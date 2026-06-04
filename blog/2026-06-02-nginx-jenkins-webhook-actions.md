---
title: "[TIL] Nginx 리버스 프록시, Jenkins CI/CD, GitHub Webhook, GitHub Actions"
date: 2026-06-02
tags: [Nginx, Jenkins, GitHub Actions]
---
> 부트캠프 백엔드 과정 · 2026.06.02

## 1. Nginx로 단일 포트 라우팅 구성

### 왜 Nginx를 쓰나?

Ngrok 무료 플랜은 HTTP 터널 수 제한이 있어서 톰캣(8080)과 젠킨스(8181)를 동시에 외부에 노출하기 어렵다.
→ Nginx를 앞단에 두고 **80 포트 하나만 열고** 내부에서 경로 기반으로 분기

```
외부 요청
   ↓
Nginx (80)
   ├── /          → 톰캣 (8080)
   └── /jenkins   → 젠킨스 (8181)
```

### Nginx 3가지 역할

| 구분 | 핵심 목적 | 대표 효과 | 본 강의 적용 |
|------|---------|---------|-----------|
| 리버스 프록시 | 외부 요청을 내부 서버로 전달 | 단일 포트로 서비스 분기 | ✅ 적용 |
| 로드 밸런싱 | 여러 서버로 트래픽 분산 | 수평 확장, 장애 완화 | 개념 소개 |
| 정적 파일 처리 | 정적 리소스 직접 제공 | WAS 부하 감소 | 개념 소개 |

### 설치 및 기동

```bash
sudo apt install nginx          # 설치
sudo systemctl start nginx      # 시작
sudo systemctl enable nginx     # 부팅 시 자동 시작
ss -lnt                         # 80 포트 리스닝 확인
```

### 설정 파일 수정

```bash
sudo vi /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80;

    location / {
        proxy_pass http://localhost:8080;
    }

    location /jenkins {
        proxy_pass http://localhost:8181;
    }

    # 413 오류 방지 (업로드 용량 제한)
    client_max_body_size 500M;
}
```

### 설정 적용

```bash
sudo nginx -t                   # 문법 검증 → syntax is ok / test is successful 확인
sudo systemctl reload nginx     # 무중단 반영
sudo systemctl restart nginx    # 강제 재시작
```

### 젠킨스 Prefix 문제

| 문제 | 원인 | 증상 | 해결 |
|------|------|------|------|
| `/jenkins` 접속 후 로그인 이동 | 젠킨스가 루트 기준 링크 생성 | `/login`으로 이동 → 404 | Jenkins Prefix를 `/jenkins`로 설정 |

> 설정 중복(ARGS 중복 선언) 발생 시 → 중복 라인 제거 후 `daemon-reload` + 서비스 재시작

```bash
sudo systemctl daemon-reload
sudo systemctl restart jenkins
```

**핵심 키워드:** `#Nginx` `#리버스프록시` `#Prefix` `#nginx-t` `#client_max_body_size`

---

## 2. Jenkins 수동 빌드/배포 (CI/CD 1단계)

### 개념

> 완전 자동은 아니지만 젠킨스가 빌드/패키징/배포를 수행 → **반자동 배포**

### Jenkins 기본 준비

| 구분 | 설정 위치 | 목적 | 입력값 |
|------|---------|------|-------|
| Tool 설정 | Manage Jenkins → Tools | 빌드 도구 연결 | JDK 경로, Git 경로, Maven 설치 |
| 플러그인 | Manage Jenkins → Plugins | 기능 확장 | Maven Integration, Deploy to container |
| System 설정 | Manage Jenkins → System | Jenkins URL 등 | 퍼블릭 URL로 지정 |

```bash
which git       # Git 실행 파일 경로 확인 → /usr/bin/git
which java      # JDK 경로 확인
```

> Jenkins URL 경고 = 로컬호스트 기반일 때 발생 → 퍼블릭 URL로 교정

### Maven Project Job 생성

| 항목 | 의미 | 예시 |
|------|------|------|
| Repository URL | 젠킨스가 클론할 Git 주소 | HTTPS 클론 URL |
| Credentials | Git 접근 인증 | 계정+PAT 또는 SSH |
| Branch | 빌드 대상 브랜치 | `*/main` |
| POM 위치 | pom.xml 상대 경로 | `deploy002/pom.xml` |
| Goals | Maven 목표 | `clean install` |
| Deploy to Container | WAR 배포 설정 | 톰캣9 + 매니저 계정 + URL |

> WAR 패턴: `**/*.war` (타겟 폴더 직접 적지 않도록)
> 413 오류 → Nginx `client_max_body_size` 설정으로 해결

**핵심 키워드:** `#Jenkins Tools` `#Maven Integration` `#Deploy to container` `#clean install` `#WAR 배포`

---

## 3. GitHub Webhook 기반 자동 배포 (CI/CD 2단계)

### 시나리오

```
개발자(DV) → 기능 브랜치 push → PR 생성
                                    ↓
형상관리자 → PR 검토 → main 머지
                                    ↓
GitHub Webhook → Jenkins로 페이로드 전송
                                    ↓
Jenkins → 소스 가져오기 → Maven 빌드 → 톰캣 배포
```

> main에 머지되는 순간 Webhook 동작 → DV 브랜치 push만으로는 Jenkins 미동작

### Webhook 설정

GitHub 저장소 → Settings → Webhooks

