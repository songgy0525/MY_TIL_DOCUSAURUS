---
title: "[TIL] MyBatis 조인, 패턴, 웹기초"
date: 2026-03-26
tags: [Java, MyBatis, Web, 디자인패턴]
---

> 부트캠프 백엔드 과정 · 2026.03.26

## 오늘 배운 흐름 한눈에 보기

```
MyBatis 1:N 조인 매핑 완성 (collection + OGNL 검증)
→ 전략(Strategy) 패턴
→ 옵저버(Observer) 패턴
→ VS Code + Live Server 환경 구축
→ HTML 기본 구조 (meta/link/파비콘/리디렉션/viewport)
→ CSS 연결 방식 + 선택자 우선순위
→ 박스 모델 (margin/padding/border)
→ HTML 폼 + DOM 탐색 + location 이동
→ 테이블 병합 + Bootstrap 적용
→ 개발자도구로 UI 복사
```

---

## 1. MyBatis 1:N 조인 매핑 완성

### 팀(1) : 선수(N) 구조

```java
// TeamDTO (상위)
class Team04DTO {
    private String teamId;
    private String teamName;
    private List<Player04DTO> playerDTOS;  // 1:N 리스트
}

// Player04DTO (하위)
class Player04DTO {
    private String playerId;
    private String playerName;
    private int height;
}
```

```xml
<!-- 선수 resultMap -->
<resultMap id="playerRM04" type="Player04DTO">
    <result column="player_id"   property="playerId"/>
    <result column="player_name" property="playerName"/>
    <result column="height"      property="height"/>
</resultMap>

<!-- 팀 resultMap + collection으로 선수 리스트 연결 -->
<resultMap id="teamRM04" type="Team04DTO">
    <result column="team_id"   property="teamId"/>
    <result column="team_name" property="teamName"/>
    <collection property="playerDTOS" resultMap="playerRM04"/>
</resultMap>

<select id="selectTeamPlayers" resultMap="teamRM04">
    SELECT t.team_id, t.team_name,
           p.player_id, p.player_name, p.height
    FROM team t
    LEFT JOIN player p ON t.team_id = p.team_id
    ORDER BY t.team_id
</select>
```

### JUnit 검증 흐름

```java
List<Team04DTO> teams = session.selectList(NS + "selectTeamPlayers");

System.out.println("팀 수: " + teams.size());                     // 15
System.out.println("첫 팀 선수 수: " + teams.get(0).getPlayerDTOS().size()); // 48
System.out.println("첫 팀 첫 선수: " + teams.get(0).getPlayerDTOS().get(0));
```

### 자주 발생하는 실수

| 확인 포인트 | 자주 발생하는 실수 |
|-----------|----------------|
| 팀 리스트 크기 | namespace/메서드명 불일치 → 매핑 실패 |
| `get(0)` 특정 팀 꺼내기 | resultMap 타입을 다른 DTO로 잘못 지정 |
| `getPlayerDTOS().size()` | property명 ↔ 필드명 불일치 → 빈 리스트 |
| 하위 리스트 `get(0)` | DTO 필드명 대소문자로 컬럼으로 오인 |

**핵심 키워드:** `#MyBatis` `#collection` `#resultMap` `#OGNL` `#1:N매핑`

---

## 2. 전략(Strategy) 패턴

```
목적: 교체 가능한 알고리즘(행위)을 인터페이스로 분리
      → 런타임에 전략 교체 가능 → OCP 만족
적용: 결제 수단, 정렬 방식, 압축 방식 등 "선택지가 늘어나는 도메인"
```

```java
// 전략 인터페이스
interface PaymentStrategy {
    void pay(int amount);
}

// 구현체
class CardPayment implements PaymentStrategy {
    public void pay(int amount) { System.out.println("카드 결제: " + amount); }
}
class CashPayment implements PaymentStrategy {
    public void pay(int amount) { System.out.println("현금 결제: " + amount); }
}

// 컨텍스트 (전략 주입받아 실행)
class PaymentContext {
    private PaymentStrategy strategy;

    public void setStrategy(PaymentStrategy strategy) {
        this.strategy = strategy;  // 런타임에 교체 가능
    }

    public void checkout(int amount) {
        if (strategy == null) throw new IllegalStateException("전략 없음");
        strategy.pay(amount);
    }
}

// 사용
PaymentContext ctx = new PaymentContext();
ctx.setStrategy(new CardPayment());
ctx.checkout(50000);   // 카드 결제: 50000

ctx.setStrategy(new CashPayment());
ctx.checkout(30000);   // 현금 결제: 30000
// 새로운 결제 수단 추가 → 새 구현체만 만들면 됨 (OCP)
```

**핵심 키워드:** `#Strategy_Pattern` `#OCP` `#의존성주입` `#인터페이스` `#컨텍스트`

---

