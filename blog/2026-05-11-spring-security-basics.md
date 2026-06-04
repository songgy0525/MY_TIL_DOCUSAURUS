---
title: "[TIL] 스프링 시큐리티 기초, DB 인증"
date: 2026-05-11
tags: [SpringBoot, Security]
---
> 부트캠프 백엔드 과정 · 2026.05.11

## 1. 스프링 시큐리티 개요

### 핵심 전제

```
모든 요청 → 시큐리티 필터 먼저 통과 → 컨트롤러 진입
→ @ControllerAdvice로 인증/인가 예외 잡기 불가
```

| 구성 요소 | 역할 |
|---------|------|
| Security Filter Chain | 컨트롤러 전 보안 처리 |
| `UserDetailsService` | DB에서 사용자 조회 |
| `UserDetails` | 인증 주체 정보 (username/password/authorities) |
| `Authentication` | 인증 결과 (인증여부 + 권한 + principal) |

> 의존성 추가만으로 → 기본 로그인 페이지 + 임시 비밀번호 자동 활성화

**핵심 키워드:** `#Authentication` `#Authorization` `#Security Filter Chain` `#기본 로그인 페이지` `#암호화`

---

## 2. JPA 기반 사용자 엔티티

```java
@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;  // 로그인 식별자

    @Column(nullable = false)
    private String password;  // BCrypt 해시로 저장

    @Column(nullable = false)
    private String role;      // ROLE_USER, ROLE_ADMIN 등

    @PrePersist  // 저장 전 자동 실행
    public void setDefaultRole() {
        if (this.role == null) this.role = "ROLE_USER";
    }
}
```

> `unique=true` = 보조 식별자 (중복 로그인 ID 방지)

---

## 3. BCrypt 암호화

```java
// 같은 입력도 매번 다른 해시 (솔트 포함) → 레인보우 테이블 공격 방어
BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
String hash = encoder.encode("1234");     // 해시 생성
boolean match = encoder.matches("1234", hash);  // 비교
```

```java
// 빈으로 등록
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

> 개발자가 직접 비교 X → 시큐리티 내부 `PasswordEncoder.matches()`가 자동 처리

---

## 4. React 로그인 폼 + FormData 전송

```javascript
// 스프링 시큐리티 기본 필드명 = username, password
// 다른 이름 보내면 인증 필터가 값을 못 읽음!
const formData = new FormData();
formData.append("username", user.username);
formData.append("password", user.password);

axios.post('/login', formData, {
    withCredentials: true  // 쿠키 포함 요청
});
```

**핵심 키워드:** `#React useState` `#FormData` `#username/password` `#Axios` `#비동기 로그인`

---

## 5. SecurityFilterChain 설정

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/login", "/register").permitAll()
            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginProcessingUrl("/login")
            .defaultSuccessUrl("/board")
        )
        .logout(logout -> logout
            .invalidateHttpSession(true)
            .deleteCookies("JSESSIONID")
        );
    return http.build();
}
```

### CORS 설정

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("http://localhost:5173"));
    config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

> 컨트롤러의 `@CrossOrigin`만으로는 시큐리티 필터 단계에서 막힘 → SecurityFilterChain에서 CORS 설정 필수

**핵심 키워드:** `#SecurityFilterChain` `#CSRF` `#CORS` `#JSESSIONID` `#logout`

---

## 6. DB 기반 인증: UserDetailsService

```java
@Service
@RequiredArgsConstructor
public class LoginUserService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("사용자 없음: " + username));

        return User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .roles(user.getRole())  // ROLE_ 접두사 자동 추가
                .build();
    }
}
```

> `loadUserByUsername` = 사용자 조회만, 비밀번호 비교는 시큐리티 내부가 담당

---

## 7. 로그인 실패 처리: AuthenticationFailureHandler

```java
@Component
public class CustomFailureHandler implements AuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest req,
            HttpServletResponse res, AuthenticationException e) throws IOException {
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);  // 401
        res.setContentType("application/json; charset=UTF-8");
        res.getWriter().println("{\"message\": \"아이디/비밀번호 오류\"}");
    }
}
```

```javascript
// 프론트에서 401 처리
axios.post('/login', formData)
    .catch(err => {
        if (err.response.status === 401) {
            alert("아이디/비밀번호를 확인하세요");
        }
    });
```

**핵심 키워드:** `#AuthenticationFailureHandler` `#401 Unauthorized` `#JSON 응답` `#Axios error.response` `#필터 계층`

---

## 오늘의 핵심 요약

1. 시큐리티 = 컨트롤러 전에 필터에서 처리 → `@ControllerAdvice`로 못 잡음
2. `PasswordEncoder` = 개발자가 직접 비교 X, 시큐리티 내부에서 자동 처리
3. 폼 필드명 반드시 `username`, `password` (시큐리티 기본값)
4. `CSRF disable` + `CORS` = REST API + SPA 기본 구성
5. `permitAll()` = 인증 없이 접근 가능 경로 지정
6. `UserDetailsService` = 사용자 조회 책임, 비밀번호 비교는 Provider가 담당
7. `AuthenticationFailureHandler` = 로그인 실패 시 JSON 응답 커스터마이징
8. `withCredentials: true` = 쿠키 포함 요청 필수
9. `@PrePersist` = 저장 전 기본값 자동 세팅
10. `deleteCookies("JSESSIONID")` = 로그아웃 시 세션 쿠키 삭제
