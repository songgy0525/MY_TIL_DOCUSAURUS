---
title: "[TIL] Spring REST Docs 문서화, 시큐리티 테스트"
date: 2026-05-19
tags: [REST, Security, Test]
---
> 부트캠프 백엔드 과정 · 2026.05.19

## 1. REST Docs 문서화 파이프라인

```
JUnit + MockMvc 테스트
    ↓ 테스트 성공 시
target/generated-snippets/ (스니펫 생성)
    ↓
src/docs/asciidoc/index.adoc (템플릿 작성)
    ↓ Maven Asciidoctor 빌드
target/generated-docs/index.html (최종 문서)
```

> **테스트 실패 = 스니펫 미생성 = 문서 신뢰도 보장**

### DSL 역할 구분

```java
mockMvc.perform(get("/api/vehicles"))        // 요청 발생
        .andExpect(status().isOk())          // 검증
        .andDo(print())                      // 콘솔 출력 (디버깅)
        .andDo(document("get-vehicles",      // 스니펫 생성
                responseFields(
                        fieldWithPath("_embedded.vehicles[].id")
                                .description("차량 ID")
                )
        ));
```

**핵심 키워드:** `#Spring REST Docs` `#MockMvc` `#Asciidoctor` `#generated-snippets` `#index.adoc`

---

## 2. 문서화 대상별 API

| 문서화 대상 | API | 예시 |
|---------|-----|------|
| Query Parameters | `queryParameters(parameterWithName("brand").description("브랜드"))` | GET `?brand=Kia` |
| Path Parameters | `pathParameters(parameterWithName("id").description("차량 ID"))` | GET `/{id}` |
| Request Fields | `requestFields(fieldWithPath("brand").description("브랜드"))` | POST body |
| Response Fields | `responseFields(fieldWithPath("id").description("ID"))` | 응답 body |

```java
// 생산연도 조회 (쿼리 파라미터 + 응답 필드)
mockMvc.perform(get("/api/vehicles/search/findByProductYear")
                .param("productYear", "2023")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andDo(document("find-by-year",
                queryParameters(
                        parameterWithName("productYear").description("생산연도")
                ),
                responseFields(
                        fieldWithPath("_embedded.vehicles[].brand")
                                .description("브랜드").optional()
                )
        ));
```

> `optional()` = 항상 존재하지 않을 수 있는 필드 처리

### 상태 코드 정리

| 상태 코드 | 의미 | 상황 |
|--------|------|------|
| 200 | 성공 + 바디 반환 | 조회, 일부 삭제 |
| 201 | 생성 성공 | POST 생성 API |
| 204 | 성공 + 바디 없음 | PATCH, DELETE |
| 401 | 인증 없음 | 미로그인 접근 |
| 403 | 접근 거부 | 권한 불일치 |

---

## 3. 스프링 시큐리티 기본 동작

```
의존성 추가만으로:
→ 기본 로그인 페이지 자동 생성
→ 콘솔에 임시 비밀번호 출력
→ 모든 요청 인증 필요

브라우저로 API 접근 시:
1. 요청 → 시큐리티 필터 차단
2. 302 리다이렉트
3. /login 200 (HTML 렌더링)
```

```properties
# 인메모리 비밀번호 고정 (테스트 편의)
spring.security.user.name=user
spring.security.user.password=test
```

### Basic 인증 테스트 (Postman)

```
Authorization 탭 → Basic Auth
Username: user / Password: test
→ 200 성공

미설정 → 401 Unauthorized
```

---

## 4. JUnit으로 로그인 세션 테스트

```java
@SpringBootTest
@AutoConfigureMockMvc
class SecurityTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void loginTest() throws Exception {
        MvcResult result = mockMvc.perform(post("/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("username", "user")
                        .param("password", "test"))
                .andExpect(status().is3xxRedirection())
                .andReturn();

        // 세션에서 인증 정보 검증
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        SecurityContext context = (SecurityContext) session.getAttribute("SPRING_SECURITY_CONTEXT");

        assertNotNull(context);
        assertNotNull(context.getAuthentication());
        assertEquals("user", context.getAuthentication().getName());
    }
}
```

> 로그인 요청 = `application/x-www-form-urlencoded` + CSRF 포함

---

## 5. DB 기반 인증 준비

```java
// UserRepository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);
}

// UserDetailsService 구현
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("사용자 없음: " + username));

        return User.builder()
                .username(user.getUsername())
                .password(user.getPassword())  // BCrypt 해시
                .roles(user.getRole())
                .build();
    }
}
```

**핵심 키워드:** `#Spring Security` `#Security Filter` `#SecurityContext` `#UserDetailsService` `#CSRF`

---

## 오늘의 핵심 요약

1. REST Docs = 테스트 성공해야 스니펫 생성 → 문서 자동화 신뢰성 보장
2. `optional()` = 항상 없을 수 있는 필드에 사용 (없으면 문서화 실패)
3. `print()` = 실제 응답 JSON 확인 → `fieldWithPath` 경로 파악에 필수
4. 201 = POST 생성 / 204 = 바디 없는 성공 (PATCH/DELETE)
5. 시큐리티 의존성 추가 = 즉시 모든 요청 보호 시작
6. `application/x-www-form-urlencoded` + `with(csrf())` = 로그인 테스트 필수
7. `SPRING_SECURITY_CONTEXT` = 세션에 저장된 인증 정보 키
8. `findByUsername` = 쿼리 메소드로 자동 생성
9. `User.builder().roles(role)` = `ROLE_` 접두사 자동 추가
10. Maven `clean` = `target` 삭제 → 기존 스니펫도 함께 제거
