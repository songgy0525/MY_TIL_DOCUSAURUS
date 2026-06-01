---
title: "[TIL] SQL 통계, 계층, 윈도우 함수 정리"
date: 2026-03-17
tags: [Oracle, SQL, ROLLUP, 계층쿼리, 윈도우함수]
---

> 부트캠프 백엔드 과정 · 2026.03.17

## 오늘 배운 흐름 한눈에 보기

```
ROLLUP/CUBE/GROUPING SETS → 계층형 쿼리(CONNECT BY)
→ 윈도우 함수(OVER) → 순위/비율/위치/집계
→ RANGE vs ROWS → JDBC 개요
```

---

## 1. GROUP BY vs ROLLUP 순서 차이 (시험 빈출 ⭐)

```
GROUP BY dname, job  ↔  GROUP BY job, dname
→ ORDER BY를 동일하게 맞추면 결과 사실상 동일
→ GROUP BY 자체는 컬럼 순서가 결과를 바꾸지 않음

ROLLUP(dname, job)  ↔  ROLLUP(job, dname)
→ 소계 구조가 완전히 달라짐!
→ 앞에 둔 컬럼이 상위 차원 = 소계 기준
```

### ROLLUP 순서별 소계 구조

```sql
-- dname이 상위 차원
GROUP BY ROLLUP(dname, job)
-- (dname, job) 상세 + dname 소계 + 전체 총계

-- job이 상위 차원
GROUP BY ROLLUP(job, dname)
-- (job, dname) 상세 + job 소계 + 전체 총계
```

### UNION ALL로 소계 직접 만들기 (통계함수 없는 방식)

```sql
-- 상세
SELECT dname, job, SUM(sal) FROM emp JOIN dept... GROUP BY dname, job
UNION ALL
-- 부서 소계 (job 자리에 NULL)
SELECT dname, NULL, SUM(sal) FROM emp JOIN dept... GROUP BY dname
UNION ALL
-- 전체 총계
SELECT NULL, NULL, SUM(sal) FROM emp;
```

> ⚠️ 컬럼 개수·타입 맞추기 필수, 소계 행은 NULL로 표현

**핵심 키워드:** `#GROUP_BY` `#UNION_ALL` `#ROLLUP` `#소계` `#총계`

---

## 2. CUBE — 다차원 통계

ROLLUP보다 더 많은 소계 조합 생성

```sql
GROUP BY CUBE(dname, job)
```

| 생성되는 집계 | 의미 |
|------------|------|
| `(dname, job)` | 상세 집계 |
| `(dname)` | 부서 소계 |
| `(job)` | 업무 소계 ← ROLLUP엔 없음! |
| `()` | 전체 총계 |

```
ROLLUP(a, b) 소계 조합: (a,b) → (a) → ()       3가지
CUBE(a, b)   소계 조합: (a,b) → (a) → (b) → ()  4가지 (2ⁿ)
```

> 💡 CUBE = 가능한 모든 차원의 소계, ROLLUP보다 행 수 더 많음

**핵심 키워드:** `#CUBE` `#다차원` `#소계` `#총계` `#집계`

---

## 3. GROUPING / GROUPING SETS

### GROUPING() — 소계 여부 식별 (0/1)

```sql
SELECT
    CASE WHEN GROUPING(dname) = 1 THEN '모든 부서' ELSE dname END AS 부서,
    CASE WHEN GROUPING(job)   = 1 THEN '모든 업무' ELSE job   END AS 업무,
    SUM(sal)
FROM emp
GROUP BY ROLLUP(dname, job);
```

```
GROUPING(col) = 1  →  소계/총계로 인해 생성된 NULL
GROUPING(col) = 0  →  원래 데이터의 실제 값
```

> 💡 원본 NULL vs 소계 NULL 구분할 때 필수

### GROUPING SETS — 원하는 소계만 선택

```sql
-- job 기준 집계 + dname 기준 집계만 (전체 총계 없음)
GROUP BY GROUPING SETS((job), (dname))
```

```
ROLLUP/CUBE  →  자동으로 소계 생성 (원치 않는 것도 포함)
GROUPING SETS →  내가 원하는 소계만 골라서 생성
```

