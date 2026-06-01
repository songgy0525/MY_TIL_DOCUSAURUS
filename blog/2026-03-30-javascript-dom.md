---
title: "[TIL] 자바스크립트 기초와 DOM 제어"
date: 2026-03-30
tags: [JavaScript, DOM, Web]
---

> 부트캠프 백엔드 과정 · 2026.03.30

## 오늘 배운 흐름 한눈에 보기

```
JS 개요 + 적용 방식 (인라인/임베드/링크드)
→ 실행 순서 (위치/defer/onload/DOMContentLoaded)
→ DOM 탐색 + 콘텐츠/스타일/속성 변경
→ 이벤트 연결 (on* vs addEventListener)
→ 변수/스코프 (var/let/const, 호이스팅, undefined/NaN)
→ null vs undefined
→ 함수 (명시적/익명/리터럴 + 콜백/클로저)
→ setInterval/clearInterval (시계 실습)
→ 이벤트 전파 제어 (stopPropagation/preventDefault)
→ DOM 선택 심화 (querySelector/HTMLCollection/체크박스)
```

---

## 1. 자바스크립트 개요와 적용 방식

```
JS 역할: HTML/CSS가 만든 정적 화면을 이벤트로 동적으로 변경
DOM = 문서가 노드 트리로 구성된 구조
탐색 결과 = 엘리먼트(객체)
```

### JS 포함 방식 3가지

```html
<!-- 1. 인라인: 태그 속성에 직접 (유지보수 불리) -->
<button onclick="alert('클릭!')">버튼</button>

<!-- 따옴표 중첩 시: 바깥 큰따옴표, 내부 작은따옴표 -->
<button onclick="alert('Hello')">버튼</button>

<!-- 2. 임베드: <script> 블록 -->
<script>
    function doSomething() { ... }
</script>

<!-- 3. 링크드: 외부 .js 파일 (실무 기본, href가 아니라 src!) -->
<script src="./js/app.js"></script>
```

**핵심 키워드:** `#DOM` `#엘리먼트` `#이벤트` `#인라인/임베드/링크드` `#src`

---

## 2. 실행 순서 제어 (시험 빈출 ⭐)

```
문제: HTML 파싱 전에 DOM 탐색 → 대상 없음 → 실패
해결: DOM이 준비된 후 JS 실행 보장
```

| 제어 수단 | 의미 | 사용 목적 |
|---------|------|---------|
| 스크립트 위치 (Body 끝) | 렌더링 후 실행 | DOM 탐색 성공 보장 |
| `defer` | 문서 파싱 완료 후 실행 | 스크립트는 위에, 실행은 나중에 |
| `window.onload` | HTML + 모든 리소스 로드 후 | 가장 안전한 초기화 시점 |
| `DOMContentLoaded` | DOM 파싱 완료 즉시 | 이미지 로드 안 기다림 |

```html
<!-- defer: 외부 스크립트 지연 실행 -->
<script src="app.js" defer></script>

<!-- DOMContentLoaded: 권장 방식 -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    // DOM 준비 완료 후 실행
    const el = document.getElementById('title');
    el.textContent = '안녕하세요';
});
</script>
```

> ⚠️ `window.onload` = 중복 정의 시 마지막 것만 유효 → `addEventListener` 권장
> ⚠️ 같은 이름 함수 재정의 → 아래쪽 선언이 최종 적용

**핵심 키워드:** `#defer` `#window.onload` `#DOMContentLoaded` `#렌더링` `#오버라이드`

---

## 3. DOM 탐색과 변경

### 탐색 API

```javascript
// 기존 API
document.getElementById('myId')         // 단일 엘리먼트
document.getElementsByTagName('li')     // HTMLCollection (유사 배열)
document.getElementsByName('chk')       // NodeList

// CSS 선택자 기반 (권장)
document.querySelector('#myId')         // 단일 (첫 번째 일치)
document.querySelectorAll('.myClass')   // NodeList (전체)
```

### 값 읽기/쓰기 구분 (시험 빈출 ⭐)

| 목적 | 속성 | 적용 대상 |
|------|------|---------|
| 폼 입력값 | `.value` | `<input>`, `<select>`, `<textarea>` |
| HTML 포함 콘텐츠 | `.innerHTML` | 태그/마크업 포함 |
| 텍스트만 | `.textContent` | 순수 텍스트 |

