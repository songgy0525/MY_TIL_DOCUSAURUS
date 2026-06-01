---
title: "[TIL] MyBatis 조회, 바인딩과 싱글턴"
date: 2026-03-23
tags: [Java, MyBatis, 싱글턴, 디자인패턴]
---

> 부트캠프 백엔드 과정 · 2026.03.23

## 오늘 배운 흐름 한눈에 보기

```
MyBatis 설정 + 조회 기본 흐름
→ #{} / ${} 바인딩 차이
→ DTO 반환 + resultMap 매핑
→ <include> 재사용 + selectOne/selectList/selectMap
→ CDATA로 XML 파싱 충돌 해결
→ 싱글턴(Singleton) 패턴 구현
```

---

## 1. MyBatis 설정과 조회 기본 흐름

### 핵심 구성 요소

```
[1] configuration.xml  → DB 연결 + 매퍼 등록
[2] Mapper XML         → SQL 정의 (namespace + id)
[3] DTO                → 파라미터/결과 운반 객체
[4] SqlSessionFactory  → 세션 생성 공장 (정적 초기화, 1회)
[5] SqlSession         → 실제 SQL 실행 단위
[6] JUnit 테스트       → 각 CRUD 검증
```

### MyBatis 실행 흐름

```
SqlSessionFactory.openSession()
        ↓
SqlSession 생성
        ↓
session.selectList("namespace.id", param)
        ↓
Mapper XML에서 SQL 찾기 (namespace.id)
        ↓
SQL 실행 → ResultSet → DTO 자동 매핑 (setter)
        ↓
결과 반환
```

```java
// 네임스페이스 상수로 관리 (오타 방지)
private static final String NS = "empMapper.";

SqlSession session = SqlSessionManager.getFactory().openSession();
List<EmpDTO> list = session.selectList(NS + "selectAll");
```

> ⚠️ 매퍼 XML 만든 후 configuration.xml `<mappers>`에 등록 필수
> ⚠️ namespace.id 오타 → "statement not found" 오류

**핵심 키워드:** `#SqlSessionFactory` `#SqlSession` `#namespace` `#mappers` `#JUnit`

---

## 2. 바인딩 문법 #{} vs ${} (시험 빈출 ⭐)

| 구분 | `#{}` | `${}` |
|------|-------|-------|
| 처리 방식 | PreparedStatement 값 바인딩 | 문자열 직접 치환 |
| 따옴표 처리 | 자동 처리 (안전) | 따옴표 없음 (직접 붙어야) |
| SQL Injection | 안전 | 취약 ⚠️ |
| 권장 용도 | **값 조건** (WHERE절 등) | 컬럼명 등 SQL 구조 요소 (제한적) |

```sql
-- #{}  → PreparedStatement: WHERE empno = ?  → ?에 7369 바인딩
WHERE empno = #{empno}

-- ${}  → 문자열 치환: WHERE empno = 7369  → SQL Injection 위험!
WHERE empno = ${empno}

-- 컬럼명은 ${}가 필요한 경우 (화이트리스트 통제 필수)
ORDER BY ${column}
```

```java
// SQL Injection 예시
// ${value}에 "1=1" 입력 시
// WHERE id = 1=1  → 전체 조회됨 → 위험!
```

> 💡 `MyBatis 3.x`에서는 `parameterType` 생략 가능
> → 회사 코드에서 parameterType 없어도 버전 특성일 수 있음

**핵심 키워드:** `##{}` `#${}` `#parameterType` `#resultType` `#SQL_Injection`

---

## 3. DTO 반환과 resultMap 매핑

### resultType vs resultMap 선택 기준

| 구분 | 사용 조건 | 장점 | 주의점 |
|------|---------|------|--------|
| `resultType` | 컬럼명 ↔ 프로퍼티명 규칙 일치 또는 alias로 맞출 수 있음 | 간단, XML 짧음 | 불일치 많으면 유지보수 어려움 |
| `resultMap` | 컬럼명-프로퍼티명 다름, 복잡한 매핑 필요 | 명시적, 협업/가독성 좋음 | 설정 길어짐 |

### resultMap 정의 예시

```xml
<!-- 컬럼명(player_id) ↔ 프로퍼티명(playerId) 불일치 해결 -->
<resultMap id="playerRM" type="com.example.PlayerDTO">
  <result column="player_id"   property="playerId"/>
  <result column="player_name" property="playerName"/>
  <result column="back_no"     property="backNo"/>
  <result column="height"      property="height"/>
</resultMap>

<select id="selectPlayer" resultMap="playerRM">
  SELECT player_id, player_name, back_no, height
  FROM player
</select>
```

### alias로 resultType 자동 매핑

```xml
<!-- alias = DTO 프로퍼티명과 동일하게 맞추면 resultMap 불필요 -->
<select id="selectPlayer" resultType="com.example.PlayerDTO">
  SELECT player_id   AS playerId,
         player_name AS playerName,
         back_no     AS backNo
  FROM player
</select>
```

**핵심 키워드:** `#DTO` `#resultMap` `#alias` `#자동매핑` `#setter`

---

## 4. `<include>` 재사용과 selectOne/selectList/selectMap

### `<sql>` + `<include>` — 반복 컬럼 재사용

