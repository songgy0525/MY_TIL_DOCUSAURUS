---
title: "[TIL] Maven, 로깅, MyBatis 기초"
date: 2026-03-20
tags: [Java, Maven, MyBatis, Logging]
---

> 부트캠프 백엔드 과정 · 2026.03.20

## 오늘 배운 흐름 한눈에 보기

```
Maven pom.xml 심화 (scope/exclusions/build)
→ XML과 DTD 개념
→ Log4j2 설정 (Appender/Layout/Rolling)
→ SLF4J + Logback 비교 + 로그 레벨
→ Logback 동작 흐름
→ MyBatis 인트로 (Mapper XML / Configuration / SqlSessionFactory)
```

---

## 1. Maven POM 핵심 구조

### 의존성 다운로드 흐름

```
pom.xml에 dependency 선언
       ↓
Maven Central 검색 (없으면 repositories 순차 조회)
       ↓
~/.m2/repository/groupId/artifactId/version/ 에 다운로드
       ↓
프로젝트는 .m2 캐시를 참조 링크로 사용
```

### scope 종류 (복습 + 실무 포인트)

| scope | 컴파일 | 실행 | 패키징 | 대표 사용처 |
|-------|--------|------|--------|------------|
| `compile` (기본) | ✅ | ✅ | ✅ | 일반 라이브러리 |
| `provided` | ✅ | ✅ | ❌ | 서블릿 API |
| `runtime` | ❌ | ✅ | ✅ | JDBC 드라이버 |
| `test` | ❌ | ❌ | ❌ | JUnit |
| `system` | ✅ | ✅ | ❌ | 로컬 경로 (이식성 낮음) |

### exclusions — 전이 의존성 충돌 방지

```xml
<!-- 특정 라이브러리가 딸려오는 로깅 충돌 방지 -->
<dependency>
  <groupId>some.library</groupId>
  <artifactId>some-lib</artifactId>
  <exclusions>
    <exclusion>
      <groupId>org.slf4j</groupId>
      <artifactId>slf4j-log4j12</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```

> 💡 전이 의존성 = 라이브러리의 라이브러리 (자동으로 따라옴)
> 로깅 계열(Log4j, SLF4J, Logback) 충돌이 가장 흔함

### build / finalName

```xml
<build>
  <finalName>myapp</finalName>       <!-- target/myapp.war 생성 -->
  <plugins>
    <!-- 컴파일러 버전 설정 -->
    <plugin>
      <artifactId>maven-compiler-plugin</artifactId>
      <configuration><source>21</source><target>21</target></configuration>
    </plugin>
    <!-- WAR 패키징 -->
    <plugin>
      <artifactId>maven-war-plugin</artifactId>
    </plugin>
  </plugins>
</build>
```

```
mvn clean   → target/ 비우기
mvn package → 빌드 + WAR 생성 (scope에 따라 test 라이브러리 제외)
```

**핵심 키워드:** `#pom.xml` `#dependency` `#scope` `#exclusions` `#build`

---

## 2. XML과 DTD 기본 개념

```xml
<!-- XML = 태그 기반 데이터 표현 -->
<book>
  <title>구름빵</title>      <!-- 태그(키) + 텍스트(값) -->
  <author>백희나</author>
</book>
```

```
DTD = XML 문서의 허용 구조 정의
  → 태그 이름, 순서, 속성을 강제
  → IDE 자동완성 + 유효성 검사 제공

예: MyBatis Mapper DTD, Log4j2 DTD, web.xml DTD
```

> HTML = 브라우저가 인식하는 태그가 미리 정해진 마크업
> XML  = 내가 태그를 설계해서 데이터 교환/설정에 활용

**핵심 키워드:** `#XML` `#DTD` `#마크업` `#태그` `#HTML`

---

## 3. Log4j2 설정과 사용

### 설정 파일 위치

```
src/main/resources/log4j2.xml   ← 고정 이름, 자동 탐지
```

### 핵심 구성 요소

