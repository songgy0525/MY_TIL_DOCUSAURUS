---
title: "[개발노트] Toss PG 연동 — 결제 상태 모델 설계와 트랜잭션 경계"
date: 2026-07-08
tags: [결제, Spring Boot, 트랜잭션]
---

> CWWW 프로젝트 · Toss PG 결제 도메인

## 구현한 것

Toss Payments API를 연동하면서 결제 흐름을 3단계 상태 모델로 설계했다.

```
PENDING → CONFIRMING → PAID
                    ↘ FAILED
PAID → CANCELING → CANCELED
```

`CONFIRMING`, `CANCELING`은 중간 상태다. PG API 호출이 진행 중임을 나타내고, 중복 요청이 와도 이 상태면 튕겨낸다.

```java
// PG 호출 전 상태 전이 (트랜잭션 커밋)
payment.transitionTo(PaymentStatus.CONFIRMING);
paymentRepository.save(payment);
entityManager.flush(); // 즉시 DB 반영

// 트랜잭션 밖에서 PG 호출
TossConfirmResponse response = tossClient.confirm(request); // 외부 호출

// 결과에 따라 최종 상태 전이
payment.transitionTo(response.isSuccess() ? PAID : FAILED);
```

## 새로 알게 된 것

**PG API 호출을 트랜잭션 안에 넣으면 안 된다**
- PG 응답이 늦을수록 DB 커넥션을 잡고 있는 시간이 길어짐
- 타임아웃 나면 롤백인지 성공인지 알 수 없는 상태가 됨
- 외부 호출은 반드시 트랜잭션 밖으로

**Toss 4xx vs 5xx 예외 분기가 중요하다**
- 4xx: 명시적 거절 (카드 한도 초과 등) → 재시도해봤자 의미 없음, FAILED 확정
- 5xx: 불확실 (Toss 서버 장애) → 재시도 가능, CONFIRMING 유지 후 스케줄러가 재처리
- 이걸 구분 안 하면 이미 실패한 결제를 계속 재시도하거나, 성공한 결제를 실패로 처리할 수 있음

**멱등성 키로 중복 확인 요청을 막는다**
- `ON CONFLICT DO NOTHING`으로 DB 레벨에서 중복 삽입 방지
- 앱 레벨 + DB 레벨 이중 방어가 안전

---
