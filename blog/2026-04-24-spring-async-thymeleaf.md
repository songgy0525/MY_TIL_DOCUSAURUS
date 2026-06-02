---
title: "[TIL] 스프링 부트 비동기 통신, Thymeleaf 실습"
date: 2026-04-24
tags: [SpringBoot, 비동기, Thymeleaf]
---
> 부트캠프 백엔드 과정 · 2026.04.24

## 1. REST API와 비동기 통신 기초

```javascript
// fetch 기본 패턴
const params = new URLSearchParams();
params.append("id", inputId);
params.append("keyword", keyword);

fetch('/some/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
})
.then(res => {
    if (!res.ok) throw new Error('오류: ' + res.status);
    return res.text();   // 또는 res.json()
})
.then(data => { /* DOM 갱신 */ })
.catch(err => console.log(err));
```

| 전송 방식 | 용도 |
|---------|------|
| `URLSearchParams` | 간단한 키-밸류 전송 |
| `FormData` | 파일 업로드/멀티파트 |
| `JSON.stringify` | 구조화 데이터 |

**핵심 키워드:** `#REST API` `#fetch` `#URLSearchParams` `#@ResponseBody` `#비동기`

---

## 2. 회원가입: @ModelAttribute + 폼 유효성

```java
// 서버
@PostMapping("/signup2")
public String signup(@ModelAttribute UserVO vo,
                     HttpServletResponse response) throws Exception {
    int cnt = userService.signup(vo);
    if (cnt == 1) {
        return "redirect:/";
    } else {
        response.setContentType("text/html; charset=UTF-8");
        response.getWriter().print("<script>alert('가입 실패');history.back();</script>");
        return null;
    }
}
```

```javascript
// 프론트 유효성 검사
window.onload = function() {
    document.querySelector("input[type='submit']").onclick = function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        if (name.length < 2) {
            alert("이름은 2글자 이상");
            return;
        }

        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!email.match(emailRegex)) {
            alert("이메일 형식 오류");
            return;
        }

        document.forms[0].submit();
    };
};
```

**핵심 키워드:** `#@ModelAttribute` `#redirect` `#preventDefault` `#정규표현식` `#document.forms`

---

## 3. 아이디 찾기: 팝업 + AJAX

```javascript
// 팝업에서 fetch
const params = new URLSearchParams();
params.append("name", document.getElementsByName('name')[0].value);
params.append("email", document.getElementsByName('email')[0].value);

fetch('/findId2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
})
.then(res => res.text())
.then(data => {
    const msg = data ? `회원님의 아이디는 ${data}입니다.` : "아이디를 찾을 수 없습니다.";
    document.getElementById('info').innerHTML = msg;
});
```

```java
// 서버
@PostMapping("/findId2")
@ResponseBody
public String findId(@RequestParam Map<String, Object> params) {
    String id = userService.findId(params);
    return StringUtils.defaultIfEmpty(id, "");
}
```

**핵심 키워드:** `#window.open` `#URLSearchParams` `#application/x-www-form-urlencoded` `#@RequestParam Map` `#StringUtils`

---

## 4. 게시판 글작성과 selectKey 흐름

```java
@PostMapping("/insertBoard2")
public String insertBoard(BoardVO vo, HttpSession session) {
    // 세션에서 로그인 ID 추출 (캐스팅 주의!)
    UserVO loginVO = (UserVO) session.getAttribute("loginVO");
    vo.setId(loginVO.getId());

    // INSERT + selectKey로 SEQ 주입
    boardService.insertBoard(vo);

    // SEQ를 쿼리스트링으로 상세로 리다이렉트
    return "redirect:/detailBoard2?seq=" + vo.getSeq();
}
```

```xml
<insert id="insertBoard">
    <selectKey keyProperty="seq" resultType="int" order="BEFORE">
        SELECT board_seq.NEXTVAL FROM dual
    </selectKey>
    INSERT INTO board (seq, id, title, content)
    VALUES (#{seq}, #{id}, #{title}, #{content})
</insert>
```

> ⚠️ 캐스팅 연산자 우선순위 = `(UserVO) session.getAttribute(...)` → 한 줄 합치면 자동완성 안 뜸

**핵심 키워드:** `#MyBatis selectKey` `#세션캐스팅` `#redirect쿼리스트링` `#BoardVO` `#상세보기`

---

## 5. Thymeleaf 레이아웃 (프래그먼트)

