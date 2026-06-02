---
title: "[TIL] 리액트 기초: 생성, 렌더링, 훅"
date: 2026-04-03
tags: [React, 프론트엔드]
---
> 부트캠프 백엔드 과정 · 2026.04.03

## 오늘 배운 흐름 한눈에 보기

```
작업환경 (Node/NPM/VSCode 확장)
→ Vite로 React 생성
→ App.jsx + 컴포넌트 + Fragment
→ SPA 렌더링 흐름
→ JSX 주석/CSS 적용
→ Props → useState → 함수형 업데이트
→ useEffect → useRef
→ State/Ref/일반변수 비교
→ 배열 렌더링(map + key)
→ 테이블 렌더링 + 폼 이벤트
→ Bootstrap + 제어 컴포넌트
```

---

## 1. 작업환경과 패키지 도구

```bash
# 버전 확인
node -v
npm -v
npx -v
```

| 도구 | 목적 |
|------|------|
| Node.js | JS 런타임 |
| npm | 패키지 설치/관리 |
| npx | 패키지 일회성 실행 |

### VS Code 스니펫 (React 확장)

| 스니펫 | 생성 형태 |
|--------|---------|
| `rfc` | 함수형 컴포넌트 |
| `rafc` | 화살표 함수형 컴포넌트 |
| `rcc` | 클래스형 컴포넌트 |

**핵심 키워드:** `#Node.js` `#NPM` `#NPX` `#스니펫` `#컴포넌트`

---

## 2. Vite로 React 생성

```bash
# 프로젝트 생성
npm create vite@latest CH01_props -- --template react

# 의존성 설치 + 실행
cd CH01_props
npm i
npm run dev
# → http://localhost:5173
```

```
package.json = Maven의 pom.xml 역할
npm i = 의존성 설치 (node_modules 생성)
반드시 프로젝트 루트에서 명령 실행!
```

**핵심 키워드:** `#Vite` `#package.json` `#npm_i` `#npm_run_dev` `#localhost:5173`

---

## 3. App.jsx, 컴포넌트, Fragment

```jsx
import Hello from "./Hello.jsx";

function App() {
    return (
        <>  {/* Fragment: DOM 노드 추가 없이 묶기 */}
            <Hello />
            <Hello />
        </>
    );
}

export default App;
```

| 방식 | 특징 |
|------|------|
| `<div>` 래핑 | DOM 노드 추가, 스타일 영향 있음 |
| `<>...</>` (Fragment) | DOM 노드 추가 없이 묶기 |

> JSX 반환 = 반드시 단일 루트로 감싸야 함

**핵심 키워드:** `#App.jsx` `#JSX` `#Fragment` `#import` `#export_default`

---

## 4. SPA 렌더링 흐름

```
index.html (div#root)
    ↓
main.jsx → createRoot(...).render(<App />)
    ↓
App.jsx → 하위 컴포넌트 조립
    ↓
각 컴포넌트 → axios 등으로 백엔드 API 호출
```

```
리플래시 = 서버에서 HTML 다시 요청 (페이지 전체 새로고침)
렌더링   = 상태 변화로 화면 일부를 다시 그리는 것 (SPA)
```

| 역할 | 기술 |
|------|------|
| 프론트엔드 (UI) | React, axios, 라우팅 |
| 백엔드 (API) | Spring Boot, @GetMapping |
| 데이터 계층 | Oracle/MySQL, MyBatis/JPA |

**핵심 키워드:** `#SPA` `#index.html` `#main.jsx` `#createRoot` `#렌더링`

---

## 5. JSX 주석과 CSS 적용

```jsx
function App() {
    // 일반 JS 주석 (return 밖)

    const cssStyle = {
        backgroundColor: "black",
        color: "white",
        fontSize: "20px",  // camelCase!
    };

    return (
        <>
            {/* JSX 주석: return 안에서는 이렇게 */}
            <div style={cssStyle}>인라인 스타일</div>
            <div className="circle">CSS 파일 적용</div>
        </>
    );
}
```

```
인라인 스타일: style={객체}, CSS 하이픈 → camelCase
CSS 파일: class 아니라 className 사용!
```

**핵심 키워드:** `#JSX주석` `#style` `#CSS파일` `#className` `#우선순위`

---

## 6. Props — 부모→자식 데이터 전달

```jsx
// 부모
<Hello name="홍길동" age={25} />

// 자식 (기본 방식)
function Hello(props) {
    return <div>{props.name} - {props.age}</div>;
}

// 자식 (비구조 할당 방식, 더 간결)
function Hello({ name, age }) {
    return <div>{name} - {age}</div>;
}
```

**핵심 키워드:** `#Props` `#부모-자식` `#비구조할당` `#컴포넌트재사용` `#데이터전달`

---

## 7. useState — 상태 선언과 객체 갱신

```jsx
import { useState } from "react";

// 기본
const [count, setCount] = useState(0);

// 객체 상태
const [info, setInfo] = useState({ name: "", phone: "" });

// 객체 갱신 (스프레드 표기법)
setInfo({
    ...info,               // 기존 값 유지
    phone: "010-0000-0000" // 특정 키만 변경
});

// ⚠️ onClick에는 콜백으로!
// onClick={alert("...")}  → 렌더링 시 즉시 실행 (❌)
// onClick={() => alert("...")} → 클릭 시 실행 (✅)
```

