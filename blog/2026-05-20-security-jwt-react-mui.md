---
title: "[TIL] 스프링 시큐리티 JWT, React 연동, MUI"
date: 2026-05-20
tags: [Security, JWT, React, MUI]
---
> 부트캠프 백엔드 과정 · 2026.05.20

## 1. AuthenticationManager + PasswordEncoder 빈 등록

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/login", "/register").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(withDefaults())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

### 인증 흐름

```
요청 → Security Filter
         ↓
AuthenticationManager
         ↓
Provider → UserDetailsService → DB 조회
         ↓
PasswordEncoder.matches() → 비밀번호 비교
         ↓
성공 → SecurityContextHolder에 Authentication 저장
```

**핵심 키워드:** `#AuthenticationManager` `#UserDetailsService` `#PasswordEncoder` `#BCryptPasswordEncoder` `#UsernamePasswordAuthenticationToken`

---

## 2. JWT 로그인 + 헤더 응답

```java
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody AccountCredentials creds) {
    try {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        creds.getUsername(), creds.getPassword()));

        String token = jwtService.generateToken(auth.getName());

        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .header("Access-Control-Expose-Headers", "Authorization")  // 프론트에서 읽으려면 필수
                .build();

    } catch (BadCredentialsException e) {
        return ResponseEntity.status(401).body("인증 실패");
    }
}
```

> `Access-Control-Expose-Headers` = 브라우저에서 커스텀 헤더 읽을 수 있게 허용

---

## 3. JWT 필터 + Stateless 완성

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String header = req.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            try {
                String username = jwtService.extractUserName(token);

                if (username != null &&
                        SecurityContextHolder.getContext().getAuthentication() == null) {
                    UserDetails user = userDetailsService.loadUserByUsername(username);

                    if (jwtService.validateToken(token, user)) {
                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(
                                        user, null, user.getAuthorities());
                        authToken.setDetails(
                                new WebAuthenticationDetailsSource().buildDetails(req));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            } catch (Exception e) {
                // 토큰 유효하지 않음 → 인증 객체 미설정 → 이후 필터에서 401 처리
            }
        }

        chain.doFilter(req, res);
    }
}
```

---

## 4. React + fetch로 Spring Data REST 연동

```javascript
function CarList() {
    const [cars, setCars] = useState([]);

    useEffect(() => {
        fetch('http://localhost:8080/api/vehicles')
            .then(res => res.json())
            .then(data => {
                // Spring Data REST(HAL) 응답 구조!
                // data._embedded.vehicles 에 실제 리스트
                setCars(data._embedded.vehicles);
            });
    }, []);

    return (
        <ul>
            {cars.map((car, idx) => (
                <li key={idx}>{car.brand} - {car.model}</li>
            ))}
        </ul>
    );
}
```

> Spring Data REST 응답 = `data._embedded.리소스명` 확인 필수!

---

## 5. CORS 설정

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.addAllowedOrigin("http://localhost:5173");
    config.addAllowedMethod("*");
    config.addAllowedHeader("*");
    config.setAllowCredentials(true);
    config.addExposedHeader("Authorization");   // 토큰 헤더 노출
    config.setMaxAge(3600L);                    // preflight 캐시

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

**핵심 키워드:** `#스프링 시큐리티` `#JWT` `#리액트` `#CORS` `#필터`

---

## 6. MUI DataGrid

```bash
# 버전 맞춰서 설치 (--force X)
npm install @mui/material@7 @mui/x-data-grid @emotion/react @emotion/styled
```

```javascript
import { DataGrid } from '@mui/x-data-grid';

const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'brand', headerName: '브랜드', width: 150 },
    {
        field: 'actions',
        headerName: '관리',
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Button onClick={() => handleDelete(params.row)}>삭제</Button>
        )
    }
];

<DataGrid
    rows={cars}
    columns={columns}
    getRowId={(row) => row._links.self.href}   // 고유 식별자
/>
```

> `peer dependency` 충돌 → `--force` 대신 루트 패키지 버전 맞추기!

**핵심 키워드:** `#peer dependency` `#--force` `#@버전지정` `#MUI DataGrid` `#rows/columns`

---

## 오늘의 핵심 요약

1. `AuthenticationManager` = 인증 중심 컴포넌트, 빈으로 명시 등록 필요
2. `Access-Control-Expose-Headers` = 프론트에서 커스텀 헤더 읽으려면 필수
3. `SessionCreationPolicy.STATELESS` = 서버 세션 미생성 → JWT 방식에 필수
4. `addFilterBefore` = JWT 필터를 인증 필터 앞에 등록
5. Spring Data REST 응답 = `data._embedded.리소스명` 구조
6. `config.addExposedHeader("Authorization")` = CORS에서 토큰 헤더 노출
7. `maxAge(3600)` = preflight 캐시 → 반복 OPTIONS 요청 감소
8. MUI 버전 충돌 = `@버전지정`으로 호환 버전 명시 (--force X)
9. `getRowId` = DataGrid에서 각 행 고유 식별자 지정
10. `sortable: false, filterable: false` = 불필요한 컬럼 컨트롤 제거
