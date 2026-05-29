---
title: "[TIL] Java 람다, 스트림, Maven, JUnit 정리"
date: 2026-03-10
tags: [Java, Lambda, Stream, Maven, JUnit5, Oracle]
---

> 부트캠프 백엔드 과정 · 2026.03.10

## 오늘 배운 흐름 한눈에 보기

```
람다/펑션 인터페이스 → Maven 프로젝트 구조 → 의존성/전이 의존성
→ JSON IO + DTO 매핑 → 스트림 기본 연산 → distinct/groupingBy
→ JUnit5 단위 테스트 → Oracle XE 설치 준비
```

---

## 1. 람다 표현식과 펑션 인터페이스

람다식 = 단일 추상 메소드(SAM)를 가진 **펑션 인터페이스**를 구현 객체 생성 없이 바인딩.

```java
@FunctionalInterface
interface LambdaObject {
    int combine(int a, int b);
}

LambdaObject s = (x, y) -> x + y;
int result = s.combine(2, 3); // 5
```

:::info
람다의 의미: 단순 문법 축약을 넘어 메소드(기능)를 값처럼 전달 → 스트림 같은 함수형 API와 결합 가능.
:::

**핵심 키워드:** `람다식` `펑션인터페이스` `SAM` `화살표표현식` `오버라이딩`

---

## 2. Maven 프로젝트 구조와 환경 설정

| 경로 | 용도 | 배포 포함 |
|------|------|----------|
| `src/main/java` | 애플리케이션 소스 | 포함 |
| `src/main/resources` | JSON, XML, properties | 포함 |
| `src/test/java` | 테스트 코드 | 미포함 |
| `src/test/resources` | 테스트 전용 리소스 | 미포함 |
| `target` | 빌드 산출물 | 산출물 위치 |
| `pom.xml` | 빌드/의존성 설정 | 설정 파일 |

```xml
<build>
  <plugins>
    <plugin>
      <artifactId>maven-compiler-plugin</artifactId>
      <version>10.1</version>
      <configuration>
        <source>21</source>
        <target>21</target>
      </configuration>
    </plugin>
  </plugins>
</build>
```

:::warning
Eclipse 초기 생성 시 JRE가 1.8로 잡히는 경우 있음 → 21로 맞추기 필수.

`pom.xml` 수정 후 반드시 **Maven Update Project** 수행.

네트워크 불안정 환경: Force Update of Snapshots/Releases로 강제 재다운로드.
:::

**핵심 키워드:** `Maven` `pom.xml` `표준디렉터리` `maven-compiler-plugin` `업데이트프로젝트`

---

## 3. 의존성 추가와 전이 의존성

| 라이브러리 | 목적 |
|-----------|------|
| Guava | 문자열/컬렉션 유틸리티 강화 |
| Gson | JSON ↔ Java Object 변환 |
| Apache Commons IO | 파일 IO 편의성 (`IOUtils` 등) |
| JUnit Jupiter | 단위 테스트 (JUnit 5) |

:::info
**전이 의존성**: A 라이브러리 선언 시 A가 필요로 하는 B, C도 함께 내려받음.

Maven Dependencies에 직접 추가한 것보다 훨씬 많은 jar가 보이는 이유.
:::

**핵심 키워드:** `MVNRepository` `dependency` `전이의존성` `Guava` `Gson`

---

## 4. JSON 파일 IO와 DTO 매핑

```java
// 3단계: 파일 읽기 → 문자열 변환 → DTO 리스트 변환
InputStream is = Resources.getResource("data.json").openStream();
String json = IOUtils.toString(is, StandardCharsets.UTF_8);
List<People> list = new Gson().fromJson(json, new TypeToken<ArrayList<People>>(){}.getType());
```

:::warning
리스트로 받을 때 `TypeToken<ArrayList<People>>` 필요 — 타입 소거 문제 때문.

단일 객체 타입으로 선언해 JSON 배열을 처리하려 하면 오류 발생.
:::

