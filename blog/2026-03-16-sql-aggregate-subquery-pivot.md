---
title: "[TIL] SQL 정렬, 집계, 그룹, 집합, 피벗, 서브쿼리"
date: 2026-03-16
tags: [Oracle, SQL, GROUP BY, 서브쿼리, PIVOT, 집합연산]
---

> 부트캠프 백엔드 과정 · 2026.03.16

## 오늘 배운 흐름 한눈에 보기

```
ORDER BY → 집계함수(NULL 처리) → MAX/MIN 활용
→ GROUP BY / HAVING → 그룹 통계 + 상세정보
→ LISTAGG / RANK → SET OPERATION
→ PIVOT / UNPIVOT → 서브쿼리 → 연관 서브쿼리 / EXISTS
```

---

## 1. ORDER BY 정렬과 실행 순서

### 기본 규칙

```sql
ORDER BY col1 ASC,   -- 기본값 (생략 가능)
         col2 DESC   -- 내림차순
```

> ⚠️ RDBMS는 "삽입 순서"가 아닌 "가장 빠른 출력 형태"로 결과를 냄
> → 의도된 순서가 필요하면 **반드시 ORDER BY 명시**

### 정렬 기준 3가지

| 기준 | 예시 | 특징 |
|------|------|------|
| 컬럼명 | `ORDER BY player_id` | 가장 명확, 권장 |
| SELECT 인덱스 | `ORDER BY 1, 2, 3` | 컬럼 순서 변경에 취약 |
| 별칭 | `ORDER BY 등번호` | 계산식 결과에 이름 붙여 정렬할 때 유용 |

```sql
-- 집계 결과로도 정렬 가능
SELECT team_id, MAX(height) AS max_height
FROM player
GROUP BY team_id
ORDER BY MAX(height) DESC;   -- 집계 결과 기준 내림차순
```

> 💡 SQL 실행 순서상 ORDER BY는 **맨 마지막** → WHERE/GROUP BY 결과를 정렬만 함

**핵심 키워드:** `#ORDER_BY` `#ASC` `#DESC` `#별칭` `#인덱스정렬`

---

## 2. 집계함수 핵심 제약과 NULL 처리

### 집계함수 제약

```
여러 행 → 단일 결과로 축약
→ SELECT에 집계함수 + 일반 컬럼 같이 쓰면 오류!
```

```sql
-- ❌ 오류: 일반 컬럼과 집계함수 혼용
SELECT player_name, COUNT(*) FROM player;

-- ✅ 올바른 방식 (GROUP BY 활용)
SELECT team_id, COUNT(*) FROM player GROUP BY team_id;
```

### NULL 처리 차이 (시험 빈출 ⭐)

```sql
SELECT COUNT(*)                          FROM player;  -- 전체 행 수 (NULL 포함)
SELECT COUNT(player_name)                FROM player;  -- NULL 제외
SELECT COUNT(NVL(player_name, 'EMPTY'))  FROM player;  -- NULL을 값으로 치환 후 카운트
```

```
AVG(comm) 계산 예시:
comm 값: 100, NULL, 200, NULL, 300

COUNT(comm) = 3    (NULL 제외)
SUM(comm)   = 600
AVG(comm)   = 600 / 3 = 200   ← NULL 행은 분모에서도 제외!

의도가 다르면:
AVG(NVL(comm, 0)) = 600 / 5 = 120  ← NULL을 0으로 포함
```

### DISTINCT vs 집계함수 차이

```
DISTINCT  →  중복 제거해서 "묶어 보여줌" (다른 컬럼 추가하면 기준 바뀜)
집계함수  →  한번 축약되면 행 단위 복구 불가
```

**핵심 키워드:** `#집계함수` `#COUNT` `#NULL` `#DISTINCT` `#NVL`

---

## 3. MAX / MIN 활용과 "다음 ID" 생성 패턴

### 기본 활용

```sql
-- 최댓값/최솟값 자체는 바로 출력 가능
SELECT MAX(height), MIN(height), MAX(weight), MIN(weight)
FROM player;

-- ❌ 최댓값을 가진 선수명은 직접 출력 불가
SELECT player_name, MAX(height) FROM player;  -- 오류!

-- ✅ 서브쿼리로 해결
SELECT player_name, height
FROM player
WHERE height = (SELECT MAX(height) FROM player);
```

