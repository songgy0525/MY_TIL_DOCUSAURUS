---
title: "[TIL] 스프링 부트 Thymeleaf, AJAX, 필터, 트랜잭션"
date: 2026-04-21
tags: [SpringBoot, Thymeleaf, AJAX, 트랜잭션]
---
> 부트캠프 백엔드 과정 · 2026.04.21

## 1. Thymeleaf 출력·전송 문법

```html
<!-- 반복 -->
<li th:each="vo : ${list}">
  <span th:text="${vo.empno}"></span>
  <!-- 빈 요소는 th:value 사용 -->
  <input th:value="${vo.empno}">
  <!-- 링크 -->
  <a th:href="@{/emp/select(empno=${vo.empno})}">상세</a>
  <!-- 폼 -->
  <form th:action="@{/emp/select}" method="post">
    <input type="hidden" name="empno" th:value="${vo.empno}">
    <button type="submit">전송</button>
  </form>
</li>
```

> `th:text` = HTML 이스케이프 출력 (XSS 방지) / 인라인: `[[${...}]]`

**핵심 키워드:** `#th:each` `#th:text` `#th:href` `#th:action` `#th:value`

---

## 2. data-* 속성과 이벤트 파라미터 전달

```html
<!-- 서버 값을 data 속성에 주입 -->
<button th:attr="data-empno=${vo.empno}" onclick="send(this)">전송</button>
```

```javascript
function send(btn) {
    const empno = btn.getAttribute('data-empno');
    // fetch 요청에 사용
}
```

> 실무 권장 = HTML 커스텀 데이터는 `data-*` 속성에 저장

**핵심 키워드:** `#data-*` `#th:attr` `#onclick` `#getAttribute`

---

## 3. Fetch 기반 AJAX와 @ResponseBody

```javascript
// 프론트
fetch('/emp/ajax', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'empno=' + empno
})
.then(res => {
    if (!res.ok) throw new Error('서버 오류: ' + res.status);
    return res.text();
})
.then(data => console.log(data))
.catch(err => console.log(err));
```

```java
// 서버
@ResponseBody
@PostMapping("/emp/ajax")
public String ajax(@RequestParam("empno") String empno) {
    return empno + "님 반갑습니다.";
}
```

| 어노테이션 | 의미 |
|-----------|------|
| `@ResponseBody` | 뷰 리졸버 없이 값 직접 반환 |
| `@RestController` | `@Controller + @ResponseBody` 조합 |

> HTTP = 텍스트 전송 프로토콜 → JSON도 "JSON 형태의 텍스트"

**핵심 키워드:** `#fetch` `#@ResponseBody` `#@RestController` `#MIME타입` `#response.ok`

---

## 4. MyBatis XML 매퍼 + 프로젝트 설정

```properties
# application.properties
server.port=8099
spring.datasource.driver-class-name=oracle.jdbc.OracleDriver
spring.datasource.url=jdbc:oracle:thin:@localhost:1521:xe
spring.datasource.username=scott
spring.datasource.password=tiger

mybatis.type-aliases-package=com.example.vo
mybatis.mapper-locations=classpath:sql/**/*.xml

spring.thymeleaf.cache=false
spring.thymeleaf.encoding=UTF-8
```

```xml
<!-- DTD 선언 + namespace = 인터페이스 FQCN -->
<mapper namespace="com.example.mapper.JobsMapper">
    <select id="getAllJobs" resultType="JobsVO">
        SELECT * FROM jobs
    </select>
</mapper>
```

**핵심 키워드:** `#application.properties` `#mybatis.mapper-locations` `#namespace` `#XML매퍼`

---

## 5. AOP로 매퍼 실행 로깅

