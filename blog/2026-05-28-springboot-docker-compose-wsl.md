---
title: "[TIL] 스프링부트 도커 배포, Compose, WSL 서버"
date: 2026-05-28
tags: [SpringBoot, Docker, WSL]
---
> 부트캠프 백엔드 과정 · 2026.05.28

## 1. 스프링 부트 Maven 패키징

```bash
# 패키징 (target/ 에 JAR 생성)
mvn verify     # 로컬 저장소(M2) 반영 X
mvn install    # 로컬 저장소(M2) 반영 O
```

```bash
# JAR 직접 실행 (서버에 Java만 있으면 됨)
java -version
java -jar target/myapp.jar
```

> 문제: 자바 버전이 다르면 실행 불가 → **Docker로 런타임까지 포함**

---

## 2. 스프링 부트 Dockerfile

```dockerfile
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
EXPOSE 8080
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```bash
# 빌드 + 실행
docker build -t spring-boot-docker:1.0 .
docker run -p 8099:8080 --name spring_boot_docker spring-boot-docker:1.0
```

> `eclipse-temurin:21-jdk-alpine` = JDK 21 + Alpine (경량)
> 실행만 하려면 JDK 대신 JRE 기반이 더 가벼움

---

## 3. Maven 플러그인으로 자동 Push

```xml
<!-- pom.xml에 Docker 플러그인 추가 -->
<build>
    <plugins>
        <plugin>
            <!-- docker:build, docker:push 자동화 -->
        </plugin>
    </plugins>
</build>
```

```bash
# IDE에서 Maven install 실행만 하면
# 빌드 → 이미지 생성 → Docker Hub Push 자동화!
```

사전 조건:
- Docker Hub 계정 + PAT 발급
- Docker Desktop 로그인 상태
- Docker Hub Repository 미리 생성 (권장)

**핵심 키워드:** `#Docker Hub` `#PAT` `#pom.xml` `#Maven plugin` `#docker push`

---

## 4. Docker Compose - 스프링 + MySQL

```yaml
version: '3'
services:
  spring-app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql-db:3306/product
      SPRING_DATASOURCE_USERNAME: test
      SPRING_DATASOURCE_PASSWORD: password
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
    depends_on:
      - mysql-db
    networks:
      - my-network

  mysql-db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: rootpw
      MYSQL_DATABASE: product
      MYSQL_USER: test
      MYSQL_PASSWORD: password
    networks:
      - my-network

networks:
  my-network:
    driver: bridge
```

```bash
docker compose up --build -d    # 이미지 재빌드 + 실행
docker compose down             # 종료 + 제거
docker compose logs -f          # 로그 스트리밍
```

> `mysql-db` = 서비스명이 내부 DNS → `SPRING_DATASOURCE_URL`에 그대로 사용

---

## 5. WSL Ubuntu 설치

```bash
# WSL 관리
wsl -l -v                       # 설치된 배포판 확인
wsl -l -o                       # 설치 가능 목록
wsl --install -d Ubuntu-22.04   # 설치
wsl --unregister Ubuntu-22.04   # 삭제

# 백업/복구
wsl --export Ubuntu-22.04 backup.tar
wsl --import Ubuntu-22.04 C:\wsl\ubuntu backup.tar
```

**핵심 키워드:** `#WSL` `#Ubuntu 22.04` `#OpenSSH` `#ssh-keygen` `#authorized_keys`

---

## 6. SSH 키 기반 인증

```bash
# 키 생성 (서버에서)
ssh-keygen -t rsa -b 4096

# .ssh 권한 설정
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 600 ~/.ssh/authorized_keys
chown -R ubuntu:ubuntu ~/.ssh

# 공개키 등록
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

| 파일 | 역할 |
|------|------|
| `id_rsa` | 개인키 → 클라이언트 보관 (절대 유출 X) |
| `id_rsa.pub` | 공개키 → 서버 `authorized_keys`에 등록 |

```bash
# IP 확인
apt install net-tools
ifconfig

# Windows로 키 복사
scp ubuntu@<IP>:~/.ssh/id_rsa ./
```

> PuTTYgen = `.pem` → `.ppk` 변환 (PuTTY 접속용)

---

## 오늘의 핵심 요약

1. `mvn install` = JAR 생성 + 로컬 저장소 반영
2. Docker = 런타임까지 이미지에 포함 → 환경 의존성 해결
3. `eclipse-temurin:21-jdk-alpine` = 경량 JDK 이미지
4. Maven Docker 플러그인 = `install` 한 번으로 빌드+이미지+push 자동화
5. Compose 서비스명 = 내부 DNS 역할 → `DATASOURCE_URL`에 그대로 사용
6. `depends_on` = 기동 순서만 보장, DB 준비 완료는 별도 처리 필요
7. WSL `--export`/`--import` = 개발 환경 백업/복구
8. SSH 키 권한 = `.ssh` 폴더 700, 키 파일 600 (틀리면 인증 실패)
9. `authorized_keys` = 공개키 등록 파일, 파일명 정확히 맞춰야 함
10. `scp` = SSH 기반 파일 복사 (Windows ↔ 리눅스)
