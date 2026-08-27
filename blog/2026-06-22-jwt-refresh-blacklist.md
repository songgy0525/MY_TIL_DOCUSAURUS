---
title: "[개발노트] JWT Refresh 토큰 + Redis 블랙리스트 로그아웃 구현"
date: 2026-06-22
tags: [JWT, Redis, 인증]
---

> ITMAL 프로젝트 · JWT 인증 전체 구현

## 구현한 것

Access Token(15분) + Refresh Token(7일) 구조로 설계하고, 로그아웃 시 Access Token을 Redis에 블랙리스트로 저장해 탈취된 토큰 재사용을 막았다.

```java
// 로그아웃 시 남은 만료 시간만큼 블랙리스트 등록
public void logout(String accessToken) {
    long expiration = jwtProvider.getExpiration(accessToken);
    redisTemplate.opsForValue()
        .set("blacklist:" + accessToken, "logout", expiration, TimeUnit.MILLISECONDS);
}

// 필터에서 블랙리스트 체크
if (redisTemplate.hasKey("blacklist:" + token)) {
    throw new InvalidTokenException("로그아웃된 토큰입니다.");
}
```

## 새로 알게 된 것

**JWT는 서버가 무효화할 수 없다 — 그래서 블랙리스트가 필요**
- stateless가 장점이지만, 로그아웃을 구현하려면 결국 서버 상태(Redis)가 필요해진다
- 만료 시간만큼만 보관하면 Redis 용량 걱정 없음

**Refresh Token은 DB에 저장해야 한다**
- Refresh는 탈취 시 장기간 악용 가능하기 때문에 서버에서 관리해야 `reuse detection` 구현 가능
- Access는 짧으니까 Redis 블랙리스트, Refresh는 DB 저장으로 역할 분리

**`@RedisHash`보다 `opsForValue()`가 TTL 관리에 편하다**
- 엔티티 방식은 TTL 세밀 제어가 번거롭고, 단순 key-value면 `opsForValue`가 직관적

---
