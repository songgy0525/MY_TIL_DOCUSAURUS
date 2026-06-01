---
title: "[TIL] HTML 핵심 정리와 CSS 실무 기초"
date: 2026-03-27
tags: [HTML, CSS, Web]
---

> 부트캠프 백엔드 과정 · 2026.03.27

## 오늘 배운 흐름 한눈에 보기

```
HTML 요소 (블록/인라인/링크/이미지/목록)
→ 외부 폰트 적용 (Import/Font-face)
→ CSS 단위 (px/em/rem/vw/vh) + 색상 표기
→ CSS 초기화 전략
→ 반응형 웹앱 + 미디어 쿼리
→ 선택자 (후손 vs 자식) + float/clear
→ 배경 이미지 상대 경로
→ 링크 상태 + 텍스트 효과 + 프로토타이핑
```

---

## 1. HTML 요소와 문서 구조

### 블록 vs 인라인 요소

```
블록 요소: 한 줄 전체 차지 → 문서 구조 구성
  div, p, h1~h6, ul/ol, table, form, section, nav, aside ...

인라인 요소: 콘텐츠 크기만큼만 차지 → 문장 내 조합
  span, a, img, strong, em, input, button ...
```

```html
<!-- div: 고유 의미 없는 영역 태그 (DOM 탐색/CSS 선택 용이하게) -->
<div id="header">...</div>
<div class="content">...</div>

<!-- 시맨틱 태그 (의미 있는 영역) -->
<header>, <nav>, <main>, <section>, <aside>, <footer>
```

### 링크 (a 태그)

```html
<!-- href="#id" = 현재 문서 내 앵커 이동 (스크롤) -->
<a href="#section1">섹션1로 이동</a>
<div id="section1">...</div>

<!-- target="_blank" = 새 탭 -->
<a href="https://naver.com" target="_blank" title="네이버로 이동">네이버</a>
<!--                                          ↑ 툴팁 + 스크린 리더 접근성 -->
```

### 이미지: `<img>` vs `background-image`

| 방식 | 적합한 경우 | 특징 |
|------|-----------|------|
| `<img src="..." alt="...">` | 콘텐츠 이미지 (의미 있는 이미지) | 사용자가 복사/저장 가능, `alt` 필수 |
| `background-image: url(...)` | 장식/배경 이미지 | 사용자 직접 선택 어려움 |

### 목록

```html
<ol>  <!-- 순서 있는 목록 -->
    <li>첫 번째</li>
    <li>두 번째</li>
</ol>

<ul>  <!-- 순서 없는 목록 -->
    <li>항목 A</li>
    <li>항목 B</li>
</ul>
```

**핵심 키워드:** `#div` `#블록요소` `#인라인요소` `#a태그` `#img`

---

## 2. 외부 폰트 적용

### 방식 1: @import (제공 URL 그대로 가져오기)

```css
/* CSS 파일 최상단에 */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR&display=swap');

body {
    font-family: 'Noto Sans KR', sans-serif;  /* 패밀리명 정확히! */
}
```

### 방식 2: @font-face (직접 선언)

```css
@font-face {
    font-family: 'MyFont';
    src: url('./fonts/myfont.woff2') format('woff2');
}

body {
    font-family: 'MyFont', serif;  /* 폴백 체인 */
}
```

> ⚠️ 폰트 이름에 따옴표가 포함되면 따옴표까지 포함한 이름 사용
> ⚠️ 폰트 먼저 확정 후 레이아웃 잡기 → 폰트마다 행간/자간 달라서 레이아웃 틀어짐
> ⚠️ 폴백 체인 = 동시 적용 X → 앞쪽 폰트 없으면 다음 폰트로 대체
> ⚠️ 상업적 사용 시 라이선스 반드시 확인

```
문제 발생 시:
1. F12 → Network 탭 → 폰트 CSS/파일 200 확인
2. 패밀리명 오타 확인
3. Ctrl+Shift+R (강력 새로고침)으로 캐시 클리어
```

**핵심 키워드:** `#@import` `#@font-face` `#font-family` `#폴백체인` `#강력새로고침`

---

## 3. CSS 단위, 색상, 초기화 전략

### CSS 단위 비교

| 단위 | 기준 | 용도 |
|------|------|------|
| `px` | 고정 | 정확한 크기, 유동성 부족 |
| `em` | 부모 폰트 크기 | 컴포넌트 단위 상대 조정 |
| `rem` | 루트(body) 폰트 크기 | 전체 스케일 일관성 유지 |
| `%` | 부모 크기 | 컨테이너 비율 기반 레이아웃 |
| `vw/vh` | 뷰포트 폭/높이 | 디바이스 크기에 즉시 반응 |

```css
/* rem 활용 예시 */
html { font-size: 16px; }   /* 루트 기준 */
h1   { font-size: 2rem; }   /* 32px */
p    { font-size: 1rem; }   /* 16px */
/* html font-size 하나만 바꾸면 전체 스케일 조정 */
```

### 색상 표기법

```css
color: red;              /* 이름 */
color: rgb(255, 0, 0);   /* RGB */
color: #FF0000;          /* HEX (축약: #F00) */
color: rgba(255, 0, 0, 0.5);  /* RGBA (투명도 포함) */
```

### CSS 초기화 전략

```css
/* 브라우저 기본 스타일 제거 → 일관된 레이아웃 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;  /* border/padding이 width에 포함되도록 */
}
```

> 💡 초기화 후 필요한 여백을 **의도적으로 다시** 부여