**핵심 키워드:** `#GROUPING` `#CASE` `#GROUPING_SETS` `#NULL구분` `#선택집계`

---

## 4. VIEW로 조인 반복 줄이기

```sql
-- 조인을 VIEW로 추상화
CREATE VIEW v_emp_dept AS
SELECT e.empno, e.ename, e.sal, d.dname, d.loc
FROM emp e JOIN dept d ON e.deptno = d.deptno;

-- 이후 재사용
SELECT * FROM v_emp_dept WHERE dname = '개발';
```

> 💡 신입이 "테이블이 안 보인다" → 뷰를 테이블로 착각하는 경우 많음
> 원본 테이블 변경 → 뷰 결과도 바뀜 (물리 저장 X)

**핵심 키워드:** `#VIEW` `#CREATE_VIEW` `#조인재사용` `#가상테이블` `#가독성`

---

## 5. 계층형 쿼리 (START WITH / CONNECT BY)

### 핵심 개념

```
EMP 테이블: EMPNO(사원번호), MGR(관리자번호)
MGR 값 = 다른 행의 EMPNO → 자기참조(셀프조인)
계층형 쿼리 = 셀프조인을 반복한 것과 동일한 의미
```

### 기본 문법

| 키워드 | 의미 |
|--------|------|
| `START WITH` | 시작 노드 조건 |
| `CONNECT BY` | 부모-자식 연결 규칙 |
| `PRIOR` | 이전(부모) 행 참조 → 방향 결정 |
| `LEVEL` | 계층 깊이 (최상위 = 1) |
| `CONNECT_BY_ISLEAF` | 리프 노드 여부 (1=리프, 0=자식 있음) |

### 순방향 (Top-down, 부모 → 자식)

```sql
SELECT LEVEL, LPAD(' ', (LEVEL-1)*2) || ename AS 이름, empno, mgr
FROM emp
START WITH mgr IS NULL             -- 최상위(사장)부터
CONNECT BY PRIOR empno = mgr;      -- PRIOR가 부모쪽 → 순방향
```
```
LEVEL | 이름
------|----------
  1   | KING
  2   |   JONES
  3   |     SCOTT
  3   |     ADAMS
  2   |   BLAKE
```

### 역방향 (Bottom-up, 자식 → 부모)

```sql
SELECT LEVEL, ename
FROM emp
START WITH empno = 7900            -- 특정 사원부터
CONNECT BY PRIOR mgr = empno;      -- PRIOR가 자식쪽 → 역방향
```

### PRIOR 방향 정리 (시험 빈출 ⭐)

```
CONNECT BY PRIOR empno = mgr   →  부모.empno = 자식.mgr  →  순방향(하향)
CONNECT BY PRIOR mgr = empno   →  부모.mgr   = 자식.empno →  역방향(상향)

암기: PRIOR = "이전(부모) 행"
      PRIOR가 붙은 쪽이 부모
```

### ORDER SIBLINGS BY / NOCYCLE

```sql
-- 계층 구조 유지하면서 정렬
ORDER SIBLINGS BY sal DESC

-- 순환 참조 방지
CONNECT BY NOCYCLE PRIOR empno = mgr
-- + CONNECT_BY_ISCYCLE로 순환 발생 행 확인 (1=순환)
```

### CONNECT BY 단독 활용 (가상 행 생성)

```sql
-- 1~10 숫자 생성
SELECT LEVEL FROM DUAL CONNECT BY LEVEL <= 10;

-- 1년치 날짜 생성
SELECT DATE '2026-01-01' + LEVEL - 1 AS dt
FROM DUAL
CONNECT BY LEVEL <= 365;
```

**핵심 키워드:** `#계층형쿼리` `#START_WITH` `#CONNECT_BY` `#PRIOR` `#LEVEL`

---

## 6. 윈도우 함수 개요 (OVER)

```
일반 집계  →  GROUP BY로 행이 줄어듦
윈도우 함수 →  행은 그대로 유지하면서 집계/순위/비율 계산
```

### 기본 문법

