---
title: "[개발노트] Docker 멀티스테이지 빌드 — 이미지 크기 줄이기"
date: 2026-06-28
tags: [Docker, CI/CD]
---

> 배포 이미지 최적화

## 문제

Spring Boot 앱을 Docker로 패키징했는데 이미지 크기가 800MB가 넘었다. JDK 전체가 다 들어가기 때문이었다.

## 해결: 멀티스테이지 빌드

```dockerfile
# 1단계: 빌드 (JDK 필요)
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY . .
RUN ./mvnw -B package -DskipTests

# 2단계: 실행 (JRE만 필요)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
```

빌드 스테이지에서 나온 jar만 실행 스테이지로 복사한다. JDK 없이 JRE만 쓰기 때문에 이미지 크기가 크게 줄어든다.

## 새로 알게 된 것

**JDK vs JRE**
- JDK: 컴파일러 포함 (개발용)
- JRE: 런타임만 (실행용)
- 운영 컨테이너에 JDK가 들어갈 이유가 없다

**레이어 캐시를 활용하면 빌드가 빨라진다**
```dockerfile
# 의존성 먼저 복사 (캐시 활용)
COPY pom.xml .
RUN mvn dependency:resolve

# 소스 나중에 (소스 변경 시만 재빌드)
COPY src ./src
RUN mvn package -DskipTests
```
- 소스가 바뀌어도 의존성 레이어는 캐시 유지 → 빌드 시간 단축

**`.dockerignore` 꼭 설정하기**
```
target/
.git/
*.md
node_modules/
```
- 없으면 `COPY . .` 할 때 불필요한 파일이 다 들어감

---
