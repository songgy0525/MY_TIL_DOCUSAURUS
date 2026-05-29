---
title: "[TIL] Java 예외처리와 JCF 기초"
date: 2026-03-09
tags: [Java, 예외처리, JCF, List, WrapperClass]
---

> 부트캠프 백엔드 과정 · 2026.03.09

## 오늘 배운 흐름 한눈에 보기

```
try-catch-finally → try-with-resources → Checked/Runtime Exception
→ throw/throws → JCF 구조 → List 실습 → Wrapper Class / 박싱
```

---

## 1. 예외 처리 심화와 리소스 관리

기본 구조: `try` 정상 로직 → 실패 시 `catch` 처리 → `finally` 항상 실행.

### try-with-resources

리소스를 `try()` 괄호 안에 선언하면 블록 종료 시 자동으로 `close()` 호출.

```java
try (FileReader reader = new FileReader("missing.txt")) {
    // 처리
} catch (FileNotFoundException e) {
    e.printStackTrace(); // 스택 역추적 정보 출력
} catch (Exception e) {
    e.printStackTrace();
}
```

:::info
예외는 구체적인 것 먼저, 큰 범주는 나중에 — `FileNotFoundException` → `Exception` 순서.

여러 리소스 선언 시 세미콜론(`;`)으로 구분 — 콤마로 잘못 쓰는 실수 주의.
:::

:::info
- Java 7: try-with-resources 도입
- Java 9+: try 블록 외부에서 생성한 리소스 변수를 `try(resource)` 형태로 전달 가능
:::

### Checked vs Runtime Exception

| 구분 | Checked Exception | Runtime Exception |
|------|------------------|------------------|
| 컴파일 강제 | 있음 | 없음 |
| 주요 패키지 | `java.io`, `java.sql` | `NullPointerException` 등 |
| 예시 | 파일/네트워크/DB | 잘못된 인덱스 접근 |

### throw vs throws

| 구분 | 위치 | 의미 |
|------|------|------|
| `throw` | 메소드 내부 | 예외를 직접 발생 |
| `throws` | 메소드 선언부 | 호출자에게 처리 위임 |

**핵심 키워드:** `try-with-resources` `Checked Exception` `Runtime Exception` `throw` `throws`

---

## 2. JCF 구조와 List 실습

JCF(Java Collection Framework) = 자료구조를 이용한 표준 라이브러리.

| 구분 | 핵심 특징 | 대표 사용 |
|------|----------|----------|
| `List` | 인덱스 기반, 중복 허용 | DB 조회 결과를 순서대로 처리 |
| `Set` | 중복 불허 | 유일한 값 집합 (로또 번호 등) |
| `Map` | Key-Value 쌍 | JSON처럼 키로 값을 찾는 구조 |

```java
list.add(n1);
list.add(n2);
list.add(n3);

System.out.println(list.get(1)); // 인덱스 1의 값 조회
```

### remove() 오버로딩 주의

| 호출 형태 | 해석 | 결과 |
|----------|------|------|
| `remove(1)` | 인덱스 1 삭제 | 두 번째 요소 제거 |
| `remove(Integer.valueOf(1))` | 값 1(객체) 삭제 | 값이 1인 요소 제거 |

:::danger
삭제 후 뒤의 요소들이 앞으로 당겨지며 인덱스 재정렬됨.

`remove(int)`와 `remove(Object)` 혼동은 빈번한 실수 포인트.
:::

### Wrapper Class와 자동 박싱/언박싱

기본 타입을 참조 타입으로 감싸는 클래스. `int` → `Integer` 등.

- Java 9 이후 자동 박싱/언박싱이 자연스럽게 처리됨
- 컬렉션에서 기본 타입이 객체로 다뤄진다는 관점이 핵심

**핵심 키워드:** `JCF` `List` `Set` `Map` `Wrapper Class`

---

## 오늘의 핵심 요약

1. `finally` = 성공/실패와 무관하게 항상 실행 — 리소스 해제에 활용
2. `try-with-resources` = 자동 `close()` 보장
3. Checked Exception = 컴파일 단계에서 강제 처리 필요
4. `throw` = 예외 직접 발생 / `throws` = 호출자에게 위임
5. JCF 3축: `List`(인덱스, 중복 허용) / `Set`(중복 불허) / `Map`(Key-Value)
6. `remove(int)` = 인덱스 삭제 / `remove(Object)` = 값 삭제 — 혼동 주의
