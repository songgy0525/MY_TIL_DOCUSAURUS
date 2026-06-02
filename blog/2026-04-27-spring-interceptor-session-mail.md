---
title: "[TIL] 스프링 부트 회원관리, 인터셉터, 세션, 메일"
date: 2026-04-27
tags: [SpringBoot, 인터셉터, 세션]
---
> 부트캠프 백엔드 과정 · 2026.04.27

## 1. 회원 권한 변경 (Thymeleaf + Ajax)

```html
<!-- 타임리프 회원 목록 테이블 -->
<tr th:each="vo : ${userList}">
  <td><input type="checkbox" th:value="${vo.id}"></td>
  <td th:text="${vo.id}"></td>
  <td th:text="${vo.role}"></td>
</tr>

<!-- th:replace로 헤더 포함 -->
<div th:replace="~{layout/header :: headerNav}"></div>
```

```javascript
// Ajax 전송 포맷 비교
const urlParams = new URLSearchParams();  // application/x-www-form-urlencoded
const formData = new FormData();          // multipart (파일 포함)
const jsonObj = { id: "user01" };         // JSON 객체
JSON.stringify(jsonObj);                  // JSON 문자열

// 체크박스 다중 선택 → 동일 키 덮어쓰기 주의!
// 배열 구성 로직 필요
```

**핵심 키워드:** `#th:each` `#th:replace` `#Fetch` `#URLSearchParams` `#FormData`

---

## 2. 인터셉터 (HandlerInterceptor + WebMvcConfigurer)

```java
// 로그인 체크 인터셉터
@Component
public class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest req,
                             HttpServletResponse res,
                             Object handler) throws Exception {
        HttpSession session = req.getSession();
        if (session.getAttribute("loginVO") == null) {
            res.sendRedirect("/");
            return false;  // 컨트롤러 실행 차단
        }
        return true;
    }
}

// 캐시 제어 인터셉터
@Component
public class CacheControlInterceptor implements HandlerInterceptor {

    @Override
    public void postHandle(HttpServletRequest req, HttpServletResponse res,
                           Object handler, ModelAndView mv) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setDateHeader("Expires", 0);
    }
}

// WebMvcConfigurer 등록
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 로그인 체크: 전체 경로에서 정적 리소스/로그인 제외
        registry.addInterceptor(loginInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/", "/login2", "/signup2",
                                     "/css/**", "/js/**", "/images/**");

        // 캐시 제어: 특정 경로만
        registry.addInterceptor(cacheControlInterceptor)
                .addPathPatterns("/boardList2", "/logout2");
    }
}
```

### 필터 vs 인터셉터 비교

| 구분 | 필터 | 인터셉터 |
|------|------|---------|
| 동작 위치 | 서블릿 계층 | 스프링 MVC 계층 |
| 빈 주입 | 어렵 (FilterRegistrationBean 필요) | 쉬움 |
| 주 용도 | 접속 로그, 기초 차단 | 로그인 인증, 캐시 제어 |

### preHandle vs postHandle 용도

| 메서드 | 시점 | 활용 |
|--------|------|------|
| `preHandle` | 컨트롤러 실행 전 | 로그인 체크 |
| `postHandle` | 컨트롤러 실행 후 | 캐시 헤더 정리 |
| `afterCompletion` | 뷰 렌더링 후 | 리소스 정리 |

**핵심 키워드:** `#HandlerInterceptor` `#preHandle` `#WebMvcConfigurer` `#excludePathPatterns` `#sendRedirect`

---

## 3. 세션: HttpSession vs @SessionAttributes (시험 빈출 ⭐)

```java
// HttpSession: 애플리케이션 전역 세션
@PostMapping("/login")
public String login(HttpSession session, ...) {
    session.setAttribute("loginVO", vo);       // 저장
    session.getAttribute("loginVO");           // 조회
    session.removeAttribute("loginVO");        // 특정 키 삭제
    session.invalidate();                      // 전체 무효화
}

// @SessionAttributes: 특정 컨트롤러에 종속
@Controller
@SessionAttributes("searchCondition")         // 세션으로 승격할 모델 이름
public class BoardController {

    @GetMapping("/board")
    public String board(Model model) {
        model.addAttribute("searchCondition", new SearchVO());  // 세션으로 승격
        return "board";
    }

    @GetMapping("/clear")
    public String clear(SessionStatus status) {
        status.setComplete();  // @SessionAttributes만 삭제 (HttpSession 영향 X)
        return "redirect:/";
    }
}
```

### 핵심 차이 (시험 빈출!)

