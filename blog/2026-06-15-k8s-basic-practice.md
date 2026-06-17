---
title: "[TIL] K8S 기초 실습"
date: 2026-06-15
tags: [Kubernetes, Kind, kubectl, Pod, Deployment, ReplicaSet, NodePort, Lens]
---

## 오늘의 핵심 흐름

K8S 핵심 개념(클러스터, 컨트롤 플레인, 노드, 파드, 서비스, kubectl, Kind)을 재정리한 뒤, Kind로 클러스터를 만들고 **Nginx 파드를 배포 → 노출 → 검증 → 삭제**하는 기본 시나리오를 실습했다. GUI 관제 도구 **Lens**를 설치해 시각적으로 확인하고, 직접 만든 Docker Hub 이미지(북마커 API)를 파드로 올려 검증했다. 마지막으로 **Deployment** 생성, 스케일링, 롤아웃 히스토리, 롤백까지 다뤘다.

---

## 1. K8S 기본 용어와 동작 흐름

```
kubectl → API 서버 → 컨트롤 플레인 → 노드/파드
```

| 용어 | 정의 | 비유 |
|------|------|------|
| K8S | 컨테이너 오케스트레이션 시스템 | 수동 운영을 자동화 |
| 클러스터(Cluster) | 하나의 K8S 시스템 단위 | 회사 전체 |
| 컨트롤 플레인 | 클러스터 제어/스케줄링 중심 | CEO/브레인 |
| 노드(Node) | 파드가 실제 실행되는 머신 | 부서/직원 |
| 파드(Pod) | 컨테이너가 실행되는 기본 단위 | 컨테이너 묶음 |

> **kind vs kubectl 역할 구분:**
> - `kind` → 클러스터 **생성/삭제**
> - `kubectl` → 클러스터 내부 리소스 **조작**

---

## 2. Kind 클러스터 포트 매핑 설정

```yaml
# kind-config.yml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: 8080
        protocol: TCP
```

```bash
kind create cluster --name demo-cluster --config kind-config.yml
```

### 포트 흐름

```
브라우저(8080) → 호스트 → Kind 노드 컨테이너(30080) → K8S Service(NodePort) → Pod(80)
```

| 구간 | 포트 | 의미 |
|------|------|------|
| 브라우저 요청 | 8080 | 사용자가 접속하는 호스트 포트 |
| Kind 노드 컨테이너 | 30080 | NodePort로 노출될 포트 |
| 서비스 포트 | 80 | 서비스 내부 포트 |
| 파드 컨테이너 | 80 | Nginx가 실제 리스닝하는 포트 |

### 컨텍스트 확인/전환

```bash
kubectl config get-contexts
kubectl config current-context
kubectl config use-context kind-demo-cluster
```

---

## 3. Nginx 파드, 서비스 배포 실습

```bash
# 1. 파드 생성
kubectl run my-nginx --image=nginx --port=80

# 2. 파드 상태 확인
kubectl get pods -o wide

# 3. 서비스 YAML 템플릿 생성 (실행 없이)
kubectl expose pod my-nginx --port=80 --type=NodePort --dry-run=client -o yaml > svc.yml
# → svc.yml에서 nodePort: 30080 추가 후 적용

# 4. 서비스 적용
kubectl apply -f svc.yml

# 5. 전체 리소스 확인
kubectl get all

# 6. 브라우저에서 http://localhost:8080 접속 확인

# 7. 파드 내부 진입
kubectl exec -it my-nginx -- sh
curl localhost
echo "<h1>Hello K8S!</h1>" > /usr/share/nginx/html/index.html
```

| 삭제 대상 | 도구 | 명령 |
|----------|------|------|
| 파드/서비스 | kubectl | `kubectl delete pod my-nginx` |
| 클러스터 | kind | `kind delete cluster --name demo-cluster` |

---

## 4. YAML 매니페스트 dry-run 활용

```bash
# Pod YAML 템플릿 생성 (실행 없이 파일로 저장)
kubectl run bookmark-api \
  --image=<dockerhub-user>/bookmark-api:latest \
  --port=8080 \
  --dry-run=client -o yaml > bookmark-api-pod.yml

# 적용
kubectl apply -f bookmark-api-pod.yml

# 파일 기반 삭제
kubectl delete -f bookmark-api-pod.yml
```

### YAML 작성 주의사항

- 숫자/문자 타입 오류 → 라벨/버전 값은 따옴표로 문자열 처리
- `status` 섹션은 매니페스트에서 제거하는 것이 일반적
- YAML 이미지 경로는 본인 Docker Hub 계정/태그로 정확히 맞춰야 함

---

## 5. 내 Docker Hub 이미지로 파드 실행

```bash
kubectl run bookmark-api --image=<user>/bookmark-api:latest

# 로그 확인 (가장 빠른 정상 동작 검증)
kubectl logs bookmark-api

# 상세 진단 — 장애 시 핵심 루틴
kubectl describe pod bookmark-api
# → 이미지 풀링 / 컨테이너 생성 / 할당 IP / 이벤트 확인

# 내부 접속
kubectl exec -it bookmark-api -- /bin/bash
curl http://localhost:8080/api/bookmarks

# 전체 리소스 확인
kubectl get all
```

---

## 6. Lens GUI 관제 도구

| 기능 | CLI 대응 | Lens 활용 포인트 |
|------|----------|----------------|
| 파드 목록 | `kubectl get pods` | 상태/개수/노드 배치 시각화 |
| 로그 보기 | `kubectl logs <pod>` | 클릭 기반 빠른 진단 |
| 상세 정보 | `kubectl describe ...` | 이벤트/이미지/포트 확인 |

> ⚠️ 운영 환경에서 GUI를 통한 **삭제는 위험**할 수 있음  
> 생성/삭제는 CLI 중심을 권장

---

## 7. Deployment — 생성, 스케일링, 롤아웃, 롤백

### Deployment 생성

```bash
kubectl create deployment bookmark-api \
  --image=<user>/bookmark-api:latest \
  --dry-run=client -o yaml > deployment.yml
kubectl apply -f deployment.yml
```

> Deployment를 만들면 **Deployment → ReplicaSet → Pod** 계층이 함께 생성된다.

### 스케일링

```bash
kubectl scale deployment bookmark-api --replicas=3
```

| 방식 | 장점 | 단점 |
|------|------|------|
| YAML `replicas` 변경 후 `apply` | 선언적 관리 적합 | 즉시 조작에는 번거로움 |
| `kubectl scale` | 즉시 반영 | 선언 파일과 싱크 의식 필요 |

### 롤아웃과 롤백

```bash
# 롤아웃 히스토리 확인
kubectl rollout history deployment bookmark-api

# 이미지 업데이트 (새 리비전 생성)
kubectl set image deployment/bookmark-api bookmark-api=<user>/bookmark-api:1.1

# 특정 리비전으로 롤백
kubectl rollout undo deployment bookmark-api --to-revision=1
```

> ⚠️ 롤아웃/롤백 대상 = **이미지 변경** 같은 배포 변경  
> **레플리카 수 변경은 롤아웃 대상이 아니다!**

---

## 핵심 키워드

`#K8S` `#Cluster` `#Control Plane` `#Pod` `#kubectl` `#Kind` `#extraPortMappings` `#NodePort` `#dry-run` `#kubectl apply` `#kubectl exec` `#kubectl describe` `#Deployment` `#ReplicaSet` `#kubectl scale` `#rollout history` `#rollout undo` `#Lens`
