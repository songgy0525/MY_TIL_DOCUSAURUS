---
title: "[개발노트] Virtual Threads — 왜 지금 주목받는가"
date: 2026-09-01
tags: [Java, Virtual Threads, 동시성, Spring Boot]
---

> Spring Boot 4.x 흐름 공부 중

## 기존 방식의 한계

Spring MVC의 기본 모델은 **thread-per-request** — 요청 하나당 OS 스레드 하나를 점유한다.

OS 스레드는 생성 비용이 크고(스택 ~1MB), 수천 개 이상 만들면 메모리와 컨텍스트 스위칭 비용이 감당이 안 된다. 그래서 스레드 풀 크기에 한계가 생기고, I/O 대기 중에도 스레드를 붙잡고 있어서 낭비가 심하다.

이 문제를 해결하려고 나온 게 WebFlux(Reactor)인데, 비동기/논블로킹 코드는 콜백 지옥이나 디버깅 난이도가 높아서 러닝커브가 존재했다.

## Virtual Threads (Project Loom)

JDK 21에서 정식 출시. JVM이 관리하는 경량 스레드로, OS 스레드 위에 마운트/언마운트되는 방식으로 동작한다.

```
OS Thread (carrier thread)
    └── Virtual Thread A (I/O 대기 중 → 언마운트)
    └── Virtual Thread B (실행 중)
    └── Virtual Thread C (대기 중)
```

- 생성 비용이 극도로 낮아서 수백만 개 생성 가능
- I/O 대기 시 OS 스레드를 블로킹하지 않고 다른 virtual thread에게 양보
- 기존 블로킹 코드 그대로 써도 됨 — WebFlux처럼 코드를 뒤집지 않아도 됨

## Spring Boot에서 활성화

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true
```

한 줄이면 Tomcat과 스케줄러가 virtual thread를 사용한다.

## 주의점: Pinning 문제

`synchronized` 블록 안에서 I/O가 발생하면 virtual thread가 carrier thread에 **고정(pin)** 된다. 이 경우 기존 OS 스레드 방식과 동일한 블로킹이 발생한다.

```java
// 이러면 pinning 발생
synchronized (lock) {
    someRepository.findAll(); // DB I/O
}

// ReentrantLock으로 교체
lock.lock();
try {
    someRepository.findAll();
} finally {
    lock.unlock();
}
```

## 내 경험과 연결

Noomit k6 테스트에서 HikariCP active 10/10, pending 1 상태로 병목을 발견했다. Virtual threads로 동시성을 높여도 **DB 커넥션 풀은 여전히 병목**이 된다 — 커넥션이 10개면 결국 같은 한계에 부딪힌다.

Virtual threads는 스레드 병목을 없애주지만, 커넥션 풀 튜닝은 별개의 문제다. 병목 원인을 정확히 구분하는 게 중요하다.

---