```javascript
// 스타일 변경 (CSS 하이픈 → 카멜케이스)
const el = document.getElementById('title');
el.style.color = 'red';
el.style.fontSize = '20px';       // font-size → fontSize
el.style.fontWeight = 'bold';     // font-weight → fontWeight

// HTML 속성 변경
el.title = '제목 툴팁';

// 내용 변경
el.innerHTML  = '<strong>강조</strong>';
el.textContent = '일반 텍스트';
```

**핵심 키워드:** `#innerHTML` `#textContent` `#value` `#HTMLCollection` `#querySelectorAll`

---

## 4. 이벤트 연결 패턴

```javascript
// 방식 1: on* 속성 (인라인 또는 JS에서)
document.getElementById('btn').onclick = function() { ... };

// 방식 2: addEventListener (권장, 여러 이벤트 부착 가능)
document.getElementById('btn').addEventListener('click', function() { ... });

// 인라인에서 this로 현재 요소 전달
// <button onclick="handleBtn(this.value)" value="A">버튼</button>
function handleBtn(val) {
    console.log(val);  // "A"
}
```

**핵심 키워드:** `#addEventListener` `#onclick` `#this` `#이벤트부착` `#익명함수`

---

## 5. 변수와 스코프

### var / let / const 비교

| 키워드 | 스코프 | 재선언 | 호이스팅 |
|--------|--------|--------|---------|
| `var` | 함수 스코프 | 가능 | 선언만 올라감 (undefined) |
| `let` | 블록 스코프 | 불가 | TDZ (접근 시 오류) |
| `const` | 블록 스코프 | 불가 | TDZ (접근 시 오류) |

### undefined와 NaN 함정

```javascript
var x = 10;

function test() {
    // 함수 내부에 같은 이름 변수 선언 → 내부 스코프 기준
    console.log(x);  // undefined (선언은 호이스팅, 초기화 전)
    var x = 20;      // 여기서 초기화
}

// undefined + 99 → NaN (Not a Number)
var result = undefined + 99;  // NaN

// typeof로 타입 확인
typeof 10          // "number"
typeof "hello"     // "string"
typeof true        // "boolean"
typeof undefined   // "undefined"
typeof null        // "object" ← 유명한 버그
typeof []          // "object"
typeof function(){} // "function"
```

**핵심 키워드:** `#동적타입` `#스코프` `#undefined` `#NaN` `#var/let/const`

---

## 6. null vs undefined 구분 (시험 빈출 ⭐)

| | `null` | `undefined` |
|--|--------|-------------|
| 의미 | "없음"을 **의도적으로** 넣은 값 | 값이 미정/알 수 없음 |
| typeof | `"object"` (유명한 버그) | `"undefined"` |
| 숫자 연산 | 0처럼 처리될 수 있음 | NaN |
| 문자열 결합 | `"null"` | `"undefined"` |
| DOM 탐색 실패 | `getElementById` → `null` | — |

```javascript
// 완전 비교 (값 + 타입 모두 비교)
null == undefined   // true  (느슨한 비교)
null === undefined  // false (완전 비교)

// DOM 탐색 실패 = null
const el = document.getElementById('없는아이디');
console.log(el);  // null
```

**핵심 키워드:** `#boolean` `#truthy/falsy` `#null` `#undefined` `#typeof`

---

## 7. 함수: 명시적 / 익명 / 콜백 / 클로저

### 함수 종류

```javascript
// 명시적 함수 (선언식)
function greet(name) {
    return 'Hello, ' + name;
}

// 익명함수 (표현식)
const greet = function(name) {
    return 'Hello, ' + name;
};

// 화살표 함수 (ES6+)
const greet = (name) => 'Hello, ' + name;

// 함수 리터럴 (함수를 인자로 전달 = 콜백)
setTimeout(function() {
    console.log('1초 후 실행');
}, 1000);
```

### 클로저 — 함수가 외부 변수를 기억하는 구조

```javascript
function makeCounter(start) {
    // 내부 함수가 외부 변수(start)를 기억
    return function() {
        return start++;  // 호출할 때마다 start 증가
    };
}

const counter = makeCounter(0);
console.log(counter());  // 0
console.log(counter());  // 1
console.log(counter());  // 2
// makeCounter 실행이 끝나도 start 변수가 메모리에 유지
```

> 💡 콜백, 클로저 → Ajax, Promise, async/await, React 컴포넌트의 기반 개념

**핵심 키워드:** `#익명함수` `#함수리터럴` `#콜백` `#클로저` `#반환함수`

---

