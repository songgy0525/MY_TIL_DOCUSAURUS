---
title: "[TIL] 스프링 부트 AOP, MyBatis, JSP, Thymeleaf"
date: 2026-04-20
tags: [SpringBoot, AOP, MyBatis, Thymeleaf]
---
> 부트캠프 백엔드 과정 · 2026.04.20

## 1. AOP 핵심 개념과 실행 흐름

### 주요 용어

| 용어 | 의미 |
|------|------|
| `Advice` | CCC 기능을 담은 메서드 (로그, 트랜잭션 등) |
| `JoinPoint` | 어드바이스가 끼어드는 시점 |
| `Pointcut` | 어떤 메서드에 적용할지 지정하는 규칙 |
| `Proxy` | CC + CCC가 결합된 실행 객체 |
| `Weaving` | 프록시를 만드는 과정 |

### JoinPoint 시점 종류

| 어노테이션 | 실행 시점 |
|-----------|---------|
| `@Before` | 대상 메서드 실행 전 |
| `@After` | 종료 후 (성공/실패 모두) |
| `@AfterReturning` | 정상 리턴 후 |
| `@AfterThrowing` | 예외 발생 후 |
| `@Around` | 전후 모두 감쌈 (가장 강력) |

### 어드바이스 실행 순서

```
정상: @Around(시작) → @Before → 타깃 → @After → @AfterReturning → @Around(종료)
예외: @Around(시작) → @Before → 타깃 → @After → @AfterThrowing → @Around(예외처리)
```

### Pointcut 표현식 구성요소

```java
execution(리턴타입 패키지.클래스.메서드(아규먼트))

// 예시
@Pointcut("execution(* com.example..*.*(..))") // 하위 전체
```

| 구성요소 | 예시 | 의미 |
|---------|------|------|
| 리턴타입 | `*`, `void`, `!void` | 모든/void/void제외 |
| 패키지 | `com.example..` | 하위 전체 |
| 아규먼트 | `(..)`, `(int,..)` | 개수/타입 지정 |

> 스프링 부트 = JDK Proxy 기반 / 인터페이스 없으면 CGLIB 사용

**핵심 키워드:** `#CC` `#CCC` `#Pointcut` `#Advice` `#ProceedingJoinPoint`

---

## 2. Spring Boot MyBatis 두 가지 방식

### 기존 vs 스프링 부트 비교

| 항목 | 기존 MyBatis | Spring Boot |
|------|------------|------------|
| config XML | 직접 작성 | 불필요 (properties로 대체) |
| SqlSessionFactory | 직접 생성 | 컨테이너가 자동 관리 |
| Mapper 등록 | XML 명시 | mapper-locations로 관리 |

### application.properties 핵심 설정

```properties
spring.datasource.driver-class-name=oracle.jdbc.OracleDriver
spring.datasource.url=jdbc:oracle:thin:@localhost:1521:xe
spring.datasource.username=scott
spring.datasource.password=tiger

mybatis.type-aliases-package=com.example.dto
mybatis.mapper-locations=classpath:sql/*.xml
```

### 방식 1: XML Mapper (권장)

```java
// 인터페이스
@Mapper
public interface EmpMapper {
    List<EmpDTO> getAllEmp();
}
```

```xml
<!-- mapper.xml -->
<mapper namespace="com.example.mapper.EmpMapper">
    <select id="getAllEmp" resultType="EmpDTO">
        SELECT * FROM emp
    </select>
</mapper>
```

### 방식 2: Annotation Mapper

```java
@Mapper
public interface EmpMapper {
    @Select("SELECT * FROM emp WHERE empno = #{empno}")
    EmpDTO getEmp(@Param("empno") int empno);
}
```

> ⚠️ 다이나믹 SQL = Annotation에서 `<script>` 태그로 감싸야 동작

**핵심 키워드:** `#DataSource` `#HikariCP` `#Mapper` `#type-aliases-package` `#mapper-locations`

---

## 3. Spring Boot에서 JSP 사용하기

### 필요 의존성

```xml
<!-- Jasper (JSP 엔진) -->
<dependency>
    <groupId>org.apache.tomcat.embed</groupId>
    <artifactId>tomcat-embed-jasper</artifactId>
</dependency>
<!-- JSTL -->
```

### View Resolver 설정

```properties
spring.mvc.view.prefix=/WEB-INF/views/
spring.mvc.view.suffix=.jsp
```

### 폴더 구조

```
src/main/webapp/WEB-INF/views/   ← JSP 파일 위치
```

### Controller 예시

```java
@Controller
public class EmpController {
    @GetMapping("/empList")
    public String empList(Model model) {
        model.addAttribute("list", empService.getAllEmp());
        return "empList";  // → /WEB-INF/views/empList.jsp
    }
    
    // 리다이렉트
    @GetMapping("/redirect")
    public String goHome() {
        return "redirect:/empList";
    }
}
```

**핵심 키워드:** `#Jasper` `#ViewResolver` `#prefix/suffix` `#Model` `#redirect:`

---

## 4. Thymeleaf 기본 설정과 핵심 문법

### JSP vs Thymeleaf 비교

| 항목 | JSP | Thymeleaf |
|------|-----|---------|
| 템플릿 | 자바 코드 혼합 | HTML 형태 유지 |
| 엔진 | Jasper 필요 | starter만으로 해결 |
| 바인딩 | EL/JSTL | `th:*` 속성 |

### 설정

```properties
spring.thymeleaf.cache=false    # 개발 중 캐시 비활성화
spring.thymeleaf.encoding=UTF-8
```

### 파일 위치
```
src/main/resources/templates/   ← HTML 파일 위치
```

### 핵심 문법

```html
<!-- HTML에 네임스페이스 선언 -->
<html xmlns:th="http://www.thymeleaf.org">

<!-- 출력 -->
<td th:text="${vo.empno}"></td>

<!-- 반복 -->
<tr th:each="vo : ${list}">

<!-- 조건 -->
<div th:if="${list.size() == 0}">데이터 없음</div>

<!-- 링크 -->
<a th:href="@{/emp/detail(empno=${vo.empno})}">상세</a>

<!-- 입력 값 바인딩 -->
<input th:value="${vo.empno}">
```

**핵심 키워드:** `#Thymeleaf` `#templates` `#th:text` `#th:each` `#th:href`

---

## 오늘의 핵심 요약

1. AOP = CC(핵심로직)와 CCC(로그/트랜잭션)를 분리하는 기술
2. `@Around` = 가장 강력한 어드바이스, `proceed()`로 타깃 실행 위임
3. Spring Boot MyBatis = `SqlSessionFactory` 자동 관리, config XML 불필요
4. XML Mapper = 다이나믹 SQL 유리 / Annotation = 단순 SQL에 간편
5. JSP 사용 시 = Jasper 의존성 + `prefix/suffix` ViewResolver 설정 필수
6. Thymeleaf = `templates/` 아래 HTML, `th:*` 속성 기반
7. `th:if` / `th:unless` = 조건 렌더링 (null/false/0/empty = 거짓)
8. Thymeleaf 링크 = `th:href="@{/path(param=${var})}"` 형식
9. `spring.thymeleaf.cache=false` = 개발 중 캐시 비활성화 필수
10. Model = 스프링의 request scope 전달 객체
