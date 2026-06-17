---
title: "[TIL] Testcontainers, 도커라이징, CI, 예외처리"
date: 2026-06-08
tags: [Testcontainers, MockMvc, Docker, Dockerfile, Buildpacks, Jib, GitHubActions, SpringBoot]
---

## 오늘의 핵심 흐름

기존 Spring Boot REST API 코드베이스를 기반으로, H2와 운영 DB(PostgreSQL) 차이를 해결하기 위한 **Testcontainers 통합 테스트**를 구성했다. MockMvc로 API 테스트를 단계적으로 확장하고, 스프링 부트 앱을 컨테이너 이미지로 만드는 **3가지 도커라이징 방식(Dockerfile, Buildpacks, Jib)** 을 비교했다. 이후 GitHub Actions로 CI를 구성하고, Secret 스캐닝 이슈 + Jib 기반 Docker Hub 자동 푸시 워크플로우를 실습했다.

---

## 1. Flyway, DTO, JPQL 복습

### Flyway 마이그레이션 파일 규칙

| 요소 | 의미 | 예시/주의점 |
|------|------|------------|
| 접두사 | 버전 마이그레이션 식별자 | `V`로 시작해야 함 |
| 버전 | 실행 순서 | `V1`, `V2`처럼 증가 |
| 구분자 | 설명과 버전 분리 | 언더스코어 규칙 틀리면 인식 실패 |
| 확장자 | SQL 파일 형식 | `.sql` 사용 |

### JPQL DTO 프로젝션

```java
// select new 구문 — DTO에 All-Args 생성자 필수!
@Query("select new com.example.dto.BookmarkDto(b.id, b.title, b.url) " +
       "from Bookmark b where lower(b.title) like lower(:title)")
Page<BookmarkDto> findByTitle(@Param("title") String title, Pageable pageable);
```

- `Page.getNumber()`는 **0부터 시작** → UI 표시 시 `+1` 보정 필요
- 엔티티를 API 응답으로 직접 노출하면 지연 로딩(Lazy Loading) 문제 커짐
- 복잡한 조회는 **DTO 변환 방식**이 안정적

---

## 2. Testcontainers로 DB 통합 테스트

H2는 빠르지만 PostgreSQL과 SQL 방언이 달라 실제 동작을 보장하지 못한다.  
**Testcontainers**를 쓰면 테스트 시점에 Docker로 PostgreSQL 컨테이너를 자동으로 띄우고, 테스트 종료 후 제거한다.

### 필요 의존성 (Maven)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

> BOM(Bill of Materials)으로 `org.testcontainers` 계열 버전을 일관되게 맞추는 것이 관례

### 테스트 설정

```java
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:tc:postgresql:14-alpine:///demo"
})
```

- `jdbc:tc:` 형태로 URL 지정 → 테스트 시 컨테이너 자동 기동
- 테스트 종료 후 자동 제거 → 수동 DB 세팅 불필요
- **⚠️ Docker가 로컬에서 실행 중이어야 함**

---

