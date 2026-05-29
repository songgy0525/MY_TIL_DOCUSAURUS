---
title: "[TIL] Java 수열, 배열, 복사, Object"
date: 2026-03-04
tags: [Java, 배열, StringBuilder, 복사, Object]
---

> 부트캠프 백엔드 과정 · 2026.03.04

## 오늘 배운 흐름 한눈에 보기

```
개미 수열 구현 → 단계 반복 → 문자열 성능 측정
→ 배열 선언/초기화 → Arrays 유틸리티
→ 기본/참조 타입 전달 방식 → 얕은/깊은 복사 → Object 클래스
```

---

## 1. 개미 수열(룩 앤 세이) 구현

입력 문자열을 왼쪽부터 읽으며 같은 문자의 연속 개수를 세고 `문자+개수` 형태로 누적해 다음 항을 생성한다.

```java
String process(String s) {
    char init = s.charAt(0);
    int cnt = 1;
    String answer = "";

    for (int i = 1; i < s.length(); i++) {
        char cur = s.charAt(i);
        if (cur == init) {
            cnt++;
        } else {
            answer = answer + init + cnt;
            init = cur;
            cnt = 1;
        }
    }
    answer = answer + init + cnt; // 루프 종료 후 마지막 그룹 반드시 누적
    return answer;
}
```

:::warning
입력 문자열이 비어 있거나 잘못된 변수로 `charAt(0)`을 호출하면 `StringIndexOutOfBoundsException` 발생.

`else` 블록에서 `init` 갱신과 `cnt = 1` 리셋을 누락하면 잘못된 결과가 나온다.
:::

:::info
루프 기반 문자열 누적은 `StringBuilder`를 기준으로 삼는 것이 안전하다.

짧은 연결(10회 이하)에서는 concat도 허용되지만 루프 안에서는 무조건 `StringBuilder`.
:::

**핵심 키워드:** `룩앤세이` `개미수열` `StringIndexOutOfBoundsException` `StringBuilder` `디버깅`

---

## 2. 개미 수열 단계 반복

단계 반복의 핵심: 매 반복마다 `result = process(prev)` 수행 후 결과를 다시 `prev`에 재대입.

```
생성 → 출력 → 재대입 순서를 유지해야 연쇄 생성이 끊기지 않는다.
```

- 시작값: `"1"` (1 → 11 → 21 → 1211 → ...)
- 반복 횟수가 길어지면 출력량이 급증하므로 테스트 단계 수를 제한

**핵심 키워드:** `stage` `재대입` `반복문` `process` `이터레이터`

---

## 3. 문자열 누적 성능 측정 (Runtime, GC)

```java
Runtime rt = Runtime.getRuntime();
rt.gc();

long memBefore = rt.totalMemory() - rt.freeMemory();
long start = System.nanoTime();

// 비교할 연산 블록 (concat / StringBuilder / StringBuffer)

long end = System.nanoTime();
long memAfter = rt.totalMemory() - rt.freeMemory();

System.out.println("실행시간(ms): " + (end - start) / 1_000_000);
System.out.println("사용메모리(KB): " + (memAfter - memBefore) / 1024);
```

:::info
- `StringBuffer`는 동기화로 인해 단일 스레드에서 `StringBuilder`보다 느릴 수 있다.
- GC는 VM 상황에 따라 비결정적이므로 결과 해석 시 전제 조건 확인 필요.
:::

**핵심 키워드:** `Runtime` `gc` `nanoTime` `StringBuffer` `메모리측정`

---

## 4. 배열 선언과 초기화 (1차원, 2차원)

배열은 클래스가 없는 참조 타입 객체. `new 타입[크기]`로 공간을 확보한다.

| 구분 | 예시 | 특징 |
|------|------|------|
| 1차원 공간 생성 | `int[] a = new int[3];` | 기본값으로 초기화 (int는 0) |
| 1차원 리터럴 | `int[] a = {1,2,3};` | 원소 개수로 크기 결정 |
| 공간 후 대입 | `a[0]=10; a[1]=11;` | 범위 벗어나면 예외 발생 |
| 2차원 선언 | `int[][] m = new int[2][3];` | "배열의 배열", 내부 배열도 참조 |

:::danger
인덱스는 0부터 시작, 마지막은 `length - 1`.

