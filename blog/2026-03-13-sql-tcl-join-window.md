---
title: "[TIL] SQL 트랜잭션, 문자열, 조인 정리"
date: 2026-03-13
tags: [Oracle, SQL, TCL, JOIN, CASE, "NULL"]
---

> 부트캠프 백엔드 과정 · 2026.03.13

## 오늘 배운 흐름 한눈에 보기

```
페이징(ROWNUM/OFFSET) → TCL(COMMIT/ROLLBACK/SAVEPOINT)
→ CHAR/VARCHAR2 → NULL 처리 함수
→ CASE/DECODE → 조인 총정리
```

---

## 1. 페이징과 서브쿼리 구조

### 핵심 개념

ROWNUM은 **"가져오는 순서대로 번호를 매기는 값"** 이라서,  
원하는 정렬 결과에 번호를 붙이려면 **정렬을 먼저 수행한 결과를 서브쿼리로 감싸야** 한다.

```sql
-- ❌ 잘못된 접근 (정렬 전에 ROWNUM이 붙어버림)
SELECT * FROM emp WHERE ROWNUM <= 3 ORDER BY sal DESC;

-- ✅ 올바른 접근 (인라인 뷰로 정렬 먼저)
SELECT * FROM (
    SELECT * FROM emp ORDER BY sal DESC
) WHERE ROWNUM <= 3;
```

### 실행 단계 흐름

```
[1단계] 인라인 뷰 (정렬)
  SELECT * FROM emp ORDER BY sal DESC
          ↓
[2단계] 바깥 쿼리 (ROWNUM 번호 부여 + 필터링)
  WHERE ROWNUM <= 3
```

### 페이징 방식 비교

| 방식 | DB | 특징 |
|------|-----|------|
| `ROWNUM` + 인라인 뷰 | Oracle (구버전) | 정렬 후 서브쿼리 필수 |
| `OFFSET` / `FETCH` | Oracle 12c+ | 직관적, 간단 |
| `LIMIT` | MySQL, PostgreSQL | 가장 간결 |
| `Pageable` | JPA | 프레임워크 레벨 처리 |

```sql
-- Oracle 12c 이상: OFFSET/FETCH
SELECT * FROM emp
ORDER BY sal DESC
OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;  -- 1페이지 (5개)

OFFSET 5 ROWS FETCH NEXT 5 ROWS ONLY;  -- 2페이지 (5개)
```

> 서브쿼리가 FROM 절에 들어가면 **인라인 뷰**, SELECT/ORDER BY 절에서 단일값 반환하면 **스칼라 서브쿼리**

**핵심 키워드:** `#ROWNUM` `#인라인뷰` `#서브쿼리` `#OFFSET` `#FETCH`

---

## 2. TCL 트랜잭션과 세션 가시성

### ACID 특성 (시험 빈출 ⭐)

| 영문 | 한글 | 의미 |
|------|------|------|
| Atomicity | 원자성 | All or Nothing — 전부 성공하거나 전부 실패 |
| Consistency | 일관성 | 트랜잭션 전후 데이터 무결성 유지 |
| Isolation | 고립성 | 트랜잭션 간 서로 간섭 없음 |
| Durability | 영속성 | 커밋된 데이터는 영구 보존 |

> 트랜잭션은 SELECT와 무관, **INSERT/UPDATE/DELETE(DML)에만 적용**

### 세션 가시성 차이

```
[세션 A]                    [세션 B]
DELETE FROM emp             ← 아직 커밋 안 함
WHERE empno = 7369;

SELECT * FROM emp;          SELECT * FROM emp;
→ 삭제된 것처럼 보임         → 삭제 전 상태로 보임 (커밋 전이라)

COMMIT;
                            SELECT * FROM emp;
                            → 이제 삭제된 상태로 보임
```

> 두 세션이 동일 행을 동시에 수정하려 하면 → **락(Lock) 대기** 발생

### TCL 명령어 정리

| 명령어 | 의미 |
|--------|------|
| `COMMIT` | 변경사항 확정 (영구 반영) |
| `ROLLBACK` | 변경사항 취소 (마지막 커밋 상태로) |
| `SAVEPOINT` | 부분 롤백을 위한 중간 지점 설정 |

**핵심 키워드:** `#TCL` `#COMMIT` `#ROLLBACK` `#ACID` `#락`

