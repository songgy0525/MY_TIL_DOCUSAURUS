---
title: "[TIL] 도커 허브 배포, K8S 기초"
date: 2026-06-12
tags: [DockerHub, GitHubActions, Kubernetes, Kind, kubectl, Pod, Deployment]
---

## 오늘의 핵심 흐름

GitHub Actions로 UI/API 이미지를 Docker Hub에 자동 배포하는 CI 파이프라인을 구성했다. `.env.local`이 `.gitignore`에 의해 저장소에 포함되지 않는 상황에서, **GitHub Secrets + `echo`로 런타임에 파일을 생성**하고 멀티스테이지 Dockerfile에서 최종 이미지로 복사하는 실무형 해결 과정을 다뤘다. 이후 **K8S 핵심 오브젝트**를 개념적으로 정리하고 **Kind**로 로컬 클러스터를 생성했다.

---

## 1. 도커 배포 테스트와 네트워크 정리

### SSR vs CSR 호출 방식

| 구분 | 호출 주체 | 접근 주소 기준 | 오류 증상 |
|------|----------|-------------|---------|
| SSR | 서버(UI 컨테이너) | 컨테이너 내부 네트워크 | 내부 DNS 미구성 시 API 접근 실패 |
| CSR | 브라우저 | 호스트 포트포워딩 주소 | `.env` 미설정 시 `undefined` URL로 호출 실패 |

### 컨테이너 내부 환경변수 확인

```bash
docker exec -it <컨테이너> sh
env | grep NEXT_PUBLIC   # 환경변수 주입 여부 확인
ls -al                   # .env.local 존재 여부 확인 (숨김 파일 포함)
```

### Spring Boot jar 갱신 주의

```bash
# 이미지 빌드 전 반드시 jar 먼저 갱신!
./mvnw clean verify
./mvnw clean package -DskipTests  # 빠른 빌드
docker build -t <user>/bookmark-api:latest .
```

---

## 2. GitHub Actions — Docker Hub 자동 배포

### UI 빌드 워크플로우 (핵심 부분)

```yaml
jobs:
  build-ui:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci
        working-directory: ./ui

      # .env.local은 .gitignore에 의해 저장소에 없으므로 직접 생성
      - name: Create .env.local
        run: |
          echo "NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL=${{ secrets.NEXT_PUBLIC_API_BASE_URL }}" > .env.local
          echo "SERVER_SIDE_API_BASE_URL=${{ secrets.API_BASE_URL_SSR }}" >> .env.local
        working-directory: ./ui

      - name: Build
        run: npm run build
        working-directory: ./ui

      - name: Login to Docker Hub
        run: docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}

      - name: Build & Push Docker Image
        run: |
          docker build -f Dockerfile.ui -t ${{ secrets.DOCKER_USERNAME }}/bookmark-ui:latest .
          docker push ${{ secrets.DOCKER_USERNAME }}/bookmark-ui:latest
        working-directory: ./ui
```

> `>` 는 덮어쓰기(첫 줄), `>>` 는 이어쓰기(추가) — `.env.local` 생성 시 핵심!

---

## 3. 환경변수 파일과 멀티스테이지 Dockerfile

| 단계 | 해야 할 일 | 실패 시 현상 |
|------|----------|------------|
| GitHub Actions | Secrets 기반으로 `.env.local` 생성 | 빌드/런타임 설정이 비어버림 |
| Dockerfile (최종 단계) | `.env.local`을 런타임 이미지로 COPY | 컨테이너 내부에서 ENV 파일이 없음 |

```dockerfile
# ✅ 최종 스테이지에서 반드시 .env.local 복사!
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.env.local ./.env.local  # ← 이 줄 없으면 undefined
```

### 도커 허브 이미지로 수동 배포 테스트

```bash
# 1. 커스텀 네트워크 생성
docker network create bookmark-network

# 2. API 컨테이너 실행
docker run -d \
  --network bookmark-network \
  -p 18080:8080 \
  --name bookmark-api \
  <user>/bookmark-api:latest

# 3. UI 컨테이너 실행
docker run -d \
  --network bookmark-network \
  -p 13000:3000 \
  --name bookmark-ui \
  <user>/bookmark-ui:latest
```

---

## 4. 도커 개념 정리

| 개념 | 비유 | 설명 |
|------|------|------|
| **이미지(Image)** | 설계도 | 앱과 필요한 환경을 담은 패키지 |
| **컨테이너(Container)** | 실행 중인 프로세스 | 이미지를 실제로 실행한 인스턴스 |

```bash
docker build -t <user>/app:latest .
docker run -d -p 8081:8080 --name my-app <user>/app:latest
docker ps -a
docker stop <id> && docker rm <id>
docker images && docker rmi <id>
```

---

## 5. Docker Compose와 볼륨 영속성

```yaml
services:
  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres-data:/var/lib/postgresql/data  # 볼륨 마운트

volumes:
  postgres-data:  # 볼륨 선언
```

> 데이터 영속성 설계 = 단순 실행을 넘어 운영 관점의 이해를 보여주는 지표

---

## 6. K8S 핵심 오브젝트

| 오브젝트 | 핵심 역할 | 비고 |
|---------|---------|------|
| **Pod** | 컨테이너를 감싸는 최소 배포 단위 | 같은 Pod 내 컨테이너는 네트워크/스토리지 공유 |
| **ReplicaSet** | 원하는 Pod 개수 유지 | 라벨 기반으로 대상 관리 |
| **Deployment** | ReplicaSet 관리 + 배포/업데이트/롤백 | 실무에서 가장 많이 사용 |
| **Service** | Pod 집합에 안정적인 엔드포인트 제공 | Pod가 바뀌어도 Service는 동일 |
| **ConfigMap** | 일반 설정값 분리 관리 | 호스트/포트/DB명 등 |
| **Secret** | 민감정보 분리 관리 | base64 인코딩 형태로 저장 |
| **PV/PVC** | 영속 스토리지 자원 정의/요청 | 여러 파드가 동일 저장소 공유 가능 |
| **Ingress** | 외부 HTTP(S) 트래픽 → 서비스로 라우팅 | 도메인 기반 라우팅, TLS 지원 |

### Service 타입

| 타입 | 설명 |
|------|------|
| `ClusterIP` | 클러스터 내부에서만 접근 (기본값) |
| `NodePort` | 노드의 특정 포트로 외부 노출 |
| `LoadBalancer` | 클라우드 로드밸런서와 연동 |
| `ExternalName` | 외부 DNS 이름으로 매핑 |

---

## 7. Kind로 로컬 클러스터 생성

```bash
kind create cluster --name my-cluster
kind get clusters
kubectl cluster-info --context kind-my-cluster
kubectl config get-contexts
kubectl config use-context kind-my-cluster
kind delete cluster --name my-cluster
```

> **kind vs kubectl 역할 구분 필수!**
> - `kind` → **클러스터 생성/삭제** 도구
> - `kubectl` → **클러스터 내부 리소스 조작** 도구

| 분류 | 제품 |
|------|------|
| 클라우드 | AWS EKS, GCP GKE, Azure AKS |
| 로컬 | Kind, Minikube |
| 경량 배포판 | K3S |

---

## 핵심 키워드

`#GitHub Actions` `#Docker Hub` `#GitHub Secrets` `#.gitignore` `#.env.local` `#멀티스테이지 빌드` `#NEXT_PUBLIC_` `#docker network` `#K8S` `#Pod` `#Deployment` `#Service` `#Kind` `#kubectl`
