---
title: "[TIL] Java 기초 문법과 제어문 — if, switch, for"
date: 2026-02-26
tags: [Java, 제어문, if, switch, for, Scanner]
---

> 부트캠프 백엔드 과정 · 2026.02.26

## 🗺 오늘 배운 흐름 한눈에 보기

```
유니코드/형변환 복습 → if/else if/else → Scanner 입력 처리
→ switch (전통 ~ Java 14+) → for 반복문 → 누적 합 → 진약수 합
```

---

## 1️⃣ 문자, 유니코드와 형변환, 문자열 결합

`char`는 내부적으로 **유니코드 코드값(정수)** 으로 저장된다.

```java
char n = '9';
char m = '0';
int result = n - m;                // 57 - 48 = 9 (코드값끼리 연산)
System.out.println("결과: " + result);

System.out.println((char)result);  // 코드값 9 → 탭/제어문자처럼 보일 수 있음
```

:::info
`'9'` - `'0'` = **9** (문자끼리 뺄셈처럼 보이지만 실제로는 정수 코드값 연산)

`+` 연산자가 **문자열과 만나면** 다른 피연산자도 문자열로 변환해서 이어 붙인다 → 컨캐트네이션(concatenation)
:::

:::warning
유니코드 표의 모든 값이 눈에 보이는 문자는 아니다.
코드값 13 = 엔터(제어문자) → 출력 시 공백처럼 보일 수 있음
:::

**핵심 키워드:** `유니코드` `char` `명시적형변환` `컨캐트네이션` `정수연산`

---

## 2️⃣ if 조건문과 Scanner 입력 처리

### if / else if / else

| 형태 | 목적 | 특징 |
|------|------|------|
| `if` | 단일 조건이 참일 때만 실행 | 거짓이면 아무것도 안 함 |
| `if-else` | 참/거짓 양분 | 반드시 하나는 실행 |
| `if-else if-else` | 다중 조건 순차 선택 | 위 조건 매칭되면 아래는 평가 안 함 |

### Scanner — 콘솔 입력 처리

```java
import java.util.Scanner;

Scanner scan = new Scanner(System.in);
System.out.print("정수 값을 입력해 주세요: ");
int input = scan.nextInt();
System.out.println("입력받은 정수값: " + input);
```

:::info
`import`는 다른 패키지에 있는 클래스를 현재 파일에서 사용하겠다는 명시다.
같은 이름의 클래스가 다른 패키지에 존재할 수 있어서 패키지 경로로 구분한다.
:::

:::warning
콘솔이 빨간색으로 실행 중 → **입력 대기 상태**일 수 있음

`nextInt()`에 문자(한글 등)를 입력하면 → `InputMismatchException` 발생
:::

**핵심 키워드:** `if문` `else if` `Scanner` `import` `InputMismatchException`

---

## 3️⃣ switch 문 — 전통 ~ Java 14+

switch는 범위 비교(`<`, `>`)가 아닌 **값의 동일성** 기반 선택문이다.

> 범위 조건 → `if` / 개별 값 매핑 → `switch`

### 전통 switch (~ Java 13)

```java
switch (n) {
    case 0:
        System.out.println("0이다.");
        break;
    case 1:
        System.out.println("1이다.");
        break;
    default:
        System.out.println("다른 값이다.");
}
```

:::danger
`break` 빠뜨리면 **fall-through** 발생 → 아래 case까지 연쇄 실행됨
:::

### Java 14+ switch expression

```java
// arrow label (break 불필요, 여러 case 콤마로 묶기 가능)
String result = switch (key) {
    case 1 -> "하나";
    case 2, 3 -> "둘 또는 셋";
    default -> "다른 숫자";
};

// yield — 블록 내 추가 로직 후 값 반환
String result2 = switch (key) {
    case 1 -> "하나";
    default -> {
        String msg = "알 수 없음: " + key;
        yield msg;  // 블록의 최종 반환값
    }
};
```

| 버전/문법 | 핵심 변화 | 주의점 |
|----------|----------|--------|
| 전통 switch | `break`로 종료 | 누락 시 fall-through |
| Java 7+ | `String` 비교 가능 | 비교값은 입력 타입과 같아야 함 |
| Java 14+ expression | 결과를 변수에 대입 가능 | 구조 규칙 준수 필요 |
| arrow label | `break` 없이 단일 동작 | 여러 case 콤마로 묶기 가능 |
| `yield` | 블록 내 로직 후 값 반환 | 중괄호로 감싸야 함 |

**핵심 키워드:** `switch` `fall-through` `switch expression` `arrow label` `yield`

---

## 4️⃣ for 반복문과 스코프

### 실행 순서

```
초기화 → 조건검사 → 본문 → 증감 → 조건검사 → 본문 → ...
```

:::info
`i < 5` 처럼 **미만** 조건이면 마지막 값(5)은 본문이 실행되지 않는다.

처음 접할 때는 **디버그 표**로 변수값 / 조건 결과 / 출력 / 증감을 단계별로 적어보면 이해가 빨라진다.
:::

### 스코프 주의

```java
// i를 반복문 밖에서 쓰고 싶다면 밖에 선언해야 함
int i = 0;
for (; i < 5; i++) {
    System.out.println(i);
}
System.out.println("마지막 i: " + i);  // 5
```

**핵심 키워드:** `for문` `스코프` `누적변수` `모듈러스` `진약수`

---

## 5️⃣ 누적 합과 진약수 합

### 누적 합 패턴

```java
int sum = 0;
for (int i = 0; i < 5; i++) {
    sum += i;  // 0+1+2+3+4
}
System.out.println("합: " + sum);  // 10
```

### 진약수 합 (자기 자신 제외한 약수의 합)

```java
int n = 10;
int sumResult = 0;

for (int i = 1; i < n; i++) {   // 자기 자신 제외
    if (n % i == 0) {           // 나누어 떨어지면 약수
        sumResult += i;         // 누적
    }
}
System.out.println(n + "의 진약수의 합: " + sumResult);  // 8 (1+2+5)
```

:::info
**약수 판별** = 모듈러스(`%`)로 나머지가 0인지 확인

이 패턴은 완전수, 친화수 같은 문제로 확장되는 전형적인 누적 변수 패턴이다.
:::

---

## 🔜 다음에 이어질 내용

- 배열 (변수 여러 개 → 한 통에 담기)
- 향상된 for문 (`for-each`)
- 인덱스는 0부터 시작, `length`로 크기 확인

---

## ✅ 오늘의 핵심 요약

1. `char` 연산 = 내부적으로 **정수 코드값** 연산
2. `+`가 문자열과 만나면 → 나머지도 문자열로 **컨캐트네이션**
3. `if` = 범위/복잡한 조건, `switch` = 값의 동일성 비교
4. `break` 빠뜨리면 **fall-through** → Java 14+ arrow label로 방지 가능
5. `for` 실행 순서: 초기화 → 조건 → 본문 → 증감 반복
6. 누적 합 패턴: 외부 변수 `sum = 0` → `sum += i`
7. 약수 판별: `n % i == 0`
