---
title: "[TIL] Docker Compose, 쉘스크립트, 프로파일, Next.js"
date: 2026-06-09
tags: [DockerCompose, ShellScript, SpringProfiles, Next.js, PostgreSQL]
---

## 오늘의 핵심 흐름

전날 도커라이징 흐름을 간단히 복기한 뒤, **Docker Compose**로 Spring Boot + PostgreSQL을 함께 실행하는 실습을 진행했다. Compose 파일을 DB용/앱용으로 분리해 `-f` 옵션으로 선택 실행하고, 반복 명령을 **쉘 스크립트**로 자동화했다. 이후 **Spring Boot 프로파일**로 H2 ↔ PostgreSQL을 전환하고, **Next.js** 기본 개념(파일 기반 라우팅, 서버/클라이언트 컴포넌트, fetch 캐싱)까지 연결했다.

---

## 1. Docker Compose 기본 개념

### 핵심 포인트 — 서비스명이 곧 내부 DNS

```yaml
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: appDB
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    image: bookmark-api:latest
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # ⚠️ localhost가 아니라 서비스명(postgres)을 사용해야 한다!
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/appDB
```

> `service_healthy` 조건을 쓰면 DB가 "컨테이너 실행"만 된 상태가 아닌,  
> **초기화까지 완료되어 연결 가능한 상태**가 된 이후에 앱이 기동된다.

### 주요 명령어

| 명령어 | 목적 | 주의사항 |
|--------|------|---------|
| `docker compose up -d` | 서비스 생성 및 백그라운드 실행 | 빌드가 필요하면 자동 수행 |
| `docker compose down` | 컨테이너와 네트워크 중지/삭제 | 단순 멈춤이 아닌 정리까지! |
| `docker compose stop` | 컨테이너만 중지 | 리소스는 남아 재시작 가능 |
| `docker compose logs -f` | 로그 스트리밍 출력 | 오류 분석 시 AI에 붙여넣어 요약 가능 |
| `docker compose ps` | 서비스 상태 확인 | 포트, health 상태 확인 |
| `docker compose exec <svc> bash` | 컨테이너 내부 진입 | bash 없으면 `sh` 사용 |

> `down` vs `stop` 차이 헷갈리지 말 것: `down`은 컨테이너 + 네트워크까지 **정리**, `stop`은 일시 중지

---

## 2. Compose 파일 분리와 `-f` 옵션

```bash
# DB만 실행
docker compose -f ./docker-compose-db.yml up -d

# DB + 앱 함께 실행
docker compose -f ./docker-compose-db.yml -f ./docker-compose-app.yml up -d
```

> YML은 공백/들여쓰기 규칙에 민감 → 복사/붙여넣기 후 정렬 필수!

---

## 3. 쉘 스크립트로 실행 자동화

```bash
#!/bin/bash

DB_FILE=./docker-compose-db.yml
APP_FILE=./docker-compose-app.yml

ACTION=${1:-start}  # 인자 없으면 기본값 start

start_infra() {
  docker compose -f $DB_FILE up -d
}

stop_infra() {
  docker compose -f $DB_FILE down
}

start_all() {
  docker compose -f $DB_FILE -f $APP_FILE up -d
}

stop_all() {
  docker compose -f $DB_FILE -f $APP_FILE down
}

build_app() {
  ./mvnw clean package -DskipTests
}

$ACTION
```

```bash
# 실행 권한 부여
chmod +x run.sh

# 사용 예시
./run.sh start_infra
./run.sh build_app
./run.sh start_all
```

> 💡 `-f` 옵션의 두 가지 의미 혼동 주의:
> - `compose -f file.yml` → **파일 지정**
> - `logs -f` → **follow(스트리밍)**

---

## 4. Spring Boot 프로파일로 DB 설정 분리

```properties
# application-local.properties
spring.datasource.url=jdbc:postgresql://localhost:15432/appDB
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.datasource.driver-class-name=org.postgresql.Driver
```

- Docker로 DB만 띄운 뒤(`start_infra`), IDE에서 앱 실행 시 프로파일을 `local`로 선택
- 프로파일 네이밍 규칙: `application-{profile}.properties`
- `local` 외에도 `dev`, `dev1` 등 팀 규칙에 따라 자유롭게 네이밍 가능

---

## 5. PostgreSQL 기본 운영 명령

```bash
# 컨테이너 진입 후 psql 접속
docker exec -it <컨테이너명> bash
psql -U postgres     # ⚠️ SQL 실행 시 세미콜론(;) 필수!

# 기본 명령
\l                              # DB 목록
\q                              # 종료
\dt                             # 테이블 목록

# DB/유저 생성 및 권한
create database mydb;
create user lion with password 'lion';
grant all privileges on database mydb to lion;
alter database mydb owner to lion;
```

> Oracle/MySQL/PostgreSQL 차이 비교 포인트 (면접):
> - DB 생성 개념
> - 사용자-스키마 관계
> - 사용자 식별 방식 (MySQL은 `user@host` 형태)

---

## 6. Next.js 기초

### 프로젝트 생성

```bash
npx create-next-app@latest
# → TypeScript, ESLint, Tailwind, App Router 등 선택
npm run dev   # 개발 서버 (기본 포트 3000)
```

### 서버/클라이언트 컴포넌트 판단 기준

| 판단 기준 | 조치 |
|----------|------|
| `useState` 또는 `useEffect` 사용 | `"use client"` 선언 필요 |
| `window`, `document` 등 브라우저 객체 사용 | `"use client"` 선언 필요 |
| `onClick`, `onChange` 등 DOM 이벤트 핸들러 | `"use client"` 선언 필요 |
| 데이터 패칭만 하는 경우 | 서버 컴포넌트 (기본값) |

> 성능 관점: 가능한 대부분은 서버 컴포넌트로 두고, **상호작용이 필요한 최소 단위만** 클라이언트 컴포넌트로 분리

### fetch 캐싱 옵션

```typescript
// 동적 렌더링 (매 요청마다 최신 데이터)
const res = await fetch('/api/data', { cache: 'no-store' });

// ISR (10초마다 재검증)
const res = await fetch('/api/data', { next: { revalidate: 10 } });
```

> 캐싱 동작 검증은 `npm run dev`가 아닌 `npm run build && npm start`(배포 모드)로 확인!  
> 빌드 결과 로그에서 정적/동적 라우트가 구분되어 표시됨

---

## 핵심 키워드

`#Docker Compose` `#depends_on` `#healthcheck` `#pg_isready` `#쉘스크립트` `#chmod` `#Spring Profiles` `#application-local.properties` `#Next.js` `#서버 컴포넌트` `#클라이언트 컴포넌트` `#revalidate`
