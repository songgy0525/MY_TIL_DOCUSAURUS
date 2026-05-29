---
title: "[TIL] SQL 기초 문법과 DDL, DML, 페이징"
date: 2026-03-12
tags: [Oracle, SQL, DDL, DML, ROWNUM, 페이징]
---

> 부트캠프 백엔드 과정 · 2026.03.12

## 오늘 배운 흐름 한눈에 보기

```
IN 연산자/우선순위 → DISTINCT/NULL → DDL/제약조건
→ DML (INSERT/UPDATE/DELETE) → WHERE 심화 (LIKE/BETWEEN/NULL)
→ NULL 연산/NVL → ROWNUM 페이징
```

---

## 1. IN 연산자와 연산자 우선순위

`IN` = 반복되는 OR 조건을 간결하게 표현.

```sql
-- 기존 OR 방식
WHERE empno = 7369 OR empno = 7499

-- IN으로 축약
WHERE empno IN (7369, 7499)
```

### 연산자 우선순위

```
괄호 > SQL 연산자(IN, BETWEEN 등) > AND > OR
```

```sql
-- 의도가 불명확한 형태
WHERE empno = 7499 OR job = 'SALESMAN' AND empno = 7369;

-- 괄호로 의도 명확히
WHERE (empno = 7499 OR job = 'SALESMAN') AND empno = 7369;
```

### 튜플 IN (시험 빈출)

```sql
-- OR/AND 전개 형태
WHERE (empno=7369 AND job='CLERK') OR (empno=7566 AND job='MANAGER')

-- 튜플 IN 축약
WHERE (empno, job) IN ((7369,'CLERK'), (7566,'MANAGER'))
```

**핵심 키워드:** `IN` `AND` `OR` `괄호` `튜플 IN`

---

## 2. DISTINCT와 NULL의 중복 처리

DISTINCT 기준 = SELECT에 선택된 **컬럼 조합**.

| SELECT 형태 | 중복 제거 기준 |
|------------|--------------|
| `DISTINCT c1` | c1 값 단독 |
| `DISTINCT c1, c2` | (c1, c2) 조합 |
| `DISTINCT c1, c2, c3` | (c1, c2, c3) 조합 → 더 많이 남음 |

:::info
DB에서 NULL은 "없음"이 아니라 **"미지의 값"**.

`DISTINCT` 결과에 NULL도 별도의 한 항목으로 포함될 수 있다.
:::

:::warning
실무에서는 PK 기반 조인 구조가 많아 `DISTINCT` 남용은 지양.
:::

**핵심 키워드:** `DISTINCT` `중복 제거` `NULL` `SELECT 조합` `조합 중복`

---

## 3. DDL과 제약조건 (Constraint)

| 제약조건 | 의미 | 실무 포인트 |
|---------|------|------------|
| `NOT NULL` | 필수 입력 | 필수값 누락을 DB에서 차단 |
| `PRIMARY KEY` | 유일 식별 | UNIQUE + NOT NULL 성격 |
| `FOREIGN KEY` | 부모 PK 참조 | 무결성 위반의 주요 원인 |
| `UNIQUE` | 유일성 강제 | NULL은 허용 |
| `CHECK` | 허용 범위 제한 | IF문처럼 허용값 통제 |
| `DEFAULT` | 미입력 시 기본값 | 컬럼을 INSERT 대상에서 제외할 때 적용 |

```sql
-- DEFAULT 적용
ALTER TABLE user_info MODIFY (role DEFAULT 'U');
```

:::info
DDL 핵심 흐름: 요구분석(한글) → 테이블 설계(ERD) → CREATE TABLE 구현
:::

**핵심 키워드:** `DDL` `CONSTRAINT` `ALTER TABLE` `DEFAULT` `FOREIGN KEY`

---

## 4. DML (INSERT, UPDATE, DELETE)과 무결성

### INSERT

| 구분 | 형태 | 특징 |
|------|------|------|
| 암묵적 | `INSERT INTO t VALUES (...)` | 컬럼 순서/타입/개수 모두 맞춰야 함 |
| 명시적 | `INSERT INTO t(c1,c2) VALUES (...)` | 필요한 컬럼만 선택 가능 (권장) |

### 무결성 순서 규칙

```
테이블 생성: 부모 먼저 → 자식
값 입력:    부모(PK) 먼저 → 자식(FK)
로우 삭제:  자식 먼저 → 부모
```

:::danger
FK가 없는 값으로 자식 INSERT 시도 → "부모키가 없습니다" 무결성 오류 발생.