```xml
<!-- 공통 SELECT 절 정의 -->
<sql id="empColumns">
    empno, ename, job, sal, deptno
</sql>

<!-- 재사용 -->
<select id="selectAll" resultType="EmpDTO">
    SELECT <include refid="empColumns"/>
    FROM emp
</select>

<select id="selectById" resultType="EmpDTO">
    SELECT <include refid="empColumns"/>
    FROM emp WHERE empno = #{empno}
</select>
```

> ⚠️ `refid` 오타 → 런타임 "statement/fragment 탐색 실패" 오류

### 조회 API 반환 규칙 (시험 빈출 ⭐)

| 메서드 | 반환 형태 | 결과 없음 | 주의점 |
|--------|---------|---------|--------|
| `selectOne` | 단일 객체 | `null` | 결과 2개↑ → `TooManyResultsException` |
| `selectList` | `List<T>` | 빈 리스트 (size=0) | null 아님 → NPE 방지 유리 |
| `selectMap` | `Map<K,V>` | 빈 맵 | 3번째 인자로 키 컬럼 지정 필수 |

```java
// selectOne: 결과 1건
EmpDTO dto = session.selectOne(NS + "selectById", 7369);

// selectList: 여러 건
List<EmpDTO> list = session.selectList(NS + "selectAll");

// selectMap: 특정 컬럼을 키로 하는 Map
Map<String, EmpDTO> map = session.selectMap(NS + "selectAll", "ename");
// → {"KING": EmpDTO, "JONES": EmpDTO, ...}
```

> ⚠️ `selectMap` 캐스팅 주의 → `Map<String, Object>` 로 받는 것이 안전

**핵심 키워드:** `#include` `#selectOne` `#selectList` `#selectMap` `#TooManyResultsException`

---

## 5. CDATA로 XML 파싱 충돌 해결

```xml
<!-- 문제: < 가 XML 태그로 인식되어 파싱 오류 -->
<select id="selectByHeight">
    SELECT * FROM player
    WHERE height < #{height}    <!-- ❌ < 때문에 오류! -->
</select>

<!-- 해결: CDATA로 감싸면 XML 파서가 문자 데이터로 처리 -->
<select id="selectByHeight">
    <![CDATA[
        SELECT * FROM player
        WHERE height < #{height}    <!-- ✅ CDATA 안에서는 OK -->
    ]]>
</select>
```

> 💡 CDATA 안에서 `<`, `>`, `&` 등을 그대로 사용 가능
> 실무 권장: SQL 구간 전체를 CDATA로 감싸기

**핵심 키워드:** `#CDATA` `#XML파싱` `#<` `#매퍼XML` `#문자데이터`

---

## 6. 싱글턴(Singleton) 디자인 패턴

### 핵심 개념

```
목적: 인스턴스를 단 하나만 생성해서 재사용
적합: 설정, 로그, 커넥션 관리 (공유 정보)
부적합: DTO처럼 상태가 계속 변하는 객체
```

### 구현 4단계

```java
public class SqlSessionManager {

    // 1. 클래스 자신의 타입으로 private static 필드 선언
    private static SqlSessionManager instance;

    // 2. 외부에서 new 못 하게 생성자를 private으로
    private SqlSessionManager() {
        // 초기화 코드
    }

    // 3. public static getInstance() 제공
    public static SqlSessionManager getInstance() {
        // 4. null이면 1회 생성, 아니면 기존 반환
        if (instance == null) {
            instance = new SqlSessionManager();
        }
        return instance;
    }
}
```

### JUnit으로 싱글턴 검증

```java
@Test
public void testSingleton() {
    SqlSessionManager a = SqlSessionManager.getInstance();
    SqlSessionManager b = SqlSessionManager.getInstance();

    // 같은 객체인지 확인 (== 참조 비교)
    assertEquals(a, b);
    System.out.println(a.hashCode());  // 해시코드 동일
    System.out.println(b.hashCode());
}
```

### static 메모리 특성

```
static 필드/메서드 → 클래스 로딩 시 메모리 할당 (JVM 메서드 영역)
                   → 모든 인스턴스가 공유
                   → 클래스 자체를 static으로 선언 불가 (일반 클래스)
```

**핵심 키워드:** `#Singleton` `#private생성자` `#static` `#getInstance` `#메모리`

---

## 오늘의 핵심 요약

1. MyBatis 호출 = `namespace.id` 조합이 고유 식별자 → 상수로 관리
2. `#{}` = PreparedStatement 안전 바인딩 / `${}` = 문자열 치환 (SQL Injection 위험)
3. `resultType` = 컬럼명-프로퍼티명 자동 매핑 / `resultMap` = 명시적 매핑
4. `selectOne` 결과 2개↑ → `TooManyResultsException` / `selectList` 없으면 빈 리스트
5. `<include refid="...">` = 반복 컬럼 재사용 → refid 오타 주의
6. 매퍼 XML 작성 → configuration.xml `<mappers>` 등록 → 가장 흔한 실수
7. CDATA = `<` 같은 특수문자 포함 SQL 안전하게 처리
8. 싱글턴 = `private` 생성자 + `private static` 인스턴스 + `public static getInstance()`
9. MyBatis `parameterType` = MyBatis 3.x에서 생략 가능
10. `selectMap` 세 번째 인자 = 키로 사용할 컬럼명 지정 필수
