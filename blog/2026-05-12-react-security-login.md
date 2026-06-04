---
title: "[TIL] React-시큐리티 로그인 구현"
date: 2026-05-12
tags: [React, Security]
---
> 부트캠프 백엔드 과정 · 2026.05.12

## 1. 로그인 상태 관리 (sessionStorage)

```javascript
// 로그인 성공 후 사용자 정보 저장
sessionStorage.setItem('user', JSON.stringify(userData));

// 사용 시
const loggedInUser = JSON.parse(sessionStorage.getItem('user'));
const id = loggedInUser?.id;
const roles = loggedInUser?.role;

// 로그인 여부 확인 (Boolean 강제 변환)
const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('user'));
```

> `!!` = truthy → true, falsy → false 변환

**핵심 키워드:** `#props` `#useState` `#sessionStorage` `#JSON.parse` `#조건부 렌더링`

---

## 2. 로그아웃 처리 순서

```javascript
const handleLogout = async () => {
    await axios.post('/logout', {}, { withCredentials: true });  // 1. 서버 로그아웃
    sessionStorage.removeItem('user');   // 2. 로컬 정보 제거
    setIsLoggedIn(false);                // 3. 상태 변경 → Header 자동 갱신
    navigate('/');                       // 4. 홈으로 이동
};
```

> 서버 세션 기반 → 로그아웃 순서 중요, `async/await`로 완료 후 후속 처리

**핵심 키워드:** `#react-router-dom` `#BrowserRouter` `#useNavigate` `#withCredentials` `#logoutSuccessHandler`

---

## 3. 권한 기반 페이지 접근 제어

```javascript
// 프론트 라우터 레벨 보호
<Route path="/admin" element={isLoggedIn ? <Admin /> : <Navigate to="/" />} />
```

```javascript
// 서버에서 권한 확인 후 상태코드로 응답
useEffect(() => {
    setLoading(true);
    axios.get('/admin/page', { withCredentials: true })
        .then(res => {
            setData(res.data);
            setLoading(false);
        })
        .catch(err => {
            if (err.response.status === 403) {
                alert("접근 권한이 없습니다");
                navigate('/');
            }
        });
}, []);
```

| 상태코드 | 의미 | 시나리오 |
|--------|------|---------|
| 200 | 성공 | 권한 있음 |
| 401 | 인증 없음 | 비로그인 접근 |
| 403 | 접근 거부 | 로그인했지만 권한 불일치 |
| 404 | 없음 | 잘못된 경로 |
| 405 | 메서드 불허 | HTTP 메서드 틀림 |

**핵심 키워드:** `#403 Forbidden` `#401 Unauthorized` `#useEffect` `#Axios 에러처리` `#Navigate`

---

## 4. 403 JSON 응답 (AccessDeniedHandler)

```java
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res,
            AccessDeniedException e) throws IOException {
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType("application/json; charset=UTF-8");

        Map<String, Object> body = new HashMap<>();
        body.put("status", 403);
        body.put("message", "접근 권한이 없습니다");
        body.put("path", req.getRequestURI());
        body.put("timestamp", LocalDateTime.now().toString());

        new ObjectMapper().writeValue(res.getWriter(), body);
    }
}

// SecurityConfig에 등록
http.exceptionHandling(ex -> ex.accessDeniedHandler(customAccessDeniedHandler));
```

**핵심 키워드:** `#AccessDeniedHandler` `#exceptionHandling` `#ObjectMapper` `#application/json` `#SecurityConfig`

---

## 5. 새로고침 후 로그인 유지 (check-session)

```java
// 서버
@GetMapping("/check-session")
public ResponseEntity<?> checkSession(Authentication authentication) {
    if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
        return ResponseEntity.status(401).body("로그인 필요");
    }

    UserDetails user = (UserDetails) authentication.getPrincipal();
    return ResponseEntity.ok(Map.of(
        "username", user.getUsername(),
        "auth", user.getAuthorities()
    ));
}
```

```javascript
// React - 앱 최초 렌더링 시 세션 확인
useEffect(() => {
    axios.get('/check-session', { withCredentials: true })
        .then(res => {
            setIsLoggedIn(true);
            sessionStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch(() => {
            setIsLoggedIn(false);
            sessionStorage.removeItem('user');
        });
}, []);
```

> `AnonymousAuthenticationToken` 제외 = 비로그인 상태에서도 익명 객체 생성되기 때문

**핵심 키워드:** `#check-session` `#AnonymousAuthenticationToken` `#useEffect` `#withCredentials` `#로그인 유지`

---

## 6. 회원가입

```java
@PostMapping("/register")
public ResponseEntity<?> register(@RequestBody UserEntity user) {
    try {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userService.save(user);
        return ResponseEntity.ok("회원가입 성공");
    } catch (DataIntegrityViolationException e) {
        return ResponseEntity.badRequest().body("이미 존재하는 사용자명");
    } catch (Exception e) {
        return ResponseEntity.internalServerError().body("서버 오류");
    }
}
```

```javascript
// React - 비밀번호 확인 + 중복 클릭 방지
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPw) {
        alert("비밀번호가 일치하지 않습니다");
        return;
    }
    setIsSubmitting(true);
    try {
        await axios.post('/register', user);
        navigate('/');
    } finally {
        setIsSubmitting(false);
    }
};
```

**핵심 키워드:** `#PasswordEncoder` `#@RequestBody` `#@PrePersist` `#isSubmitting` `#회원가입`

---

## 오늘의 핵심 요약

1. `sessionStorage` = 브라우저 탭 단위 저장, 탭 닫으면 삭제
2. `JSON.stringify` / `JSON.parse` = 객체 ↔ 문자열 변환
3. `!!sessionStorage.getItem('user')` = 존재 여부 boolean 변환
4. 로그아웃 순서 = 서버 → 로컬 저장소 → 상태 변경 → 이동
5. `AnonymousAuthenticationToken` = 비로그인 상태에도 생성 → 명시적 제외 필요
6. `AccessDeniedHandler` = 403 응답 커스터마이징
7. `ObjectMapper` = Java 객체 → JSON 문자열 직렬화
8. 프론트 라우터 보호 + 서버 권한 확인 = 이중 보호
9. `isSubmitting` = 중복 제출 방지 패턴
10. `@PrePersist` = 기본 role 자동 세팅
