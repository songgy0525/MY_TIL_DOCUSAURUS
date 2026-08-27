---
title: "[개발노트] GitHub OAuth2 비공개 이메일 처리 — 재현하고 수정한 과정"
date: 2026-06-26
tags: [OAuth2, Spring Security, 버그수정]
---

> ITMAL 프로젝트 · GitHub 소셜 로그인 구현 중

## 문제 상황

GitHub OAuth2 로그인 구현 후 테스트하다가 특정 계정에서 이메일이 `null`로 넘어오는 걸 발견했다.

GitHub는 사용자가 이메일을 비공개로 설정하면 `/user` API 응답에 `email` 필드가 null이다. GitHub 사용자의 상당수가 이 설정을 켜두기 때문에 처리 안 하면 NPE 또는 회원가입 실패가 난다.

## 해결 방법

`/user/emails` API를 추가 호출해서 `primary: true`, `verified: true`인 이메일을 폴백으로 사용했다.

```java
private String resolveEmail(OAuth2User oAuth2User, String accessToken) {
    String email = oAuth2User.getAttribute("email");
    if (email != null) return email;

    // 비공개 이메일 폴백
    List<Map<String, Object>> emails = githubApiClient.getUserEmails(accessToken);
    return emails.stream()
        .filter(e -> Boolean.TRUE.equals(e.get("primary"))
                  && Boolean.TRUE.equals(e.get("verified")))
        .map(e -> (String) e.get("email"))
        .findFirst()
        .orElseThrow(() -> new OAuthException("GitHub 이메일을 가져올 수 없습니다."));
}
```

## 새로 알게 된 것

**OAuth2 Provider마다 응답 스펙이 다르다**
- Google은 OIDC라 `email`이 항상 있음
- GitHub는 REST 기반이라 `email` null 케이스를 직접 처리해야 함
- Provider별 예외 케이스를 미리 정리하지 않으면 실 사용자가 겪고 나서야 알게 됨

**`OAuthUserProcessor`로 provider 공통 로직 분리**
- if-else로 provider 분기하면 금방 복잡해짐
- `Map<String, OAuthUserProcessor>` 전략 패턴으로 분리하면 확장에 열려있음

---