## 3. MockMvc API 요청 테스트 확장

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class BookmarkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BookmarkRepository bookmarkRepository;

    @BeforeEach
    void setUp() {
        bookmarkRepository.deleteAllInBatch(); // 테스트 간 데이터 독립성 보장
    }

    @ParameterizedTest
    @CsvSource({
        "1, true, false",
        "2, false, true"
    })
    void 페이징_테스트(int page, boolean isFirst, boolean isLast) throws Exception {
        mockMvc.perform(get("/api/bookmarks?page=" + page))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.first").value(isFirst))
            .andExpect(jsonPath("$.last").value(isLast));
    }
}
```

| 구성 요소 | 어노테이션/기능 | 목적 |
|-----------|----------------|------|
| 컨텍스트/포트 | `@SpringBootTest(RANDOM_PORT)` | 포트 충돌 없이 통합 테스트 |
| MockMvc 구성 | `@AutoConfigureMockMvc` | 컨트롤러 요청 모사 |
| 사전 정리 | `@BeforeEach + deleteAllInBatch()` | 테스트 간 데이터 독립성 |
| 응답 검증 | `jsonPath() + matcher` | 구조적 검증 |

> `@Before`는 JUnit4, `@BeforeEach`는 JUnit5(Jupiter) — 헷갈리기 쉬운 포인트!

---

## 4. Maven 빌드와 테스트 실행 흐름

| 명령 | 핵심 의미 | 비고 |
|------|----------|------|
| `clean` | target 디렉터리 정리 | 빌드 산출물 초기화 |
| `verify` | 테스트 포함 검증 | 테스트 성공 시 빌드 유효 |
| `install` | 로컬 `.m2` 저장소 배포 | 다른 프로젝트에서 의존성 사용 가능 |
| `-DskipTests` | 테스트 생략 | CI 품질 저하 위험 있음 |

> `verify` vs `install` 차이를 알고 있어야 한다. 회사마다 선호가 다름.

---

## 5. 도커라이징 3가지 방식 비교

| 방식 | Dockerfile 필요 | 로컬 Docker 엔진 | 특징 |
|------|----------------|-----------------|------|
| **Dockerfile** | 필요 | 필요 | 제어 강력, 관리 부담 있음 |
| **Buildpacks** | 불필요 | 필요 | 이미지 선택/레이어 최적화 자동화 |
| **Jib** | 불필요 | 불필요 | 데몬 없이 레지스트리 직접 푸시 가능 |

### Dockerfile 기본 구성

```dockerfile
FROM eclipse-temurin:21-jre-jammy
COPY target/*.jar /app/myapp.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/myapp.jar"]
```

> `COPY` vs `ADD`: ADD는 tar 자동 해제 기능 있음. 일반 복사는 **COPY** 사용이 원칙.

### Jib 명령 구분

| 명령 | 용도 |
|------|------|
| `jib:build` | 레지스트리로 직접 푸시 |
| `jib:dockerBuild` | 로컬 Docker 데몬에 이미지 생성 |

---

## 6. GitHub Actions CI 구성

```yaml
- name: Build with Maven
  run: |
    chmod +x ./mvnw
    ./mvnw verify

- name: Login to Docker Hub
  run: docker login -u ${{ secrets.DOCKER_USERNAME }} -p ${{ secrets.DOCKER_PASSWORD }}

- name: Push with Jib
  run: ./mvnw jib:build
```

**⚠️ Secret 스캐닝:** `pom.xml` 등에 토큰/비밀번호가 포함되면 GitHub가 푸시를 차단한다.  
→ 민감 정보는 반드시 Repository Settings → Secrets and variables → Actions에 등록 후 `${{ secrets.변수명 }}`으로 주입.

**💡 GitHub Actions는 원격 러너에서 실행된다:**  
워크플로우에서 `docker build`를 수행해도 그 이미지는 러너 내부에만 존재하며, 개발자 PC의 Docker Desktop에 나타나지 않음.

---

## 7. REST API 입력 검증과 전역 예외 처리

### 전역 예외 처리 — JSON 응답 표준화

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, Object> errors = new LinkedHashMap<>();
        errors.put("status", 400);
        errors.put("message", ex.getBindingResult().getAllErrors().stream()
            .map(ObjectError::getDefaultMessage)
            .collect(Collectors.joining(", ")));
        return errors;
    }
}
```

> ⚠️ Spring Security 인증/인가 예외는 **필터 체인**에서 발생 → `@ControllerAdvice`로 잡히지 않는다.  
> Security 관련 오류 응답은 **Security Filter 레벨**에서 별도 처리 필요.

### 오류 시나리오 MockMvc 테스트

```java
mockMvc.perform(post("/api/bookmarks")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"title\":\"lion-study\"}"))  // URL 누락
    .andExpect(status().is4xxClientError())
    .andExpect(jsonPath("$.status", is(400)))
    .andExpect(jsonPath("$.message", is("URL은 필수 입력값입니다.")))
    .andReturn();
```

---

## 핵심 키워드

`#Testcontainers` `#MockMvc` `#@BeforeEach` `#Dockerfile` `#Buildpacks` `#Jib` `#GitHub Actions` `#Secret scanning` `#@ControllerAdvice` `#MethodArgumentNotValidException`
