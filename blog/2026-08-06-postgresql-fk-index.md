---
title: "[개발노트] PostgreSQL FK 컬럼에 인덱스가 자동 생성되지 않는다"
date: 2026-08-06
tags: [PostgreSQL, 성능, 인덱스]
---

> Noomit 프로젝트 · 부하테스트 중 발견

## 발견한 것

k6로 20 VU 부하를 주면서 PostgreSQL 실행 계획을 확인했는데 `repair_cases` 테이블 조회에서 **Seq Scan**이 나왔다.

`WHERE technician_id = ?` 조건인데 인덱스가 없었다. `technician_id`는 FK 컬럼이니까 당연히 인덱스가 있을 거라고 생각했는데 아니었다.

## 원인

MySQL은 FK 선언 시 자동으로 인덱스를 생성하지만 **PostgreSQL은 그렇지 않다.**

```sql
-- FK 선언해도 인덱스 없음 (PostgreSQL)
CONSTRAINT fk_technician FOREIGN KEY (technician_id) REFERENCES users(id)
```

`REFERENCES` 선언은 참조 무결성 제약만 걸 뿐, 조회 성능을 위한 인덱스는 별도로 만들어야 한다.

## 조치

Flyway 마이그레이션 추가:

```sql
-- V11__add_repair_indexes.sql
CREATE INDEX idx_repair_cases_technician_id
    ON repair_cases (technician_id);

CREATE INDEX idx_repair_details_repair_case_id
    ON repair_details (repair_case_id);
```

`repair_details.repair_case_id`도 같은 이유로 인덱스가 없었다. JOIN/WHERE 조건에 쓰이는 FK 컬럼이라 함께 추가.

## 새로 알게 된 것

**PostgreSQL과 MySQL의 FK 인덱스 정책이 다르다**
- MySQL/InnoDB: FK 컬럼 자동 인덱스 생성 ✅
- PostgreSQL: 자동 생성 없음, 직접 추가해야 함 ❌
- MySQL로 먼저 배웠다면 PostgreSQL에서 이 함정에 빠지기 쉬움

**Seq Scan이 나오면 일단 인덱스부터 확인**
```sql
EXPLAIN ANALYZE SELECT * FROM repair_cases WHERE technician_id = 1;
```
- `Seq Scan`이면 인덱스가 없거나 선택도가 낮은 것
- `Index Scan`이면 인덱스 활용 중

---
