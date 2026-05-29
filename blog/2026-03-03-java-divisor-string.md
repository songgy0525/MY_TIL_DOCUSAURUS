---
title: "[TIL] Java 약수/완전수/친화수와 문자열 심화"
date: 2026-03-03
tags: [Java, 알고리즘, String, 정규표현식, DTO]
---

> 부트캠프 백엔드 과정 · 2026.03.03

## 오늘 배운 흐름 한눈에 보기

```
진약수 합 → 완전수 → 친화수 → 기본 생성자
→ String 해시코드/intern → DTO equals/hashCode
→ String API → 길이 측정 규칙 → 텍스트 블록
```

---

## 1. 진약수 합과 약수 판별 메소드

진약수 = 자기 자신을 제외한 약수. 반복 범위는 1부터 n-1까지.

약수 판별 로직을 별도 메소드로 분리하면 완전수/친화수 문제에서 재사용 가능하다.

```java
public boolean isCheck(int num, int chkNum) {
    boolean isCheck = false;
    if (num % chkNum == 0) {
        isCheck = true;
    }
    return isCheck;
}

public void divisorSum(int num) {
    int cnt = 0;
    int sum = 0;

    for (int i = 1; i < num; i++) {
        if (isCheck(num, i)) {
            cnt++;
            sum += i;
        }
    }
    System.out.printf("%d의 진약수 개수는 %d, 합은 %d입니다.%n", num, cnt, sum);
}
```

:::info
약수 판별을 공통 메소드로 분리하면 **응집도는 높이고 결합도는 낮출 수 있다.**

반복에서 0을 제외하는 것만으로도 불필요한 연산을 줄일 수 있다.
:::

**핵심 키워드:** `진약수` `모듈러(%)` `메소드 분리` `응집도/결합도` `printf`

---

## 2. 완전수 판별과 private 메소드 설계

완전수 = 자기 자신 == 진약수의 합인 수. (예: 6 = 1+2+3)

내부 계산용 메소드는 `private`, 외부에는 범위 출력용 `public` 메소드만 노출한다.

```java
private boolean isCheck(int num, int chkNum) {
    return (num % chkNum == 0) ? true : false;
}

private int divisorSum(int num) {
    int sum = 0;
    for (int i = 1; i < num; i++) {
        if (isCheck(num, i)) {
            sum += i;
        }
    }
    return sum;
}

public void perfectNum(int range) {
    for (int i = 2; i <= range; i++) {
        if (i == divisorSum(i)) {
            System.out.println(i + "는 완전수로 판단됨");
        }
    }
}
```

:::info
캡슐화 관점에서 외부에서 직접 호출할 필요가 없는 메소드는 `private`으로 숨긴다.

`return`이 누락되면 컴파일 오류 발생 — 반환 타입이 있는 메소드는 반드시 반환값이 존재해야 한다.
:::

**핵심 키워드:** `완전수` `private` `캡슐화` `반환(return)` `삼항연산자`

---

## 3. 친화수 로직과 대입 특성 활용

친화수 = A의 진약수 합이 B이고, B의 진약수 합이 다시 A가 되는 쌍.

```
sumProperDivisors(A) = B
sumProperDivisors(B) = A
(단, A != B)
```

대입 연산의 핵심: **대입 시점의 값이 복사되어 유지**되므로 중간 결과를 비교 기준으로 안전하게 보관할 수 있다.

- 실습 예시: 220 ↔ 284
- 진약수 합 함수를 2회 호출하는 구조 → 메소드 재사용 설계가 유리

**핵심 키워드:** `친화수` `대입연산자` `중간결과 비교` `메소드 재사용` `알고리즘 설계`

---

## 4. 기본 생성자와 객체 인스턴스화

별도 생성자를 선언하지 않으면 자바가 디폴트 생성자를 암묵적으로 제공한다.

- 디폴트 생성자: 클래스명과 같은 이름, 반환 타입 없음
- `new` = 힙에 객체 생성 후 참조(주소) 반환
- 객체 생성 후에야 메소드 호출 가능

**핵심 키워드:** `디폴트 생성자` `new` `인스턴스화` `참조(주소)` `힙 메모리`

---

## 5. String 해시코드와 identityHashCode, intern

| 메소드 | 동작 |
|--------|------|
| `hashCode()` | String에서 값 기반으로 오버라이딩 — 내용 같으면 같은 값 |
| `System.identityHashCode()` | VM이 부여한 정체성 기반 해시 — 오버라이딩 무시 |
| `intern()` | String 풀의 동일 리터럴을 참조하도록 유도 |
| `==` | 참조(주소) 비교 — 같은 객체를 가리키지 않으면 거짓 |

```java
String a = new String("hello");
String b = new String("hello");

a == b            // false (서로 다른 객체)
a.equals(b)       // true  (값 동일)
a.hashCode() == b.hashCode()  // true (값 기반 hashCode)
System.identityHashCode(a) == System.identityHashCode(b)  // false (정체성 기반)
a.intern() == b.intern()  // true (String 풀 동일 참조)
```

**핵심 키워드:** `String 풀` `hashCode()` `System.identityHashCode()` `intern()` `참조 비교(==)`

---

## 6. DTO equals/hashCode 오버라이딩과 객체 비교