```html
<!-- layout/header.html -->
<nav th:fragment="headerNav">
  <a th:href="@{/boardList2}">게시판</a>
  <a th:href="@{/logout2}">로그아웃</a>
</nav>

<!-- 각 페이지에서 사용 -->
<div th:replace="layout/header :: headerNav"></div>
```

```html
<!-- 문자열 리터럴 (|...|) -->
<td th:text="|작성자: ${vo.id}|"></td>

<!-- 문자열 자르기 -->
<td th:text="${#strings.substring(vo.title, 0, 10)}"></td>
```

**핵심 키워드:** `#th:fragment` `#th:replace` `#문자열리터럴(||)` `##strings` `#레이아웃`

---

## 6. 다중 삭제: 선택자 최적화

```javascript
// 체크된 항목만 한 번에 선택
const checked = document.querySelectorAll("input[type='checkbox'][name='chkVal']:checked");

if (checked.length === 0) {
    alert("선택된 항목이 없습니다.");
    return;
}

// 단일 삭제 → 동일 파라미터명으로 다중 삭제 재사용
location.href = "/multiDelete2?chkVal=" + seq;
```

```java
// 서버: List로 자동 바인딩
@RequestMapping(value = "/multiDelete2", method = {RequestMethod.GET, RequestMethod.POST})
public String multiDelete(@RequestParam List<Integer> chkVal) {
    boardService.deleteMulti(chkVal);
    return "redirect:/boardList2";
}
```

**핵심 키워드:** `#querySelectorAll` `#:checked` `#@RequestParam List` `#@RequestMapping` `#location.href`

---

## 7. 삭제글 복구 — SPA 방식

```javascript
function restore(btn) {
    const tr = btn.closest("tr");
    const seq = tr.children[0].textContent;  // 첫 번째 TD에서 SEQ 추출

    fetch('/listToa2?seq=' + seq)
    .then(res => res.text())
    .then(result => {
        if (result === "true") {
            tr.remove();  // 성공 시 행 제거 (리로드 없음!)
        }
    });
}
```

```java
@GetMapping("/listToa2")
@ResponseBody
public String restore(@RequestParam int seq) {
    int cnt = boardService.restoreBoard(seq);
    return String.valueOf(cnt > 0);
}
```

**핵심 키워드:** `#closest` `#textContent` `#tr.remove` `#response.text` `#SPA`

---

## 8. 회원 검색 — JSON 직렬화 (Jackson)

```javascript
// fetch POST + JSON 응답 처리
fetch('/getSearchUser2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
})
.then(res => res.json())  // Jackson이 List<UserVO> → JSON 배열로 자동 직렬화
.then(list => {
    let html = "<table>";
    list.forEach(user => {
        html += `<tr><td>${user.id}</td><td>${user.name}</td></tr>`;
    });
    html += "</table>";
    document.getElementById('result').innerHTML = html;
});
```

```java
// Jackson 자동 직렬화: List<UserVO> 반환 → JSON 배열
@PostMapping("/getSearchUser2")
public ResponseEntity<List<UserVO>> searchUser(
        @RequestParam Map<String, Object> params) {
    return ResponseEntity.ok(userService.searchUser(params));
}
```

> Jackson databind = spring-web-starter에 포함 → 자동 JSON 직렬화!

**핵심 키워드:** `#Jackson databind` `#response.json` `#Gson` `#템플릿리터럴` `#autocomplete`

---

## 오늘의 핵심 요약

1. `URLSearchParams.append()` = 다중 키-밸류 구성
2. `Content-Type: application/x-www-form-urlencoded` 오타 → 500 에러
3. `@ModelAttribute` = 폼 파라미터 → DTO 세터 자동 바인딩
4. selectKey `order="BEFORE"` = INSERT 전 시퀀스 조회 → DTO에 주입
5. 세션 캐스팅 = `(UserVO) session.getAttribute(...)` 한 줄로 합치면 자동완성 안 뜸
6. `th:replace` = 태그를 fragment로 완전 교체
7. `||` = Thymeleaf 문자열 리터럴 (문자+변수 혼용)
8. `:checked` CSS 선택자 = 체크된 체크박스만 선택
9. `tr.remove()` = SPA 방식으로 리로드 없이 행 삭제
10. Jackson = `spring-web-starter`에 포함 → `List<VO>` 반환 시 자동 JSON 변환
