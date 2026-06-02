---
title: "[TIL] JSP 게시판 마무리와 JS 검증"
date: 2026-04-14
tags: [JSP, JavaScript, 게시판]
---
> 부트캠프 백엔드 과정 · 2026.04.14

## 1. MVC 요청-응답 흐름 정리

```
URL 요청
    ↓
Controller (서블릿) → 파라미터 처리
    ↓
DAO/MyBatis → DB CRUD
    ↓
request.setAttribute(key, value)
    ↓
forward → JSP (JSTL/EL로 HTML 렌더링)
    ↓
응답
```

---

## 2. Bootstrap 적용과 CSS 오버라이딩

```html
<!-- Bootstrap 3 = jQuery 필요 / Bootstrap 4,5 = ES 기반 -->
<!-- 남의 CSS 위에, 내 CSS 아래에 (오버라이딩) -->
<link rel="stylesheet" href="bootstrap.min.css">
<link rel="stylesheet" href="my.css">   <!-- 내 CSS는 아래에 -->
```

---

## 3. 리스트 화면 — JSTL 핵심 패턴

```jsp
<!-- 빈 목록 처리 -->
<c:if test="${empty list}">
    <tr><td colspan="5">작성된 글이 없습니다.</td></tr>
</c:if>

<!-- 답글 들여쓰기 (depth 기반) -->
<c:if test="${dto.depth > 0}">
    <img src="/img/reply.png" width="16" style="margin-left:${dto.depth * 20}px">
</c:if>

<!-- 삭제글 처리 -->
<c:choose>
    <c:when test="${dto.delFlag == 'Y'}">
        <span>관리자에 의해 삭제되었습니다.</span>
    </c:when>
    <c:otherwise>
        <a href="./DetailBoardServlet2?seq=${dto.seq}">${dto.title}</a>
    </c:otherwise>
</c:choose>
```

---

## 4. 페이지 이탈 방지와 단축키 차단

```javascript
let isShow = true;  // 저장되지 않은 상태 플래그

window.onbeforeunload = function() {
    if (isShow) return "저장되지 않은 내용이 있습니다.";
};

// 제출 시 경고 비활성화
function submitForm() {
    isShow = false;
    document.forms[0].submit();
}

// 키 차단
let isCtrl = false;
document.addEventListener('keydown', function(e) {
    if (e.keyCode === 17) isCtrl = true;  // Ctrl

    if (e.keyCode === 116 ||              // F5 (새로고침)
        (isCtrl && e.keyCode === 82) ||   // Ctrl+R
        (isCtrl && e.keyCode === 78)) {   // Ctrl+N
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
});
document.addEventListener('keyup', function(e) {
    if (e.keyCode === 17) isCtrl = false;
});
```

---

## 5. XSS 방어 전략

| 방어 위치 | 방법 | 특징 |
|---------|------|------|
| 클라이언트 입력 | 정규식 + replace 엔티티 치환 | 즉시 적용 |
| JSP 출력 | `c:out` | 이스케이프 출력 |
| 서버 전역 | Filter + RequestWrapper | 가장 강력 |

```javascript
// 태그 제거
const cleaned = text.replace(/<[^>]+>/ig, "");

// 엔티티 치환
const safe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
                 .replace(/\r\n|\n/g, "<br>");
```

---

## 오늘의 핵심 요약

1. MVC 흐름: 컨트롤러 → DAO → setAttribute → JSP forward
2. Bootstrap CSS = 위에 / 내 CSS = 아래에 (오버라이딩 위해)
3. 답글 들여쓰기 = `depth * 20px` margin-left
4. 삭제글 = `delFlag == 'Y'` 조건으로 텍스트 대체
5. `onbeforeunload` + 플래그로 정상 제출 시 경고 비활성화
6. Ctrl 키 상태 = `keydown`/`keyup`으로 추적
7. XSS = `c:out`으로 이스케이프 출력 또는 Filter로 전역 방어
8. `fn:length(list)` = JSTL 함수 태그 (taglib 별도 선언 필요)
9. `fmt:parseDate` + `fmt:formatDate` = 날짜 문자열 변환
10. 정적 include = taglib 선언이 헤더에 있으면 하위 페이지에 전파됨