범위 초과 시 `ArrayIndexOutOfBoundsException` 발생.
:::

**핵심 키워드:** `참조타입` `length` `ArrayIndexOutOfBoundsException` `2차원배열` `기본값초기화`

---

## 5. 배열 출력과 Arrays 유틸리티

배열을 그대로 `println`하면 `타입@해시코드` 형태로 출력된다.

| 방식 | 대상 | 장점 | 주의 |
|------|------|------|------|
| 인덱스 접근 | 1/2차원 | 출력 범위 자유롭게 제어 | 인덱스 관리 실수 주의 |
| 향상된 for | 1차원 | 코드 간결 | 인덱스 제어 불가 |
| `Arrays.toString` | 1차원 | 한 줄 출력 | 구분자 포함, 가공에 부적합 |
| `Arrays.deepToString` | 다차원 | 중첩 배열 한 번에 출력 | 남용 시 장황해짐 |

- `Arrays.sort()` — 동일 배열을 직접 정렬
- `Arrays.fill()` — 전체 원소를 특정 값으로 일괄 초기화

**핵심 키워드:** `java.util.Arrays` `toString` `sort` `fill` `향상된for`

---

## 6. 기본 타입 vs 참조 타입 전달 방식

| 타입 | 전달 방식 | 메소드 내 변경 시 |
|------|----------|----------------|
| 기본 타입 (`int`) | 값 복제 | 원본 보존 |
| 참조 타입 (`int[]`) | 주소값 복제 | 원본도 변경됨 |

:::info
자바는 오직 **pass-by-value**만 존재한다.

참조 타입은 "주소값 자체가 값"으로 복제 전달되는 것이지, 객체 자체가 전달되는 게 아니다.
:::

:::warning
참조 공유는 의도치 않은 사이드 이펙트를 만들 수 있으므로 복제 전략이 필요하다.
:::

**핵심 키워드:** `기본타입` `참조타입` `pass-by-value` `주소값` `오버로딩`

---

## 7. 얕은 복사 vs 깊은 복사

| 방식 | 설명 | 독립성 |
|------|------|--------|
| 얕은 복사 | `arrCopy = arr` — 같은 주소 공유 | 없음 (변경 전파) |
| 인덱스 복사 | `for (copy[i] = src[i])` | 있음 |
| `clone()` | `src.clone()` | 있음 (배열 기준) |
| `System.arraycopy` | `System.arraycopy(src, sPos, dst, dPos, len)` | 있음, 구간 복사 강점 |

:::info
깊은 복사 확인: `hashCode()`가 다르면 독립된 객체.

얕은 복사는 동일 해시코드, 깊은 복사는 서로 다른 해시코드.
:::

**핵심 키워드:** `ShallowCopy` `DeepCopy` `clone` `System.arraycopy` `hashCode`

---

## 8. Object 최상위 클래스

모든 자바 클래스는 명시하지 않아도 `Object`를 상속한다.

| 메소드 | 역할 |
|--------|------|
| `getClass()` | 런타임 타입 정보 반환 |
| `toString()` | 기본 출력: `클래스명@해시코드(16진수)` |
| `equals()` | 객체 비교 — 기본은 정체성 기반, 값 비교 필요 시 오버라이딩 |
| `hashCode()` | 고유성 확인, `equals`와 쌍으로 오버라이딩 |

:::info
배열을 그냥 출력했을 때 `@` 표기가 나오는 이유 = `Object`의 기본 `toString()` 동작 때문.
:::

**핵심 키워드:** `java.lang.Object` `getClass` `toString` `equals` `상속`

---

## 오늘의 핵심 요약

1. 개미 수열: 초기값 설정 + 루프 종료 후 마지막 그룹 누적 필수
2. 루프 내 문자열 누적은 무조건 `StringBuilder`
3. 배열 출력 시 그냥 `println`하면 주소 출력됨 → `Arrays.toString` 또는 반복문 사용
4. 자바는 pass-by-value만 존재 — 참조 타입은 주소값이 복제됨
5. 얕은 복사 = 주소 공유, 깊은 복사 = 독립 객체
6. 모든 클래스는 `Object`를 상속 — `toString`, `equals`의 기본 동작 이해 필수