**핵심 키워드:** `#useState` `#상태` `#스프레드표기법` `#콜백` `#렌더링`

---

## 8. 함수형 업데이트 (비동기 상태 업데이트)

```jsx
// ❌ 비동기 문제 발생 가능
setCount(count + 1);

// ✅ 이전 값 기반 업데이트 (권장)
setCount((prev) => prev + 1);
```

> 상태 업데이트는 비동기 처리 → 현재 값 의존 시 함수형 업데이트 사용

**핵심 키워드:** `#비동기업데이트` `#함수형업데이트` `#setState` `#카운터` `#배치처리`

---

## 9. useEffect — 사이드 이펙트

```jsx
import { useEffect } from "react";

// dependency에 따라 실행 타이밍 다름
useEffect(() => {
    console.log("실행!");
});                          // 매 렌더링마다

useEffect(() => {
    console.log("최초 1회");
}, []);                      // 마운트 시 1회

useEffect(() => {
    console.log("count 변경 시");
}, [count]);                 // count 변할 때만

// cleanup 함수 (언마운트 또는 다음 effect 전 실행)
useEffect(() => {
    const timer = setInterval(...);
    return () => clearInterval(timer);  // 정리
}, []);
```

> ⚠️ 개발환경 StrictMode → useEffect 로그 2번 찍힘 (배포 시 정상)

**핵심 키워드:** `#useEffect` `#dependency` `#StrictMode` `#cleanup` `#콜백`

---

## 10. useRef — DOM 접근과 값 유지

```jsx
import { useRef } from "react";

const inputRef = useRef(null);

// DOM 접근
const value = inputRef.current.value;
inputRef.current.focus();  // 포커스 이동

return <input ref={inputRef} />;
```

### State / Ref / 일반변수 비교 (시험 빈출 ⭐)

| 구분 | 값 유지 | 렌더링 유발 | 특징 |
|------|--------|------------|------|
| `useState` | ✅ | ✅ | UI 동기화 목적 |
| `useRef` | ✅ | ❌ | DOM 참조/비렌더링 값 저장 |
| 일반 변수 | ❌ (초기화) | ❌ | 렌더링마다 재선언 |

**핵심 키워드:** `#useRef` `#current` `#DOM접근` `#focus` `#값유지`

---

## 11. 배열 렌더링 (map + key)

```jsx
const arr = ["사과", "바나나", "딸기"];

return (
    <ul>
        {arr.map((item, idx) => (
            <li key={idx}>{item}</li>  // key 필수!
        ))}
    </ul>
);
```

> 💡 실무에서는 인덱스보다 **고유 ID**를 key로 사용 권장
> key = 렌더링 최적화 + 항목 식별 목적

**핵심 키워드:** `#map` `#key` `#배열렌더링` `#JSX표현식` `#리렌더링`

---

## 12. 테이블 렌더링과 폼 이벤트

```jsx
// 객체 배열 → 테이블
{users.map((item, idx) => (
    <tr key={idx}>
        <td>{item.id}</td>
        <td>{item.name}</td>
    </tr>
))}

// 폼 submit 기본 동작 차단 (SPA에서 필수!)
const handleSubmit = (event) => {
    event.preventDefault();  // return false는 React에서 동작 안 함!
    alert("전송!");
};

return <form onSubmit={handleSubmit}>...</form>;
```

**핵심 키워드:** `#onClick` `#onSubmit` `#preventDefault` `#stopPropagation` `#콜백`

---

## 13. Bootstrap 설치와 제어 컴포넌트 폼

```bash
npm i bootstrap
```

```jsx
// CSS import
import "bootstrap/dist/css/bootstrap.min.css";

// 제어 컴포넌트 (하나의 핸들러로 여러 입력 처리)
const [user, setUser] = useState({ firstName: "", email: "" });

const inputChange = (event) => {
    setUser({
        ...user,
        [event.target.name]: event.target.value,  // 동적 키
    });
};

return (
    <>
        <input name="firstName" value={user.firstName} onChange={inputChange} />
        <input name="email" value={user.email} onChange={inputChange} />
    </>
);
```

> `value`만 걸면 입력 불가 → 반드시 `onChange`와 함께!

**핵심 키워드:** `#bootstrap` `#import` `#제어컴포넌트` `#onChange` `#스프레드표기법`

---

## 오늘의 핵심 요약

1. JSX 반환 = 단일 루트 필수 → `<>...</>` (Fragment) 사용
2. `class` → JSX에서는 `className`
3. Props = 부모→자식 단방향 데이터 전달
4. 객체 상태 갱신 = `...기존` + 변경 키만 덮어쓰기
5. onClick에는 **콜백**으로 → `onClick={() => fn()}` (즉시 실행 주의)
6. 현재 값 의존 상태 업데이트 → `setCount((prev) => prev + 1)`
7. useEffect `[]` = 최초 1회 / `[state]` = state 변할 때
8. useRef = 값 유지하지만 렌더링 유발 안 함 (DOM 참조에 최적)
9. `map()` 렌더링 시 `key` 필수 (고유 ID 권장)
10. 제어 컴포넌트 = `value` + `onChange` 반드시 세트로
