---
title: "[개발노트] SessionRegistry로 권한 변경 즉시 세션 무효화 구현"
date: 2026-08-18
tags: [Spring Security, 세션, 보안]
---

> Prodio 프로젝트 · 세션 보안

## 문제

관리자가 특정 사용자의 권한을 변경했는데, 그 사용자가 이미 로그인 중이면 이전 권한으로 계속 접근이 가능했다. 재로그인 전까지 보안 정책이 적용되지 않는 구멍이었다.

## 해결: SessionRegistry + expireNow()

Spring Security의 `SessionRegistry`를 활용해 특정 사용자의 활성 세션을 찾아 즉시 만료시켰다.

```java
public class SessionRegistryInvalidator implements UserSessionInvalidator {

    private final SessionRegistry sessionRegistry;

    @Override
    public void invalidateSessionsOf(long userId) {
        sessionRegistry.getAllPrincipals().stream()
            .filter(p -> p instanceof UserDetails ud
                      && ud.getUsername().equals(String.valueOf(userId)))
            .flatMap(p -> sessionRegistry.getAllSessions(p, false).stream())
            .forEach(SessionInformation::expireNow);
    }
}
```

`expireNow()`를 호출하면 해당 세션은 다음 요청 시 `expiredSessionStrategy`에 의해 처리되어 401이 내려간다.

## 삽질한 부분

처음에 관리자가 **본인의 권한을 바꿀 때도** 본인 세션을 무효화하는 버그가 있었다.

```java
// 수정 전
sessionInvalidator.invalidateSessionsOf(targetUserId);

// 수정 후
if (targetUserId != actorUserId) {
    sessionInvalidator.invalidateSessionsOf(targetUserId);
}
```

관리자가 자기 자신의 권한을 바꾸면 즉시 로그아웃되는 문제. 엣지케이스를 테스트로 잡아냈다.

## 새로 알게 된 것

**`SessionRegistry`는 현재 활성 세션 목록을 메모리에서 관리한다**
- `HttpSessionEventPublisher`를 Bean으로 등록해야 세션 생성/소멸 이벤트가 Registry에 반영됨
- 멀티 인스턴스 환경에서는 Redis 기반 세션 저장소가 필요 (Spring Session + Redis)

**`expireNow()`는 즉시 세션을 끊지 않는다**
- 만료 마크만 찍고, 실제 차단은 **다음 요청** 시 발생
- 따라서 현재 처리 중인 요청은 영향 없음 — 의도된 동작

**포트-어댑터 패턴으로 Spring Security 의존 격리**
- `UserSessionInvalidator` 인터페이스를 도메인에 두고, `SessionRegistryInvalidator` 구현체를 인프라에 분리
- 나중에 Redis 세션으로 교체해도 도메인 코드 수정 없음

---
