---
title: "[TIL] 회원관리 JSP, 서블릿 실습 정리"
date: 2026-04-09
tags: [JSP, Servlet, Java]
---
> 부트캠프 백엔드 과정 · 2026.04.09

## 1. AJAX JSON 기반 아이디 중복검사

```java
// 서블릿 (AJAX 응답)
boolean isUsable = (dao.duplicateId(id) == null);
response.getWriter().write("{\"available\":" + isUsable + "}");
response.getWriter().flush();
```

```javascript
// 프론트 fetch
fetch("./DuplicateIdServlet2?id=" + id)
    .then(res => res.json())
    .then(data => {
        if (data.available) {
            alert("사용 가능!");
        } else {
            alert("이미 사용 중!");
        }
    });
```

> AJAX = 값 반환 / 일반 서블릿 = HTML 반환 → 응답 목적에 따라 설계 다름

---

## 2. 회원가입 유효성 + readonly 전송 주의

```javascript
// 이메일 정규식 검사
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
if (!emailRegex.test(email)) {
    alert("이메일 형식 오류");
    return;
}

// ⚠️ readonly input은 서버로 전송 안 됨!
// submit 직전 readonly 해제 필수
document.getElementById('id').removeAttribute('readonly');
document.forms[0].submit();
```

---

## 3. JSP 인클루드와 헤더 컴포넌트화

```jsp
<!-- 정적 include: 컴파일 시점에 파일 병합 -->
<%@ include file="Header.jsp" %>

<!-- Header.jsp 안에서 세션 체크 -->
<c:if test="${empty sessionScope.loginDto}">
    <% response.sendRedirect("/"); %>
</c:if>
```

```
JSP include 구조 vs React 컴포넌트:
  JSP: 컴파일 시점 병합, EL/JSTL로 데이터 전달
  React: 런타임 렌더링, props로 명시 전달
```

---

## 4. 관리자 목록 + AJAX 권한 변경

```javascript
// 권한 변경 버튼 클릭
function changeAuth(userId) {
    fetch("./AuthUpdateServlet2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "id=" + encodeURIComponent(userId)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // DOM 탐색으로 해당 셀 텍스트 변경
            const row = document.getElementById('row-' + userId);
            row.cells[3].textContent = data.newAuth;  // cells 복수형 주의!
        }
    });
}
```

> ⚠️ `onclick="fn('문자열')"` → 문자열 인자는 반드시 따옴표로 감싸기
> `cell` vs `cells` 오타 → 콘솔 에러로 즉시 확인

---

## 5. 오늘의 핵심 요약

1. AJAX 응답 = JSON 텍스트 / 일반 서블릿 = HTML
2. `readonly` input = 서버로 전송 안 됨 → submit 전 `removeAttribute` 필수
3. JSP 정적 include = 컴파일 시 병합 → taglib 선언도 전파됨
4. 세션 체크는 Header.jsp에서 공통 처리 → 이후 Filter로 확장
5. AJAX DOM 갱신 = SPA처럼 특정 셀만 변경 (리로드 없음)
6. `encodeURIComponent()` = 한글 등 비ASCII 문자 인코딩
7. `document.forms[0].submit()` = 수동 폼 전송
8. 로그인 후 쿠키 JSESSIONID = 세션 식별자
9. 문자열 인자 onclick 전달 시 따옴표 정확히 감싸기
10. `cells` (복수) vs `cell` (단수) 오타 주의