```sql
함수명() OVER (
    PARTITION BY 컬럼   -- 그룹 경계 (GROUP BY 역할)
    ORDER BY 컬럼       -- 그룹 내 정렬
    ROWS/RANGE BETWEEN  -- 프레임 범위 (생략 가능)
)
```

| OVER 요소 | 역할 |
|-----------|------|
| `PARTITION BY` | 그룹처럼 묶음 나누기 |
| `ORDER BY` | 파티션 내 정렬 |
| `WINDOWING(프레임)` | 현재 행 기준 집계 범위 지정 |

**핵심 키워드:** `#윈도우함수` `#OVER` `#PARTITION_BY` `#ORDER_BY` `#프레임`

---

## 7. 순위 함수

```sql
SELECT ename, sal,
    RANK()        OVER(ORDER BY sal DESC) AS rank,
    DENSE_RANK()  OVER(ORDER BY sal DESC) AS dense_rank,
    ROW_NUMBER()  OVER(ORDER BY sal DESC) AS row_num
FROM emp;
```
```
sal   | RANK | DENSE_RANK | ROW_NUMBER
------|------|------------|----------
3000  |  1   |     1      |    1
3000  |  1   |     1      |    2   ← ROW_NUMBER만 다름
2975  |  3   |     2      |    3   ← RANK는 3등 건너뜀
2850  |  4   |     3      |    4
```

```
RANK        →  동점 다음 순위 건너뜀  (1,1,3,4)
DENSE_RANK  →  동점 다음 순위 연속   (1,1,2,3)
ROW_NUMBER  →  무조건 일련번호       (1,2,3,4)
```

**핵심 키워드:** `#RANK` `#DENSE_RANK` `#ROW_NUMBER` `#동점처리` `#순위`

---

## 8. 비율 함수

### RATIO_TO_REPORT — 전체 대비 비율

```sql
SELECT ename, sal,
    ROUND(RATIO_TO_REPORT(sal) OVER() * 100, 1) AS 비율
FROM emp;
-- 전부 더하면 100%
```

### PERCENT_RANK — 백분위 순위 (나보다 작은 값이 몇 %)

```sql
SELECT ename, sal,
    PERCENT_RANK() OVER(ORDER BY sal) AS pct_rank
FROM emp;
-- 공식: (순위-1) / (전체행수-1)
-- 첫번째 = 0, 마지막 = 1
```

### CUME_DIST — 누적 분포 (나보다 작거나 같은 값이 몇 %)

```sql
SELECT ename, sal,
    CUME_DIST() OVER(ORDER BY sal) AS cume
FROM emp;
-- 공식: 나 이하 행수 / 전체행수
-- 첫번째 > 0, 마지막 = 1
```

### PERCENT_RANK vs CUME_DIST 비교

```
PERCENT_RANK  →  0부터 시작, 나보다 "작은" 값 기준
CUME_DIST     →  0 없음,    나보다 "작거나 같은" 값 기준
동점이면       →  둘 다 같은 값 공유
```

**핵심 키워드:** `#RATIO_TO_REPORT` `#PERCENT_RANK` `#CUME_DIST` `#비율` `#동점`

---

## 9. 위치 함수 — FIRST_VALUE / LAST_VALUE 프레임 함정 (시험 빈출 ⭐)

```sql
-- FIRST_VALUE: 파티션 첫 행 값 (문제없음)
SELECT ename, sal,
    FIRST_VALUE(ename) OVER(PARTITION BY deptno ORDER BY sal DESC) AS first_v
FROM emp;

-- LAST_VALUE: 디폴트 프레임 때문에 "자기 자신"이 나옴!
SELECT ename, sal,
    LAST_VALUE(ename) OVER(PARTITION BY deptno ORDER BY sal DESC) AS last_v
FROM emp;
-- 문제: 디폴트 프레임 = RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
--      → 현재 행까지만 봄 → 자기 자신이 마지막
```

### 해결: 프레임 명시

```sql
LAST_VALUE(ename) OVER (
    PARTITION BY deptno
    ORDER BY sal DESC
    ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING  -- 현재~끝까지
)
```

**핵심 키워드:** `#FIRST_VALUE` `#LAST_VALUE` `#프레임` `#CURRENT_ROW` `#UNBOUNDED_FOLLOWING`

