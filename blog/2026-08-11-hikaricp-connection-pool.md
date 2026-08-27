---
title: "[개발노트] HikariCP 커넥션 풀 포화 — 병목이 쿼리가 아니었다"
date: 2026-08-11
tags: [HikariCP, 성능, 부하테스트]
---

> Noomit 프로젝트 · 20 VU 부하테스트

## 상황

BCrypt 격리 후 20 VU로 부하를 올렸다. 쿼리는 빠른데 Grafana에서 HikariCP 지표가 이상했다.

```
active:  10 / 10  (풀 한계 도달)
idle:    0
pending: 1 (잠깐 발생)
처리량:  ~28 req/s
실패율:  0%
```

응답 자체는 성공하는데 커넥션이 꽉 찼다.

## 분석

기본 `maximum-pool-size`는 10이다. 20개 VU가 동시에 요청하면 10개 커넥션으로 돌아가면서 처리해야 하는데, 각 요청이 커넥션을 잠깐씩 잡고 있는 동안 나머지는 대기한다.

지금은 쿼리가 빠르기 때문에 pending이 1 정도에서 그치지만, 쿼리가 조금이라도 느려지거나 VU를 더 올리면 pending이 급격히 쌓이기 시작한다.

## 새로 알게 된 것

**커넥션 풀 크기 = 동시 DB 접근 상한**
- `maximum-pool-size: 10`이면 동시에 10개 쿼리만 실행 가능
- 나머지는 커넥션이 풀릴 때까지 대기 → `connectionTimeout` 초과 시 예외

**무작정 늘리면 안 된다**
- 커넥션 하나가 DB 서버 메모리를 잡아먹음
- PostgreSQL 기준 커넥션당 ~5–10MB
- 1GB 서버에서 풀 사이즈 100으로 올리면 DB 서버가 OOM 위험

**HikariCP 공식 권장 공식**
```
pool_size = (core_count * 2) + effective_spindle_count
```
- SSD면 spindle count ≈ 1
- CPU 2코어 서버라면 5 정도가 적정

**병목이 쿼리인지 풀인지 구분이 중요**
- 쿼리 자체가 느리면 → 인덱스, N+1, 실행 계획 확인
- 쿼리는 빠른데 지연 → 커넥션 풀 또는 네트워크 레이턴시

---
