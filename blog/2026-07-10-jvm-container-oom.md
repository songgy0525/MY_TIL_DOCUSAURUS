---
title: "[개발노트] 컨테이너 환경 JVM OOM — MaxRAMPercentage로 해결"
date: 2026-07-10
tags: [JVM, Docker, 운영]
---

> Prodio 프로젝트 · Oracle Cloud 1GB 서버

## 문제

1GB 메모리 서버에 Spring Boot 앱을 Docker로 띄웠는데 가끔 컨테이너가 죽었다. 로그를 보니 `java.lang.OutOfMemoryError: Metaspace`였다.

## 원인

JVM이 컨테이너 메모리 제한을 인식하지 못하고 호스트 메모리를 기준으로 힙을 잡는 문제다.

- 호스트: 1GB
- Docker 컨테이너 메모리 제한: 512MB
- JVM이 인식한 메모리: 1GB (잘못됨)
- JVM이 잡은 힙: ~256MB
- Metaspace + 힙 + 스택 + 오버헤드 합산 → 512MB 초과 → OOM Killer

## 해결

```dockerfile
ENTRYPOINT ["java",
  "-XX:MaxRAMPercentage=75.0",
  "-XX:InitialRAMPercentage=50.0",
  "-jar", "app.jar"]
```

`MaxRAMPercentage`는 JVM이 컨테이너 메모리 제한을 인식해서 그 비율만큼 힙을 잡는다.

- 컨테이너 제한 512MB × 75% = 약 384MB를 힙 최대로 설정
- Metaspace, 스택, GC 오버헤드가 나머지를 쓸 여유가 생김

## 새로 알게 된 것

**JDK 8u191+, JDK 10+부터 컨테이너 인식 기본 활성화**
- 예전 JVM은 `-XX:+UseContainerSupport`를 명시해야 했지만 최신 버전은 기본값
- 그래도 비율은 직접 잡아주는 게 안전 (기본값이 프로젝트 성격에 안 맞을 수 있음)

**`-Xmx` 고정값보다 `MaxRAMPercentage`가 낫다**
- `-Xmx512m`은 컨테이너 메모리를 바꾸면 Dockerfile도 같이 수정해야 함
- 비율 방식은 컨테이너 제한만 바꾸면 JVM도 따라감

**Metaspace OOM은 클래스 로딩이 원인**
- Metaspace는 힙 밖에 있어서 `-Xmx`로는 제어 불가
- `-XX:MaxMetaspaceSize=128m`으로 상한을 걸면 무한 증가 방지 가능 (단, 초과 시 OOM)

---