### 시퀀스 없이 다음 ID 생성 패턴

```sql
-- 연도 + 3자리 순번 형태 ID 만들기 (예: 2026003)
SELECT TO_CHAR(SYSDATE, 'YYYY')
       || LPAD(
            TO_NUMBER(SUBSTR(MAX(seq_id), 5, 3)) + 1,
            3, '0'
          ) AS next_id
FROM some_table;
```

| 구성 요소 | 예시 | 사용 함수 |
|----------|------|----------|
| 연도 추출 | `2026` | `TO_CHAR(SYSDATE,'YYYY')` |
| 최대 키 순번 절단 | `002` | `SUBSTR(MAX_ID, 5, 3)` |
| 다음 순번 계산 | `003` | `TO_NUMBER(...) + 1` |
| 3자리 패딩 | `003` | `LPAD(..., 3, '0')` |
| 최종 조합 | `2026003` | 문자열 연결 `\|\|` |

> ⚠️ 동시 접근 시 충돌 가능 → 실무에서는 **시퀀스 / UUID** 사용 권장

**핵심 키워드:** `#MAX` `#MIN` `#LPAD` `#SUBSTR` `#TO_CHAR`

---

## 4. GROUP BY와 HAVING의 역할 분리

### 핵심 구분

```
WHERE   →  그룹화 이전, 원본 행에 조건
HAVING  →  그룹화 이후, 집계 결과에 조건
```

```
SQL 실행 순서:
FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY
         ↑                   ↑
    행 필터링          그룹 필터링
```

### 요구사항별 올바른 절 선택 (시험 빈출 ⭐)

| 요구사항 | 올바른 처리 | 이유 |
|---------|-----------|------|
| "190 이상인 선수 중 팀별 최대 키" | `WHERE height >= 190` 후 `GROUP BY` | 먼저 행을 줄이고 그룹화 |
| "팀별 최대 키가 190 이상인 팀만" | `GROUP BY` 후 `HAVING MAX(height) >= 190` | 그룹 통계 결과에 조건 |

```sql
-- WHERE 먼저 (190 이상 선수만 모아서 팀별 통계)
SELECT team_id, MAX(height)
FROM player
WHERE height >= 190
GROUP BY team_id;

-- HAVING 사용 (팀별 최대 키가 190 이상인 팀만)
SELECT team_id, MAX(height)
FROM player
GROUP BY team_id
HAVING MAX(height) >= 190;
```

### GROUP BY 규칙

```sql
-- SELECT에 올 수 있는 것:
-- 1. GROUP BY에 참여한 컬럼
-- 2. 집계함수
-- 그 외는 오류!

SELECT team_id, AVG(height)          -- ✅
FROM player
GROUP BY team_id;

SELECT team_id, player_name, AVG(height)  -- ❌ player_name은 GROUP BY에 없음
FROM player
GROUP BY team_id;
```

> ⚠️ NULL도 하나의 그룹으로 묶임 → 제외하려면 `WHERE col IS NOT NULL` 먼저

**핵심 키워드:** `#GROUP_BY` `#HAVING` `#WHERE` `#AVG` `#TRUNC`

---

## 5. 그룹 통계 + 상세정보 뽑기

### 문제 상황

```
"팀별 가장 큰 키의 선수 이름, 등번호, 포지션을 출력하라"
→ MAX(height)는 구할 수 있지만 그 선수 상세정보는 바로 못 뽑음!
```

### 방법 1 — 인라인 뷰 + 조인

```sql
SELECT p.player_name, p.back_no, p.position, p.height, p.team_id
FROM player p
JOIN (
    SELECT team_id, MAX(height) AS max_height  -- 인라인 뷰
    FROM player
    GROUP BY team_id
) m ON p.team_id = m.team_id
   AND p.height  = m.max_height;
```

### 방법 2 — 튜플 IN (다중컬럼 서브쿼리)

```sql
SELECT player_name, back_no, position, height, team_id
FROM player
WHERE (team_id, height) IN (
    SELECT team_id, MAX(height)
    FROM player
    GROUP BY team_id
);
```