## 3. 옵저버(Observer) 패턴

```
목적: 상태 변화(이벤트) 발생 시 구독자에게 자동 통지
적용: 유튜브 구독 알림, 실시간 채팅, WebSocket, Kafka 이벤트
```

```java
// 구독자 인터페이스
interface Observer {
    void update(String message);
}

// 퍼블리셔 (유튜브 채널)
class YouTubeChannel {
    private List<Observer> subscribers = new ArrayList<>();
    private String channelName;

    public void subscribe(Observer o)   { subscribers.add(o); }
    public void unsubscribe(Observer o) { subscribers.remove(o); }

    private void notifySubscribers(String msg) {
        for (Observer o : subscribers) o.update(msg);
    }

    public void uploadVideo(String title) {
        System.out.println("[업로드] " + title);
        notifySubscribers(channelName + ": 새 영상 - " + title);
    }
}

// 구독자 구현체
class User implements Observer {
    private String name;
    public void update(String msg) { System.out.println(name + " 알림: " + msg); }
}
```

| 메서드 | 위치 | 의미 |
|--------|------|------|
| `subscribe(s)` | 퍼블리셔 | 구독자 리스트 추가 |
| `unsubscribe(s)` | 퍼블리셔 | 구독자 리스트 제거 |
| `notifySubscribers(msg)` | 퍼블리셔 | 모든 구독자 `update()` 호출 |
| `uploadVideo(title)` | 퍼블리셔 | 상태 변화 + notify 트리거 |

**핵심 키워드:** `#Observer_Pattern` `#Publisher` `#Subscriber` `#notify` `#update`

---

## 4. VS Code + Live Server 환경 구축

```
설치 순서:
1. VS Code 설치
2. Extensions → Live Server 설치
3. Workspace Trust 허용 (보안 차단 해제)
4. Live Server Settings → Custom Browser: Chrome
5. HTML 파일 → Open with Live Server
   → 저장 시 브라우저 자동 갱신
```

**핵심 키워드:** `#VS_Code` `#Live_Server` `#Extensions` `#Workspace_Trust` `#Emmet`

---

## 5. HTML 기본 구조와 meta 태그

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">                              <!-- 인코딩 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- 반응형 -->
    <meta http-equiv="refresh" content="5;url=https://naver.com"> <!-- 리디렉션 -->
    <title>페이지 제목</title>                           <!-- 브라우저 탭 -->
    <link rel="shortcut icon" href="favicon.ico">        <!-- 파비콘 -->
</head>
<body>
    <!-- 화면 출력 콘텐츠 -->
</body>
</html>
```

| 요소 | 위치 | 의미 |
|------|------|------|
| `meta charset` | head | 문자 인코딩 지정 |
| `meta viewport` | head | 반응형 렌더링 기준 |
| `meta refresh` | head | 시간 기반 리디렉션 |
| `title` | head | 브라우저 탭 제목 |
| `link favicon` | head | 탭 아이콘 |

**핵심 키워드:** `#meta` `#viewport` `#refresh` `#favicon` `#개발자도구`

---

## 6. CSS 연결 방식 + 선택자 우선순위

### CSS 연결 3가지

```html
<!-- 1. 인라인: 태그에 직접 -->
<p style="color: red; font-size: 16px;">텍스트</p>

<!-- 2. 임베드: head 안 style 블록 -->
<style> p { color: blue; } </style>

<!-- 3. 링크드: 외부 파일 (실무 기본) -->
<link rel="stylesheet" href="./css/style.css">
```

### 선택자 우선순위 (높을수록 우선 적용)

```
인라인 > ID > Class > Tag
 1000  > 100 >  10  >  1

복합 선택자 = 점수 합산
h1#a = 1(태그) + 100(ID) = 101점
```

```css
/* 선택자 종류 */
h1 { }          /* 태그 선택자: 1점 */
.myClass { }    /* 클래스 선택자: 10점 */
#myId { }       /* ID 선택자: 100점 */
h1#myId { }     /* 복합: 101점 */

/* 그룹 선택자 */
h1, h2, h3 { color: red; }

/* 후손 선택자 (div 안의 모든 p) */
div p { }

/* 자식 선택자 (div 바로 아래 p만) */
div > p { }
```

**핵심 키워드:** `#inline` `#embedded` `#linked` `#우선순위` `#복합선택자`

---

## 7. 박스 모델 (margin / padding / border)

```
┌─────────────────────┐
│       margin        │  ← 다른 요소와의 거리
│  ┌───────────────┐  │
│  │    border     │  │  ← 테두리
│  │  ┌─────────┐  │  │
│  │  │ padding │  │  │  ← 콘텐츠와 테두리 사이 내부 공간
│  │  │ content │  │  │
│  │  └─────────┘  │  │
│  └───────────────┘  │
└─────────────────────┘
```

