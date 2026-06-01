---
title: "[TIL] MyBatis 다이나믹 SQL, 조인, 패턴"
date: 2026-03-25
tags: [Java, MyBatis, JOIN, 디자인패턴]
---

> 부트캠프 백엔드 과정 · 2026.03.25

## 오늘 배운 흐름 한눈에 보기

```
다이나믹 SQL: if/where → foreach → choose → trim → set
→ 조인 결과 DTO 매핑 전략 (단일 DTO / resultMap + association/collection)
→ OGNL 점 표기법
→ 디자인 패턴: 파사드(Facade) + 팩토리(Factory)
```

---

## 1. 다이나믹 SQL 핵심

> 하나의 매퍼 쿼리로 다양한 조건을 안전하게 조합하는 것이 핵심
> 자바 코드에서 for로 쿼리 여러 번 실행 → 트랜잭션 길어짐 + 락 경합/데드락 위험

### 공통 SQL 재사용: `<sql>` + `<include>`

```xml
<sql id="selectAll">
    SELECT job_id, job_title, min_salary, max_salary FROM jobs
</sql>

<select id="searchJobs" resultType="JobsDTO">
    <include refid="selectAll"/>
    <where>
        <if test="jobId != null">
            AND job_id = #{jobId}
        </if>
    </where>
</select>
```

---

### `<if>` + `<where>` — 조건 분기

```xml
<select id="searchJobs" resultType="JobsDTO">
    SELECT * FROM jobs
    <where>
        <!-- 조건이 하나라도 생성되면 WHERE 자동 추가 -->
        <!-- 앞쪽 AND/OR 자동 제거 -->
        <if test="jobId != null">
            AND job_id = #{jobId}
        </if>
        <if test="jobTitle != null">
            AND job_title LIKE '%' || #{jobTitle} || '%'
        </if>
    </where>
</select>
```

> ⚠️ `test="str.trim() != null"` → str이 null이면 NullPointerException!
> null 체크를 **먼저** 하거나, `test="str != null and str != ''"`로 작성

---

### `<foreach>` — IN 절 구성 (시험 빈출 ⭐)

```xml
<!-- List 단독 전달 → collection="list" -->
<select id="selectByIds" resultType="JobsDTO">
    SELECT * FROM jobs
    WHERE job_id IN
    <foreach collection="list" item="id" open="(" close=")" separator=",">
        #{id}
    </foreach>
</select>
```

```xml
<!-- Map에 리스트 담아서 전달 → collection="키이름" -->
<select id="selectByIds" resultType="JobsDTO">
    SELECT * FROM jobs
    WHERE job_id IN
    <foreach collection="IDS" item="id" open="(" close=")" separator=",">
        #{id}
    </foreach>
</select>
```

```java
// List 단독 전달
List<String> ids = Arrays.asList("IT_PROG", "SA_REP", "MK_MAN");
session.selectList(NS + "selectByIds", ids);

// Map으로 전달
Map<String, Object> params = new HashMap<>();
params.put("IDS", ids);
session.selectList(NS + "selectByIds", params);
```

| 파라미터 타입 | `collection` 값 | 설명 |
|-------------|----------------|------|
| List 단독 | `"list"` | 예약어처럼 사용 |
| Map 안의 리스트 | `"키이름"` | Map의 키 이름 사용 |

---

### `<choose>` / `<when>` / `<otherwise>` — switch-case

```xml
<!-- 상위 조건 참 → 하위 조건 평가 안 함 (switch-case 동작) -->
<select id="searchJobs" resultType="JobsDTO">
    SELECT * FROM jobs
    <where>
        <choose>
            <when test="jobId != null">
                AND job_id = #{jobId}       <!-- jobId 있으면 여기만 실행 -->
            </when>
            <when test="jobTitle != null">
                AND job_title = #{jobTitle} <!-- jobId 없고 jobTitle 있으면 -->
            </when>
            <otherwise>
                AND 1=1                     <!-- 둘 다 없으면 -->
            </otherwise>
        </choose>
    </where>
</select>
```

