---
title: "[TIL] 스프링 부트 입문과 빈, DI 정리"
date: 2026-04-17
tags: [SpringBoot, Java, DI]
---
> 부트캠프 백엔드 과정 · 2026.04.17

## 1. 서블릿 한계와 스프링 등장 배경

```
서블릿 문제:
  - 요청마다 클래스 폭증
  - 파라미터 = 문자열 → 수동 형변환
  - 뷰 경로 반복 조합 (/WEB-INF/views/...jsp)

해결책: 프론트 컨트롤러 패턴
  - 단일 진입점 → 요청 분기
  - 핸들러 매핑/어댑터 → 자동 실행 대상 탐색
  - 헬퍼 뷰 → prefix/suffix로 뷰 자동 조합

스프링 = 이 패턴들의 결합
스프링 부트 = 스프링 + 자동설정 + 스타터 의존성 + 내장 톰캣
```

**핵심 키워드:** `#Front_Controller` `#Handler_Adapter` `#Reflection` `#Helper_View` `#전자정부프레임워크`

---

## 2. 스프링 부트 개념과 의존성

```
스프링 부트 특징:
  - 스타터(Starter) = 의존성 묶음 세트
  - 내장 톰캣 = jar로 즉시 실행
  - application.properties = 자동설정 조정
  - Effective POM = 의존성 버전 자동 관리 (버전 생략 가능)
```

```xml
<!-- 버전 생략 가능 (부트가 BOM으로 관리) -->
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
</dependency>
```

**핵심 키워드:** `#Spring_Starter` `#내장톰캣` `#Effective_POM` `#의존성관리` `#application.properties`

---

## 3. 프로젝트 구조

```
src/main/java/          → 자바 소스
src/main/resources/
  ├── static/           → CSS/JS/이미지 (정적 리소스)
  ├── templates/        → Thymeleaf 화면
  └── application.properties → 핵심 설정 파일
src/test/java/          → JUnit 테스트 (배포 X)
mvnw, mvnw.cmd          → Maven Wrapper (Maven 설치 불필요)
```

```properties
# application.properties vs application.yml
spring.mvc.view.prefix=/WEB-INF/views/
spring.mvc.view.suffix=.jsp

# YAML 방식
spring:
  mvc:
    view:
      prefix: /WEB-INF/views/
      suffix: .jsp
```

---

## 4. 빈(Bean) 등록 방식

```java
// 방법 1: @Component (클래스 단위 등록)
@Component  // 빈 이름 = samsungTelevision (camelCase)
public class SamsungTelevision { ... }

// 방법 2: @Configuration + @Bean (메서드 반환값 등록)
@Configuration
public class AppConfig {
    @Bean
    public Television samsung() {
        return new SamsungTelevision();
    }

    @Bean
    public Television lg() {
        return new LgTelevision();
    }
    // 같은 타입 여러 개 → 이름으로 구분
}
```

```
@SpringBootApplication 내부:
  @ComponentScan = 베이스 패키지 하위 자동 탐지
  @EnableAutoConfiguration = 자동 설정

⚠️ 베이스 패키지(메인 클래스 패키지) 밖에 클래스 → 빈 등록 안 됨!
```

**핵심 키워드:** `#Bean` `#@Component` `#@Configuration` `#@Bean` `#@ComponentScan`

---

## 5. DI 주입과 @Autowired 규칙 (시험 빈출 ⭐)

```java
@Service
public class MyService {

    // 방법 1: 생성자 주입 (권장)
    private final MyRepository repo;

    @Autowired  // 생성자 1개면 생략 가능
    public MyService(MyRepository repo) {
        this.repo = repo;
    }

    // 방법 2: 필드 주입 (간편하지만 권장도 낮음)
    @Autowired
    private MyRepository repo2;

    // 방법 3: 세터 주입
    @Autowired
    public void setRepo(MyRepository repo) {
        this.repo = repo;
    }
}
```

### @Autowired 탐색 규칙

| 어노테이션 | 탐색 우선순위 | 다중 빈 처리 |
|-----------|------------|------------|
| `@Autowired` | 타입 우선 | 다중이면 오류 → `@Qualifier`로 이름 지정 |
| `@Resource(name=...)` | 이름 우선 → 타입 | name으로 특정 빈 지정 |
| `@Autowired(required=false)` | 타입 우선 | 없으면 null (시스템 기동 허용) |

```java
// 동일 타입 빈 다중 시 이름으로 구분
@Autowired
@Qualifier("samsung")  // 빈 이름 지정
private Television tv;
```

---

## 6. 스테레오타입 어노테이션

| 어노테이션 | 역할 |
|-----------|------|
| `@Controller` | 요청 받아 뷰/데이터 반환 |
| `@Service` | 비즈니스 로직, 트랜잭션 |
| `@Repository` | 데이터 접근, 예외 변환 |
| `@Component` | 일반 컴포넌트 빈 |

---

## 7. AOP 개념 도입

```
주 관심사 (Core Concern, CC):
  → 요청 처리, CRUD, 비즈니스 로직

횡단 관심사 (Cross-cutting Concern, CCC):
  → 로그, 트랜잭션, 예외 처리 (반복되는 공통 기능)

AOP = CC와 CCC를 분리하여 자동 적용
프록시 = CC + CCC가 결합된 실행 객체
위빙  = 프록시를 만들어 결합하는 과정
```

**핵심 키워드:** `#AOP` `#Core_Concern` `#Cross-cutting_Concern` `#포인트컷` `#어드바이스`

---

## 오늘의 핵심 요약

1. 스프링 부트 = 스프링 + 자동설정 + 스타터 + 내장 톰캣
2. `@SpringBootApplication` = 베이스 패키지 하위만 컴포넌트 스캔
3. `@Component` = 클래스 단위 빈 / `@Bean` = 메서드 반환값 빈
4. `@Autowired` = 타입 기반 / 동일 타입 다중 = `@Qualifier`로 이름 지정
5. `@Resource` = 이름 우선 탐색
6. `required=false` = 빈 없어도 null로 주입 (시스템 기동 허용)
7. 생성자 주입이 권장 이유: 불변성, 테스트 용이, 순환 의존성 감지
8. Effective POM = 부트 버전에 맞는 의존성 버전 자동 관리
9. AOP = 핵심 로직과 공통 기능(로그/트랜잭션) 분리
10. `static/` = 정적 리소스 / `templates/` = Thymeleaf 화면