---

## 3. SAVEPOINT 부분 롤백

여러 DML을 하나의 트랜잭션으로 처리하되, **중간 지점을 지정해 일부분만 롤백** 가능.

```sql
INSERT INTO emp VALUES (...);
SAVEPOINT svp1;          -- 중간 지점 1

UPDATE emp SET sal = 3000 WHERE empno = 7369;
SAVEPOINT svp2;          -- 중간 지점 2

DELETE FROM emp WHERE empno = 7499;

ROLLBACK TO SAVEPOINT svp2;  -- DELETE만 취소, INSERT/UPDATE는 유지
COMMIT;                       -- INSERT + UPDATE 확정
```

### SAVEPOINT 포함 관계

```
트랜잭션 시작
    │
    ├─ INSERT
    │
  svp1 ◀─── ROLLBACK TO svp1 하면 svp1 이후 전부 취소
    │
    ├─ UPDATE
    │
  svp2 ◀─── ROLLBACK TO svp2 하면 svp2 이후만 취소
    │
    └─ DELETE
```

> ⚠️ 상위 지점으로 롤백하면 그 이후 작업들이 **모두 취소**

**핵심 키워드:** `#SAVEPOINT` `#부분롤백` `#ROLLBACK_TO` `#트랜잭션` `#SQLD`

---

## 4. CHAR / VARCHAR2 저장과 길이 함수

### 저장 방식 비교

| 항목 | CHAR | VARCHAR2 |
|------|------|----------|
| 길이 | 고정 길이 | 가변 길이 |
| 저장 공간 | 지정 크기만큼 항상 차지 | 실제 길이만큼만 차지 |
| 공백 패딩 | 빈 공간을 공백으로 채움 | 없음 |
| 비교 이슈 | 공백 때문에 같아 보여도 다를 수 있음 | 상대적으로 단순 |

```sql
-- CHAR(10)에 'ABC' 저장
-- 실제: 'ABC       ' (7칸 공백 패딩)

-- VARCHAR2(10)에 'ABC' 저장
-- 실제: 'ABC' (3바이트만)
```

### 길이 함수

```sql
SELECT LENGTH('한글'),   -- 문자 수 기준: 2
       LENGTHB('한글')   -- 바이트 기준: 6 (UTF-8에서 한글 1자 = 3바이트)
FROM DUAL;
```

> ⚠️ 한글 바이트 계산: 환경/인코딩에 따라 2~4바이트, 강의 예시는 **3바이트**

**핵심 키워드:** `#CHAR` `#VARCHAR2` `#LENGTH` `#LENGTHB` `#세그먼트`

---

## 5. NULL 개념과 NULL 처리 함수

### NULL 이란?

> NULL = "값이 없음"이 아니라 **"미지의 값(Unknown Value)"**

```sql
-- NULL 연산 → 결과도 NULL
SELECT 100 + NULL FROM DUAL;    -- NULL
SELECT NULL = NULL FROM DUAL;   -- UNKNOWN (TRUE/FALSE 아님!)

-- NULL 비교는 IS NULL / IS NOT NULL 만 가능
WHERE comm = NULL     -- ❌ 항상 공집합
WHERE comm IS NULL    -- ✅ 올바른 비교
```

### 공집합 vs NULL 구분 (시험 빈출 ⭐)

```
공집합: 조회 결과 자체가 없는 상태 (행이 0개)
NULL:   행은 있지만 컬럼 값이 NULL인 상태
```

### NULL 처리 함수

| 함수 | 목적 | 예시 | 주의사항 |
|------|------|------|----------|
| `NVL(col, 대체값)` | NULL → 지정값 치환 | `NVL(comm, 0)` | 대체값 타입이 컬럼 타입과 같아야 함 |
| `NULLIF(a, b)` | a = b 이면 NULL 반환 | `NULLIF(sal, 0)` | 특정값을 NULL로 전처리할 때 |
| `COALESCE(a,b,c...)` | NULL 아닌 최초값 반환 | `COALESCE(comm, bonus, 0)` | 인수들은 동일 타입이어야 함 |

```sql
-- AVG에서 NULL 처리 주의
SELECT AVG(comm) FROM emp;            -- NULL 제외하고 평균 (잘못된 통계 가능)
SELECT AVG(NVL(comm, 0)) FROM emp;    -- NULL을 0으로 처리 후 평균 (의도에 따라 선택)
```

