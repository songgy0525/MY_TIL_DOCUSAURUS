---
title: "[TIL] Oracle DB 환경구축과 SQL 기초"
date: 2026-03-11
tags: [Oracle, SQL, DBeaver, DDL, DCL, SELECT, JOIN]
---

> 부트캠프 백엔드 과정 · 2026.03.11

## 오늘 배운 흐름 한눈에 보기

```
Oracle 설치/접속 점검 → DBeaver 환경 구성 → 인코딩 설정
→ DB 학습 목표 → DDL/DCL 실습 → 샘플 데이터 적재
→ SELECT 기본 → 따옴표 규칙 → 알리아스 → JOIN 기초 → WHERE 조건
```

---

## 1. Oracle 설치 및 접속 점검

**Windows**: `sqlplus -v`로 버전 확인 (12 이상이면 실습 가능)

**macOS**: Docker 컨테이너 내부에서 확인

```bash
docker ps
docker exec -it <컨테이너ID> /bin/bash
sqlplus -v
```

:::warning
**Oracle 설치 실패 주요 원인**: PC 이름/계정명에 한글, 공백, 특수문자 포함.

해결: 영문 PC 이름으로 변경이 가장 단순.
:::

**핵심 키워드:** `SQL*Plus` `docker exec` `원격접속(IP)` `아키텍처(인텔/ARM)`

---

## 2. DBeaver 환경 구성

| 구분 | 형태 | 특징 |
|------|------|------|
| Standalone | 독립 실행형 앱 | 설치 단순, 바로 사용 가능 |
| Plugin | Eclipse 플러그인 | 워크스페이스/프로젝트 연동 |

:::info
Eclipse 플러그인 방식: 워크스페이스를 DB 전용으로 분리해 프로젝트 단위 관리.

SQL 파일이 DB에 연결되지 않은 상태에서는 실행 불가 — **연결된 SQL 편집기**로 열어야 함.
:::

**핵심 키워드:** `DBeaver` `Eclipse 플러그인` `워크스페이스` `퍼스펙티브` `GUI`

---

## 3. DB 학습 목표와 SQL 분류

최종 목표: 요구사항 분석 → 엔티티 추출 → **ERD 모델링** → DDL/DML 수행

| 분류 | 의미 | 대표 명령 |
|------|------|----------|
| DDL | 정의어 | `CREATE`, `ALTER`, `DROP` |
| DML | 조작어 | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| DCL | 제어어 | `GRANT`, `REVOKE` |
| TCL | 트랜잭션 제어 | `COMMIT`, `ROLLBACK` |

**핵심 키워드:** `ERD` `모델링` `요구사항분석` `엔티티추출` `DDL/DML/DCL/TCL`

---

## 4. DDL, DCL 실습: 계정/권한/프로파일

```sql
-- 비밀번호 만료 정책 무한으로 변경
ALTER PROFILE DEFAULT LIMIT PASSWORD_LIFE_TIME UNLIMITED;

-- 사용자 생성 및 권한 부여
CREATE USER EDU IDENTIFIED BY EDU;
GRANT DBA, RESOURCE, CONNECT TO EDU;

-- Oracle 21c 이상: C## 접두어 요구 완화
ALTER SESSION SET "_ORACLE_SCRIPT" = TRUE;

-- 테이블스페이스 및 쿼터 설정 (선택)
ALTER USER EDU DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;

-- 시스템 카탈로그 조회
SELECT USERNAME FROM DBA_USERS;
SELECT FILE_NAME, TABLESPACE_NAME FROM DBA_DATA_FILES;
```

:::info
사용자 생성만으로는 접속 불가 — 반드시 권한(CONNECT 등) 부여 필요.
:::

**핵심 키워드:** `CREATE USER` `GRANT` `ALTER PROFILE` `TABLESPACE` `DBF`

---

## 5. 샘플 데이터 적재

```bash
# SQL*Plus에서 스크립트 실행
sqlplus EDU/EDU
show user
@C:\TEMP\EMP.sql
@C:\TEMP\FOOTBALL.sql
```

:::warning
실행 후 테이블이 보이지 않으면 **Refresh(F5)**로 메타데이터 갱신.

"이미 객체가 존재함" 오류 = 중복 실행 → 기존 객체 DROP 후 재실행.
:::