```xml
<Configuration>
  <Appenders>
    <!-- 콘솔 출력 -->
    <Console name="Console" target="SYSTEM_OUT">
      <PatternLayout pattern="%d{HH:mm:ss} [%t] %-5level %logger - %msg%n"/>
    </Console>

    <!-- 파일 출력 (Rolling) -->
    <RollingFile name="File" fileName="logs/app.log"
                 filePattern="logs/app-%d{yyyy-MM-dd}.log.gz">
      <PatternLayout pattern="%d %level %msg%n"/>
      <Policies>
        <TimeBasedTriggeringPolicy interval="1"/>  <!-- 하루마다 교체 -->
      </Policies>
    </RollingFile>
  </Appenders>

  <Loggers>
    <Root level="INFO">
      <AppenderRef ref="Console"/>
      <AppenderRef ref="File"/>
    </Root>
  </Loggers>
</Configuration>
```

| 구성 요소 | 역할 | 실무 포인트 |
|----------|------|-----------|
| Appender | 출력 대상 (콘솔/파일) | 콘솔+파일 병행이 흔함 |
| Layout/Pattern | 출력 형식 | 분석 편의성 위해 포맷 표준화 중요 |
| Rolling 정책 | 파일 분리 (일자/용량) | 로그 폭증 시 운영 안정성 직결 |
| Logger 설정 | 패키지별 로그 선택 출력 | SQL 로그 표시/차단 튜닝 |

### 코드에서 사용

```java
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

public class MyClass {
    private static final Logger logger = LogManager.getLogger(MyClass.class);

    public void doSomething() {
        logger.info("작업 시작");
        logger.debug("디버그 정보: {}", someValue);
        logger.error("에러 발생", e);
    }
}
```

**핵심 키워드:** `#Log4j2` `#Appender` `#RollingFile` `#PatternLayout` `#Logger`

---

## 4. SLF4J + Logback 비교와 로그 레벨

### 로깅 계층 구조

```
애플리케이션 코드
      ↓
SLF4J (추상화 계층, API)   ← {} 바인딩 문법으로 편리
      ↓
Logback 또는 Log4j2 (구현체)
```

| 구분 | 성격 | 주요 차이 |
|------|------|---------|
| Log4j2 | 구현체 | 직접 API 사용 가능, 설정 강력 |
| SLF4J | 추상화 (파사드) | `{}` 바인딩 기반, 구현체 교체 가능 |
| Logback | 구현체 | SLF4J와 결합해 실무 표준처럼 사용 |

### 로그 레벨 (낮은 레벨 → 높은 레벨)

```
TRACE → DEBUG → INFO → WARN → ERROR
```

| 레벨 | 의미 | 일반적 사용 |
|------|------|-----------|
| `ERROR` | 시스템/기능 오류 | 장애 분석 핵심 단서 |
| `WARN` | 잠재적 문제/경고 | 운영 기본값으로 자주 선택 |
| `INFO` | 정상 흐름 주요 이벤트 | 개발/운영 공통 |
| `DEBUG` | 디버깅 상세 정보 | 개발 환경 주로 사용 |
| `TRACE` | 가장 상세한 추적 | 로그 폭증 위험, 제한적 사용 |

> 레벨을 INFO로 설정 → INFO, WARN, ERROR만 출력 (DEBUG/TRACE 숨김)

**핵심 키워드:** `#SLF4J` `#Logback` `#로그레벨` `#RollingPolicy` `#maxHistory`

---

## 5. Logback 동작 흐름 (면접 포인트)

```
[1] JVM 시작 → Logback 구현체 로딩 (클래스패스/바인딩 충돌 확인)
[2] Logback Context 생성 (환경 접근 중심 객체)
[3] logback.xml 탐색 + 파싱 (리소스 루트 경로 핵심)
[4] Appender / Logger / Root 설정 구성 (패턴, 롤링, 레벨 적용)
[5] 앱에서 SLF4J API로 로그 호출 → 전역/개별 레벨 함께 작동
```

> 💡 컨텍스트 = "설정 기반 객체 구성 환경"
> → 스프링의 Bean 컨테이너도 동일한 철학