**핵심 키워드:** `#px` `#rem` `#vw` `#CSS초기화` `#HEX`

---

## 4. 반응형 웹앱과 미디어 쿼리

```css
/* 공통 CSS (모든 화면) */
.container { width: 1200px; }

/* 태블릿 (1024px 이하) */
@media (max-width: 1024px) {
    .container { width: 100%; }
}

/* 모바일 (700px 이하) */
@media (max-width: 700px) {
    .container { width: 100%; }
    .ad-box    { display: none; }    /* 광고 숨기기 */
    img        { width: 100%; }      /* 이미지 꽉 채우기 */
}
```

```
미디어 쿼리 핵심:
  - 조건 만족할 때만 CSS 적용 (나머지는 공통 CSS 유지)
  - 공통 CSS 위에 미디어 쿼리로 오버라이드하는 구조
  - @media 뒤 공백 누락 → 동작 안 함! 문법 정확성 중요

개발자도구 → 반응형 모드(Ctrl+Shift+M) → 폭 바꾸며 테스트
```

| 상황 | 처리 | 의미 |
|------|------|------|
| 모바일에서 광고 숨김 | `display: none;` | 렌더링 흐름에서 제거 |
| 조건 만족 시 보이기 | `display: block;` | 다시 표시 |
| 이미지 꽉 채우기 | `width: 100%;` | 부모 폭 기준 유동 |

**핵심 키워드:** `#@media` `#오버라이드` `#display` `#반응형` `#뷰포트`

---

## 5. 선택자, float, clear, 배경 이미지 경로

### 후손 선택자 vs 자식 선택자

```css
div p   { }   /* div 내부의 모든 p (깊이 무관, 후손 전체) */
div > p { }   /* div 바로 아래 p만 (1단계 자식만) */
```

### float와 clear

```css
/* float: 요소를 띄워 배치, 다음 요소가 흐르듯 배치 */
.left-box  { float: left;  width: 30%; }
.right-box { float: right; width: 65%; }

/* clear: float 침범 정리 (부모 높이 무너짐 방지) */
.footer { clear: both; }

/* 또는 가상 요소로 clearfix */
.container::after {
    content: "";
    display: block;
    clear: both;
}
```

> ⚠️ float된 요소 → 부모 높이 계산에서 제외 → 부모가 찌그러짐
> → `clear: both`로 해결

### 배경 이미지 상대 경로 기준 (시험 빈출 ⭐)

```css
/* 경로 기준 = HTML이 아니라 CSS 파일 위치! */

/* 파일 구조:
   /css/style.css
   /image/bg.png
*/

/* CSS 파일 기준으로 상위 폴더로 이동 */
#banner {
    background-image: url("../image/bg.png");  /* ../로 css 폴더 탈출 */
    background-repeat: no-repeat;
    background-position: center top;
}
```

**핵심 키워드:** `#후손선택자` `#자식선택자` `#float` `#clear` `#상대경로`

---

## 6. 링크 상태, 텍스트 효과, 프로토타이핑

### 링크 상태 선택자

```css
/* 기본 밑줄 제거 */
a { text-decoration: none; }

/* 상태별 스타일 */
a:link    { color: #333; }           /* 방문 안 한 링크 */
a:visited { color: #999; }           /* 방문한 링크 (보라색 방지) */
a:hover   { color: #0066cc; }        /* 마우스 오버 */
a:active  { color: #ff0000; }        /* 클릭 순간 */
```

### 텍스트 그림자

```css
/* text-shadow: X이동 Y이동 블러 색상 */
h1 {
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

/* 여러 그림자 중첩 */
h1 {
    text-shadow: 1px 1px 0 #fff, 2px 2px 4px rgba(0,0,0,0.5);
}
```

### 프로토타이핑 팁

```html
<!-- 실제 이미지 없어도 크기 박스 먼저 잡기 -->
<img src="https://via.placeholder.com/300x200" alt="placeholder">
<img src="https://placehold.co/600x400" alt="placeholder">
```

```
AI 활용 팁:
- 전체 페이지 생성 X → 구조가 예기치 않게 바뀔 수 있음
- "일부분만 수정 요청"이 안전
- AI 코드 수정 = 소스 해석력이 기반
```

**핵심 키워드:** `#a:visited` `#a:hover` `#text-shadow` `#placeholder` `#프로토타이핑`

---

## 오늘의 핵심 요약

1. 블록 = 한 줄 전체 / 인라인 = 콘텐츠 크기만큼 (레이아웃 특성 차이)
2. `href="#id"` = 앵커 이동 / `target="_blank"` = 새 탭 / `title` = 접근성
3. `<img>` = 콘텐츠 이미지 (alt 필수) / `background-image` = 장식 이미지
4. 폰트 먼저 확정 → 레이아웃 잡기 (폰트마다 행간/자간 달라 레이아웃 틀어짐)
5. `rem` = 루트 기준 → 전체 스케일 일관성 / `vw/vh` = 뷰포트 기준
6. CSS 초기화 = 브라우저 기본 스타일 제거 → 의도적으로 여백 다시 부여
7. 미디어 쿼리 = 조건 만족 시 CSS 오버라이드, `@media` 뒤 공백 주의
8. `div p` = 후손 전체 / `div > p` = 바로 아래 자식만
9. 배경 이미지 경로 기준 = **CSS 파일 위치** (HTML 아님!)
10. Bootstrap = 내 CSS는 아래에 연결해야 오버라이드 가능