## 8. setInterval / clearInterval — 시계 실습

```javascript
var intervalHandle;  // 전역 변수로 핸들 저장 (중지를 위해)

function startClock() {
    intervalHandle = setInterval(function() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        document.getElementById('clock').textContent = `${hh}:${mm}:${ss}`;
    }, 1000);  // 1000ms = 1초마다
}

function stopClock() {
    clearInterval(intervalHandle);  // 핸들로 중지
}
```

> ⚠️ `intervalHandle`을 전역 변수에 저장하지 않으면 중지 불가

**핵심 키워드:** `#setInterval` `#clearInterval` `#Date` `#padStart` `#템플릿리터럴`

---

## 9. 이벤트 전파 제어

```
버블링: 자식 클릭 → 부모 이벤트까지 전파
캡처링: 부모 → 자식 방향으로 내려가면서 전파
```

| 메서드 | 목적 | 적용 예 |
|--------|------|---------|
| `event.stopPropagation()` | 이벤트 전파 차단 | 자식 클릭 시 부모 클릭 방지 |
| `event.preventDefault()` | 기본 동작 차단 | `<a>` 이동, submit, 드래그 방지 |
| `return false` | 둘 다 차단 (인라인) | 빠른 처리 (인라인 이벤트에서) |

```javascript
// 폼 submit 차단 후 유효성 검사
document.getElementById('myForm').addEventListener('submit', function(e) {
    const input = document.getElementById('name').value;
    if (!input) {
        e.preventDefault();           // 전송 막기
        alert('이름을 입력하세요');
        return;
    }
    // 조건 만족 시 자동 전송
});

// 링크 기본 이동 차단
document.getElementById('myLink').addEventListener('click', function(e) {
    e.preventDefault();
    // 커스텀 동작 실행
});

// 드래그 방지
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});
```

**핵심 키워드:** `#stopPropagation` `#preventDefault` `#return_false` `#submit` `#전파`

---

## 10. DOM 선택 심화 + 체크박스 전체선택

### HTMLCollection → Array 변환

```javascript
// HTMLCollection/NodeList는 배열이 아님!
const items = document.getElementsByTagName('li');
// items.forEach(...)  // ❌ 오류

// Array.from()으로 변환 후 forEach 사용
Array.from(items).forEach(item => {
    item.style.backgroundColor = 'yellow';
});
```

### 체크박스 전체 선택/해제

```javascript
window.onload = function() {
    const allCheck = document.getElementById('allCheck');
    const checks = document.getElementsByName('chk');  // name 기반 탐색

    // 전체 체크박스 클릭 시
    allCheck.addEventListener('click', function() {
        Array.from(checks).forEach(chk => {
            chk.checked = allCheck.checked;  // value가 아니라 checked!
        });
    });

    // 개별 체크박스 변경 시 전체 체크 상태 업데이트
    Array.from(checks).forEach(chk => {
        chk.addEventListener('change', function() {
            const checkedCount = Array.from(checks).filter(c => c.checked).length;
            allCheck.checked = (checkedCount === checks.length);
        });
    });
};
```

> 💡 체크박스 상태 = `.value` X → `.checked` (true/false)
> 💡 서버로 전송되는 값 = `name` 속성이 키 → 다중 체크박스는 `name` 사용

**핵심 키워드:** `#checked` `#getElementsByName` `#HTMLCollection` `#Array.from` `#forEach`

---

## 오늘의 핵심 요약

1. JS 적용 방식: 인라인 < 임베드 < **링크드** (실무 기본), 연결은 `src`
2. DOM 탐색은 렌더링 후 실행 보장 → `DOMContentLoaded` 또는 Body 끝에 배치
3. `.value` = 폼 입력값 / `.innerHTML` = HTML 포함 / `.textContent` = 텍스트만
4. `undefined + 99 = NaN` / DOM 탐색 실패 = `null`
5. `null` = 의도적으로 없음 / `undefined` = 미정, 초기화 전
6. 함수 = 값 → 변수에 담거나 인자로 전달 가능 (클로저/콜백 기반)
7. 클로저 = 내부 함수가 외부 변수를 기억 → React/Ajax의 기반 개념
8. `setInterval` 핸들을 전역 변수에 저장해야 `clearInterval`로 중지 가능
9. `preventDefault()` = 브라우저 기본 동작 차단 / `stopPropagation()` = 전파 차단
10. `HTMLCollection` → `Array.from()` 변환 후 `forEach` 사용