> ⚠️ 두 조건 **동시에** 적용하려면 `choose` X → `trim` + `if` 조합 사용

---

### `<trim>` — 접두/접미어 오버라이딩

```xml
<!-- WHERE절 조합: prefix로 WHERE 붙이고, 앞쪽 AND/OR 제거 -->
<select id="searchJobs" resultType="JobsDTO">
    SELECT * FROM jobs
    <trim prefix="WHERE" prefixOverrides="AND|OR">
        <if test="jobId != null">
            AND job_id = #{jobId}
        </if>
        <if test="jobTitle != null">
            AND job_title LIKE '%' || #{jobTitle} || '%'
        </if>
    </trim>
</select>
```

| 속성 | 의미 |
|------|------|
| `prefix="WHERE"` | 조각이 하나라도 생성되면 앞에 WHERE 붙임 |
| `prefixOverrides="AND\|OR"` | 조각 앞의 AND/OR 자동 제거 |
| `suffix=")"` | 뒤에 붙이기 |
| `suffixOverrides=","` | 뒤의 쉼표 자동 제거 |

---

### `<set>` — UPDATE 전용 (마지막 콤마 제거)

```xml
<update id="updateJob" parameterType="JobsDTO">
    UPDATE jobs
    <set>
        <!-- <set> = 자동으로 SET 붙이고, 마지막 콤마 제거 -->
        <if test="jobTitle != null">job_title = #{jobTitle},</if>
        <if test="minSalary != 0">min_salary = #{minSalary},</if>
        <if test="maxSalary != 0">max_salary = #{maxSalary},</if>
    </set>
    WHERE job_id = #{jobId}
</update>
```

```xml
<!-- <set>과 동일한 표현 (trim으로 직접 구현) -->
<trim prefix="SET" suffixOverrides=",">
    ...
</trim>
```

---

## 2. 조인 결과 매핑 전략

### 방식 A — 단일 DTO에 모두 담기 (간단하지만 비권장)

```java
// 조인 결과 컬럼을 한 DTO에 모두 선언
class TeamPlayerDTO {
    // 팀 정보
    private String teamId;
    private String teamName;
    // 선수 정보 (비대해짐)
    private String playerId;
    private String playerName;
    private int height;
}
```

> 컬럼 많을수록 DTO가 비대해짐 → 확장 불리

### 방식 B — DTO 분리 + OGNL 점 표기법

```java
// 팀 DTO가 선수 DTO를 멤버로 보유
class TeamDTO {
    private String teamId;
    private String teamName;
    private PlayerDTO playerDTO;  // 하위 DTO
}
```

```xml
<!-- OGNL 점 표기법으로 하위 객체 필드 매핑 -->
<resultMap id="teamRM" type="TeamDTO">
    <result column="team_id"   property="teamId"/>
    <result column="team_name" property="teamName"/>
    <result column="player_id" property="playerDTO.playerId"/>     <!-- 점 표기법 -->
    <result column="height"    property="playerDTO.height"/>
</resultMap>
```

> OGNL = Object Graph Navigation Language
> 점 표기법으로 하위 객체 필드까지 접근

### 방식 C — 1:N 구조 (collection) ← 권장

```java
// 팀 DTO가 선수 리스트를 보유
class TeamDTO {
    private String teamId;
    private String teamName;
    private List<PlayerDTO> playerDTOS;  // 1:N 리스트
}
```

```xml
<resultMap id="playerRM" type="PlayerDTO">
    <result column="player_id"   property="playerId"/>
    <result column="player_name" property="playerName"/>
    <result column="height"      property="height"/>
</resultMap>

<resultMap id="teamRM" type="TeamDTO">
    <result column="team_id"   property="teamId"/>
    <result column="team_name" property="teamName"/>
    <!-- 1:N → collection -->
    <collection property="playerDTOS" resultMap="playerRM"/>
</resultMap>
```

