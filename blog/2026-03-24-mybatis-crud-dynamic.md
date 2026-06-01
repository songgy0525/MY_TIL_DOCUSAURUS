---
title: "[TIL] MyBatis 매핑과 CRUD, 동적쿼리"
date: 2026-03-24
tags: [Java, MyBatis, CRUD, 동적쿼리]
---

> 부트캠프 백엔드 과정 · 2026.03.24

## 오늘 배운 흐름 한눈에 보기

```
DTO 바인딩(게터) / 결과 매핑(세터) 도식화
→ resultType vs resultMap 적용 기준
→ CRUD 매퍼 + Repository 구현 + openSession 커밋 차이
→ 신규 웹 프로젝트 + properties 기반 DB 설정
→ Lombok으로 VO 자동화
→ #/${} 바인딩 + LIKE 검색 구현
```

---

## 1. DTO 바인딩과 결과 매핑 핵심 방향성

```
입력 (파라미터 → SQL):
  DTO 전달 → #{jobId} → getJobId() 호출 → SQL에 바인딩

출력 (SQL → 결과):
  SELECT 결과 → resultType → setJobId() 호출 → DTO에 주입
```

```java
// 입력: #{필드명} = DTO의 게터 자동 호출
// "SELECT * FROM jobs WHERE job_id = #{jobId}"
// → dto.getJobId() 값으로 바인딩

// 출력: resultType = DTO의 세터 자동 호출
// JOB_ID 컬럼 → dto.setJobId() 호출
```

> 💡 "입력은 게터 기반 바인딩, 출력은 세터 기반 매핑"

### `<sql>` + `<include>` 재사용

```xml
<sql id="jobColumns">
    job_id, job_title, min_salary, max_salary
</sql>

<select id="selectAllJobs" resultType="JobsDTO">
    SELECT <include refid="jobColumns"/> FROM jobs
</select>
```

**핵심 키워드:** `#DTO` `##바인딩` `#게터/세터` `#include` `#resultType`

---

## 2. resultMap과 alias로 매핑 단순화

### resultType vs resultMap 비교

| 구분 | 사용 조건 | 장점 | 주의점 |
|------|---------|------|--------|
| `resultType` | 컬럼명 ↔ 프로퍼티명 일치 또는 alias로 맞출 수 있음 | 설정 간단 | 불일치 많으면 유지보수 어려움 |
| `resultMap` | 컬럼명-프로퍼티명 다르거나 복잡한 매핑 필요 | 명시적, 가독성 좋음 | 설정 길어짐, 작성 비용 증가 |

```xml
<!-- resultMap 정의 -->
<resultMap id="jobRM" type="JobsDTO">
    <result column="JOB_ID"     property="jobId"/>
    <result column="JOB_TITLE"  property="jobTitle"/>
    <result column="MIN_SALARY" property="minSalary"/>
    <result column="MAX_SALARY" property="maxSalary"/>
</resultMap>

<select id="selectJob" resultMap="jobRM">
    SELECT job_id     AS JOB_ID,
           job_title  AS JOB_TITLE,
           min_salary AS MIN_SALARY,
           max_salary AS MAX_SALARY
    FROM jobs
    WHERE job_id = #{jobId}
</select>
```

**핵심 키워드:** `#resultMap` `#property` `#alias` `#resultType` `#매핑`

---

## 3. CRUD 매퍼, Repository 구현과 커밋

### insert / update / delete 규칙

```xml
<!-- DML = resultType/resultMap 없음, 영향받은 행 수 반환 -->
<insert id="insertJob" parameterType="JobsDTO">
    INSERT INTO jobs(job_id, job_title, min_salary, max_salary)
    VALUES(#{jobId}, #{jobTitle}, #{minSalary}, #{maxSalary})
</insert>

<delete id="deleteJob" parameterType="String">
    DELETE FROM jobs WHERE job_id = #{jobId}
</delete>

<update id="updateJob" parameterType="JobsDTO">
    UPDATE jobs
    SET job_title  = #{jobTitle},
        min_salary = #{minSalary},
        max_salary = #{maxSalary}
    WHERE job_id = #{jobId}
</update>
```

```java
// DML 검증: 영향받은 행 수 = 1인지 확인
int cnt = session.insert(NS + "insertJob", dto);
assertEquals(1, cnt);
```

### openSession 커밋 차이 (시험 빈출 ⭐)

```java
// 자동 커밋: DML 즉시 반영
SqlSession session = factory.openSession(true);

// 수동 커밋 (기본값): 여러 DML 묶어서 커밋 (트랜잭션)
SqlSession session = factory.openSession(false);
session.insert(...);
session.update(...);
session.commit();    // 명시적 커밋
// session.rollback(); // 실패 시 롤백
```

```
openSession()      = openSession(false) = 수동 커밋 (기본값)
openSession(true)  = 자동 커밋 (즉시 반영)
```

### Repository 구현체 멤버 구성

```java
public class JobsRepositoryImpl implements IJobsRepository {
    private static final Logger logger = LoggerFactory.getLogger(JobsRepositoryImpl.class);
    private static final String NS = "jobsMapper.";
    private SqlSessionFactory factory = SqlSessionManager.getFactory();

    @Override
    public List<JobsDTO> findAll() {
        SqlSession session = factory.openSession();
        return session.selectList(NS + "selectAllJobs");
    }
}
```