```java
@Aspect
@Component
public class MapperLogAop {

    @Pointcut("execution(* com.example..*.mapper.*.*(..))")
    public void mapperPointcut() {}

    @Before("mapperPointcut()")
    public void beforeLog(JoinPoint jp) {
        log.info("메서드명: {}", jp.getSignature().getName());
        log.info("인자: {}", Arrays.toString(jp.getArgs()));
    }

    @AfterThrowing(pointcut = "mapperPointcut()", throwing = "e")
    public void exceptionLog(Exception e) {
        log.error("예외 발생: {}", e.getMessage());
    }
}
```

**핵심 키워드:** `#AOP` `#@Pointcut` `#JoinPoint` `#@Before` `#@AfterThrowing`

---

## 6. MVC 계층 분리

```
Controller → Service → Mapper(Repository)

@Controller   → 요청/모델/뷰 반환
@Service      → 비즈니스 로직, 트랜잭션 경계
@Mapper       → SQL 실행 단위
```

**핵심 키워드:** `#@Controller` `#@Service` `#Model` `#뷰리졸버` `#템플릿`

---

## 7. @Transactional 트랜잭션과 강제 롤백

```java
@Service
public class EmpServiceImpl implements IEmpService {

    @Transactional(rollbackFor = Exception.class)
    public void updateAndInsert(EmpVO vo) throws Exception {
        int updateCnt = empMapper.updateEmp(vo);
        if (updateCnt == 0) {
            throw new Exception("수정 실패 → 롤백");
        }
        empMapper.insertEmp(vo);
    }
}
```

| 항목 | 내용 |
|------|------|
| 전파 기본값 | `REQUIRED` (기존 트랜잭션 참여 or 새로 시작) |
| 롤백 트리거 | 예외 발생 시 |
| 실패 판정 | row count == 0 → `throw` |

> ⚠️ DB 오류만으로 롤백 기대 X → 애플리케이션 레벨 예외로 명시 필요

**핵심 키워드:** `#@Transactional` `#Propagation.REQUIRED` `#rollbackFor` `#throw` `#롤백`

---

## 8. 웹 필터 (@WebFilter) — 접속 로그

```java
@WebFilter(urlPatterns = "/*")
public class AccessLogFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;

        String ip = request.getRemoteAddr();
        String url = request.getRequestURL().toString();
        String query = StringUtils.defaultIfEmpty(request.getQueryString(), "");
        String fullUrl = query.isEmpty() ? url : url + "?" + query;

        log.info("접속: {} → {}", ip, fullUrl);

        chain.doFilter(req, res);
    }
}
```

**핵심 키워드:** `#@WebFilter` `#FilterChain` `#getRemoteAddr` `#getRequestURL` `#StringUtils`

---

## 9. @ControllerAdvice 전역 예외 처리

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public String handleException(Exception e, Model model) {
        model.addAttribute("status", 500);
        model.addAttribute("message", e.getMessage());
        return "error/error";   // → templates/error/error.html
    }
}
```

> 구체 예외 → 상위 예외 순서로 배치 필수

**핵심 키워드:** `#@ControllerAdvice` `#@ExceptionHandler` `#전역예외처리` `#Model` `#error.html`

---

## 오늘의 핵심 요약

1. `th:text` = 이스케이프 출력 / `th:utext` = HTML 태그 렌더링
2. `data-*` 속성 = 커스텀 데이터 저장 → `getAttribute`로 읽기
3. `@ResponseBody` = 뷰 리졸버 안 거치고 값 직접 반환
4. `response.ok` 검증 → 아니면 throw → catch로 처리
5. `@Transactional(rollbackFor=Exception.class)` = 체크 예외도 롤백
6. row count == 0 → throw로 강제 롤백 유도
7. `chain.doFilter()` 누락 → 다음 단계 흐름 안 이어짐
8. `@ControllerAdvice` = 컨트롤러 예외 전역 처리
9. `@ExceptionHandler` = 구체 예외 → 상위 예외 순 배치
10. 필터 = 서블릿 계층 / 인터셉터 = 스프링 MVC 계층
