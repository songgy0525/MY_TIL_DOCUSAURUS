---
title: "[TIL] JSP, JSTL, MyBatis 회원관리 구축"
date: 2026-04-07
tags: [JSP, JSTL, MyBatis]
---
> 부트캠프 백엔드 과정 · 2026.04.07

## 오늘 배운 흐름 한눈에 보기

```
JSP/JSTL 렌더링 모델 → Maven 웹프로젝트 세팅
→ 서블릿 매핑 + MIME 타입
→ JSTL (core/fmt) + EL + 스코프
→ 회원관리 DB 설계 + 쿼리 테스트
→ 프로젝트 문서화 → DTO + Lombok
→ MyBatis 설정 → SqlSessionFactory JUnit
→ 동적 SQL (set/if) → DAO JUnit 테스트
→ Postman 설치
```

---

## 1. JSTL과 JSP 렌더링 모델

```
WAS 처리 흐름:
요청 → 서블릿/JSP 실행 → HTML 생성 → 응답

JSP = Java + HTML 혼합
JSTL = JSP에서 자바 로직을 태그로 표현 (스크립틀릿 대체)

React 방식 vs JSP 방식:
  React = 별도 포트 → JSON 받아 프론트가 렌더링 (CORS 이슈)
  JSP   = 서버 내부에서 렌더링 → CORS 없음
```

**핵심 키워드:** `#WAS` `#JSP` `#JSTL` `#CORS` `#서버사이드렌더링`

---

## 2. Maven 웹프로젝트 세팅

| 구성 항목 | 설정 값 | 주의사항 |
|---------|--------|--------|
| Dynamic Web Module | 6.0 | Tomcat 10+에 대응 |
| Servlet API | Jakarta Servlet 6.0 | Tomcat 10+ = jakarta.* |
| JSTL | API + 구현체 | API와 구현체 버전 일치 필수 |
| OJDBC | ojdbc11 | DB 버전과 맞춰야 함 |
| MyBatis | mybatis 3.5.x | Mapper/Config 구조 함께 설계 |
| Logback | logback-classic/core | 같은 버전으로 맞추기 |
| Lombok | lombok | IDE 플러그인 설치 확인 |
| JUnit4 | junit 4.13.2 | 테스트는 서버사이드 완성 후 |

**핵심 키워드:** `#Maven` `#DynamicWebModule` `#web.xml` `#의존성정합성` `#Tomcat`

---

## 3. JSTL 태그라이브러리, EL, 스코프

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
```

### EL 스코프 (시험 빈출 ⭐)

| 스코프 | 의미 | 대표 사용 |
|--------|------|---------|
| `requestScope` | 1회 요청-응답 | 조회 결과 전달 |
| `sessionScope` | 사용자 세션 | 로그인 정보 |
| `applicationScope` | 서버 전역 | 공통 캐시 |
| `param` | URL/폼 파라미터 | 검색어, 페이지 번호 |

```jsp
${requestScope.list}   <!-- request 스코프 명시 -->
${param.query}         <!-- URL 파라미터 -->
${sessionScope.loginDto} <!-- 세션 -->
```

---

## 4. JSTL core 핵심 태그

```jsp
<!-- 변수 선언 -->
<c:set var="name" value="${dto.name}" />

<!-- 안전 출력 (XSS 방지) -->
<c:out value="${dto.content}" />

<!-- 반복 -->
<c:forEach var="dto" items="${list}" varStatus="vs">
    <tr>
        <td>${vs.index}</td>  <!-- 0부터 -->
        <td>${vs.count}</td>  <!-- 1부터 -->
        <td>${vs.first}</td>  <!-- 첫 번째면 true -->
        <td>${dto.name}</td>
    </tr>
</c:forEach>

<!-- 조건 -->
<c:if test="${dto.role == 'ROLE_ADMIN'}">
    <button>관리자 전용</button>
</c:if>

<!-- 다중 조건 -->
<c:choose>
    <c:when test="${dto.enable == 'Y'}">사용 중</c:when>
    <c:otherwise>탈퇴</c:otherwise>
</c:choose>
```

---

## 5. JSTL fmt — 날짜 포맷

```jsp
<!-- Date → 문자열 -->
<fmt:formatDate value="${dto.joinDate}" pattern="yyyy-MM-dd HH:mm:ss" />

<!-- 문자열 → Date → 포맷 변환 -->
<fmt:parseDate value="2026-04-07 10:30:00"
               pattern="yyyy-MM-dd HH:mm:ss"
               var="convertedDate" />