**핵심 키워드:** `#NULL` `#공집합` `#NVL` `#NULLIF` `#COALESCE`

---

## 6. CASE 표현식과 DECODE

### CASE 종류

```sql
-- 서치드 CASE (범위 조건, IF문처럼)
CASE
  WHEN sal >= 3000 THEN 'HIGH'
  WHEN sal >= 1000 THEN 'MID'
  ELSE 'LOW'
END AS 구분

-- 심플 CASE (1:1 매핑, switch-case처럼)
CASE job
  WHEN 'MANAGER'  THEN '관리자'
  WHEN 'SALESMAN' THEN '영업'
  ELSE '기타'
END AS 직책명
```

> ⚠️ `ELSE` 생략하면 매칭 안 되는 경우 → **NULL 반환**

### 중첩 CASE (시험 빈출 ⭐)

```sql
CASE
  WHEN deptno = 10 THEN
    CASE
      WHEN sal >= 3000 THEN 'A'
      ELSE 'B'
    END
  WHEN deptno = 20 THEN 'C'
  ELSE 'D'
END
```

### DECODE (오라클 전용)

```sql
-- 심플 CASE와 동일한 표현
DECODE(job,
  'MANAGER',  '관리자',
  'SALESMAN', '영업',
  '기타'           -- ELSE 역할
)
```

> ⚠️ DECODE는 **오라클 전용**, ANSI 표준 아님 → 타 DB에서 사용 불가

**핵심 키워드:** `#CASE` `#서치드케이스` `#심플케이스` `#중첩CASE` `#DECODE`

---

## 7. 조인(JOIN) 총정리

### 조인이란?

> 정규화로 분리된 테이블을 다시 결합해서 조회하는 기법

### 조인 유형 비교

| 조인 유형 | 핵심 의미 | 문법 | 시험 포인트 |
|----------|----------|------|------------|
| **CROSS JOIN** | 조건 없이 모든 조합 생성 | `FROM A, B` 또는 `A CROSS JOIN B` | 결과 행 수 = A행 × B행 |
| **INNER JOIN** | 매칭되는 행만 반환 | `JOIN ... ON` 또는 `USING` | ON/USING 누락 시 문법 오류 |
| **USING** | 동일 컬럼명일 때 간결하게 | `USING (col)` | 별칭 쓰면 오류, 결과에 컬럼 1회만 출력 |
| **NATURAL JOIN** | 동일 컬럼 자동 AND 조인 | `NATURAL JOIN` | 동일 컬럼 여러 개면 의도치 않은 결과 |
| **OUTER JOIN** | 한쪽 기준으로 불일치 행 포함 | `LEFT/RIGHT/FULL OUTER JOIN` | 오라클 `(+)` 방향 해석 주의 |
| **비등가 JOIN** | 범위 조건으로 조인 | `BETWEEN`, `<`, `>=` 등 | 급여등급 테이블 범위 매핑 형태 |

### ON vs USING 차이

```sql
-- ON: 컬럼명 달라도 가능, SELECT * 시 조인 컬럼 중복 출력
SELECT e.emp_name, d.dept_name
FROM employee e
JOIN department d ON e.dept_id = d.dept_id;

-- USING: 컬럼명 같아야 함, 조인 컬럼 1회만 출력, 별칭 사용 불가
SELECT emp_name, dept_name
FROM employee
JOIN department USING (dept_id);  -- dept_id에 테이블 별칭 붙이면 ❌
```

### 오라클 OUTER JOIN (+) 기호

```sql
-- LEFT OUTER JOIN
WHERE e.dept_id = d.dept_id(+)   -- (+)가 오른쪽 = LEFT OUTER

-- RIGHT OUTER JOIN  
WHERE e.dept_id(+) = d.dept_id   -- (+)가 왼쪽 = RIGHT OUTER
```

> 💡 `(+)` 기호는 **NULL로 채울 쪽**에 붙인다고 기억하면 편함

### NATURAL JOIN 주의점

```sql
-- 팀-스타디움 테이블에 주소, 전화번호 컬럼이 동일하게 있으면
-- 자동으로 모든 동일 컬럼이 AND 조건으로 묶여버림
-- → 의도치 않게 결과가 줄어들 수 있음
```

### 다중 조인 (같은 테이블 두 번)

