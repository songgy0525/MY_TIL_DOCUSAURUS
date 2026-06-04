---
title: "[TIL] 스프링 OAuth2 연동, JPA 실전"
date: 2026-05-15
tags: [OAuth2, JPA]
---
> 부트캠프 백엔드 과정 · 2026.05.15

## 1. 네이버 OAuth2 로그인 설정

```properties
# application.properties
spring.security.oauth2.client.registration.naver.client-id=클라이언트ID
spring.security.oauth2.client.registration.naver.client-secret=시크릿
spring.security.oauth2.client.registration.naver.redirect-uri={baseUrl}/login/oauth2/code/{registrationId}
spring.security.oauth2.client.registration.naver.authorization-grant-type=authorization_code
spring.security.oauth2.client.registration.naver.scope=name,email,profile_image

spring.security.oauth2.client.provider.naver.authorization-uri=https://nid.naver.com/oauth2.0/authorize
spring.security.oauth2.client.provider.naver.token-uri=https://nid.naver.com/oauth2.0/token
spring.security.oauth2.client.provider.naver.user-info-uri=https://openapi.naver.com/v1/nid/me
spring.security.oauth2.client.provider.naver.user-name-attribute=response
```

```html
<!-- Thymeleaf 로그인 버튼 -->
<a href="/oauth2/authorization/naver">네이버 로그인</a>
```

**핵심 키워드:** `#OAuth2` `#scope` `#provider` `#registrationId` `#Spring Security`

---

## 2. 사용자 엔티티와 저장 흐름

```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    private String name;
    private String nickname;
    private String profileImage;
    private String role;

    // 소셜 로그인 속성 Map → 엔티티 변환
    public static User createUser(Map<String, Object> attributes) {
        User user = new User();
        user.setEmail((String) attributes.get("email"));
        user.setName((String) attributes.get("name"));
        user.setRole("ROLE_USER");
        return user;
    }

    // 기존 사용자 정보 업데이트
    public void update(Map<String, Object> attributes) {
        this.name = (String) attributes.get("name");
        this.nickname = (String) attributes.get("nickname");
    }
}
```

> `findByEmail` → 있으면 update, 없으면 새로 저장 (신규/기존 분기)

---

## 3. CustomOAuth2UserService

```java
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2UserException {
        OAuth2User oAuth2User = super.loadUser(request);

        // 네이버는 response 키 아래에 실제 데이터
        Map<String, Object> attributes =
                (Map<String, Object>) oAuth2User.getAttributes().get("response");

        String email = (String) attributes.get("email");

        User user = userRepository.findByEmail(email)
                .map(u -> { u.update(attributes); return userRepository.save(u); })
                .orElseGet(() -> userRepository.save(User.createUser(attributes)));

        return new CustomOAuth2User(user, attributes);
    }
}
```

### SecurityConfig에 연결

```java
http.oauth2Login(oauth -> oauth
    .defaultSuccessUrl("/main")
    .userInfoEndpoint(info -> info.userService(customOAuth2UserService))
);
```

**핵심 키워드:** `#DefaultOAuth2UserService` `#SecurityFilterChain` `#oauth2Login` `#userInfoEndpoint` `#logout`

---

## 4. 네이버 연동 해제 (토큰 폐기)

```java
@GetMapping("/unlink")
public String unlink(OAuth2AuthenticationToken authToken) {
    // 1. 액세스 토큰 추출
    OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
            authToken.getAuthorizedClientRegistrationId(),
            authToken.getName());
    String accessToken = client.getAccessToken().getTokenValue();

    // 2. 네이버 토큰 폐기 API 호출
    String url = "https://nid.naver.com/oauth2.0/token"
            + "?grant_type=delete"
            + "&client_id=" + clientId
            + "&client_secret=" + clientSecret
            + "&access_token=" + accessToken;

    RestTemplate restTemplate = new RestTemplate();
    restTemplate.exchange(url, HttpMethod.GET, null, String.class);

    // 3. DB 사용자 비활성화/삭제
    userRepository.deleteByEmail(authToken.getName());

    return "redirect:/";
}
```

| 단계 | 처리 | 핵심 객체 |
|------|------|---------|
| 1 | 인증된 사용자 클라이언트 로드 | `OAuth2AuthorizedClientService` |
| 2 | 액세스 토큰 추출 | `OAuth2AuthorizedClient.getAccessToken()` |
| 3 | 토큰 폐기 API 호출 | `RestTemplate.exchange()` |
| 4 | 내부 DB 사용자 삭제/비활성화 | `UserRepository.delete(...)` |

**핵심 키워드:** `#토큰 폐기` `#OAuth2AuthorizedClientService` `#OAuth2AuthenticationToken` `#RestTemplate` `#연동 해제`

---

## 5. JPA 기본키 전략

| 전략 | 특징 | 대표 DB |
|------|------|---------|
| `IDENTITY` | DB에 생성 위임, INSERT 후 ID 확인 | MySQL |
| `SEQUENCE` | 시퀀스 기반, INSERT 전 ID 확보 | Oracle/PostgreSQL |
| `TABLE` | 별도 키 테이블, DB 독립적 | 거의 사용 안 함 |
| `AUTO` | DB에 맞는 전략 자동 선택 | 이식성 중요할 때 |

---

## 6. 쿼리 메소드와 JPQL

```java
// 쿼리 메소드 (메서드명으로 자동 생성)
Optional<User> findByEmail(String email);
List<User> findByNameAndRole(String name, String role);

// JPQL (@Query) - 엔티티/필드 기준
@Query("SELECT u FROM User u WHERE u.email = ?1")
Optional<User> findUserByEmail(String email);
```

| 방식 | 장점 | 단점 |
|------|------|------|
| 쿼리 메소드 | 빠르고 타입 안전 | 긴 메서드명, 복잡 쿼리 어려움 |
| `@Query` JPQL | 복잡 쿼리 가능 | 문자열 오타에 취약 |

**핵심 키워드:** `#Query Method` `#@Query` `#JPQL` `#?1 바인딩` `#JUnit`

---

## 오늘의 핵심 요약

1. 네이버 OAuth2 = `response` 키 아래에 실제 프로필 데이터
2. `DefaultOAuth2UserService.super.loadUser()` 먼저 호출 → 그 다음 DB 저장
3. `findByEmail` → 있으면 update/save, 없으면 createUser/save
4. 소셜 로그인 탈퇴 = 토큰 폐기 API 호출 + 내부 DB 처리 모두 필요
5. Client Secret = 절대 코드에 하드코딩 X (환경변수/properties로 관리)
6. `IDENTITY` = MySQL 자동 증가 / `SEQUENCE` = Oracle 시퀀스
7. 쿼리 메소드 = 메서드명이 곧 쿼리 (긴 이름 주의)
8. JPQL = 테이블명이 아닌 **엔티티명** 기준
9. 물리 삭제보다 **상태 업데이트(비활성화)** 권장 (관계/데이터 보존)
10. `OAuth2AuthorizedClientService` = 로그인한 사용자의 액세스 토큰 조회