```
흐름:
[1단계] 서브쿼리: 팀별 MAX(height) 구하기
         team_id | max_height
         --------|----------
         K01     |   196
         K02     |   193
         ...

[2단계] 메인쿼리: (team_id, height) 쌍이 일치하는 행만 출력
```

> 💡 핵심 사고: **결과 먼저 도출 → 필요한 정보를 바깥 조인으로 단계적으로 붙인다**

**핵심 키워드:** `#인라인뷰` `#조인` `#IN` `#MAX` `#팀별통계`

---

## 6. LISTAGG / WITHIN GROUP / 윈도우 RANK

### LISTAGG — 행 값을 문자열 리스트로 집계

```sql
-- 팀별 선수 이름을 쉼표로 이어 한 줄로 출력
SELECT team_id,
       LISTAGG(player_name, ', ')
         WITHIN GROUP (ORDER BY player_name) AS player_list
FROM player
GROUP BY team_id;
```
```
team_id | player_list
--------|---------------------------
K01     | 김민수, 박철수, 이영희
K02     | 강지훈, 윤서연
```

```sql
-- 중복 제거가 필요한 경우 → 인라인 뷰에서 DISTINCT 먼저
SELECT team_id,
       LISTAGG(position, ', ')
         WITHIN GROUP (ORDER BY position) AS pos_list
FROM (SELECT DISTINCT team_id, position FROM player)
GROUP BY team_id;
```

### 윈도우 RANK — 그룹 내 순위

```sql
-- 팀별 키 순위 (행 유지하면서 순위 매김)
SELECT player_name, team_id, height,
       RANK() OVER (
           PARTITION BY team_id    -- 팀별로 나눠서
           ORDER BY height DESC    -- 키 큰 순으로
       ) AS team_rank
FROM player;
```
```
player_name | team_id | height | team_rank
------------|---------|--------|----------
홍길동      | K01     |  196   |    1
김철수      | K01     |  190   |    2
이영희      | K01     |  190   |    2   ← 동점
박민수      | K01     |  185   |    4   ← 3등 없음
```

### WITHIN GROUP 확장 — 특정 값의 순위

```sql
-- 키 180이 전체 분포에서 몇 등인지?
SELECT RANK(180) WITHIN GROUP (ORDER BY height DESC) AS rank_of_180
FROM player;
```

**핵심 키워드:** `#LISTAGG` `#WITHIN_GROUP` `#RANK` `#PARTITION_BY` `#윈도우함수`

---

## 7. SET OPERATION 규칙과 함정

### 4가지 연산

```
A 집합: {1, 2, 3, 4}
B 집합: {3, 4, 5, 6}

UNION      → {1,2,3,4,5,6}    합집합 (중복 제거)
UNION ALL  → {1,2,3,4,3,4,5,6}  합집합 (중복 유지)
INTERSECT  → {3, 4}           교집합
MINUS      → {1, 2}           차집합 (A - B)
```

| 연산 | 의미 | 중복 처리 |
|------|------|----------|
| `UNION` | 합집합 | 중복 제거 |
| `UNION ALL` | 합집합 | 중복 유지 (빠름) |
| `INTERSECT` | 교집합 | 중복 행만 남김 |
| `MINUS` | 차집합 | 선행 - 후행 |

### 필수 제약 조건 (시험 빈출 ⭐)

```sql
-- ✅ 올바른 형태
SELECT empno, ename FROM emp         -- 컬럼 2개, NUMBER + VARCHAR2
UNION
SELECT player_id, player_name FROM player;  -- 컬럼 2개, NUMBER + VARCHAR2

-- ❌ 컬럼 개수 다름 → 오류
SELECT empno, ename, sal FROM emp
UNION
SELECT player_id, player_name FROM player;

-- ❌ 타입 불일치 → 오류
SELECT empno, ename FROM emp         -- empno: NUMBER
UNION
SELECT player_name, player_id FROM player;  -- player_name: VARCHAR2
-- → TO_CHAR(empno) 로 타입 맞춰야 함
```

### 중요 규칙 3가지

```
1. 컬럼명은 선행 쿼리를 따름
   → 뒤쪽 쿼리 컬럼명은 무시됨

2. ORDER BY는 맨 마지막에 한 번만
   → 중간에 넣으면 오류!

3. 중복 제거 기준 = SELECT에 포함된 컬럼 조합
```