:::info
DTO 설계 팁:
- JSON 1:1 매핑 DTO (예: `People`) 와 서비스용 프로덕션 DTO (예: `PeopleDTO`) 분리
- `final` 필드 + 생성자 주입으로 불변성 강화 → setter 없이 getter만 제공
:::

**핵심 키워드:** `DTO` `IOUtils` `TypeToken` `fromJson` `불변객체`

---

## 5. 스트림 기본 문법과 주요 연산

| 연산 | 의미 | 전통 코드 감각 |
|------|------|--------------|
| `filter` | 조건에 맞는 요소만 통과 | `if` 조건문 |
| `map` | 요소를 다른 형태로 변환/추출 | 필드 추출/가공 |
| `limit` | 개수 제한 | 카운터 + `break` |
| `distinct` | 중복 제거 | Set 사용/중복 체크 |
| `sorted` | 정렬 | `Comparator` |
| `collect` | 결과를 List/Set/Map으로 수집 | 결과 컨테이너에 `add` |

```java
// 18세 이하 10명 추출
List<People> result = list.stream()
    .filter(p -> p.getAge() <= 18)
    .limit(10)
    .collect(Collectors.toList());

// 정수 반복
IntStream.rangeClosed(0, 10).forEach(System.out::println);
```

**핵심 키워드:** `Stream` `filter` `map` `collect` `메서드레퍼런스`

---

## 6. distinct, groupingBy, counting으로 집계

```java
// 중복 제거
List<Integer> unique = numbers.stream()
    .distinct()
    .collect(Collectors.toList());

// 제조사별 그룹핑
Map<String, List<Car>> grouped = cars.stream()
    .collect(Collectors.groupingBy(Car::getMake));

// 항목별 개수 집계
Map<String, Long> count = names.stream()
    .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
```

:::info
그룹핑 결과 출력: 키를 모르는 Map은 `forEach((k, v) -> ...)` 형태로 순회.
:::

**핵심 키워드:** `distinct` `groupingBy` `counting` `Map` `JCF`

---

## 7. JUnit 5 (주피터) 단위 테스트

```java
class Calculator {
    int add(int a, int b) { return a + b; }
}

public class JUnitTest {
    @Test
    @DisplayName("더하기 테스트")
    void addTest() {
        Calculator cal = new Calculator();
        Assertions.assertEquals(5, cal.add(2, 3));
    }
}
```

- 성공 = 파란색 / 실패 = 빨간색 + 기대값/실제값 비교 출력
- `@DisplayName` — 테스트 목적을 사람이 읽기 좋게 표현
- 기존 JUnit 3.8 테스트 파일 삭제 후 `junit-jupiter-api` 의존성 추가

**핵심 키워드:** `JUnit5` `Jupiter` `@Test` `Assertions` `단위테스트`

---

## 8. DB 과정 준비: Oracle XE 설치

```sql
-- 관리자 비밀번호 변경
ALTER USER system IDENTIFIED BY manager;

-- 계정 잠금 해제
ALTER USER system ACCOUNT UNLOCK;
```

- Windows: XE 설치 파일 다운로드 후 setup 진행
- macOS: Docker(Colima) 기반 설치 필요 (아키텍처 차이)
- 접속 도구: DBeaver 기준 (SQL Developer, IntelliJ DB 도구도 무방)

**핵심 키워드:** `OracleXE` `SQL*Plus` `SYSDBA` `계정언락` `DBeaver`

---

## 오늘의 핵심 요약

1. 람다 = 펑션 인터페이스의 SAM을 즉시 구현 — 별도 클래스 불필요
2. Maven 표준 구조 숙지 — `src/main`은 배포 포함, `src/test`는 미포함
3. 전이 의존성: 선언한 라이브러리의 연관 라이브러리까지 자동 포함
4. 스트림 = 컬렉션을 파이프라인으로 선언적 처리
5. `groupingBy` + `counting` = 집계/통계 처리의 핵심 패턴
6. JUnit `@Test` + `assertEquals` = 메소드 단위 검증