**핵심 키워드:** `샘플데이터` `스크립트 실행` `@경로` `이행 스크립트` `Refresh`

---

## 6. SELECT 기본 문법과 따옴표 규칙

```sql
-- 기본 구조
SELECT *
FROM PLAYER;

-- 조건 포함
SELECT *
FROM EMP
WHERE EMPNO = '7369';
```

| 구분 | 용도 | 예시 |
|------|------|------|
| 싱글쿼트 `'` | 값(문자 리터럴) | `WHERE JOB = 'CLERK'` |
| 더블쿼트 `"` | 식별자(예약어/공백/대소문자 고정) | `"POSITION"`, `"선수 성명"` |

:::warning
예약어인 컬럼명(예: `POSITION`)은 더블쿼트로 감싸야 한다.

예약어를 테이블명으로 사용하면 실무에서 권장되지 않음.
:::

**핵심 키워드:** `SELECT` `FROM` `WHERE` `싱글쿼트` `더블쿼트`

---

## 7. 컬럼 알리아스와 테이블 알리아스

```sql
-- 컬럼 알리아스 (AS 생략 가능)
SELECT PLAYER_ID AS ID,
       PLAYER_NAME 성명,
       PLAYER_NAME AS "선수 성명"  -- 공백 포함 시 더블쿼트
FROM PLAYER;

-- 상수 컬럼
SELECT PLAYER_NAME, '1'
FROM PLAYER;

-- 테이블 알리아스
SELECT P.*
FROM PLAYER P;
```

:::warning
알리아스를 선언했다면 이후 컬럼 참조는 알리아스만 사용 — 테이블명과 혼용하면 오류.
:::

**핵심 키워드:** `컬럼 알리아스` `AS` `공백 알리아스` `테이블 알리아스` `ANSI/ISO`

---

## 8. JOIN 기초와 ambiguous 오류

```sql
SELECT P.PLAYER_ID,
       P.TEAM_ID,
       T.TEAM_NAME
FROM PLAYER P
JOIN TEAM T
  ON P.TEAM_ID = T.TEAM_ID;
```

:::warning
양쪽 테이블에 같은 컬럼명(`TEAM_ID`)이 있으면 단독 `SELECT` 시 **ambiguous(열 정의가 애매함)** 오류 발생.

반드시 `P.TEAM_ID` 또는 `T.TEAM_ID` 처럼 출처 지정 필요.
:::

:::info
JOIN이 필요한 이유: 정규화로 분리된 테이블을 다시 합쳐 요구사항을 충족.

예: 출판사명 변경 시 모든 행을 수정해야 하는 수정 이상 → 출판사 테이블 분리 → JOIN으로 결합.
:::

**핵심 키워드:** `JOIN` `정규화` `FK` `TEAM_ID` `ambiguous`

---

## 9. WHERE 조건절: 비교, AND/OR, 우선순위

```sql
-- 단일 조건
SELECT * FROM EMP WHERE EMPNO = '7369';

-- OR 조건
SELECT * FROM EMP
WHERE JOB = 'CLERK' OR EMPNO = '7782';

-- AND/OR 혼합 시 괄호로 의도 명확히
SELECT * FROM EMP
WHERE (JOB = 'CLERK' OR JOB = 'MANAGER')
  AND DEPTNO = 10;
```

:::danger
AND가 OR보다 먼저 평가됨.

괄호 없이 AND/OR 혼합 시 의도와 다른 결과 발생 가능 — 반드시 괄호 사용.
:::

**핵심 키워드:** `WHERE` `AND` `OR` `우선순위` `비교연산`

---

## 오늘의 핵심 요약

1. Oracle macOS 환경 = Docker(Colima) 기반 설치
2. 사용자 생성 후 반드시 권한(`CONNECT` 등) 부여
3. 싱글쿼트 = 값 / 더블쿼트 = 식별자(예약어/공백 포함 컬럼명)
4. 알리아스 선언 후에는 테이블명 대신 알리아스만 사용
5. 양쪽 테이블에 같은 컬럼명 = ambiguous 오류 → 알리아스로 출처 지정
6. AND가 OR보다 먼저 평가 → 복합 조건은 괄호 사용 필수