```sql
-- ORDER BY는 전체 결과 맨 끝에 한 번만
SELECT empno, ename FROM emp
UNION
SELECT player_id, player_name FROM player
ORDER BY 1;  -- ← 맨 끝에만 가능
```

**핵심 키워드:** `#UNION` `#UNION_ALL` `#INTERSECT` `#MINUS` `#ORDER_BY`

---

## 8. PIVOT / UNPIVOT과 WITH AS

### PIVOT — 행을 열로 변환

```sql
-- 월별 건수를 가로로 펼치기
SELECT *
FROM (
    SELECT TO_CHAR(sale_date, 'MM') AS mon, sale_id
    FROM sales
)
PIVOT (
    COUNT(sale_id)          -- 집계
    FOR mon                 -- 피벗할 컬럼
    IN ('01','02','03','04','05','06',
        '07','08','09','10','11','12')  -- 열로 만들 값 목록
);
```
```
결과:
'01' | '02' | '03' | ... | '12'
-----|------|------|-----|-----
  5  |  8   |  3   | ... |  7
```

### UNPIVOT — 열을 행으로 변환 (PIVOT 반대)

```sql
SELECT *
FROM pivot_result
UNPIVOT (
    sale_count        -- 값 컬럼명
    FOR month         -- 구분 컬럼명
    IN (jan, feb, mar, apr)  -- 행으로 풀 컬럼들
);
```

### WITH AS — 임시 가상 테이블

```sql
-- 실제 테이블 없이 임시 데이터 선언
WITH temp_data AS (
    SELECT 'A' AS category, 100 AS val FROM DUAL UNION ALL
    SELECT 'B',             200         FROM DUAL UNION ALL
    SELECT 'C',             300         FROM DUAL
)
SELECT * FROM temp_data;
```

> 💡 테스트나 DDL 없이 빠르게 데이터 재현할 때 유용

### 날짜 샘플 데이터 생성 (CONNECT BY LEVEL 활용)

```sql
-- 1년치 날짜 테이블 생성
CREATE TABLE date_sample AS
SELECT DATE '2026-01-01' + LEVEL - 1 AS dt
FROM DUAL
CONNECT BY LEVEL <= 365;
```

**핵심 키워드:** `#PIVOT` `#UNPIVOT` `#CONNECT_BY` `#CTAS` `#WITH_AS`

---

## 9. 서브쿼리 유형과 단일행/다중행 오류

### 서브쿼리 위치별 분류

```
SELECT  ← 스칼라 서브쿼리 (단일값 반환)
FROM    ← 인라인 뷰
WHERE   ← 일반/연관 서브쿼리
HAVING  ← 집계 조건 서브쿼리
ORDER BY ← 정렬 기준 서브쿼리
DML     ← UPDATE/INSERT 내부 서브쿼리
```

### 단일행 vs 다중행 오류

```sql
-- ❌ 다중행 오류: 동명이인이면 = 사용 불가
SELECT * FROM player
WHERE player_name = (
    SELECT player_name FROM player
    WHERE player_name LIKE '정현수%'
);
-- ORA-01427: 단일 행 하위 질의에 두 개 이상의 행이 리턴되었습니다

-- ✅ IN으로 변경
SELECT * FROM player
WHERE player_name IN (
    SELECT player_name FROM player
    WHERE player_name LIKE '정현수%'
);
```

### LIKE + OR → REGEXP_LIKE 대안

```sql
-- 팀명에 '삼성' 또는 '현대'가 포함된 팀의 선수 조회
-- LIKE + OR 방식
WHERE team_id IN (
    SELECT team_id FROM team
    WHERE team_name LIKE '%삼성%'
       OR team_name LIKE '%현대%'
)

-- REGEXP_LIKE 방식
WHERE team_id IN (
    SELECT team_id FROM team
    WHERE REGEXP_LIKE(team_name, '삼성|현대')
)
```

### 서브쿼리 → 조인 대체

```sql
-- 서브쿼리 방식
SELECT player_name FROM player
WHERE team_id IN (SELECT team_id FROM team WHERE region = '서울');

-- 조인 방식 (대용량에서 더 안정적)
SELECT p.player_name
FROM player p
JOIN team t ON p.team_id = t.team_id
WHERE t.region = '서울';
```

