---
title: "[TIL] 웹소켓 그룹 채팅, JPA, 도커"
date: 2026-04-29
tags: [WebSocket, JPA, Docker]
---
> 부트캠프 백엔드 과정 · 2026.04.29

## 1. 웹소켓 그룹 채팅 구조

### 핵심 아이디어

```
그룹 ID + 멤버 ID → 웹소켓 세션 분리
같은 그룹에만 메시지 브로드캐스트
참여자 목록은 애플리케이션 스코프에서 공유
```

### 핸들러 구성

| 오버라이드 메서드 | 시점 | 역할 |
|----------------|------|------|
| `afterConnectionEstablished` | 연결 직후 | 세션 리스트 추가, 그룹/멤버 ID 저장 |
| `afterConnectionClosed` | 연결 종료 | 세션 제거, chatList에서 멤버 제거 |
| `handleTextMessage` | 메시지 수신 | 같은 그룹만 `sendMessage()` |

```java
// HTTP 세션 → 웹소켓 세션으로 전달
// WebSocketConfig에서 등록
registry.addHandler(chatHandler, "/ws/chat")
        .addInterceptors(new HttpSessionHandshakeInterceptor());

// 핸들러에서 그룹 정보 꺼내기
String grId = (String) session.getAttributes().get("gr_id");
String memId = (String) session.getAttributes().get("mem_id");
```

### 참여자 목록 (Application Scope)

```java
// 모든 사용자에게 공유되어야 하므로 Application Scope 사용
// ServletContext에 chatList (Map<String, List<String>>) 저장
// CopyOnWriteArrayList → 멀티스레드 환경에서 안정적
```

> 세션 스코프 = "나만"의 정보 → 참여자 공유에 부적합
> 애플리케이션 스코프 = 모든 사용자 공유 → 참여자 목록에 적합

### beforeunload + sendBeacon

```javascript
// beforeunload에서 fetch() → 페이지 종료 전에 요청 누락 가능
// 대안: navigator.sendBeacon() → 종료 시점 전송 성공률 높음

window.onbeforeunload = function() {
    navigator.sendBeacon('/socket_out', params);
};
```

| 항목 | 문제점 | 대안 |
|------|--------|------|
| `beforeunload` + `fetch()` | 페이지 종료 속도 경쟁으로 누락 가능 | `navigator.sendBeacon()` |
| 중복 종료 이벤트 | 서버 상태 꼬임 | `isClosing` 플래그로 재진입 차단 |

**핵심 키워드:** `#WebSocketHandler` `#HttpSessionHandshakeInterceptor` `#Application Scope` `#CopyOnWriteArrayList` `#sendBeacon`

---

## 2. 도커로 MySQL 컨테이너 구성

```bash
# MySQL 컨테이너 실행
docker run --name jpa_mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=DV# -d mysql

# 컨테이너 내부 접근
docker exec -it jpa_mysql bash
mysql -u root -p
```

```sql
-- DB/계정/권한 구성
CREATE DATABASE test;
CREATE USER 'test'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON test.* TO 'test'@'%';
FLUSH PRIVILEGES;
```

| 작업 | 명령 | 목적 |
|------|------|------|
| DB 생성 | `CREATE DATABASE test;` | 스키마 생성 |
| 사용자 생성 | `CREATE USER 'test'@'%' ...` | 외부 접속 가능 계정 |
| 권한 부여 | `GRANT ALL PRIVILEGES ...` | DB 접근 권한 |
| 적용 | `FLUSH PRIVILEGES;` | 권한 즉시 반영 |

**핵심 키워드:** `#docker run` `#docker exec` `#grant` `#flush privileges` `#DBeaver`

---

## 3. JPA 개념과 엔티티/레포지토리 구성

### MyBatis vs JPA

| 구분 | MyBatis | JPA(Spring Data JPA) |
|------|---------|---------------------|
| 중심 | SQL 중심 | 객체(엔티티) 중심 |
| 장점 | 복잡 쿼리/다이나믹 SQL에 강함 | CRUD 빠름, SQL 작성 부담 감소 |
| 단점 | SQL/맵퍼 학습 부담 | 추상화 높아 내부 동작 이해 어려움 |
| 실무 | 금융권 등 복잡 도메인 | 게시판/게임 등 단순 CRUD |

> JPA = 규격(인터페이스) / Hibernate = 구현체

### application.properties 설정

```properties
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.url=jdbc:mysql://localhost:3306/test
spring.datasource.username=test
spring.datasource.password=password

spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

### DDL 전략

| 전략 | 동작 | 주 사용처 |
|------|------|---------|
| `none` | 스키마 작업 없음 | 기존 스키마에 JPA 붙일 때 |
| `create-drop` | 시작 시 생성, 종료 시 삭제 | 로컬 테스트 |
| `create` | 기존 삭제 후 새로 생성 | 실무 거의 사용 X |
| `update` | 변경된 스키마 반영 | 개발 단계 |
| `validate` | 엔티티와 DB 스키마 일치 검증 | 마이그레이션 점검 |

### 엔티티 예시

```java
@Entity
public class StudentEntity {

    @Id
    @SequenceGenerator(name = "student_seq", sequenceName = "student_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "student_seq")
    private Long id;

    private String name;
    private String email;
    private LocalDate dateOfBirth;

    @Transient  // DB 컬럼 생성 제외 → 계산 필드
    private Integer age;

    public Integer getAge() {
        return Period.between(dateOfBirth, LocalDate.now()).getYears();
    }
}
```

### 레포지토리

```java
// interface만 만들면 기본 CRUD 자동 제공!
public interface StudentRepository extends JpaRepository<StudentEntity, Long> {}
```

**핵심 키워드:** `#@Entity` `#@Id` `#@SequenceGenerator` `#@Transient` `#JpaRepository` `#ddl-auto`

---

## 오늘의 핵심 요약

1. `HttpSessionHandshakeInterceptor` = HTTP 세션 속성을 웹소켓 세션으로 복사
2. 참여자 목록 공유 = Application Scope (세션 스코프 X)
3. `CopyOnWriteArrayList` = 읽기 많고 쓰기 적은 멀티스레드 환경에 유리
4. `sendBeacon()` = 페이지 종료 시점 안정적 전송
5. 도커 포트 포워딩 = `-p 외부:내부`
6. JPA = 규격, Hibernate = 구현체
7. `@Transient` = DB 컬럼 생성 제외, 계산 필드에 사용
8. `ddl-auto=create-drop` = 로컬 테스트에만 사용
9. `JpaRepository` 상속만으로 기본 CRUD 자동 제공
10. `FLUSH PRIVILEGES` = MySQL 권한 변경 즉시 반영
