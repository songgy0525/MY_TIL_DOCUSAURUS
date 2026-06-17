---
title: "[TIL] K8S 배포, 설정, 볼륨"
date: 2026-06-16
tags: [Kubernetes, Deployment, ConfigMap, Secret, PV, PVC, SpringBoot, YAML]
---

## 오늘의 핵심 흐름

북마커 API + PostgreSQL을 K8S에 배포하기 위한 **Deployment YAML**을 작성하고, **ConfigMap/Secret**으로 환경변수를 외부화했다. 마지막으로 **PV/PVC**로 데이터 영속성을 확보하고, 파드를 삭제해도 DB 테이블이 유지되는 것을 직접 검증했다.

---

## 1. GitHub Actions CI/CD 재정리

```
소스 확보 → GitHub 레포지토리 생성 → Secrets 등록 → commit & push → Actions 자동 실행 → Docker Hub 이미지 push
```

| 단계 | 핵심 작업 | 결과 |
|------|----------|------|
| 소스 확보 | 저장소에서 다운로드 후 압축 해제 | 로컬에 동일한 프로젝트 구조 준비 |
| GitHub 준비 | 레포지토리 생성 + Secrets 등록 | Actions에서 민감 정보 안전 사용 |
| 배포 자동화 | 커밋/푸시 후 Actions 실행 | Docker Hub로 이미지 자동 배포 |

> 이미지가 갱신되지 않으면 로컬 이미지 삭제 후 `docker pull`로 최신 이미지 받기

---

## 2. K8S 핵심 개념 재정리

### 연결의 핵심은 "라벨(Label)"

```yaml
# Deployment — 라벨 정의
spec:
  selector:
    matchLabels:
      app: bookmark-api
  template:
    metadata:
      labels:
        app: bookmark-api
```

```yaml
# Service — 라벨로 타겟 파드 찾기
spec:
  selector:
    app: bookmark-api  # 동일한 라벨을 가진 파드로 트래픽 라우팅
```

> 이름(name)도 있지만, Service/Deployment가 대상을 선택하는 기준은 **라벨 셀렉터(matchLabels)**

```bash
kind create cluster --name demo-cluster --config ./kind-config.yaml
kubectl config current-context
kubectl apply -f .        # 폴더 내 모든 YAML 적용
kubectl get all
```

---

## 3. Deployment YAML — 북마커 API + PostgreSQL

### 북마커 API Deployment

```yaml
# bookmark-api-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bookmark-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bookmark-api
  template:
    metadata:
      labels:
        app: bookmark-api
    spec:
      containers:
        - name: bookmark-api
          image: <dockerhub-user>/bookmark-api:latest
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "K8S"
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: DB_HOST
            - name: DB_PORT
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: DB_PORT
            - name: DB_DATABASE
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: DB_NAME
            - name: DB_USERNAME
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: DB_USERNAME
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: DB_PASSWORD
```

### PostgreSQL Deployment

```yaml
# postgres-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:14-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: DB_USERNAME
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: DB_PASSWORD
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: DB_NAME
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-pvc
```

> **라벨/셀렉터/참조 이름**이 리소스 간 연결을 결정 — 오타가 가장 흔한 실수

---

## 4. ConfigMap, Secret으로 환경변수 외부화

### ConfigMap 생성

```bash
kubectl create configmap db-config \
  --from-literal=DB_HOST=postgres \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_NAME=appdb \
  --dry-run=client -o yaml > db-config.yml
kubectl apply -f db-config.yml
```

### Secret 생성

```bash
kubectl create secret generic db-secret \
  --from-literal=DB_USERNAME=postgres \
  --from-literal=DB_PASSWORD=secret123 \
  --dry-run=client -o yaml > db-secret.yml
kubectl apply -f db-secret.yml
```

| 구분 | 저장 대상 | 참조 방식 |
|------|----------|----------|
| ConfigMap | 호스트/포트/DB명 등 일반 설정 | `valueFrom.configMapKeyRef` |
| Secret | 유저/비밀번호 등 민감 정보 | `valueFrom.secretKeyRef` |

> ⚠️ Secret은 완전한 암호화가 아닌 **base64 인코딩** 형태로 저장됨

> `apply`는 수정된 파일을 다시 적용하면 자동 갱신됨 → 변경 시 delete가 필수는 아님

### Spring Boot K8S 프로파일 설정

```yaml
# application.yml (K8S 프로파일 섹션)
---
spring:
  config:
    activate:
      on-profile: K8S
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_DATABASE:appdb}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
```

> `${변수명:기본값}` — 환경변수가 없을 때 기본값 처리 문법

---

## 5. PV / PVC로 데이터 영속성 확보

### 개념 정리

| 항목 | PV | PVC |
|------|-----|-----|
| 핵심 의미 | 스토리지 자원 **정의** | 스토리지 자원 **요청** |
| 용량 관계 | 전체 제공 용량 | PV 용량을 초과할 수 없음 |
| 바인딩 | 조건 맞는 PVC 수용 | 조건 맞는 PV에 자동 바인딩 |

### PV / PVC YAML

```yaml
# postgres-pv-pvc.yml
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: postgres-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /data/postgres   # Kind 노드 내부 경로

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi   # ⚠️ PV 용량(1Gi)을 초과할 수 없음!
```

### 데이터 영속성 검증 시나리오

```bash
# 1. Postgres 파드 내부 진입
kubectl exec -it <postgres-pod-name> -- /bin/bash

# 2. psql 접속
psql -U postgres -d appdb

# 3. 테이블 생성 및 데이터 삽입
CREATE TABLE test(id SERIAL PRIMARY KEY, name VARCHAR(100));
INSERT INTO test(name) VALUES ('K8S 영속성 테스트');
\dt

# 4. 파드 삭제 (Deployment가 자동 재생성!)
kubectl delete pod <postgres-pod-name>

# 5. 새 파드에서 데이터 확인
kubectl exec -it <new-postgres-pod> -- psql -U postgres -d appdb -c "SELECT * FROM test;"
# ✅ 데이터가 그대로 남아있어야 정상!
```

> Lens에서 확인 포인트:
> - PV/PVC가 **Bound** 상태인지
> - 파드의 Volumes 섹션에 마운트가 잡혔는지
> - 파드 재생성 후에도 DB 오브젝트가 유지되는지

---

## 핵심 키워드

`#GitHub Actions` `#CI/CD` `#K8S` `#라벨` `#Deployment` `#ConfigMap` `#Secret` `#valueFrom` `#configMapKeyRef` `#secretKeyRef` `#SPRING_PROFILES_ACTIVE` `#PV` `#PVC` `#볼륨 마운트` `#Bound` `#데이터 영속성`