<fmt:formatDate value="${convertedDate}" pattern="yyyy년 MM월 dd일" />
```

> ⚠️ 날짜 타입 전략을 프로젝트 차원에서 통일할 것 (문자열 vs Date)

---

## 6. 회원관리 DB 설계와 쿼리 테스트

```sql
-- 테이블 생성 (예시)
CREATE TABLE member (
    id       VARCHAR2(30) PRIMARY KEY,
    name     VARCHAR2(50) NOT NULL,
    password VARCHAR2(100) NOT NULL,
    email    VARCHAR2(100),
    role     VARCHAR2(20) DEFAULT 'ROLE_USER',
    enable   CHAR(1) DEFAULT 'Y',
    join_date DATE DEFAULT SYSDATE
);

-- 논리 삭제 (물리 삭제 X)
UPDATE member SET enable = 'N' WHERE id = ?;

-- 로그인 체크
SELECT * FROM member WHERE id = ? AND password = ? AND enable = 'Y';

-- 아이디 중복 체크
SELECT id FROM member WHERE id = ?;
```

```
SYSDATE = DB 서버 시간
CURRENT_DATE = 사용자 세션(OS) 시간
논리 삭제 = enable 컬럼을 Y/N으로 처리 (물리 삭제 금지)
```

---

## 7. 프로젝트 문서화 핵심

```
필요 문서:
  매핑 테이블 = 서블릿명 / 클래스명 / URL 패턴 / HTTP 메서드
  쿼리 테스트 시트 = 테스트ID / SQL / 입력/출력 / MyBatis id

패키지 구조:
  controller/  → 서블릿
  dto/         → 데이터 전송 객체
  filter/      → 필터
  model/       → DAO/서비스
  support/     → 공통 유틸
  mybatis/     → 설정
  properties/  → DB 설정
  sql/         → Mapper XML
```

---

## 8. MyBatis 설정: properties, config, mapper

```properties
# oracle.properties
driver=oracle.jdbc.OracleDriver
url=jdbc:oracle:thin:@localhost:1521:xe
username=scott
password=tiger
```

```xml
<!-- mybatis-config.xml -->
<configuration>
  <properties resource="properties/oracle.properties"/>
  <typeAliases>
    <typeAlias type="com.example.dto.MemberDTO" alias="MemberDTO"/>
  </typeAliases>
  <environments default="development">
    <environment id="development">
      <transactionManager type="JDBC"/>
      <dataSource type="POOLED">
        <property name="driver"   value="${driver}"/>
        <property name="url"      value="${url}"/>
        <property name="username" value="${username}"/>
        <property name="password" value="${password}"/>
      </dataSource>
    </environment>
  </environments>
  <mappers>
    <mapper resource="sql/Member_statement.xml"/>
  </mappers>
</configuration>
```

---

## 9. DAO JUnit 테스트 패턴

| 테스트 대상 | 파라미터 | 검증 방식 |
|-----------|---------|---------|
| 로그인 | Map<String,Object> | `assertNotNull(result)` |
| 상세조회 | String id | `assertNotNull(dto)` |
| 정보수정 | MemberDTO | `assertEquals(1, cnt)` |
| 등록 | MemberDTO | `assertEquals(1, cnt)` |
| 삭제 (논리) | String id | `assertEquals(1, cnt)` |
| 중복검사 | String id | `assertNull` / `assertNotNull` |
| 목록조회 | - | `assertNotEquals(0, list.size())` |
| 권한변경 | Map | `assertEquals(1, cnt)` |

---

## 10. 동적 SQL (set/if)

```xml
<!-- 수정: 입력된 필드만 UPDATE -->
<update id="updateMember" parameterType="MemberDTO">
    UPDATE member
    <set>
        <if test="email != null and email != ''">
            email = #{email},
        </if>
        <if test="password != null and password != ''">
            password = #{password},
        </if>
    </set>
    WHERE id = #{id}
</update>
```

> `<set>` = 마지막 쉼표 자동 제거 + `SET` 자동 추가

---

## 오늘의 핵심 요약

1. JSTL = JSP 스크립틀릿 대신 태그로 로직 표현
2. `requestScope` = 1회 포워드 / `sessionScope` = 로그인 유지
3. `c:forEach varStatus` = `index`(0부터) / `count`(1부터)
4. 논리 삭제 = `enable = 'N'` (물리 삭제 금지)
5. `SYSDATE` = DB 서버 시간 / `CURRENT_DATE` = 세션 시간
6. MyBatis config에 `<mappers>` 등록 필수 (누락 시 가장 흔한 실수)
7. DML 반환값 = 영향받은 행 수 (int) → `assertEquals(1, cnt)` 검증
8. `<set>` = 동적 UPDATE, 마지막 쉼표 자동 제거
9. 프로젝트 시작 시 매핑 테이블 + 쿼리 테스트 시트 선작성
10. Tomcat 10+ = `jakarta.servlet` (javax 아님!)
