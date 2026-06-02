---
title: "[TIL] 스프링 부트 MVC 테스트, 화면, Ajax"
date: 2026-04-23
tags: [SpringBoot, MVC, Test, AJAX]
---
> 부트캠프 백엔드 과정 · 2026.04.23

## 1. Spring Boot 빈/MyBatis 구성 테스트

```java
@SpringBootTest
class ConfigTest {

    @Autowired
    ApplicationContext ctx;

    @Autowired
    SqlSessionTemplate template;

    @Test
    void dataSourceTest() throws Exception {
        DataSource ds = (DataSource) ctx.getBean("dataSource");
        Connection conn = ds.getConnection();
        DatabaseMetaData meta = conn.getMetaData();
        System.out.println("URL: " + meta.getURL());
    }

    @Test
    void mapperTest() {
        Configuration config = template.getConfiguration();
        boolean hasMapper = config.hasMapper(BoardMapper.class);
        assertNotNull(config.getMappedStatement("com.example.mapper.BoardMapper.getAllBoard"));
    }
}
```

| 검증 대상 | 방법 |
|---------|------|
| DataSource 빈 생성 | `getBean("dataSource")` + `getConnection()` |
| 매퍼 등록 | `config.hasMapper(클래스)` |
| 스테이트먼트 등록 | `getMappedStatement("ns.id")` |

**핵심 키워드:** `#DataSource` `#ApplicationContext` `#SqlSessionTemplate` `#Configuration` `#MappedStatement`

---

## 2. @SpringBootTest DAO 테스트

```java
@SpringBootTest  // 스프링 컨테이너 로딩 필수!
class BoardDAOTest {

    @Autowired  // 순수 JUnit에서는 null → @SpringBootTest 필요
    IBoardDAO boardDAO;

    @Test
    void getAllTest() {
        List<BoardVO> list = boardDAO.getAllBoard();
        assertNotEquals(0, list.size());
    }

    @Test
    void insertTest() {
        BoardVO vo = new BoardVO();
        vo.setId("user01");
        vo.setTitle("테스트 제목");
        int cnt = boardDAO.insertBoard(vo);
        assertEquals(1, cnt);
    }

    @Test
    void multiDeleteTest() {
        List<Integer> seqList = Arrays.asList(1, 2);
        int cnt = boardDAO.delFlagList(seqList);
        assertEquals(2, cnt);
    }
}
```

> 순수 JUnit = 스프링 컨테이너 X → `@Autowired` null → NPE
> `@SpringBootTest` = 컨테이너 로딩 → 주입 가능

**핵심 키워드:** `#@SpringBootTest` `#@Autowired` `#JUnit` `#Assert` `#DAO`

---

## 3. 자동 아이디 생성 SQL (Oracle)

```sql
-- 일반 사용자만 필터링해서 다음 아이디 생성
SELECT 'user' || LPAD(MAX(SUBSTR(id, 5, 2)) + 1, 2, '0')
FROM member
WHERE id LIKE 'user__'

-- 단계별 이해
-- 1. SUBSTR(id, 5, 2) → "01", "02" 등 숫자부 추출
-- 2. MAX(...) + 1 → 다음 값
-- 3. LPAD(3, 2, '0') → "03" (2자리 고정)
-- 4. 'user' || '03' → "user03"
```

> ⚠️ `LIKE 'user__'` = 범위 제한 필수 (admin 등 다른 패턴 제외)

**핵심 키워드:** `#LIKE` `#SUBSTR` `#MAX` `#LPAD` `#접두사`

---

## 4. MVC 구현: 서비스 계층과 컨트롤러

```java
// 서비스 구현체
@Service
@RequiredArgsConstructor
public class BoardServiceImpl implements IBoardService {

    private final IBoardMapper boardMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int replyBoard(BoardVO vo) throws Exception {
        int updateCnt = boardMapper.replyUpdate(vo);  // STEP 밀기
        if (updateCnt < 0) throw new Exception("정렬 실패");
        return boardMapper.replyInsert(vo);           // 답글 삽입
    }
}

// 컨트롤러
@Controller
@RequiredArgsConstructor
public class UserController {

    @PostMapping("/login2")
    public String login(@RequestParam Map<String, Object> params,
                        HttpSession session) {
        UserVO vo = userService.login(params);
        if (vo != null) {
            session.setAttribute("loginVO", vo);
            session.setMaxInactiveInterval(1800);  // 30분
            return "redirect:/boardList2";
        }
        return "redirect:/";
    }
}
```

