---
title: "[개발노트] k6 부하테스트 — BCrypt 비용이 측정을 망치고 있었다"
date: 2026-08-04
tags: [k6, 성능, 부하테스트]
---

> Noomit 프로젝트 · Repair 도메인 부하테스트

## 상황

수리 케이스 조회 API(`GET /api/repair-cases/my`)를 k6로 부하테스트했다. 5 VU인데도 목록 p95가 525ms, max는 14초가 나왔다. CPU는 100%로 치솟았다.

"조회 쿼리가 느린가?" 싶어서 실행 계획을 봤는데 문제없었다.

## 원인

k6 스크립트를 보니 매 iteration마다 CSRF → **로그인** → 목록 조회 → 상세 조회 순으로 실행하고 있었다.

로그인할 때마다 서버에서 BCrypt 검증이 실행된다. BCrypt는 CPU 집약적 연산이라, VU 5개가 동시에 로그인하면 CPU가 포화된다. 조회 자체는 빠른데 BCrypt가 병목을 만들고 있었던 것.

## 수정: `setup()`으로 로그인 격리

```typescript
export function setup(): SetupData {
    // 로그인은 테스트 시작 전 1회만
    const loginRes = http.post(`${BASE_URL}/auth/login`, ...);
    const sessionCookie = extractCookie(loginRes);
    return { sessionCookie };
}

export default function (data: SetupData): void {
    // VU는 세션 재사용, 조회만 반복
    http.get(`${BASE_URL}/api/repair-cases/my`, {
        headers: { Cookie: data.sessionCookie }
    });
}
```

재측정 결과: 목록 p95 **51ms** (525ms → 51ms, 약 10배)

## 새로 알게 된 것

**측정 노이즈를 먼저 제거해야 병목이 보인다**
- 테스트하려는 대상(조회 API)과 관련 없는 비용(BCrypt)이 섞이면 잘못된 방향으로 최적화하게 됨
- `setup()`은 VU 시작 전 1회 실행 — 인증처럼 공통 준비 작업은 여기서 처리

**k6 `stages`로 부하를 단계적으로 올려야 한다**
```typescript
stages: [
    { duration: '30s', target: 5 },   // 램프업
    { duration: '1m',  target: 5 },   // 측정 구간
    { duration: '30s', target: 0 },   // 램프다운
]
```
- 측정 구간에서만 지표를 봐야 의미 있는 수치가 나옴

---
