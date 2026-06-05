---
title: "[TIL] 스프링부트 + 리액트 CI/CD 전체 배포 흐름"
date: 2026-06-04
tags: [SpringBoot, React, Docker, CI/CD, GitHub Actions, Nginx]
---

# [TIL] 스프링부트 + 리액트 CI/CD 전체 배포 흐름
> 부트캠프 백엔드 과정 · 2026.06.05

## 1. GitHub 저장소 공개 범위와 인증

| 구분 | 퍼블릭 | 프라이빗 |
|---|---|---|
| clone | 인증 없이 가능 | 인증 필수 |
| Jenkins 연동 | PAT/SSH 없어도 동작 | PAT/SSH 구성 필수 |
| 주 사용처 | 학습/오픈소스 | 회사 코드/배포 파이프라인 |

> 실무는 대부분 프라이빗 → Jenkins에 PAT 또는 SSH 키 미리 등록해둬야 함

**핵심 키워드:** `#PAT` `#SSH` `#Jenkins` `#프라이빗저장소`

---

## 2. 스프링 부트 JAR 빌드 → 로컬 검증

```bash
# Maven 빌드
mvn verify

# 로컬 실행 (포트 충돌 방지 위해 9090 사용)
java -jar target/app-0.0.1-SNAPSHOT.jar --server.port=9090
```

```
포트 점유 현황 (충돌 주의):
8080 → Tomcat
8181 → Jenkins
9090 → 스프링부트 테스트용
```

> 로컬에서 먼저 `java -jar`로 실행 검증한 뒤 Docker 이미지화하는 순서가 안정적

**핵심 키워드:** `#Maven` `#JAR` `#server.port` `#finalName`

---

## 3. Dockerfile로 스프링 부트 이미지화

```dockerfile
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
ARG JAR_FILE=target/app-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
EXPOSE 9090
ENTRYPOINT ["java","-jar","app.jar"]
```

> 실행만 할 거면 JDK 말고 **JRE** 이미지로 충분 → 이미지 사이즈 줄어듦

| 명령 | 차이점 |
|---|---|
| `COPY` | 단순 복사 → JAR 배포에 적합 |
| `ADD` | 복사 + 압축 해제 등 부가 기능 → 설치형 구성에 사용 |

**핵심 키워드:** `#Dockerfile` `#Eclipse-Temurin` `#JRE` `#ARG` `#ENTRYPOINT`

---

## 4. Docker Hub PAT + GitHub Secrets 등록

```
Docker Hub → Account Settings → Security → New Access Token
→ 복사한 PAT를 GitHub Secrets에 저장
```

```yaml
# workflow에서 참조 방법
${{ secrets.DOCKER_USERNAME }}
${{ secrets.DOCKER_PASSWORD }}
```

> 코드에 토큰 하드코딩하면 GitHub가 자동 감지해서 차단함 → Secrets 필수

**핵심 키워드:** `#DockerHub` `#PAT` `#GitHubSecrets` `#Actions`

---

## 5. GitHub Actions 워크플로 - 멀티플랫폼 빌드/푸시

```yaml
on:
  push:
    branches: [ "main" ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/myapp:latest
```

> Node 런타임 경고 뜨면 `actions/checkout`, `actions/setup-java` 등 메이저 버전 최신으로 올리면 됨

| 구성 요소 | 역할 |
|---|---|
| QEMU | ARM/x86 아키텍처 에뮬레이션 |
| Buildx | 멀티플랫폼 이미지 빌드/푸시 |

**핵심 키워드:** `#GitHubActions` `#QEMU` `#Buildx` `#멀티플랫폼` `#workflow`

---

## 6. 서버에서 이미지 실행 + ngrok 외부 노출

```bash
# 최신 이미지 pull + 실행
docker pull <user>/<image>:latest
docker run -d -p 8383:9090 --name springboot_004 <user>/<image>:latest

# ngrok으로 외부 노출
ngrok http 8383

# 백그라운드 실행
nohup ngrok http 8383 > ngrok.log 2>&1 &

# 종료
pkill ngrok
```

> ngrok TCP 터널로 SSH 22포트도 열 수 있음 → CI/CD에서 서버 원격 접근할 때 사용

**핵심 키워드:** `#docker-run` `#포트매핑` `#ngrok` `#nohup`

---

## 7. 포트 점유 확인 + 강제 종료

