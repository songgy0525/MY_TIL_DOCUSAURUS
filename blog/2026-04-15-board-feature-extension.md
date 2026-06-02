---
title: "[TIL] 답변형 게시판 기능 확장"
date: 2026-04-15
tags: [JavaScript, Java, SweetAlert2, 페이징]
---
> 부트캠프 백엔드 과정 · 2026.04.15

## 1. 완전 삭제(DB 삭제) 구현

```javascript
function del(e) {
    const ok = confirm("선택된 글이 완전 삭제됩니다.");
    const seq = document.querySelector('input[name="seq"]').value;

    if (ok === true) {
        location.href = "./realDelete.do?seq=" + seq;
    } else {
        alert("삭제가 취소되었습니다.");
    }
}
```

> ⚠️ 객체는 존재만 해도 truthy → 비교 시 `=== true` 명시 권장

---

## 2. 체크박스 다중 삭제 전체선택/유효성

```javascript
// 전체 선택
document.getElementById('allCheck').addEventListener('click', function() {
    const checks = document.getElementsByName('ch');
    Array.from(checks).forEach(chk => {
        chk.checked = this.checked;
    });
});

// 체크 개수 카운트
function chCheckCount() {
    const chks = document.getElementsByName('ch');
    let cnt = 0;
    for (let i = 0; i < chks.length; i++) {
        if (chks[i].checked === true) cnt++;
    }
    return cnt;
}

// submit 유효성
function chkSubmit(event) {
    event.preventDefault();
    if (chCheckCount() <= 0) {
        alert("선택된 글이 없습니다.");
        return;
    }
    document.forms[0].submit();
}
```

---

## 3. SweetAlert2 콜백 기반 Submit 제어

```javascript
function chkSubmit(event) {
    event.preventDefault();
    const cnt = chCheckCount();
    if (cnt <= 0) {
        Swal.fire("선택된 글이 없습니다.");
        return;
    }

    Swal.fire({
        title: "다중삭제를 진행하시겠습니까?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "삭제",
        cancelButtonText: "취소"
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire("완료", "", "success").then(() => {
                document.forms[0].submit();
            });
        } else {
            Swal.fire("취소되었습니다.", "", "info");
        }
    });
}
```

> 콜백 중첩이 깊어지면 콜백 지옥 → Promise/async-await로 해결

---

## 4. 서블릿 Filter — 세션 접근 제어

```java
List<String> excludeUrls = Arrays.asList(
    "/LoginServlet2", "/RegisterServlet2",
    "/js/", "/css/", "/img/"
);

String path = ((HttpServletRequest) req).getServletPath();

boolean isExclude = excludeUrls.stream()
    .anyMatch(url -> path.startsWith(url));

if (!isExclude) {
    HttpSession session = ((HttpServletRequest) req).getSession();
    if (session.getAttribute("loginDto") == null) {
        req.getRequestDispatcher("/WEB-INF/views/login.jsp")
           .forward(req, res);
        return;
    }
}
chain.doFilter(req, res);
```

---

## 5. 페이징 쿼리와 연산

```sql
-- 현재 페이지 데이터 조회
SELECT * FROM answerboard
ORDER BY ref DESC, step ASC
OFFSET #{offset} ROWS FETCH NEXT #{pageSize} ROWS ONLY;

-- 전체 건수
SELECT COUNT(*) FROM answerboard;
```

```java
// 페이징 연산
int currentPage = Integer.parseInt(pageParam == null ? "1" : pageParam);
int pageSize = 10;
int pageBlock = 5;
int offset = (currentPage - 1) * pageSize;
int totalPage = (int) Math.ceil((double) totalCount / pageSize);

int startPage = ((currentPage - 1) / pageBlock) * pageBlock + 1;
int endPage = startPage + pageBlock - 1;
if (endPage > totalPage) endPage = totalPage;
```

```jsp
<!-- 역순 연번 -->
${totalCount - ((currentPage-1) * pageSize) - vs.index}
```

---

## 오늘의 핵심 요약

1. SweetAlert2 = `.then(result => result.isConfirmed)` 패턴
2. 콜백 중첩 → Promise로 해결 (콜백 지옥 방지)
3. 체크박스 상태 = `value` X → `checked` (true/false)
4. 필터 Exclude = `startsWith()`로 경로 패턴 매칭
5. OFFSET/FETCH = Oracle 12c+ 페이징 쿼리
6. `pageParam == null ? "1" : pageParam` = 첫 페이지 디폴트 처리
7. 역순 번호 = `totalCount - offset - index`
8. 완전 삭제 = 관리자만 가능 (role 체크 필수)
9. GNB Active = `classList.remove('active')` 전체 후 `add('active')` 클릭 요소에
10. `DOMContentLoaded` = 모든 리소스 로드 기다리지 않고 DOM 준비 시 실행
