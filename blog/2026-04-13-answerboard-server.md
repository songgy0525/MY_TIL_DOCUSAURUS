---
title: "[TIL] 답변형 게시판 서버사이드 구현"
date: 2026-04-13
tags: [Java, Servlet, MyBatis]
---
> 부트캠프 백엔드 과정 · 2026.04.13

## 1. MyBatis Mapper XML 핵심 구성

```xml
<!-- selectKey: INSERT 전 시퀀스 선조회 → DTO에 seq 주입 -->
<insert id="insertBoard" parameterType="AnswerBoardDTO">
    <selectKey keyProperty="seq" resultType="int" order="BEFORE">
        SELECT answerboard_seq.NEXTVAL AS seq FROM dual
    </selectKey>
    INSERT INTO answerboard (seq, id, title, content, ref, step, depth)
    VALUES (#{seq}, #{id}, #{title}, #{content}, #{ref}, #{step}, #{depth})
</insert>

<!-- 다중 삭제: foreach로 IN 절 구성 -->
<delete id="deleteBoards">
    DELETE FROM answerboard
    WHERE seq IN
    <foreach collection="list" item="seq" open="(" close=")" separator=",">
        #{seq}
    </foreach>
</delete>
```

| Mapper 기능 | 핵심 태그 | 포인트 |
|-----------|---------|--------|
| 전체/상세 조회 | `<select>` + `resultType` | 조인으로 name 컬럼 포함 |
| 루트글 입력 | `<insert>` + `<selectKey>` | 시퀀스를 DTO에 먼저 주입 |
| 답글 트랜잭션 | UPDATE + INSERT | DAO에서 수동 commit/rollback |
| 다중 삭제 | `<foreach>` | IN 절 자동 생성 |
| Config 연결 | `<mappers>` | 등록 누락 시 statement not found |

---

## 2. DAO 트랜잭션 처리 패턴

```java
// 답글 등록: UPDATE + INSERT를 하나의 트랜잭션으로
public int replyBoard(AnswerBoardDTO dto) {
    SqlSession session = factory.openSession(false); // 수동 커밋
    int result = 0;
    try {
        // 1. STEP 밀기
        int updateCnt = session.update(NS + "replyUpdate", dto);
        // 2. 답글 삽입
        int insertCnt = session.insert(NS + "replyInsert", dto);

        if (updateCnt > 0 && insertCnt == 1) {
            session.commit();
            result = 1;
        } else {
            session.rollback();
        }
    } catch (Exception e) {
        session.rollback();
        log.error("답글 등록 실패", e);
    } finally {
        session.close();  // 반드시 닫기
    }
    return result;
}
```

---

## 3. 서블릿 컨트롤러 패턴

| Servlet | 역할 | 메서드 |
|---------|------|--------|
| `LoginServlet2` | 로그인/로그아웃 | POST=로그인, GET=로그아웃 |
| `BoardListServlet2` | 전체 글 조회 | GET |
| `DetailBoardServlet2` | 상세 조회 | GET |
| `WriteBoardServlet2` | 글 작성 | GET=폼, POST=저장 |
| `ModifyBoardServlet2` | 수정 | GET=폼, POST=수정 |

---

## 4. 권한/작성자 체크와 공통 Alert 유틸

```java
// 권한 체크
Object loginObj = session.getAttribute("loginDto");
MemberDTO loginDto = (MemberDTO) loginObj;

if (!"ROLE_ADMIN".equalsIgnoreCase(loginDto.getAuth())) {
    Utils.servletAlert(response, "권한 없음", "/");
    return;
}

// 공통 Alert 유틸
public static void servletAlert(HttpServletResponse resp,
                                 String msg, String url) throws IOException {
    PrintWriter out = resp.getWriter();
    out.print("<script>");
    out.print("alert('" + msg + "');");
    out.print("location.href='" + url + "';");
    out.print("</script>");
    out.flush();
}
```

---

## 오늘의 핵심 요약

1. `selectKey order="BEFORE"` = INSERT 전 시퀀스 조회 → DTO에 주입
2. 답글 = UPDATE(STEP 밀기) + INSERT → 반드시 트랜잭션으로 묶기
3. 트랜잭션 실패 → `rollback()` + `finally { session.close(); }`
4. `selectOne` 결과 없음 → `null` / `selectList` 결과 없음 → 빈 리스트
5. DAO 공통 멤버: Logger + SqlSessionFactory + NS 상수
6. JUnit `@SpringBootTest` = 스프링 컨테이너 로딩 (Autowired 주입 가능)
7. Mapper XML → Config `<mappers>` 등록 → 가장 흔한 실수
8. 세션 캐스팅: `(MemberDTO) session.getAttribute("loginDto")`
9. 유틸 클래스 = 반복되는 스크립트 응답을 공통 메서드로
10. `ROLE_ADMIN` 대소문자 비교 = `equalsIgnoreCase()` 안전
