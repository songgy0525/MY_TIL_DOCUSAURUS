---
title: "[개발노트] Docker Compose로 로컬 개발 환경 통일하기"
date: 2026-07-24
tags: [Docker, Docker Compose, 개발환경]
---

> 팀 프로젝트 환경 구성

## 문제

팀원마다 PostgreSQL 버전, Redis 버전이 달라서 "내 로컬에서는 되는데" 이슈가 자주 났다. 개발 환경을 코드로 관리하기로 했다.

## 구성

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: prodio
      POSTGRES_USER: prodio
      POSTGRES_PASSWORD: prodio
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

```bash
docker compose up -d   # 백그라운드로 실행
docker compose down    # 종료
docker compose down -v # 볼륨까지 삭제 (DB 초기화)
```

## 새로 알게 된 것

**volumes로 데이터를 영속화해야 한다**
- 볼륨 없이 컨테이너를 내리면 DB 데이터가 사라짐
- named volume(`postgres_data`)으로 호스트에 저장

**`healthcheck`로 의존성 순서를 제어할 수 있다**
```yaml
app:
  depends_on:
    db:
      condition: service_healthy
```
- `depends_on`만으로는 컨테이너가 "시작"됐을 때 다음으로 넘어감
- `service_healthy`를 쓰면 DB가 실제로 준비될 때까지 앱 시작을 대기

**`.env` 파일로 환경변수 관리**
```
# .env (gitignore에 추가)
POSTGRES_PASSWORD=localpassword
```
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```
- 비밀번호 같은 민감 정보는 `.env`로 분리하고 `.gitignore` 처리

---
