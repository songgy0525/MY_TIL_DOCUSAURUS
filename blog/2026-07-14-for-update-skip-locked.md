---
title: "[개발노트] FOR UPDATE SKIP LOCKED — 스케줄러 중복 실행 방지"
date: 2026-07-14
tags: [PostgreSQL, JPA, 동시성]
---

> CWWW 프로젝트 · 결제 보정 스케줄러 구현

## 문제 상황

결제 보정 스케줄러를 구현했는데, 서버가 여러 인스턴스로 뜨면 동시에 같은 미확정 결제를 가져가서 중복 처리할 위험이 있었다.

## 해결: FOR UPDATE SKIP LOCKED

```java
@Query("""
    SELECT p FROM Payment p
    WHERE p.status IN ('CONFIRMING', 'CANCELING')
      AND p.updatedAt < :threshold
    ORDER BY p.updatedAt ASC
    LIMIT :limit
""", nativeQuery = false)
@Lock(LockModeType.PESSIMISTIC_WRITE)
@QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
List<Payment> findStuckPaymentsForUpdate(...);
```

`-2`는 `SKIP LOCKED`를 의미한다. 다른 트랜잭션이 이미 잡고 있는 row는 건너뛴다.

## 새로 알게 된 것

**SKIP LOCKED는 "줄 서지 말고 다음 거 가져가"**
- `FOR UPDATE`만 쓰면 잠긴 row가 풀릴 때까지 대기 → 스케줄러가 몰리면 병목
- `SKIP LOCKED`는 잠긴 row를 그냥 건너뛰고 다음 미처리 건으로 이동 → 자연스러운 분산 처리

**소프트 락(처리 중 플래그)을 같이 써야 완벽하다**
- `SKIP LOCKED`는 트랜잭션 범위 내 보호만 해줌
- 트랜잭션이 길거나 락이 풀린 직후에 다른 인스턴스가 잡을 수 있음
- `processing_at` 컬럼으로 "지금 처리 중" 상태를 앱 레벨에서도 관리하면 더 안전

**지수 백오프 재시도**
- 외부 장애 시 즉시 재시도하면 PG 서버에 부담
- `retryCount`에 따라 `2^n * baseDelay`로 대기 시간 늘려서 재시도

---