| 설정 항목 | 값 | 실무 포인트 |
|---------|---|-----------|
| Payload URL | Jenkins Webhook URL | 퍼블릭 URL 필수, **끝 슬래시 누락 주의** |
| Content type | `application/x-www-form-urlencoded` | 기본값으로 동작 |
| Events | Push 이벤트 | Active 반드시 활성화 |

### Jenkins Job 트리거 설정

```
빌드 유발 → "GitHub hook trigger for GITScm polling" 체크
```

> 이 설정 없으면 Webhook 수신해도 빌드 안 됨!

### SSH 키 인증 (PAT 대신)

```bash
# Windows Git Bash에서 키 생성
ssh-keygen -t rsa -b 4096 -C "your@email.com"
```

| 위치 | 등록 대상 | 주의 |
|------|---------|------|
| Jenkins Credentials | Private Key (개인키) | Jenkins가 Git 접근 권한 가짐 |
| GitHub Deploy Keys | Public Key (공개키) | 저장소 단위 권한, Write는 필요 시만 |

**핵심 키워드:** `#GitHub Webhook` `#Payload` `#GITScm polling` `#Deploy Key` `#SSH Credentials`

---

## 4. GitHub Actions로 파이프라인 대체

### Jenkins vs GitHub Actions

| 구분 | Jenkins | GitHub Actions |
|------|---------|--------------|
| 운영 부담 | 서버 직접 관리 | GitHub가 실행 환경 제공 |
| 설정 방식 | GUI + 플러그인 | YAML 파일 |
| 실행 환경 | 자체 서버 | GitHub Runner |
| 비용 | 서버 비용 | public repo 무료 |

### 구성 요소

| 구성 요소 | 역할 | 위치 |
|---------|------|------|
| Workflow YAML | 트리거/빌드/배포 단계 정의 | `.github/workflows/maven.yml` |
| Secrets | 민감정보 암호화 저장 | Repo Settings → Security → Secrets |
| env | 환경변수 주입 | YAML `env:` 섹션 |

### Secrets 등록

```
Repo → Settings → Security → Secrets and variables → Actions
→ TOMCAT_USERNAME, TOMCAT_PASSWORD 등록
```

### Workflow YAML 예시

```yaml
name: Deploy to Tomcat

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  TOMCAT_USERNAME: ${{ secrets.TOMCAT_USERNAME }}
  TOMCAT_PASSWORD: ${{ secrets.TOMCAT_PASSWORD }}

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Build with Maven
        run: mvn clean install -DskipTests -f ./pom.xml

      - name: Deploy to Tomcat
        run: |
          mvn tomcat:redeploy \
            -Dtomcat.url="https://<YOUR_DOMAIN>/manager/text" \
            -Dtomcat.username=${TOMCAT_USERNAME} \
            -Dtomcat.password=${TOMCAT_PASSWORD} \
            -DskipTests \
            -f ./pom.xml
```

### YAML 작성 주의사항

```
구조 순서: 트리거(on) → jobs → steps
들여쓰기 오류 = 가장 흔한 실패 원인
run: |  → 여러 줄 명령 작성 시 파이프(|) 사용
```

> 이클립스에서 `.github/workflows` 파일 안 보이면 → 필터 해제 후 링크 추가
> Secrets 값은 코드에 노출 X, 로그에도 마스킹 처리됨

**핵심 키워드:** `#GitHub Actions` `#Workflow` `#Secrets` `#YAML` `#Maven Tomcat Plugin`

---

## 5. (부록) 생성형 AI 프롬프트 평가 포인트

### S등급 프롬프트 구성 요소

| 평가 요소 | 의미 | 기대 효과 |
|---------|------|---------|
| 역할 부여 | 모델이 수행할 직무/관점 지정 | 답변 깊이와 일관성 상승 |
| 제외 조건 | 분석 범위 명확히 제한 | 불필요한 가정과 잡음 감소 |
| 프롬프트 구조화 | 조건을 순서 있게 제시 | 채점 기준 만족 쉬워짐 |

### 예시 (기상 분석 과제)

```
❌ 나쁜 프롬프트:
"이 기상 데이터 분석해줘"

✅ 좋은 프롬프트:
"당신은 기상 분석 전문가입니다.
아래 데이터를 분석하되, 인간 활동과 동물 활동의 영향은 제외하고
기상 패턴 중심으로만 분석해주세요."
```

**핵심 키워드:** `#프롬프트` `#역할부여` `#제외조건` `#AI평가` `#문제해결`

---

## 오늘의 핵심 요약

1. Nginx = 80 포트 단일 통로, 내부에서 경로 기반 분기
2. `nginx -t` = 설정 변경 후 **반드시** 문법 검증
3. `client_max_body_size 500M` = 413 오류 해결
4. 젠킨스 Prefix = `/jenkins` 경로 프록시 시 URL 꼬임 방지
5. CI/CD 1단계 = 버튼으로 수동 빌드 (반자동)
6. CI/CD 2단계 = Webhook + GITScm polling → main 머지 시 자동 빌드
7. Webhook Payload URL = 퍼블릭 URL 필수 + 끝 슬래시 확인
8. GitHub Actions = Jenkins 없이 YAML로 파이프라인 구성
9. Secrets = 민감정보 코드 노출 없이 주입, 로그에도 마스킹
10. YAML `run: |` = 여러 줄 명령 작성 시 파이프 사용