| 구분 | `HttpSession` | `@SessionAttributes` |
|------|------------|-------------------|
| 스코프 | 애플리케이션 전역 | 특정 컨트롤러 종속 |
| 삭제 | `invalidate()` or `removeAttribute()` | `SessionStatus.setComplete()` |
| 다른 컨트롤러에서 삭제 | 가능 | 불가 (자기 컨트롤러만) |
| 사용 사례 | 로그인 정보, 전역 권한 | 검색 조건, 임시 상태 |

> `SessionStatus.setComplete()` = `@SessionAttributes`만 삭제
> `HttpSession.invalidate()` = 전체 세션 무효화 (→ `@SessionAttributes`도 영향받을 수 있음)

**핵심 키워드:** `#HttpSession` `#@SessionAttributes` `#SessionStatus` `#invalidate` `#setComplete`

---

## 4. @ModelAttribute 두 가지 의미

```java
// 의미 1: 요청 파라미터 → DTO 바인딩 (생략 가능)
@PostMapping("/signup")
public String signup(@ModelAttribute UserVO vo) { ... }

// 의미 2: 컨트롤러 실행 전 모델에 참조 데이터 자동 주입
@Controller
public class BoardController {

    @ModelAttribute("userType")  // 이 컨트롤러의 모든 요청에 자동 적재
    public List<String> referenceUserType() {
        return List.of("관리자", "일반유저", "게스트");
    }

    @GetMapping("/board")
    public String board(Model model) {
        // userType이 이미 모델에 담겨있음 → 별도 addAttribute 불필요
        return "board";
    }
}
```

```html
<!-- 뷰에서 자동으로 접근 가능 -->
<li th:each="t : ${userType}" th:text="${t}"></li>
```

**핵심 키워드:** `#@ModelAttribute` `#참조데이터` `#모델자동주입` `#DTO바인딩` `#타임리프`

---

## 5. SMTP 메일 전송 (Gmail)

```properties
# application.properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your@gmail.com
spring.mail.password=앱비밀번호   # 계정 비밀번호 아님!
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

```java
@Controller
@RequiredArgsConstructor
public class MailController {

    private final JavaMailSender mailSender;

    @PostMapping("/sendMail")
    public String sendMail(@RequestParam Map<String, String> params,
                           @RequestParam(required = false) MultipartFile attachFile)
            throws Exception {

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom("your@gmail.com");
        helper.setTo(params.get("toMail"));
        helper.setSubject(params.get("subject"));
        helper.setText(params.get("content"), true);  // true = HTML 렌더링

        // 첨부파일
        if (attachFile != null && !attachFile.isEmpty()) {
            helper.addAttachment(attachFile.getOriginalFilename(),
                                 attachFile.getResource());
        }

        mailSender.send(message);
        return "redirect:/mailForm";
    }
}
```

| 설정 | 의미 |
|------|------|
| `spring.mail.password` | 앱 비밀번호 (Google 계정 비밀번호 아님!) |
| `starttls.enable=true` | TLS 설정 (없으면 전송 차단) |
| `setText(content, true)` | `true` = HTML 렌더링 |
| `new MimeMessageHelper(msg, true, "UTF-8")` | 첨부파일 + 한글 인코딩 |

> Gmail 앱 비밀번호 발급: Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호

**핵심 키워드:** `#SMTP` `#JavaMailSender` `#MimeMessageHelper` `#앱비밀번호` `#TLS`

---

## 오늘의 핵심 요약

1. `preHandle` = 컨트롤러 실행 전 (로그인 체크) / `postHandle` = 실행 후 (캐시 제어)
2. 인터셉터 `excludePathPatterns` = 정적 리소스/로그인 경로 제외 필수
3. `HttpSession.invalidate()` = 전체 무효화 / `SessionStatus.setComplete()` = 컨트롤러 종속 세션만 삭제
4. `@SessionAttributes` = 특정 컨트롤러에 종속 → 다른 컨트롤러에서 `setComplete()` 불가
5. `@ModelAttribute` 메서드 = 컨트롤러 실행 전 모델 자동 주입 → `addAttribute` 불필요
6. Gmail SMTP = 계정 비밀번호 아니라 **앱 비밀번호** 사용
7. `starttls.enable=true` = TLS 설정 없으면 전송 차단
8. `setText(content, true)` = `true`면 HTML 렌더링
9. `th:replace="~{layout/header :: headerNav}"` = 타임리프 fragment 교체
10. FormData 동일 키 반복 = 덮어쓰기 → 배열로 구성하는 로직 필요