---

## 10. LAG / LEAD — 이전/이후 행 조회

```sql
SELECT ename, sal,
    LAG(sal, 1, 0)  OVER(ORDER BY sal) AS 이전행급여,  -- 1칸 전, 없으면 0
    LEAD(sal, 1, 0) OVER(ORDER BY sal) AS 다음행급여   -- 1칸 후, 없으면 0
FROM emp;
```
```
ename  | sal  | 이전행급여 | 다음행급여
-------|------|----------|----------
SMITH  | 800  |    0     |   950
JAMES  | 950  |   800    |  1100
ADAMS  | 1100 |   950    |  1300
...
```

> `LAG(col, n, default)` — n칸 이전값, 없으면 default
> `LEAD(col, n, default)` — n칸 이후값, 없으면 default

**핵심 키워드:** `#LAG` `#LEAD` `#오프셋` `#기본값` `#이전값`

---

## 11. 윈도우 집계와 RANGE vs ROWS (시험 빈출 ⭐)

### 자주 쓰는 프레임

| 프레임 | 의미 |
|--------|------|
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | 누적 (처음~현재) |
| `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING` | 현재~끝 |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | 이동 (앞1, 나, 뒤1) |

### ROWS vs RANGE 차이

```sql
-- 데이터: sal = 3000, 3000, 2975 (3000이 2개)

-- ROWS: 행 단위 → 각 행 독립적
SUM(sal) OVER(ORDER BY sal ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
-- 3000, 6000, 8975  (각 행마다 다른 누적)

-- RANGE: 값 단위 → 동일 값은 묶어서 처리
SUM(sal) OVER(ORDER BY sal RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
-- 6000, 6000, 8975  (3000 두 개가 같은 프레임 → 둘 다 6000)
```

```
ROWS  →  행 개수 기준, 동점이어도 각자 독립
RANGE →  값 범위 기준, 동점이면 묶음 처리
```

**핵심 키워드:** `#RANGE` `#ROWS` `#윈도우집계` `#누적합` `#이동평균`

---

## 12. JDBC 6단계 개요

```
JDBC = 자바에서 DB에 직접 접속해 SQL 실행하는 저수준 기술
실무에서는 MyBatis/JPA로 추상화되지만 원리 이해 필수
```

| 단계 | 내용 |
|------|------|
| 1 | 드라이버 로딩 |
| 2 | URL/계정으로 Connection 생성 |
| 3 | SQL 준비 (PreparedStatement) |
| 4 | 실행 (SELECT → executeQuery, DML → executeUpdate) |
| 5 | ResultSet → DTO 매핑 |
| 6 | 자원 close (try-with-resources 권장) |

> 💡 프레임워크가 2~6단계를 자동화해줌 → 원리 모르면 트러블슈팅 한계

**핵심 키워드:** `#JDBC` `#드라이버로딩` `#Connection` `#executeQuery` `#DTO`

---

## 오늘의 핵심 요약

1. `GROUP BY` 컬럼 순서 → 결과 무관 / `ROLLUP` 컬럼 순서 → 소계 구조 달라짐
2. `CUBE` = 모든 차원의 소계 (2ⁿ 조합), ROLLUP보다 행 많음
3. `GROUPING()` = 소계로 생긴 NULL(1) vs 원본 NULL(0) 구분
4. `GROUPING SETS` = 원하는 소계만 선택적으로 생성
5. `PRIOR` 위치가 계층형 쿼리 방향 결정 — PRIOR가 붙은 쪽이 부모
6. `CONNECT BY LEVEL` 단독 사용 → 가상 숫자/날짜 시퀀스 생성
7. `LAST_VALUE` 디폴트 프레임 함정 → `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING` 명시
8. `ROWS` = 행 단위 / `RANGE` = 값 단위 → 동점 있으면 결과 달라짐
9. `RANK` 동점 건너뜀 / `DENSE_RANK` 연속 / `ROW_NUMBER` 무조건 일련번호
10. `PERCENT_RANK` 0부터 시작 / `CUME_DIST` 0 없음 — 동점 처리 방식 차이
