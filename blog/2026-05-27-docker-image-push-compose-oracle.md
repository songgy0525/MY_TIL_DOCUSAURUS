---
title: "[TIL] 도커 이미지 배포, Compose, 오라클"
date: 2026-05-27
tags: [Docker]
---
> 부트캠프 백엔드 과정 · 2026.05.27

## 1. Docker Hub 이미지 Push/Pull

```bash
# 1. Docker Hub 로그인 (PAT 사용)
docker login

# 2. 태그 지정 (계정명/레포지토리:태그 형태 필수!)
docker tag busybox_new myaccount/myrepo:1.0

# 3. Push
docker push myaccount/myrepo:1.0

# 4. 다른 환경에서 Pull
docker pull myaccount/myrepo:1.0
```

> ⚠️ 계정명 없는 이미지명 = 업로드 실패
> PAT = 생성 직후만 확인 가능 → 별도 보관 필수

---

## 2. Dockerfile 기반 이미지 빌드

```dockerfile
FROM httpd:latest
WORKDIR /app
EXPOSE 80
COPY index.html /usr/local/apache2/htdocs/
```

```bash
# 빌드
docker build -t httpd_dockerfile:1.0 .

# 파일명이 Dockerfile이 아닌 경우
docker build -f Dockerfile.exam -t myimage:1.0 .

# 실행
docker run -d -p 8282:80 httpd_dockerfile:1.0
```

### 주요 인스트럭션

| 인스트럭션 | 역할 |
|-----------|------|
| `FROM` | 베이스 이미지 (필수) |
| `WORKDIR` | 작업 디렉터리 지정 |
| `COPY` | 파일 복사 (단순) |
| `ADD` | 파일 복사 + 압축 해제 가능 |
| `RUN` | 빌드 시 명령 실행 |
| `EXPOSE` | 포트 문서화 |
| `CMD` / `ENTRYPOINT` | 컨테이너 시작 명령 |

**핵심 키워드:** `#Docker Hub` `#PAT` `#docker login` `#docker push` `#docker pull`

---

## 3. docker cp로 파일 교환

```bash
# 호스트 → 컨테이너
docker cp ./index.html mycontainer:/usr/local/apache2/htdocs/

# 컨테이너 → 호스트
docker cp mycontainer:/usr/local/apache2/htdocs/index.html ./
```

> 수정 후 브라우저 캐시 강제 새로고침 필요 (Ctrl+Shift+R)

**핵심 키워드:** `#docker cp` `#컨테이너경로` `#호스트경로` `#캐시` `#httpd`

---

## 4. Docker Compose

```yaml
# docker-compose.yml
version: '3'

services:
  spring-app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql-db:3306/student
      - SPRING_DATASOURCE_USERNAME=test
      - SPRING_DATASOURCE_PASSWORD=password
    depends_on:
      - mysql-db
    networks:
      - app-network

  mysql-db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: student
      MYSQL_USER: test
      MYSQL_PASSWORD: password
    ports:
      - "3307:3306"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

```bash
# 실행
docker compose up --build -d

# 종료 + 컨테이너 제거
docker compose down

# 상태/로그 확인
docker compose ps
docker compose logs -f
```

> `mysql-db` = 서비스명이 곧 내부 호스트명 (DNS 역할)
> `depends_on` = 기동 순서 보장, ready 상태는 보장 X

### YAML 주의사항

```
들여쓰기 = 공백 2칸 (탭 금지!)
들여쓰기 오류 = 가장 흔한 실패 원인
작성 후 AI 도구로 검증 권장
```

**핵심 키워드:** `#Docker Compose` `#YAML` `#depends_on` `#bridge network` `#environment`

---

## 5. 오라클 컨테이너 + 샘플 스키마 주입

```bash
# 오라클 컨테이너 실행 (바인드 마운트로 데이터 영속화)
docker run --name oracle-db \
  -d -p 1521:1521 \
  -e ORACLE_PASSWORD=DV## \
  -v C:\docker\oracle:/opt/oracle/oradata \
  gvenzl/oracle-xe:latest

# 루트 권한으로 내부 접속
docker exec -it -u 0 oracle-db bash

# SQL*Plus 접속
sqlplus system/DV##
```

```sql
-- 오라클 12c 이상: C## 접두사 우회
ALTER SESSION SET "_ORACLE_SCRIPT"=true;

-- HR 샘플 스키마 실행 (2행 스크립트)
@/경로/HR_main.sql
```

```bash
# 샘플 파일 복사
docker cp ./HR_main.sql oracle-db:/opt/oracle/product/.../
```

| 단계 | 작업 |
|------|------|
| 이미지 실행 | 포트/ENV/볼륨 설정 |
| 내부 접속 | `docker exec -it -u 0 ... bash` |
| 스키마 복사 | `docker cp` |
| SQL 실행 | `@/경로/HR_main.sql` |

**핵심 키워드:** `#Docker Hub` `#Dockerfile` `#볼륨` `#데이터영속성` `#오라클`

---

## 오늘의 핵심 요약

1. Docker Hub Push = 반드시 `계정명/레포지토리:태그` 형태
2. PAT = 생성 직후만 확인 가능 → 즉시 복사 보관
3. Dockerfile = `FROM` 필수, `COPY`/`RUN`으로 레이어 추가
4. `-f` 옵션 = Dockerfile이 아닌 파일명 지정
5. Docker Compose = 여러 컨테이너를 YAML로 묶음 정의
6. 서비스명 = Compose 내부 DNS 역할 → DB 호스트명으로 사용
7. `depends_on` = 기동 순서만 보장, DB 준비 완료는 보장 X
8. YAML 들여쓰기 = 공백 2칸, 탭 절대 금지
9. `docker exec -it -u 0` = 루트 권한으로 컨테이너 접속
10. 오라클 12c+ `C##` 우회 = `ALTER SESSION SET "_ORACLE_SCRIPT"=true`
