---
title: "[TIL] 웹 프로토콜과 서블릿 실습"
date: 2026-04-08
tags: [Java, Servlet, HTTP]
---
> 부트캠프 백엔드 과정 · 2026.04.08

## 1. HTTP 요청 메서드 정리 (시험 빈출 ⭐)

| 메서드 | 목적 | 데이터 위치 | 사용 예 |
|--------|------|-----------|--------|
| `GET` | 조회 | URL(쿼리스트링) | 게시글 조회 |
| `POST` | 생성/입력 | Body | 회원가입, 로그인 |
| `PUT` | 전체 수정 | Body | 게시글 전체 수정 |
| `PATCH` | 부분 수정 | Body | 제목만 수정 |
| `DELETE` | 삭제 | URL/Body | 글 삭제 |

```
POST 요청 구조:
POST /endpoint HTTP/1.1
Host: example.com
Content-Type: application/json

{"name":"홍길동","age":25}
```

---

## 2. HTTP 상태 코드

| 코드 | 의미 | 발생 상황 |
|------|------|---------|
| `200` | 성공 | 정상 처리 |
| `400` | 잘못된 요청 | 파라미터 누락/형식 오류 |
| `404` | 리소스 없음 | URL/매핑 미존재 |
| `405` | 메서드 불허용 | POST 전용에 GET 요청 |
| `500` | 서버 오류 | 내부 예외 발생 |

---

## 3. Postman 기반 요청 테스트

```
Postman 용도:
  - GET/POST/PUT/DELETE 등 다양한 메서드 테스트
  - Body 입력, 헤더 설정 GUI로 관리
  - 브라우저 주소창은 GET만 가능 → Postman으로 POST 테스트
```

---

## 4. 서블릿 컨트롤러 설계

| 기능 | 서블릿 | 메서드 | 의도 |
|------|--------|--------|------|
| 로그인/로그아웃 | LoginServlet | POST=로그인, GET=로그아웃 | 로그인은 Body 전송 |
| 마이페이지 | UserInfoServlet | GET | 세션 기반 조회 |
| 수정 | UserModifyServlet | GET=폼, POST=저장 | 화면/저장 분리 |
| 탈퇴 | DelUserServlet | GET | enable 변경 |
| 회원가입 | RegisterServlet | GET=폼, POST=처리 | 화면/저장 분리 |

---

## 5. Request/Session 스코프와 포워드 흐름

```java
// Request 스코프: 1회 포워드 범위
request.setAttribute("userInfo", dto);
request.getRequestDispatcher("/WEB-INF/views/userInfo.jsp")
       .forward(request, response);

// Session 스코프: 여러 페이지에서 공유
HttpSession session = request.getSession();
session.setAttribute("loginDto", memberDto);

// 로그아웃
session.invalidate();         // 세션 전체 삭제
session.removeAttribute("key"); // 특정 키만 삭제

// 세션 만료 설정
session.setMaxInactiveInterval(1800); // 30분
```

---

## 6. web-inf 보안 영역

```
/WEB-INF/ = 외부 URL 직접 접근 불가 (보안 영역)
→ 서블릿을 통해 forward로만 접근 가능

/webapp/ 루트 = 직접 URL 접근 가능 (공개 영역)
→ index.jsp, 정적 리소스 등

포워드: 서버 내부 이동 (request 유지)
리다이렉트: 클라이언트에 새 URL 요청 (request 끊김)
```

| 구분 | 핵심 | 데이터 전달 | 용도 |
|------|------|-----------|------|
| `forward` | 서버 내부 이동 | request 유지 | 보안 영역 JSP 이동 |
| `redirect` | 클라이언트 새 요청 | request 끊김 | 로그인 후 초기화 |

---

## 7. 로그인/로그아웃 구현 패턴

```java
// 로그인 서블릿 (POST)
request.setCharacterEncoding("UTF-8");
response.setContentType("text/html; charset=UTF-8");

String id = request.getParameter("id");
String pw = request.getParameter("pw");

Map<String, Object> params = new HashMap<>();
params.put("id", id);
params.put("password", pw);

MemberDTO dto = dao.login(params);

if (dto != null) {
    // 세션 저장
    HttpSession session = request.getSession();
    session.setAttribute("loginDto", dto);

    // 성공 페이지로 포워드
    request.getRequestDispatcher("/WEB-INF/views/main.jsp")
           .forward(request, response);
} else {
    // 실패 시 스크립트 응답
    PrintWriter out = response.getWriter();
    out.print("<script>alert('로그인 실패');location.href='/';</script>");
}
```

---

## 8. 회원가입 구현

```java
// POST 처리
String id = request.getParameter("id");
String name = request.getParameter("name");
String password = request.getParameter("pw");
String email = request.getParameter("email");

MemberDTO dto = MemberDTO.builder()
    .id(id).name(name).password(password).email(email)
    .build();

int cnt = dao.register(dto);

if (cnt == 1) {
    response.sendRedirect("/");  // 성공 시 로그인 페이지로
} else {
    response.sendRedirect("/RegisterServlet");  // 실패 시 재입력
}
```

> 폼의 `name` 속성 = 서버 파라미터 키 (반드시 일치)

---

## 오늘의 핵심 요약

1. GET = URL 노출 / POST = Body 전송 (민감 정보는 POST)
2. `405` = HTTP 메서드 불허용 → Postman으로 올바른 메서드 확인
3. `/WEB-INF/` = 보안 영역 → `forward()`로만 접근
4. `forward` = request 유지 / `redirect` = request 끊김
5. 로그인 성공 → `session.setAttribute("loginDto", dto)`
6. 로그아웃 → `session.invalidate()`
7. 인코딩 = 요청/응답 둘 다 UTF-8 설정 필수
8. DML 성공 = cnt == 1 로 검증
9. 논리 삭제 = enable 컬럼 Y/N 변경 (실제 삭제 X)
10. 폼 `name` 속성 없으면 서버에서 파라미터 못 받음
