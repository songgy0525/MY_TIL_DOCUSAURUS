---
title: "[TIL] JPA 연관관계 + REST 자동화 + REST Docs 세팅"
date: 2026-05-18
tags: [JPA, REST]
---
> 부트캠프 백엔드 과정 · 2026.05.18

## 1. Car–Owner 1:N 연관관계

```java
// Car - ManyToOne (FK 보유)
@ManyToOne(fetch = FetchType.EAGER)
@JoinColumn(name = "owner_id")
private Owner owner;

// Owner - OneToMany (역방향)
@OneToMany(mappedBy = "owner", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
@JsonIgnore  // 순환 참조 방지
private List<Car> cars;
```

### JSON 직렬화 순환 참조 해결

```java
// 방법 1: 필드 무시
@JsonIgnore

// 방법 2: 단방향 기준 직렬화
@JsonManagedReference   // 이쪽 기준 직렬화
@JsonBackReference      // 역방향 차단

// 방법 3: Hibernate 프록시 필드 무시
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
```

**핵심 키워드:** `#@ManyToOne` `#@OneToMany` `#mappedBy` `#@JoinColumn` `#FetchType`

---

## 2. JUnit + Repository 테스트

```java
@SpringBootTest
class CarRepositoryTest {

    @Autowired
    CarRepository carRepository;
    @Autowired
    OwnerRepository ownerRepository;

    @BeforeAll
    static void setUp() {
        // 샘플 데이터 준비
    }

    @Test
    @Transactional  // LAZY 로딩 no session 방지
    void findByBrandTest() {
        List<Car> cars = carRepository.findByBrand("Kia");
        assertNotEquals(0, cars.size());
    }

    // 파라미터화 테스트
    @ParameterizedTest
    @ValueSource(longs = {1L, 2L})
    void deleteTest(Long id) {
        carRepository.deleteById(id);
    }
}
```

> 연관관계 저장 순서: Owner 먼저 저장 → Car 저장 (FK 참조 대상 선행 필수)

**핵심 키워드:** `#@Query` `#@Param` `#@SpringBootTest` `#@BeforeAll` `#@ValueSource`

---

## 3. Spring Data REST와 HATEOAS

```properties
spring.data.rest.base-path=/api
spring.data.rest.default-page-size=100
spring.data.rest.max-page-size=1000
```

```java
// 경로 변경
@RepositoryRestResource(path = "vehicles")
public interface CarRepository extends JpaRepository<Car, Long> {}

// 노출 제외
@RepositoryRestResource(exported = false)
public interface InternalRepository extends JpaRepository<Internal, Long> {}
```

### ID 노출 설정

```java
@Configuration
public class RestConfig implements RepositoryRestConfigurer {

    @Override
    public void configureRepositoryRestConfiguration(
            RepositoryRestConfiguration config, CorsRegistry cors) {
        config.exposeIdsFor(Car.class, Owner.class);
    }
}
```

### 연관관계 전달 방식 (HATEOAS)

```
// 일반 JSON 방식 X
{ "owner": { "id": 1 } }

// HATEOAS URI 방식 O
{ "owner": "http://localhost:8080/api/owners/1" }

// 소유자 변경 (Content-Type: text/uri-list)
PUT /api/vehicles/1/owner
Body: http://localhost:8080/api/owners/2
```

**핵심 키워드:** `#Spring Data REST` `#HATEOAS` `#@RepositoryRestResource` `#base-path` `#JpaRepository`

---

## 4. 전역 예외 처리 (JSON 응답)

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            NoResourceFoundException e, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                        "status", 404,
                        "message", "리소스를 찾을 수 없습니다",
                        "path", req.getRequestURI()
                ));
    }

    // 반드시 마지막에!
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(Exception e) {
        return ResponseEntity.status(500)
                .body(Map.of("status", 500, "message", e.getMessage()));
    }
}
```

> 구체 예외 → 상위 예외 순 배치 필수!

**핵심 키워드:** `#@RestControllerAdvice` `#@ExceptionHandler` `#ResponseEntity` `#HttpStatus` `#예외 계층`

---

## 5. Spring REST Docs 세팅

```xml
<!-- pom.xml - 의존성 -->
<dependency>
    <groupId>org.springframework.restdocs</groupId>
    <artifactId>spring-restdocs-mockmvc</artifactId>
    <scope>test</scope>
</dependency>

<!-- Asciidoctor 플러그인 -->
```

```java
// 테스트 기본 패턴
mockMvc.perform(get("/api/vehicles"))
        .andExpect(status().isOk())
        .andDo(print())
        .andDo(document("get-vehicles",
                responseFields(
                        fieldWithPath("_embedded.vehicles[].id").description("차량 ID"),
                        fieldWithPath("_embedded.vehicles[].brand").description("브랜드")
                )
        ));
```

```
테스트 성공 → target/generated-snippets/ 스니펫 생성
→ index.adoc에서 include
→ Maven Asciidoctor 빌드
→ target/generated-docs/index.html
```

**핵심 키워드:** `#Spring REST Docs` `#MockMvc` `#Asciidoctor` `#generated-snippets` `#index.adoc`

---

## 오늘의 핵심 요약

1. 연관관계 저장 순서 = 부모 먼저, 자식 나중 (FK 참조 순서)
2. `@JsonIgnore` = 순환 참조 차단 (실무는 DTO 변환 권장)
3. Spring Data REST = 컨트롤러 없이 CRUD API 자동 생성
4. `exposeIdsFor()` = HATEOAS 기본값에서 ID 노출하려면 설정 필요
5. HATEOAS 연관관계 = URI로 전달 (`text/uri-list`)
6. `@RestControllerAdvice` = REST JSON 오류 응답 전역 처리
7. 예외 핸들러 = 구체 예외 먼저, 상위 예외 나중 배치
8. REST Docs = 테스트 성공해야 스니펫 생성 → 문서 신뢰도 높음
9. `andDo(document(...))` = 스니펫 생성 구간
10. `fieldWithPath` 경로 = 실제 JSON 구조 확인 후 작성
