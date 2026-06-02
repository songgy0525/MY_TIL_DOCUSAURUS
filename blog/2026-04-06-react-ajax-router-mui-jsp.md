---
title: "[TIL] 리액트 AJAX, 라우터, MUI, JSP 스크래핑"
date: 2026-04-06
tags: [React, AJAX, JSP]
---
> 부트캠프 백엔드 과정 · 2026.04.06

## 오늘 배운 흐름 한눈에 보기

```
React 폼 상태관리 → AJAX + fetch
→ OpenWeatherMap API → React-Spring Boot 연동 (CORS)
→ React Router DOM → React DevTools
→ MUI 설치/적용 → JSP Jsoup 스크래핑
→ 요구사항 분석 (유스케이스 다이어그램)
```

---

## 1. React 폼 상태관리 기본 패턴

```jsx
// 필드별 useState
const [firstName, setFirstName] = useState("");
const [email, setEmail] = useState("");

const handleSubmit = (event) => {
    event.preventDefault();  // 기본 전송 차단
    console.log(firstName, email);
};

return (
    <form onSubmit={handleSubmit}>
        <input value={firstName} onChange={e => setFirstName(e.target.value)} />
        <input value={email} onChange={e => setEmail(e.target.value)} />
        <input type="submit" value="전송" />
    </form>
);
```

**핵심 키워드:** `#useState` `#onChange` `#value바인딩` `#preventDefault` `#JSX표현식`

---

## 2. AJAX와 fetch 기반 통신

```
AJAX = 화면 전환 없이 데이터만 교환
SPA  = 서버가 JSON 반환 → 프론트가 화면 구성
```

```javascript
// fetch POST 기본 패턴
fetch("http://localhost:8080/api/form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email }),
})
.then(res => res.json())      // JSON 파싱
.then(data => console.log("응답:", data))
.catch(err => console.log("에러:", err));
```

| 방식 | 설치 | 특징 |
|------|------|------|
| `fetch` | 불필요 (브라우저 기본) | 응답 JSON 파싱 직접 호출 |
| `axios` | 필요 | 사용성 좋음, React에서 자주 사용 |
| `jQuery.ajax` | 필요 | 레거시에서 자주 마주침 |

**핵심 키워드:** `#AJAX` `#fetch` `#Promise` `#Content-Type` `#JSON.stringify`

---

## 3. OpenWeatherMap API 날씨 출력

```jsx
const [temp, setTemp] = useState("");
const [desc, setDesc] = useState("");
const [icon, setIcon] = useState("");
const [isReady, setIsReady] = useState(false);

// 날씨 조회
fetch(`https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
        setTemp(data.main.temp);
        setDesc(data.weather[0].description);
        setIcon(data.weather[0].icon);
        setIsReady(true);
    });

// 아이콘 표시
<img src={`https://openweathermap.org/img/wn/${icon}@2x.png`} />
```

**핵심 키워드:** `#OpenWeatherMap` `#지오코딩` `#weather[0]` `#로딩상태` `#아이콘URL`

---

## 4. React-Spring Boot 연동, DTO, CORS (시험 빈출 ⭐)

```java
// Spring Boot 컨트롤러
@PostMapping("/api/form")
@CrossOrigin(origins = "http://localhost:5173")  // CORS 허용
public ResponseEntity<FormResponse> submit(@RequestBody FormRequest req) {
    return ResponseEntity.ok(new FormResponse("성공", req.getFirstName()));
}
```

```
CORS 에러 원인:
  React 개발서버: http://localhost:5173
  Spring Boot:   http://localhost:8080
  → 포트가 달라 출처(origin) 불일치 → 브라우저 차단

해결: @CrossOrigin(origins="http://localhost:5173")
```

| 오류 | 원인 |
|------|------|
| `405 Method Not Allowed` | GET으로 POST 전용 엔드포인트 호출 |
| CORS 에러 | 출처(origin) 불일치 → 브라우저 차단 |

**핵심 키워드:** `#@RequestBody` `#DTO` `#ResponseEntity` `#CORS` `#@CrossOrigin`

---

## 5. React Router DOM

```bash
npm i react-router-dom
```

```jsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/">홈</Link>
                <Link to="/about">소개</Link>
            </nav>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
            </Routes>
        </BrowserRouter>
    );
}
```

```
Link = <a> 태그처럼 보이지만 페이지 리로드 없이 이동 (히스토리 API 기반)
```

**핵심 키워드:** `#react-router-dom` `#BrowserRouter` `#Routes` `#Route` `#Link`

---

## 6. 컴포넌트 구조와 React DevTools