```sql
-- 스케줄 테이블에서 홈팀명, 원정팀명 동시 출력
SELECT s.game_date,
       t1.team_name AS 홈팀,
       t2.team_name AS 원정팀
FROM schedule s
JOIN team t1 ON s.home_team_id  = t1.team_id
JOIN team t2 ON s.away_team_id  = t2.team_id;
-- 같은 team 테이블을 t1, t2 별칭으로 두 번 조인
```

### VIEW와 CTAS

| 구분 | 물리 저장 | 원본 변경 시 | 용도 |
|------|----------|------------|------|
| `VIEW` | ❌ (가상 테이블) | 뷰 결과도 변경 | 보안, 복잡 쿼리 단순화 |
| `CTAS` | ✅ (물리 복사) | 영향 없음 | 테이블 복제, 백업 |

```sql
-- VIEW 생성
CREATE VIEW v_emp_dept AS
SELECT e.emp_name, d.dept_name
FROM employee e JOIN department d ON e.dept_id = d.dept_id;

-- CTAS (물리 복사)
CREATE TABLE emp_backup AS SELECT * FROM employee;
```

**핵심 키워드:** `#VIEW` `#CTAS` `#INNER_JOIN` `#USING` `#OUTER_JOIN`

---

## 8. ORDER BY와 SQL 실행 순서

### SQL 실행 순서 (시험 빈출 ⭐)

```
작성 순서              실행 순서
─────────────         ─────────────
SELECT    5    →   1  FROM
FROM      1    →   2  WHERE
WHERE     2    →   3  GROUP BY
GROUP BY  3    →   4  HAVING
HAVING    4    →   5  SELECT  ← 별칭(AS) 여기서 만들어짐
ORDER BY  6    →   6  ORDER BY
```

> 암기법: **"프웨그하셀오"** (프롬 → 웨어 → 그룹바이 → 하빙 → 셀렉트 → 오더바이)

### 실행 순서로 이해하는 자주 나오는 오류

```sql
-- ❌ WHERE에서 SELECT 별칭 사용 불가
SELECT salary * 12 AS annual_sal
FROM employee
WHERE annual_sal > 50000;   -- 에러! WHERE(2) 실행 시점에 별칭(5) 아직 없음

-- ✅ ORDER BY에서는 별칭 사용 가능
SELECT salary * 12 AS annual_sal
FROM employee
ORDER BY annual_sal;        -- OK! ORDER BY(6)는 SELECT(5) 이후 실행
```

### ORDER BY 지정 방법

| 지정 방식 | 예시 | 비고 |
|----------|------|------|
| 컬럼명 | `ORDER BY emp_name` | 가장 명확 |
| SELECT 인덱스 | `ORDER BY 3, 2, 1` | SELECT 출력 순서 기준 |
| 별칭 | `ORDER BY 연봉` | SELECT에서 준 별칭 사용 가능 |

> ⚠️ 오라클에서 NULL은 정렬 시 **가장 큰 값**으로 취급 (DESC 시 맨 앞에 나옴)

**핵심 키워드:** `#ORDER_BY` `#SQL실행순서` `#FROM` `#WHERE` `#GROUP_BY`

---

## 오늘의 핵심 요약

1. `ROWNUM` 페이징 = 정렬을 인라인 뷰로 먼저 감싸고 바깥에서 ROWNUM 조건 적용
2. 트랜잭션 ACID: 원자성 / 일관성 / 고립성 / 영속성 — 영문/한글 매칭 필수
3. 커밋 전 변경은 **본인 세션에만 보임**, 다른 세션에는 안 보임
4. `SAVEPOINT` = 트랜잭션 내 부분 롤백 포인트, 상위 지점 롤백 시 이후 모두 취소
5. `CHAR` 고정 길이 / `VARCHAR2` 가변 길이 — 공백 패딩 비교 이슈 주의
6. NULL = "미지의 값" — 비교는 `IS NULL` / `IS NOT NULL` 만 가능
7. `COALESCE` = 여러 인수 중 NULL 아닌 첫 번째 값 반환
8. `CASE WHEN` ELSE 생략 시 → NULL 반환
9. `NATURAL JOIN` = 동일 컬럼 자동 AND 조인, 컬럼 많으면 위험
10. SQL 실행 순서: **프웨그하셀오** (FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY)
