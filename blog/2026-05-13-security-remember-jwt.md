---
title: "[TIL] 스프링 시큐리티 리멤버미, 중복로그인, JWT 개요"
date: 2026-05-13
tags: [Security, JWT]
---
> 부트캠프 백엔드 과정 · 2026.05.13

## 1. OWASP Top 10 핵심 연결

| 범주 | 대응 방향 |
|------|---------|
| 접근제어 오류 | `requestMatcher` 권한 제한, 401/403 구분 응답 |
| SQL Injection | `PreparedStatement` / ORM 파라미터 바인딩 |
| XSS | 템플릿 이스케이프 (Thymeleaf `th:text`), 입력 치환 |
| 암호화 오류 | `BCryptPasswordEncoder` 사용 (MD5/SHA1 X) |
| 보안 로깅 | 인증 실패/비정상 접근 이벤트 기록 |

---

## 2. 리멤버미 (쿠키 기반 로그인 유지)

```java
http.rememberMe(rm -> rm
    .key("remember")
    .rememberMeParameter("remember-me")        // 프론트 FormData 키
    .tokenValiditySeconds(180)                 // 유효 시간 (초)
    .userDetailsService(loginUserService)      // 권한 재로딩 필수
    .rememberMeCookieName("remember-me-cookie")
);
```

```javascript
// 프론트 - 체크박스 선택 시만 append
if (rememberMe) {
    formData.append("remember-me", "on");
}
```

| 구성 요소 | 핵심 포인트 |
|---------|-----------|
| 체크박스 name | `rememberMeParameter`와 반드시 일치 |
| 권한 재로딩 | `userDetailsService` 주입 필수 (쿠키만으론 권한 모름) |
| 로그아웃 | `JSESSIONID` + `remember-me-cookie` 모두 삭제 |

> `withCredentials: true` = 쿠키 포함 요청 필수

**핵심 키워드:** `#RememberMe` `#쿠키` `#withCredentials` `#UserDetailsService` `#로그아웃`

---

## 3. 중복 로그인 방지 (세션 동시성 제어)

```java
http.sessionManagement(session -> session
    .maximumSessions(1)                           // 최대 동시 세션 수
    .maxSessionsPreventsLogin(false)              // 신규 로그인 허용 + 기존 세션 만료
    .expiredSessionStrategy(event -> {
        HttpServletResponse res = event.getResponse();
        res.setStatus(403);
        res.setContentType("application/json; charset=UTF-8");
        res.getWriter().println("{\"message\": \"다른 곳에서 로그인되었습니다\"}");
    })
);
```

```javascript
// 프론트 - 10초마다 세션 확인
setInterval(() => {
    axios.get('/check-session', { withCredentials: true })
        .catch(err => {
            if (err.response.status === 403) {
                alert("다른 곳에서 로그인되어 로그아웃됩니다");
                onLogout();
            }
        });
}, 10000);
```

```java
// 세션 체크 API - getSession(false) 중요!
HttpSession session = request.getSession(false);  // 없으면 새로 만들지 않음
if (session == null) {
    return ResponseEntity.status(403).body("세션 없음");
}
```

> `getSession(true)` = 세션 없으면 새로 생성 → 정책 흔들림 위험

**핵심 키워드:** `#sessionManagement` `#maximumSessions` `#expiredSessionStrategy` `#getSession(false)` `#폴링`

---

## 4. 커스텀 UserDetails (프린서플 확장)

```java
// User 클래스 상속 → 도메인 정보 추가
public class CustomUserDetails extends User implements Serializable {

    private static final long serialVersionUID = 1L;

    private final UserEntity userEntity;  // 추가 도메인 정보

    public CustomUserDetails(UserEntity user) {
        // super() 반드시 호출
        super(user.getUsername(), user.getPassword(),
                Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + user.getRole())));
        this.userEntity = user;
    }

    public UserEntity getUserEntity() {
        return userEntity;
    }
}
```

> `Serializable` = 세션 저장 시 직렬화 필수
> `super(username, password, authorities)` = 시큐리티 인증 골격 유지

**핵심 키워드:** `#principal` `#UserDetails` `#Serializable` `#serialVersionUID` `#SimpleGrantedAuthority`

---

## 5. JWT 개념 정리

```
JWT ≠ 보안 프레임워크
JWT = 인증 정보를 담는 "토큰 규격"

구조: header.payload.signature
      알고리즘  클레임    서명값
```

| 영역 | 역할 | 예시 |
|------|------|------|
| Header | 알고리즘/타입 정보 | `alg: HS256`, `typ: JWT` |
| Payload | 클레임 (사용자 정보 등) | `sub`, `iat`, `exp` |
| Signature | 위변조 방지 서명 | 시크릿 키 기반 |

### 세션 기반 vs JWT 비교

| 구분 | 세션 기반 | JWT |
|------|---------|-----|
| 상태 | Stateful (서버에 저장) | Stateless (클라이언트에 저장) |
| 확장성 | 서버 간 세션 공유 필요 | 각 서버 독립 검증 가능 |
| 만료 처리 | 서버에서 즉시 무효화 | 토큰 만료까지 대기 |

**핵심 키워드:** `#JWT` `#클레임` `#시크릿 키` `#Authentication` `#Security Filter`

---

## 오늘의 핵심 요약

1. 리멤버미 = 쿠키 기반 재인증, 권한 재로딩을 위해 `userDetailsService` 주입 필수
2. 로그아웃 시 `JSESSIONID` + 리멤버미 쿠키 모두 삭제
3. `maximumSessions(1)` = 동시 1개 세션만 허용
4. `getSession(false)` = 세션 없으면 새로 만들지 않음 (체크에서 중요)
5. 10초 폴링 = 세션 만료 감지용, 실무는 TanStack Query로 개선 가능
6. 커스텀 UserDetails = `extends User` + 도메인 정보 필드 추가
7. `Serializable` + `serialVersionUID` = 세션 직렬화 안정화
8. JWT = 토큰 규격, 스프링 시큐리티는 이를 검증해 `Authentication` 생성
9. `SimpleGrantedAuthority("ROLE_" + role)` = 권한 객체 생성
10. XSS = Thymeleaf `th:text` 이스케이프 or 입력값 치환으로 방어