```
레이아웃 구조:
BrowserRouter
  └── Layout (헤더/푸터 고정)
        └── Outlet (페이지 교체 영역)
              ├── Home
              ├── Login
              └── Board

디렉토리:
  layout/    → 공통 프레임 (헤더/푸터)
  pages/     → 라우팅 단위 화면
  components/ → 재사용 UI 조각
  services/  → API 통신 로직
```

> Chrome 확장 React DevTools → Components 탭에서 컴포넌트 트리/props/state 확인

**핵심 키워드:** `#Layout` `#Outlet` `#React_DevTools` `#props` `#컴포넌트트리`

---

## 7. MUI 설치와 기본 사용

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material  # 아이콘 필요 시
```

```jsx
import Button from "@mui/material/Button";
import List from "@mui/material/List";

// ⚠️ 전역 CSS(index.css) import와 충돌 가능
// 초기 실습 시 index.css import 주석 처리 권장
```

> MUI = 미리 만들어진 React UI 컴포넌트 (Tailwind와 달리 "구성 요소" 단위)

**핵심 키워드:** `#MUI` `#Material_Design` `#@mui/material` `#emotion` `#전역CSS충돌`

---

## 8. MUI로 리스트 추가/삭제

```jsx
// 상태 관리
const [items, setItems] = useState([]);
const [open, setOpen] = useState(false);  // Dialog 열기/닫기

// 추가
const addItem = (newItem) => {
    setItems([...items, newItem]);
};

// 삭제 (인덱스 기반)
const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
};

// Dialog에서 입력
<Dialog open={open} onClose={() => setOpen(false)}>
    <TextField name="product" value={form.product} onChange={handleChange} />
    <Button onClick={() => { addItem(form); setOpen(false); }}>추가</Button>
</Dialog>
```

| 컴포넌트 | 역할 |
|---------|------|
| `AppBar/Toolbar` | 상단 헤더 |
| `Dialog` | 모달 입력창 |
| `TextField` | 입력 UI |
| `List/ListItemText` | 목록 UI |

**핵심 키워드:** `#Dialog` `#TextField` `#List` `#props전달` `#스프레드표기법`

---

## 9. JSP Jsoup 스크래핑 (서블릿)

```java
// Maven 의존성 추가 필요: jsoup
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;

// 서블릿에서 스크래핑
String title = request.getParameter("title");
String url = "https://comic.naver.com/webtoon/..." + title;

Document doc = Jsoup.connect(url).get();
Elements imgTags = doc.select("#comic_view_area img");

List<String> imgList = new ArrayList<>();
for (Element img : imgTags) {
    imgList.add(img.attr("src"));
}

request.setAttribute("imgList", imgList);
request.getRequestDispatcher("/WEB-INF/views/webtoon.jsp")
       .forward(request, response);
```

| 단계 | 주체 | 핵심 API |
|------|------|---------|
| 파라미터 수신 | 서블릿 | `request.getParameter()` |
| HTML 수집 | Jsoup | `Jsoup.connect(url).get()` |
| DOM 탐색 | Jsoup | `Document.select(cssQuery)` |
| 결과 전달 | 서블릿→JSP | `request.setAttribute()` + `forward()` |

**핵심 키워드:** `#JSP` `#HttpServlet` `#Jsoup` `#Document` `#CSS_Selector`

---

## 10. 요구사항 분석과 유스케이스 다이어그램

```
분석 요소:
  액터(Actor) = 시스템 이해관계자 (회원, 관리자)
  유스케이스  = 동사 포함 기능 목록 (로그인, 게시글 등록)

관계 표현:
  Include    = 기능 수행에 필수로 포함되는 하위 기능
  Extend     = 조건에 따라 선택적으로 추가되는 기능
  일반화     = 상위 기능을 하위 기능으로 분해

비기능 요구사항 = 유스케이스 목록에 포함하지 않고 별도 관리
(예: 파일 크기 제한, 다국어 지원, 음성 지원)
```

**핵심 키워드:** `#요구사항분석` `#액터` `#유스케이스` `#Include/Extend` `#UML`

---

## 오늘의 핵심 요약

1. CORS = 포트 다른 출처 간 요청 → `@CrossOrigin`으로 허용
2. `405` = HTTP 메서드 불허용 (GET으로 POST 전용 호출 등)
3. `fetch` = 브라우저 기본 / `axios` = 설치 필요, 더 편리
4. React Router = `<Link>`로 이동 (페이지 리로드 없음)
5. MUI = 전역 CSS와 충돌 가능 → 초기엔 import 주석 처리
6. Jsoup = HTML을 URL로 가져와 CSS 선택자로 탐색
7. 유스케이스 = 동사 포함 기능 / 비기능 요구사항은 별도 관리
8. `@RequestBody` = JSON 바디를 DTO로 자동 매핑
9. `ResponseEntity` = 상태 코드 + 응답 바디 함께 반환
10. Outlet = 레이아웃에서 페이지가 교체되는 영역