`WHERE` 없이 `UPDATE` 실행 시 전체 행 변경 위험 — 반드시 조건 포함.
:::

### DELETE vs TRUNCATE

| 구분 | 복구 | 속도 | 분류 |
|------|------|------|------|
| `DELETE` | 가능 (로그/버퍼) | 느림 | DML |
| `TRUNCATE` | 매우 어려움 | 빠름 | DDL |

:::info
`DEFAULT`는 컬럼을 INSERT 대상에서 **제외**했을 때 적용.

빈 문자열 입력 시 DB가 이를 NULL로 처리하는 경우 있음.
:::

**핵심 키워드:** `INSERT` `UPDATE` `DELETE` `무결성 제약` `DEFAULT`

---

## 5. WHERE 절 심화: LIKE, BETWEEN, 부정, NULL

### LIKE 와일드카드

| 패턴 | 의미 | 비고 |
|------|------|------|
| `LIKE '삼성%'` | 삼성으로 시작 | 비교적 사용 가능 |
| `LIKE '%블루%'` | 블루를 포함 | 범위 넓어 부하 큼 |
| `LIKE '드레__'` | 드레 + 임의 2글자 | `_` = 임의 1글자 |
| `LIKE '%전남'` | 전남으로 끝 | 선행 와일드카드 — 비권장 |

:::warning
선행 와일드카드(`%abc`)는 인덱스 활용 어려움 → 성능 부하 주의.
:::

### BETWEEN

```sql
WHERE sal BETWEEN 1000 AND 3000  -- 이상/이하 포함
```

:::danger
반드시 **작은 값 AND 큰 값** 순서 — 반대로 쓰면 결과 없음.
:::

### NULL 비교

```sql
-- 잘못된 방식 (결과 항상 공집합)
WHERE comm = NULL

-- 올바른 방식
WHERE comm IS NULL
WHERE comm IS NOT NULL
```

:::danger
NULL 비교는 `=`로 절대 불가 — 반드시 `IS NULL` / `IS NOT NULL` 사용.

"공집합(로우가 없음)"과 "NULL 컬럼(로우는 있으나 값이 NULL)"은 완전히 다른 결과.
:::

**핵심 키워드:** `LIKE` `BETWEEN` `IS NULL` `드모르간` `인덱스`

---

## 6. NULL 연산, NVL, ROWNUM 페이징

### NULL 연산과 NVL

```sql
-- comm이 NULL이면 결과도 NULL
SELECT ename, sal, comm + 100 FROM emp;

-- NVL로 NULL을 0으로 치환
SELECT ename, sal, NVL(comm, 0) + 100 AS bonus_sal FROM emp;
```

### ROWNUM 페이징

:::warning
`ROWNUM`은 FROM 절에서 읽혀 나온 순서로 번호 부여.

`ROWNUM = 2` 처럼 1이 생성되지 않으면 다음 번호가 나오지 않는 특성 있음.

`ORDER BY`와 결합 시 원하는 결과를 얻으려면 인라인 뷰(서브쿼리) 필요.
:::

```sql
-- 잘못된 접근 (정렬 전 ROWNUM 적용)
SELECT * FROM emp WHERE rownum <= 3 ORDER BY sal DESC;

-- 올바른 접근 (인라인 뷰로 정렬 후 ROWNUM 적용)
SELECT * FROM (
    SELECT * FROM emp ORDER BY sal DESC
) WHERE rownum <= 3;
```

| 페이징 방식 | DB |
|-----------|-----|
| `ROWNUM` + 인라인 뷰 | Oracle (고전) |
| `OFFSET` | Oracle (최신) |
| `LIMIT` | MySQL, PostgreSQL |
| `Pageable` | JPA |

**핵심 키워드:** `NULL 연산` `NVL` `CONCAT` `ROWNUM` `인라인 뷰`

---

## 오늘의 핵심 요약

1. `IN` = 반복 OR 축약, 튜플 IN으로 복합 조건 축약 가능
2. AND가 OR보다 먼저 평가 → 복합 조건은 괄호 필수
3. `DISTINCT` 기준 = SELECT 컬럼 **조합** / NULL도 하나의 항목으로 포함
4. DEFAULT = 컬럼을 INSERT 대상에서 **제외**해야 적용
5. DML 무결성 순서: 부모 먼저 생성/입력, 자식 먼저 삭제
6. NULL 비교는 `IS NULL` / `IS NOT NULL` 만 사용
7. ROWNUM 페이징 = 정렬을 인라인 뷰로 감싼 후 바깥에서 ROWNUM 조건 적용
