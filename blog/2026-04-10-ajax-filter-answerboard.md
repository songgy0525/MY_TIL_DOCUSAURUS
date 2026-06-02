---
title: "[TIL] AJAX 권한수정, 필터, 답글게시판"
date: 2026-04-10
tags: [AJAX, Java, Servlet]
---
> 부트캠프 백엔드 과정 · 2026.04.10

## 1. AJAX 권한 변경과 DOM 갱신

```javascript
// fetch POST (form 인코딩 방식)
fetch("./AuthUpdateServlet2", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "id=" + encodeURIComponent(id)
})
.then(res => res.json())
.then(data => {
    if (data.success === true) {
        // DOM에서 해당 행 권한 셀 텍스트 변경 (리로드 없음)
        const tr = event.target.closest('tr');
        tr.cells[3].textContent = data.newAuth;
    } else {
        alert("권한 변경 실패");
    }
});
```

> 공통 CSS는 헤더 JSP에 올려 include된 모든 페이지가 공유하게 구성

---

## 2. 서블릿 필터 — 인코딩 + 로그인 체크

```java
@WebFilter(urlPatterns = "/*")
public class LoginFilter implements Filter {

    // 필터 제외 URL 목록
    List<String> excludeList = Arrays.asList(
        "/LoginServlet2", "/RegisterServlet2",
        "/js/register.js", "/css/style.css"
    );

    @Override
    public void doFilter(ServletRequest req, ServletResponse res,
                         FilterChain chain) throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        // 인코딩 처리
        request.setCharacterEncoding("UTF-8");
        response.setContentType("text/html; charset=UTF-8");

        String path = request.getServletPath();

        if (!excludeList.contains(path)) {
            HttpSession session = request.getSession();
            if (session.getAttribute("loginDto") == null) {
                // 미로그인 → 로그인 폼으로 포워드
                request.getRequestDispatcher("/WEB-INF/views/login.jsp")
                       .forward(request, response);
                return;
            }
        }

        chain.doFilter(request, response);  // 반드시 호출!
    }
}
```

---

## 3. 답변형 게시판 — REF/STEP/DEPTH 설계 (시험 빈출 ⭐)

```
답글 구조 핵심 컬럼:
  REF   = 같은 루트글의 그룹 식별자
  STEP  = 그룹 내 출력 순서 (답글 입력 시 밀어내기 필요)
  DEPTH = 들여쓰기 깊이

정렬: REF DESC, STEP ASC

루트글 입력:
  REF = NVL(MAX(REF), 0) + 1
  STEP = 0, DEPTH = 0

답글 입력 (트랜잭션으로 묶어야 함):
  [1] UPDATE: 같은 REF에서 부모 STEP보다 큰 것들 STEP + 1
  [2] INSERT: 부모 기준 STEP+1, DEPTH+1로 답글 삽입
```

```sql
-- STEP 밀기 (답글 입력 전)
UPDATE answerboard
SET step = step + 1
WHERE ref = #{ref} AND step > #{step};

-- 답글 삽입
INSERT INTO answerboard (seq, id, title, content, ref, step, depth, reg_date)
VALUES (answerboard_seq.NEXTVAL, #{id}, #{title}, #{content},
        #{ref}, #{step}+1, #{depth}+1, SYSDATE);
```

---

## 4. MyBatis SqlSessionFactory JUnit 테스트

```java
@Test
public void testSession() {
    SqlSessionFactory factory = SqlSessionManager.getFactory();
    SqlSession session = factory.openSession();
    assertNotNull(session);  // 세션 생성 성공 여부 확인
    session.close();
}
```

---

## 오늘의 핵심 요약

1. `chain.doFilter()` 누락 → 다음 단계로 흐름이 안 이어짐
2. 필터 Exclude URL = 로그인/회원가입/정적 리소스 제외 필수
3. 답글 = UPDATE(STEP 밀기) + INSERT(답글 삽입) → 트랜잭션 필수
4. REF = 그룹 / STEP = 순서 / DEPTH = 들여쓰기
5. `NVL(MAX(REF), 0) + 1` = 루트글 REF 채번 (공집합 처리)
6. AJAX 응답 = DOM 직접 변경 (SPA 방식)
7. `encodeURIComponent()` = 한글 파라미터 안전 처리
8. 정적 리소스(JS/CSS)는 WEB-INF 밖 webapp에 배치
9. JSTL taglib는 헤더 JSP에 선언하면 include된 페이지에 전파
10. Tomcat에 새 서블릿 추가 → 재시작 필요 (자동 인식 안 됨)