**핵심 키워드:** `#Context` `#파싱` `#바인딩` `#Root_Logger` `#ELK`

---

## 6. MyBatis 인트로 — Mapper XML / Configuration

### MyBatis 목적

```
JDBC 문제점:
  - SQL이 자바 코드에 섞임 (문자열)
  - ResultSet → DTO 매핑 코드 반복

MyBatis 해결:
  - SQL → Mapper XML로 분리
  - resultType에 따라 DTO 자동 매핑 (setter 호출)
```

### Mapper XML 기본 구조

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<mapper namespace="dptMapper">

  <!-- 전체 조회 -->
  <select id="selectAllDPT" resultType="com.example.DptDTO">
    SELECT dpt_no AS dptNo, dname, loc
    FROM department
  </select>

  <!-- 단건 조회 -->
  <select id="selectDPT" parameterType="int" resultType="com.example.DptDTO">
    SELECT dpt_no AS dptNo, dname, loc
    FROM department
    WHERE dpt_no = #{dptNo}
  </select>

</mapper>
```

> 💡 resultType의 컬럼명 ↔ DTO 프로퍼티명 자동 매핑
> 불일치 → alias로 맞추거나 resultMap 사용

### Configuration XML 기본 구조

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE configuration PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
  "http://mybatis.org/dtd/mybatis-3-config.dtd">

<configuration>
  <environments default="development">
    <environment id="development">
      <transactionManager type="JDBC"/>
      <dataSource type="POOLED">
        <property name="driver"   value="oracle.jdbc.OracleDriver"/>
        <property name="url"      value="jdbc:oracle:thin:@localhost:1521:xe"/>
        <property name="username" value="scott"/>
        <property name="password" value="tiger"/>
      </dataSource>
    </environment>
  </environments>

  <!-- 매퍼 등록 (필수!) -->
  <mappers>
    <mapper resource="com/example/mapper/DPT_statement.xml"/>
  </mappers>
</configuration>
```

### SqlSessionFactory 생성 패턴

```java
// SqlSessionManager.java (정적 초기화로 1회 생성)
public class SqlSessionManager {
    private static SqlSessionFactory factory;

    static {
        try {
            Reader reader = Resources.getResourceAsReader("configuration.xml");
            factory = new SqlSessionFactoryBuilder().build(reader);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static SqlSessionFactory getFactory() {
        return factory;
    }
}
```

```java
// JUnit 테스트 (세션 열리는지 먼저 확인)
@Test
public void testSession() {
    SqlSession session = SqlSessionManager.getFactory().openSession();
    assertNotNull(session);    // 연결 성공 여부 확인
    session.close();
}
```

> ⚠️ 경로(resource) 오타 → 파싱 실패 오류 → 가장 먼저 점검
> 매퍼 등록 누락 → "statement not found" 오류

**핵심 키워드:** `#MyBatis` `#Mapper_XML` `#resultType` `#parameterType` `#DTO매핑`

---

## 오늘의 핵심 요약

1. `exclusions` = 전이 의존성 중 충돌 유발 항목 제거 → 로깅 계열 충돌에 자주 사용
2. `scope` 생략 → `compile` (컴파일+실행+패키징 모두 포함)
3. `mvn clean` = target/ 비우기 / `mvn package` = WAR 생성
4. `Log4j2` = 직접 API / `SLF4J` = 추상화 계층 / `Logback` = SLF4J 구현체
5. 로그 레벨: `TRACE < DEBUG < INFO < WARN < ERROR`
6. 운영 환경 → WARN 이상만 출력 (과도한 로그 = 성능/용량 문제)
7. MyBatis = SQL을 Mapper XML로 분리, DTO 자동 매핑 (setter 호출)
8. Mapper XML 작성 후 Configuration XML의 `<mappers>`에 등록 필수
9. `SqlSessionFactory` = 정적 초기화로 1회 생성 후 재사용
10. 경로(resource) 오타 → MyBatis 파싱 실패 → 가장 먼저 점검