```bash
# Windows
netstat -ano | findstr 8080
taskkill /PID <pid> /F

# Linux
ss -lntp | grep 8080
kill -9 <pid>

# 도커 컨테이너가 점유 중인 경우
docker ps
docker stop <name>
```

**핵심 키워드:** `#netstat` `#taskkill` `#ss` `#kill-9` `#포트충돌`

---

## 8. 리눅스 환경설정 범위

| 파일 | 적용 범위 |
|---|---|
| `~/.bashrc` | 해당 사용자에게만 |
| `/etc/profile` | 시스템 전체 (모든 사용자) |

```bash
# TCP 연결 확인 (Windows PowerShell)
Test-NetConnection <ngrok_host> -Port 22

# SSH 접속
ssh ubuntu@<host> -p <port>
```

**핵심 키워드:** `#bashrc` `#profile` `#Test-NetConnection` `#SSH`

---

## 9. MSA 관점 - 백/프론트 분리 배포

```
[React] ──Axios──▶ [Spring Boot REST API]
  │                        │
Nginx (정적 서빙)       JRE (JAR 실행)
  컨테이너 A             컨테이너 B
```

> 런타임이 다르면 컨테이너도 분리하는 게 자연스러움 (Node vs Java)

**핵심 키워드:** `#MSA` `#REST-API` `#React` `#Axios` `#분리배포`

---

## 10. 리액트 Nginx 정적 배포

```bash
npm install       # 의존성 설치
npm run build     # dist/ 생성
```

```dockerfile
FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

> `daemon off;` 없으면 Nginx가 백그라운드로 돌다가 컨테이너 즉시 종료됨

> esbuild 버전 충돌 시 → `package.json`에 버전 명시로 해결

**핵심 키워드:** `#Nginx` `#dist` `#daemon-off` `#esbuild` `#멀티스테이지빌드`

---

## 11. Docker Compose로 백/프론트 동시 기동

```yaml
services:
  backend:
    build:
      context: ./deploy005_springboot_react
      dockerfile: Dockerfile
    container_name: springboot_server
    ports:
      - "9090:9090"
    networks:
      - app_network

  frontend:
    build:
      context: ./deploy_front
      dockerfile: Dockerfile
    container_name: react_front
    ports:
      - "5173:80"
    depends_on:
      - backend
    networks:
      - app_network

networks:
  app_network:
    driver: bridge
```

```bash
docker compose up -d      # 전체 기동
docker compose stop       # 중지 (컨테이너 유지)
docker compose down       # 중지 + 컨테이너 삭제
```

> `down` = 컨테이너 삭제까지 됨 → 재기동만 필요하면 `stop` 쓸 것

**핵심 키워드:** `#DockerCompose` `#depends_on` `#bridge-network` `#up` `#down`

---

## 12. GitHub Actions - SSH 원격 배포 자동화

```bash
# 원격 서버에서 실행되는 스크립트
docker stop springboot_004 || true
docker rm springboot_004 || true
docker pull <user>/<image>:latest
docker image prune -f
docker run -d -p 8383:9090 --name springboot_004 <user>/<image>:latest
```

> `|| true` = 컨테이너 없어도 파이프라인 중단 안 됨 (최초 배포 시 필수)

> SSH 주소에 `tcp://` 스키마 붙이면 안 됨 → 호스트만 입력할 것

> `--name` 고정해야 stop/rm 스크립트가 안정적으로 동작

**핵심 키워드:** `#SSH배포` `#docker-stop` `#image-prune` `#||true` `#원격스크립트`

---

## 오늘의 핵심 요약

1. 퍼블릭 저장소는 인증 없이 clone 가능, 프라이빗은 PAT/SSH 필수
2. 배포 전 `java -jar`로 로컬 검증 먼저 → 컨테이너화
3. 실행 전용이면 JDK 말고 **JRE** 이미지 사용 → 용량 절약
4. `COPY` vs `ADD` → JAR 배포엔 `COPY` 명확
5. GitHub Secrets에 토큰 저장 → `${{ secrets.이름 }}`으로 참조
6. QEMU + Buildx = ARM/x86 멀티플랫폼 이미지 한 번에 빌드
7. `daemon off;` 없으면 Nginx 컨테이너 바로 종료됨
8. Docker Compose `down` ≠ `stop` → 차이 구분해서 쓸 것
9. 원격 배포 스크립트에 `|| true` = 최초 배포 시 실패 방지
10. SSH 주소에 `tcp://` 스키마 넣으면 접속 실패