### margin/padding 단축 표기

| 값 개수 | 의미 | 예시 |
|--------|------|------|
| 1개 | 4방향 동일 | `margin: 10px` |
| 2개 | 위아래 / 좌우 | `margin: 10px 0` |
| 3개 | 위 / 좌우 / 아래 | `margin: 10px 0 5px` |
| 4개 | 위 / 오른쪽 / 아래 / 왼쪽 | `margin: 10px 5px 10px 5px` |

```css
/* border 단축 표기 */
border: 1px solid #ccc;

/* 특정 방향만 오버라이드 */
border: 1px solid #ccc;
border-bottom: 2px solid red;  /* 아래만 다르게 */

/* 둥근 모서리 */
border-radius: 8px;
```

**핵심 키워드:** `#box_model` `#margin` `#padding` `#border` `#border-radius`

---

## 8. HTML 폼 + DOM 탐색 + 페이지 이동

```html
<fieldset>
    <legend>검색</legend>
    <input type="text" id="keyword" placeholder="검색어 입력">
    <button onclick="search()">검색</button>
</fieldset>

<script>
function search() {
    const keyword = document.getElementById('keyword').value;  // 값 읽기
    console.log(keyword);                                      // 콘솔 출력
    location.href = 'https://search.naver.com/search.naver?query=' + keyword;
}
</script>
```

| 기능 | API | 역할 |
|------|-----|------|
| 요소 탐색 | `document.getElementById()` | ID 기반 DOM 탐색 |
| 값 읽기 | `.value` | input 입력값 |
| HTML 조작 | `.innerHTML` | 태그 포함 읽기/쓰기 |
| 텍스트만 | `.textContent` | 태그 없이 텍스트만 |
| 콘솔 출력 | `console.log()` | 브라우저 콘솔 |
| 페이지 이동 | `location.href` | URL로 이동 |

**핵심 키워드:** `#fieldset` `#onclick` `#document` `#location.href` `#console.log`

---

## 9. 테이블 병합 + Bootstrap 적용

```html
<table>
    <thead>
        <tr>
            <th colspan="2">이름 (가로 병합)</th>  <!-- 2칸 가로 병합 -->
            <th rowspan="2">비고 (세로 병합)</th>   <!-- 2칸 세로 병합 -->
        </tr>
        <tr>
            <th>성</th><th>이름</th>
            <!-- rowspan된 칸은 제거! -->
        </tr>
    </thead>
    <tbody>...</tbody>
    <tfoot>...</tfoot>
</table>
```

```html
<!-- Bootstrap CDN 연결 (남의 CSS → 위에, 내 CSS → 아래에) -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="./css/my.css">  <!-- 내 CSS는 아래에서 오버라이드 -->

<!-- Bootstrap 테이블 클래스 -->
<table class="table table-striped table-bordered table-hover">
```

> ⚠️ 병합 시 병합된 셀만큼 나머지 td/th **반드시 제거**

**핵심 키워드:** `#table` `#colspan` `#rowspan` `#Bootstrap` `#thead/tbody/tfoot`

---

## 10. 개발자도구로 UI 복사 활용

```
실무 흐름: 기존 UI 가져와 수정하는 방식이 일반적
           (처음부터 모두 제작 X)

1. F12 → 요소 선택 → Copy element (HTML 조각 확보)
2. 페이지 소스에서 CSS 링크 찾아 저장
3. 로컬 프로젝트에 배치 → <link>로 연결
4. 내 CSS로 오버라이드 (내 CSS는 항상 아래에)
```

> 핵심 역량 = 태그 암기 X → **구조(노드 트리)와 CSS 적용 관계를 읽는 능력**
> AI 코드 수정도 소스 해석력이 있어야 가능

---

## 오늘의 핵심 요약

1. MyBatis 1:N = `collection` 으로 같은 팀 기준 선수 리스트 묶음
2. `property` 명 ↔ DTO 필드명 불일치 → 빈 리스트 반환 (가장 흔한 실수)
3. 전략 패턴 = 인터페이스로 행위 분리 → 런타임에 교체 가능 (OCP)
4. 옵저버 패턴 = 상태 변화 시 구독자 자동 통지 → 이벤트 리스너 기초 개념
5. CSS 우선순위: 인라인(1000) > ID(100) > Class(10) > Tag(1)
6. 복합 선택자 = 점수 합산 / 동점 → 나중에 작성된 규칙 적용
7. `margin` = 외부 거리 / `padding` = 내부 공간 / `border` = 테두리
8. Bootstrap CSS = 위에 연결, 내 CSS = 아래에 연결 (오버라이드 위해)
9. 테이블 병합 시 병합된 칸만큼 td/th 반드시 제거
10. DOM 탐색 `value` = 폼 입력값 / `innerHTML` = HTML 포함 / `textContent` = 텍스트만
