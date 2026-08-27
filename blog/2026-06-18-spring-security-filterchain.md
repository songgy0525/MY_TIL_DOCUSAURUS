---
title: "[개발노트] Spring Security FilterChain 직접 설계하며 배운 것들"
date: 2026-06-18
tags: [Spring Security, JWT, 인증]
---

> ITMAL 프로젝트 · 인증 도메인 설계 시작

## 구현한 것

Spring Security를 처음부터 직접 설계하면서 `SecurityFilterChain`을 Bean으로 등록하는 방식으로 전환했다.

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        )
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
}
```

## 새로 알게 된 것

**필터 체인 순서가 생각보다 중요하다**
- `addFilterBefore`로 JWT 필터를 `UsernamePasswordAuthenticationFilter` 앞에 배치하지 않으면 기본 폼 로그인이 먼저 가로챈다
- 필터가 어디 끼워지냐에 따라 인증 흐름이 완전히 달라짐

**`SecurityContext`는 요청 스코프**
- `SecurityContextHolder.getContext().setAuthentication(auth)`로 세팅해야 이후 필터에서 인증된 것으로 인식
- 요청이 끝나면 자동으로 클리어됨 (`SecurityContextPersistenceFilter` 역할)

**`@EnableMethodSecurity` 없으면 `@PreAuthorize` 안 먹힌다**
- URL 레벨 인가와 메서드 레벨 인가는 별도 설정이 필요

---