```java
// 팀 15개 → 각 팀마다 선수 리스트
List<TeamDTO> teams = session.selectList(NS + "selectTeamPlayers");
System.out.println(teams.size());                  // 15 (팀 개수)
System.out.println(teams.get(0).getPlayerDTOS().size());  // 48 (첫 팀 선수 수)
```

### association vs collection

| 구분 | 목적 | 관계 | 특징 |
|------|------|------|------|
| `association` | 하위 객체 1개 매핑 | 1:1 | 단일 객체를 필드로 |
| `collection` | 하위 목록 매핑 | 1:N | 같은 상위 키 기준으로 리스트 묶음 |

**핵심 키워드:** `#조인` `#resultMap` `#collection` `#OGNL` `#DTO설계`

---

## 3. 디자인 패턴: 파사드 + 팩토리

### 파사드(Facade) — 복잡한 하위 시스템을 단일 창구로

```java
// 하위 시스템
class Amp { public void on() {...} }
class DvdPlayer { public void play(String movie) {...} }
class Projector { public void on() {...} }

// 파사드 (단일 진입점)
class HomeTheaterFacade {
    private Amp amp;
    private DvdPlayer dvd;
    private Projector projector;

    public HomeTheaterFacade(Amp amp, DvdPlayer dvd, Projector projector) {
        this.amp = amp;
        this.dvd = dvd;
        this.projector = projector;
    }

    // 복잡한 순서를 하나로 묶음
    public void watchMovie(String movie) {
        projector.on();
        amp.on();
        dvd.play(movie);
    }
}

// 사용: 내부 복잡성 숨기고 단순 호출
facade.watchMovie("어벤져스");
```

> 💡 낮은 결합도 + 단일 진입점 + 계층 구조 명확화

### 팩토리(Factory) — 생성과 등록/관리 분리

```java
// 추상 팩토리
abstract class CardFactory {
    public final Card create(String owner) {    // final = 흐름 고정
        Card card = createProduct(owner);       // 생성 위임
        registerProduct(card);                  // 등록 관리
        return card;
    }
    protected abstract Card createProduct(String owner);  // 하위 구현
    protected abstract void registerProduct(Card card);   // 하위 구현
}

// 구체 팩토리
class IDCardFactory extends CardFactory {
    private List<Card> cards = new ArrayList<>();

    @Override
    protected Card createProduct(String owner) {
        return new IDCard(owner);
    }

    @Override
    protected void registerProduct(Card card) {
        cards.add(card);
    }
}
```

```
팩토리 패턴 핵심:
  생성(createProduct) + 등록/관리(registerProduct) 분리
  새 카드 추가 시 → CardFactory 상속한 새 팩토리만 만들면 됨 (OCP)
```

**핵심 키워드:** `#Facade` `#Factory_Method` `#OCP` `#낮은결합도` `#템플릿메서드`

---

## 오늘의 핵심 요약

1. `<where>` = 조건 있을 때만 WHERE 자동 추가, 앞쪽 AND/OR 자동 제거
2. `<if test="...">` null 체크 먼저! → `test="str != null and str != ''"`
3. `<foreach>` List 단독 → `collection="list"` / Map 안 리스트 → `collection="키이름"`
4. `<choose>` = switch-case (상위 조건 참 → 하위 평가 안 함)
5. `<trim prefixOverrides="AND|OR">` = 수동 WHERE + AND 제거
6. `<set>` = UPDATE 마지막 콤마 자동 제거
7. 조인 1:N → `collection` 으로 같은 상위 키 기준 리스트 묶음
8. OGNL = 점 표기법으로 하위 객체 필드 매핑 (`property="dto.field"`)
9. 파사드 = 복잡한 하위 시스템 → 단일 창구로 추상화
10. 팩토리 = 생성(createProduct) + 등록(registerProduct) 분리 → OCP 확장
