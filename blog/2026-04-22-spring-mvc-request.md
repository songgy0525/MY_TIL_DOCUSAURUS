---
title: "[TIL] 스프링 부트 MVC 아키텍처와 요청 처리"
date: 2026-04-22
tags: [SpringBoot, MVC]
---
> 부트캠프 백엔드 과정 · 2026.04.22

## 1. 스프링 부트 기본 아키텍처 복습

### 스테레오타입 어노테이션

| 어노테이션 | 역할 |
|-----------|------|
| `@Controller` | 요청 수신, 뷰/데이터 반환 |
| `@Service` | 비즈니스 로직, 트랜잭션 경계 |
| `@Repository` | 데이터 접근, 예외 변환 |
| `@Component` | 일반 컴포넌트 |

### AOP 조인포인트 정리

| 어노테이션 | 시점 | 활용 |
|-----------|------|------|
| `@Before` | 실행 전 | 파라미터 로깅 |
| `@After` | 종료 후 | 성공/실패 공통 처리 |
| `@AfterReturning` | 정상 리턴 후 | 반환값 검사 |
| `@AfterThrowing` | 예외 발생 후 | 예외 로깅 |
| `@Around` | 전후 모두 | 실행시간 측정 |

**핵심 키워드:** `#@SpringBootApplication` `#AOP` `#@ControllerAdvice` `#MyBatis` `#@Transactional`

---

## 2. @Value로 설정값 주입

```java
@Controller
public class MyController {

    @Value("${app.title}")
    private String appTitle;

    @GetMapping("/home")
    public String home(Model model) {
        model.addAttribute("title", appTitle);
        return "home";
    }
}
```

```properties
# application.properties
app.title=My Spring App
```

**핵심 키워드:** `#@Value` `#@GetMapping` `#Model` `#Thymeleaf` `#void반환`

---

## 3. 요청 매핑과 void 반환 규칙

```java
// void 반환 → 메서드명 = 뷰 이름
@GetMapping("/empList")
public void empList(Model model) {
    model.addAttribute("list", empService.getAllEmp());
    // → templates/empList.html 탐색
}

// String 반환 → 명시적 뷰 이름
@GetMapping("/emp")
public String emp(Model model) {
    return "emp/list";  // → templates/emp/list.html
}
```

> `void` 반환 = 메서드명이 뷰 이름 → 회사 레거시 코드에서 자주 등장!

---

## 4. 엔드포인트 설계와 경로 변수 주의

```java
// 클래스 레벨 공통 경로
@Controller
@RequestMapping("/user")
public class UserController {

    @GetMapping("/login")   // → /user/login
    public String login() { ... }

    @GetMapping("/logout")  // → /user/logout
    public String logout() { ... }
}
```

```
⚠️ /{action} 단일 변수 경로 = 모든 값 흡수 → 설계 주의!

예) @GetMapping("/{action}") → /login, /test, /abc 모두 매핑됨
→ 가능하면 고정 경로 사용
```

**핵심 키워드:** `#엔드포인트` `#@RequestMapping` `#RequestMethod` `#405` `#설계주의`

---

## 5. @RequestParam, 오토바인딩, Map 바인딩

```java
// 기본 바인딩
@GetMapping("/list")
public String list(@RequestParam(defaultValue = "1") int page, Model model) {
    ...
}

// DTO 오토바인딩 (세터 호출)
@PostMapping("/insert")
public String insert(EmpDTO dto) {
    empService.insert(dto);
    return "redirect:/list";
}

// Map 바인딩
@PostMapping("/update")
public String update(@RequestParam Map<String, Object> params) {
    empService.update(params);
    return "redirect:/list";
}

// 다중 값 (체크박스)
@PostMapping("/delete")
public String delete(@RequestParam List<Integer> chkSeq) {
    empService.deleteMulti(chkSeq);
    return "redirect:/list";
}
```

| 옵션 | 의미 |
|------|------|
| `value` | 파라미터 이름과 변수명 매핑 |
| `defaultValue` | 값 없으면 기본값 사용 |
| `required=false` | 값 없어도 400 오류 미발생 |

**핵심 키워드:** `#@RequestParam` `#오토바인딩` `#DTO` `#Map바인딩` `#defaultValue`

---

## 6. 리다이렉트와 값 전달 전략

```java
// 방법 1: RedirectAttributes
@PostMapping("/insert")
public String insert(EmpDTO dto, RedirectAttributes rttr) {
    int seq = empService.insert(dto);
    rttr.addAttribute("seq", seq);    // → 쿼리스트링으로 반영
    return "redirect:/detail";
}

// 방법 2: 직접 쿼리스트링
@PostMapping("/insert2")
public String insert2(EmpDTO dto) {
    int seq = empService.insert(dto);
    return "redirect:/detail?seq=" + seq;
}
```

| 전달 방식 | 특징 |
|---------|------|
| `RedirectAttributes` | 코드 가독성 좋음 |
| 쿼리스트링 직접 | 간단하지만 조합이 지저분해질 수 있음 |
| `Model` | 리다이렉트 후 전달 불가 (request 끊김) |

> 핵심: 리다이렉트 = 새 요청 → Model 값 전달 안 됨

**핵심 키워드:** `#redirect:` `#RedirectAttributes` `#쿼리스트링` `#요청단절` `#URL인코딩`

---

## 7. @PathVariable

```java
@GetMapping("/user/{id}")
public String userDetail(@PathVariable int id, Model model) {
    model.addAttribute("user", userService.getUser(id));
    return "user/detail";
}

// 화면 분기에도 활용
@GetMapping("/{path}/view")
public String dynamicView(@PathVariable String path) {
    return path + "/view";  // → templates/{path}/view.html
}
```

> ⚠️ 앞단 인덱싱 위치에 `/{var}` = 모든 요청 흡수 위험 → 뒤쪽에서만 사용

**핵심 키워드:** `#@PathVariable` `#경로변수` `#REST설계` `#엔드포인트` `#화면분기`

---

## 오늘의 핵심 요약

1. `void` 반환 = 메서드명이 뷰 이름 (회사 코드에서 자주 등장)
2. `/{action}` 단일 변수 경로 = 모든 요청 흡수 → 가능하면 고정 경로
3. DTO 오토바인딩 = 폼 `name` 속성 = DTO setter 메서드명 일치 필요
4. `defaultValue` = 페이징처럼 값이 없을 수 있는 파라미터에 필수
5. primitive 타입 파라미터 + null → 500 에러 → `Integer` 래퍼 타입 사용
6. 리다이렉트 = 새 요청 → Model 값 전달 불가 → RedirectAttributes 사용
7. `@PathVariable` = REST 경로 파라미터 바인딩
8. `@RequestMapping(method={GET,POST})` = 메서드 배열로 복수 허용
9. `@Value` = application.properties 값 주입
10. `WebMvcConfigurer` = 인터셉터/CORS/정적리소스 등 MVC 설정 커스터마이징