**핵심 키워드:** `#@Service` `#@Transactional` `#HttpSession` `#Model` `#리다이렉트`

---

## 5. Thymeleaf 화면: 스코프, th:block, uText

```html
<!-- 세션 값 참조 (모델과 구분!) -->
<span th:text="${session.loginVO.name}"></span>
<!-- ${loginVO} ← 모델 스코프 탐색 (세션 아님!) -->

<!-- 태그 없는 조건 처리 -->
<th:block th:if="${vo.depth > 0}">
  <img src="/img/reply.png" width="16">
</th:block>

<!-- HTML 태그 포함 문자열 렌더링 -->
<td th:utext="${vo.title}"></td>
<!-- th:text 쓰면 태그가 문자로 출력됨 -->

<!-- 문자열 자르기 -->
<span th:text="${#strings.substring(vo.regDate, 0, 10)}"></span>
```

| 문법 | 의미 |
|------|------|
| `${session.loginVO}` | 세션 스코프 접근 |
| `th:block` | DOM 태그 추가 없는 조건 블록 |
| `th:utext` | HTML 태그 렌더링 |
| `#strings.substring` | 문자열 자르기 유틸 |

> 정적 파일(CSS/JS/이미지) = `resources/static/` → `/img/...`로 접근

**핵심 키워드:** `#th:block` `#th:utext` `#세션스코프` `#static` `##strings`

---

## 6. Ajax 아이디 중복검사: jQuery vs Fetch + REST

```javascript
// jQuery Ajax
$.ajax({
    url: '/checkId',
    type: 'POST',
    data: { id: inputId },
    dataType: 'json',  // 자동 파싱
    success: function(data) {
        console.log(data.isOk);
    }
});

// Fetch
fetch('/checkId', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'id=' + inputId
})
.then(res => res.json())
.then(data => console.log(data.isOk));
```

```java
// 서버
@RestController
public class UserRestController {

    @PostMapping("/checkId")
    public ResponseEntity<Map<String, Object>> checkId(
            @RequestParam String id) {
        boolean isOk = (userService.checkId(id) == 0);
        Map<String, Object> result = new HashMap<>();
        result.put("isOk", isOk);
        return ResponseEntity.ok(result);
    }
}
```

| 방식 | 설치 필요 | 특징 |
|------|---------|------|
| jQuery Ajax | 필요 | 짧고 콜백 단순, 레거시에서 자주 |
| fetch | 불필요 | Promise 기반, 현대 표준 |
| axios | 필요 | Promise 기반, SPA에서 자주 |

**핵심 키워드:** `#@RestController` `#jQuery Ajax` `#fetch` `#Gson` `#ResponseEntity`

---

## 오늘의 핵심 요약

1. 순수 JUnit = 스프링 컨테이너 X → `@SpringBootTest` 필수
2. `getMappedStatement("ns.id")` = 스테이트먼트 등록 여부 확인
3. Oracle 자동 채번 = `LPAD(MAX(SUBSTR(...)) + 1, 2, '0')` + LIKE 범위 제한
4. 답글 트랜잭션 = UPDATE(STEP 밀기) + INSERT → `@Transactional` 필수
5. `session.loginVO` ≠ `loginVO` → 세션 스코프는 `${session.xxx}` 명시
6. `th:utext` = HTML 태그 렌더링 / `th:text` = 텍스트만 (이스케이프)
7. `th:block` = 태그 없는 조건 블록
8. `ResponseEntity.ok(data)` = 상태코드 200 + 바디 함께 반환
9. jQuery `dataType: 'json'` = 응답 자동 파싱
10. `session.setMaxInactiveInterval(1800)` = 세션 30분 타임아웃