**핵심 키워드:** `#스칼라서브쿼리` `#인라인뷰` `#단일행서브쿼리` `#IN` `#REGEXP_LIKE`

---

## 10. 연관 서브쿼리와 EXISTS / UPDATE 적용

### 연관 서브쿼리 동작 방식

```
메인쿼리 한 행 꺼냄
       ↓
서브쿼리에 전달 (메인쿼리 컬럼 참조)
       ↓
서브쿼리 실행 → 결과 반환
       ↓
조건 비교
       ↓
다음 행 반복...
```

```sql
-- 팀별 평균 키보다 큰 선수 조회
SELECT p.player_name, p.team_id, p.height
FROM player p
WHERE p.height > (
    SELECT AVG(p2.height)
    FROM player p2
    WHERE p2.team_id = p.team_id  -- ← 메인쿼리 컬럼 참조
);
```

### EXISTS vs IN 비교

```sql
-- EXISTS: 결과 존재 여부만 확인 (SELECT 1 관례)
SELECT team_name
FROM team t
WHERE EXISTS (
    SELECT 1 FROM player p
    WHERE p.team_id = t.team_id  -- 선수가 있는 팀만
);

-- NOT EXISTS: 존재하지 않는 대상
SELECT team_name
FROM team t
WHERE NOT EXISTS (
    SELECT 1 FROM player p
    WHERE p.team_id = t.team_id  -- 선수가 없는 팀만
);
```

```
EXISTS 특징:
- SELECT 목록이 무엇이든 상관없음 (SELECT 1 사용 관례)
- 공집합 여부만 판단 → TRUE / FALSE
- 결과 1건만 찾으면 즉시 중단 → 대용량에서 IN보다 빠를 수 있음
```

### UPDATE에서 연관 서브쿼리 활용

```sql
-- TEAM 테이블에 STADIUM_NAME 컬럼 추가
ALTER TABLE team ADD (stadium_name VARCHAR2(40));

-- 연관 서브쿼리로 값 채우기
UPDATE team t
SET stadium_name = (
    SELECT s.stadium_name
    FROM stadium s
    WHERE s.stadium_id = t.stadium_id  -- ← 연관 조건
);
```

```
동작 흐름:
team 테이블 한 행 → stadium_id 추출
                  → stadium 테이블에서 매칭
                  → stadium_name 가져와서 UPDATE
team 테이블 다음 행 → 반복...
```

### MAX(SEQ)+1 INSERT 패턴

```sql
INSERT INTO board (seq, title, content)
VALUES (
    (SELECT NVL(MAX(seq), 0) + 1 FROM board),  -- 다음 순번
    '제목',
    '내용'
);
```

> ⚠️ 동시 접근 시 같은 SEQ 생성 가능 → 실무에서는 **시퀀스 / UUID** 사용 권장

**핵심 키워드:** `#연관서브쿼리` `#EXISTS` `#NOT_EXISTS` `#UPDATE` `#ALTER_TABLE`

---

## 오늘의 핵심 요약

1. `ORDER BY` = SQL 실행 순서 마지막, 가공/필터링 X 정렬만
2. 집계함수 + 일반 컬럼 혼용 → 오류, `GROUP BY` 필요
3. `AVG(col)` = NULL 행은 **분모에서도 제외** → 의도에 따라 `NVL` 처리
4. `WHERE` = 행 필터링 (그룹화 전) / `HAVING` = 그룹 필터링 (그룹화 후)
5. 그룹 통계 + 상세정보 = **인라인 뷰 조인** 또는 **튜플 IN 서브쿼리**
6. `LISTAGG` = 행 값을 문자열로 합치기, `WITHIN GROUP`으로 내부 정렬
7. SET OPERATION 제약: 컬럼 개수 일치, 타입 일치, 컬럼명은 선행 쿼리, `ORDER BY` 맨 끝 한 번
8. `PIVOT` = 행 → 열 변환, `IN` 목록에 피벗 값 나열 필수
9. `WITH AS` = 실제 테이블 없이 임시 가상 테이블 선언
10. `EXISTS` = 공집합 여부만 판단, `SELECT 1` 관례, 1건 찾으면 즉시 중단