> ⚠️ Mapper XML 등록 누락 → 가장 빈번한 오류 원인

**핵심 키워드:** `#openSession(true)` `#자동커밋` `#영향받은행수` `#namespace` `#mappers등록`

---

## 4. properties 기반 DB 설정

```properties
# oracle.properties (공백 주의! 공백도 값으로 인식됨)
driver=oracle.jdbc.OracleDriver
url=jdbc:oracle:thin:@localhost:1521:xe
username=scott
password=tiger
```

```xml
<!-- configuration.xml에서 외부 properties 로드 -->
<configuration>
  <properties resource="oracle.properties"/>

  <environments default="dev">
    <environment id="dev">
      <transactionManager type="JDBC"/>
      <dataSource type="POOLED">
        <property name="driver"   value="${driver}"/>
        <property name="url"      value="${url}"/>
        <property name="username" value="${username}"/>
        <property name="password" value="${password}"/>
      </dataSource>
    </environment>
  </environments>
</configuration>
```

> ⚠️ properties 값 뒤 공백 → 드라이버/URL 매핑 실패
> 리소스 경로 = 파일시스템 경로 X, **클래스패스 경로** 기준

**핵심 키워드:** `#pom.xml` `#properties` `#config.xml` `#SqlSessionFactoryBuilder` `#Resources`

---

## 5. Lombok으로 VO 자동화

### Eclipse 설치 순서

```
1. lombok.jar 실행 → IDE에 agent 설치
2. eclipse.ini에 lombok agent 항목 추가 확인
3. pom.xml에 Lombok 의존성 추가
```

```xml
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <version>1.18.30</version>
    <scope>provided</scope>
</dependency>
```

### 어노테이션 역할

| 어노테이션 | 생성 내용 | 비고 |
|-----------|---------|------|
| `@Getter @Setter` | 모든 필드 getter/setter | DTO 기본 |
| `@NoArgsConstructor` | 기본 생성자 | 프레임워크 매핑에 필요 |
| `@AllArgsConstructor` | 모든 필드 받는 생성자 | 테스트 데이터 구성 |
| `@ToString` | toString() 오버라이드 | 로그/디버깅 |
| `@Builder` | 빌더 패턴 | 필요한 필드만 골라 객체 생성 |

```java
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class PlayerVO {
    private String playerId;
    private String playerName;
    private int backNo;
    private double height;
}

// @Builder 사용
PlayerVO player = PlayerVO.builder()
    .playerId("P001")
    .playerName("홍길동")
    .height(185.5)
    .build();
```

**핵심 키워드:** `#Lombok` `#@Getter` `#@AllArgsConstructor` `#@Builder` `#VO`

---

## 6. `#` / `$` 바인딩과 LIKE 검색

### LIKE 검색 구현 (안전한 방식)

```xml
<!-- % 자체는 SQL 고정 문자열로 두고, 입력값만 #{} 바인딩 -->
<select id="searchByName" resultType="PlayerVO">
    SELECT * FROM player
    WHERE player_name LIKE '%' || #{key} || '%'
</select>
```

```java
// 검색 실행
List<PlayerVO> list = session.selectList(NS + "searchByName", "홍");
```

### `${}` 동적 컬럼 검색 (화이트리스트 통제 필수)

```xml
<!-- 컬럼명은 ${} + 값은 #{} 조합 -->
<select id="searchByColumn" resultType="PlayerVO">
    WHERE ${column} = #{value}
</select>
```

```java
// Map으로 파라미터 묶어서 전달
Map<String, Object> params = new HashMap<>();
params.put("column", "back_no");    // ${}로 치환될 컬럼명
params.put("value", 7);             // #{}로 바인딩될 값
List<PlayerVO> list = session.selectList(NS + "searchByColumn", params);
```

> ⚠️ `${}` 컬럼명은 반드시 허용 목록(화이트리스트)으로 통제

**핵심 키워드:** `##{}` `#${}` `#PreparedStatement` `#SQL인젝션` `#LIKE`

---

## 오늘의 핵심 요약

1. DTO 입력 = **게터** 기반 바인딩 / DTO 출력 = **세터** 기반 매핑
2. `resultType` = 간단, 컬럼명-프로퍼티명 일치 시 / `resultMap` = 명시적, 불일치 시
3. DML(insert/update/delete) = `resultType` 없음, `int` 반환 (영향받은 행 수)
4. `openSession(true)` = 자동 커밋 / `openSession(false)` = 수동 커밋 (기본값)
5. properties 파일 값 뒤 공백 → 드라이버/URL 매핑 실패 주의
6. Lombok `@Builder` = 필요한 필드만 골라 객체 생성
7. LIKE 검색 = `'%' || #{key} || '%'` 패턴으로 안전하게
8. `${}` 컬럼명 동적 검색 = 화이트리스트 통제 필수
9. MyBatis 여러 파라미터 전달 = DTO 또는 Map으로 묶어서 전달
10. Mapper XML 등록 누락 = 가장 빈번한 오류 원인 → 반드시 `<mappers>` 확인