| 비교 항목 | 오버라이딩 전 | 오버라이딩 후 |
|----------|-------------|-------------|
| `dto1 == dto2` | false (다른 객체) | false (다른 객체) |
| `dto1.hashCode()` | 정체성 기반, 서로 다름 | 필드 값 기반, 같을 수 있음 |
| `System.identityHashCode(dto)` | VM 기반, 서로 다름 | VM 기반, 서로 다름 |
| `dto1.equals(dto2)` | false (Object 기본 구현) | 값 같으면 true |

:::info
`equals()`/`hashCode()`를 값 기반으로 오버라이딩하면 컬렉션(JCF)에서 중복 판단과 키 동작에 직접 영향을 준다.

멤버 필드는 `private`으로 두고 getter/setter로 제어하는 것이 캡슐화의 출발점이다.
:::

**핵심 키워드:** `DTO` `equals()` `hashCode()` `오버라이딩` `캡슐화(getter/setter)`

---

## 7. String 메소드와 정규표현식 기반 유효성 처리

### 공백 검증

| 메소드 | 동작 |
|--------|------|
| `isEmpty()` | 길이가 0인 경우만 true (공백 문자열은 false) |
| `isBlank()` | 공백/탭 등으로만 구성된 경우도 true |
| `trim()` | 앞뒤 화이트스페이스 제거 |

:::warning
사용자가 스페이스를 입력하면 눈으로는 같아 보여도 `isEmpty()`는 false가 된다.

`trim()` 또는 정규식으로 추가 정제가 필요하다.
:::

### replaceAll + 정규표현식

```java
String str = "!T%123abC";
String regex = "[^0-9a-zA-Z]";  // 숫자/영문자 외 제거
String result = str.replaceAll(regex, "");
// 결과: "T123abC"
```

### 문자열 결합 최적화

```java
// 빈번한 결합 시 StringBuilder 권장
StringBuilder sb = new StringBuilder();
sb.append("hello").append(" ").append("world");
```

**핵심 키워드:** `replaceAll` `정규표현식` `isBlank` `trim` `StringBuilder`

---

## 8. 문자열 분해, 탐색과 인덱스 예외

| 메소드 | 성공 시 | 실패/범위 초과 시 |
|--------|---------|----------------|
| `substring(begin, end)` | 새 문자열 반환 (end 미포함) | 범위 잘못되면 예외 |
| `charAt(i)` | 해당 인덱스 문자 반환 | 인덱스 초과 시 `StringIndexOutOfBoundsException` |
| `indexOf(str)` | 첫 위치 인덱스 반환 | 찾지 못하면 **-1** 반환 |
| `contains(str)` | `true` | `false` |

```java
// 메일 주소 분해 예시
String email = "hello@gmail.com";
int atIdx = email.indexOf('@');   // 5
String id = email.substring(0, atIdx);  // "hello"
String domain = email.substring(atIdx + 1);  // "gmail.com"
```

:::warning
`indexOf()` 결과로 `substring()`을 연결할 때 **-1 처리 누락**이 논리 오류로 이어질 수 있다.
:::

**핵심 키워드:** `substring` `charAt` `indexOf` `contains` `인덱스 예외`

---

## 9. 길이 측정 규칙: length vs length() vs size()

| 타입 | 사용 방법 | 이유 |
|------|----------|------|
| 배열(Array) | `arr.length` | 고정 길이 필드 |
| 문자열(String) | `str.length()` | 메소드 |
| 컬렉션(JCF) | `collection.size()` | 메소드 |

:::info
반복문과 인덱싱의 전제조건이므로 타입별 구분을 명확히 해야 한다.
:::

**핵심 키워드:** `length` `length()` `size()` `배열` `JCF`

---

## 10. 텍스트 블록 (Java 13~17)

여러 줄 문자열을 `"""`로 표현하는 문법. HTML/JSON 같은 멀티라인 텍스트 작성에 유용하다.

```java
String s = """
안녕하세요.
반갑습니다.
""";
```

:::danger
시작 `"""` 뒤에 **즉시 엔터**를 치고 내용을 작성해야 한다.

줄바꿈 누락 시 컴파일 오류 발생.
:::

:::warning
눈에 보이는 문자열이 같아도 개행 포함 여부에 따라 비교 결과가 달라질 수 있다.

문자열 비교는 `==`가 아니라 `equals()`를 기본으로 사용할 것.
:::

**핵심 키워드:** `텍스트 블록` `Java 13` `Java 17` `멀티라인 문자열` `equals()`

---

## 오늘의 핵심 요약

1. 약수 판별 로직은 메소드로 분리 → 완전수/친화수에서 재사용
2. 내부 계산용 메소드는 `private`, 외부 인터페이스만 `public`
3. `==`는 참조 비교, 값 비교는 `equals()` 사용
4. `hashCode()`는 String에서 값 기반으로 오버라이딩됨
5. `isEmpty()` vs `isBlank()` — 공백 문자열 처리 다름
6. `indexOf()` 실패 시 **-1** 반환 → 처리 누락 주의
7. 배열 = `length`, 문자열 = `length()`, 컬렉션 = `size()`
8. 텍스트 블록 시작 `"""` 뒤에 반드시 엔터
