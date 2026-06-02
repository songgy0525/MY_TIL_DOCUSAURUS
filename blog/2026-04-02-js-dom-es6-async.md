---
title: "[TIL] 자바스크립트 DOM, ES6, 비동기 정리"
date: 2026-04-02
tags: [JavaScript, ES6, 비동기]
---
> 부트캠프 백엔드 과정 · 2026.04.02

## 오늘 배운 흐름 한눈에 보기

```
DOM 탐색 (노드/엘리먼트 차이)
→ DOM 속성 조작 (createElement/setAttribute)
→ 엘리먼트 추가/삽입/이동
→ 실시간 테이블 + 이벤트 위임
→ Node.js 설치와 실행 환경
→ ES6 핵심 (var/let/const, IIFE, 화살표함수)
→ Promise / async-await / Axios
```

---

## 1. DOM 탐색과 노드 구조 (시험 빈출 ⭐)

```javascript
// childNodes vs children 차이
const ul = document.querySelector('ul');

ul.childNodes  // 텍스트 노드(공백/엔터) + 주석 + 엘리먼트 전부
ul.children    // 엘리먼트만 (권장!)

// 부모 탐색
const p = document.getElementById('child01');
p.parentNode.style.backgroundColor = 'yellow';  // 부모 div 배경색 변경

// innerHTML vs textContent
el.innerHTML   // HTML 태그 포함
el.textContent // 텍스트만 (태그 제외)
```

| API | 반환 | 특징 |
|-----|------|------|
| `querySelector` | 단일 객체 | `length` 없음 (undefined) |
| `querySelectorAll` | NodeList | `length` 있음 |
| `getElementsByTagName` | HTMLCollection | `length` 있음 |
| `childNodes` | NodeList | 텍스트/주석 노드 포함 주의 |
| `children` | HTMLCollection | 엘리먼트만 |

**핵심 키워드:** `#parentNode` `#childNodes` `#children` `#innerHTML` `#textContent`

---

## 2. DOM 속성 조작과 동적 엘리먼트 생성

```javascript
// 동적 생성
const img = document.createElement('img');
img.setAttribute('src', './img/photo.jpg');
img.setAttribute('alt', '사진');

// 속성 확인
img.hasAttribute('alt')    // true
img.removeAttribute('src') // 속성 삭제

// append vs appendChild 차이
parent.append("텍스트")      // 문자열 → 텍스트 노드로 처리
parent.appendChild(imgNode) // 노드 객체만 가능

// 이벤트 속성 제거 (권장)
btn.removeAttribute('onclick')
// btn.onclick = null  → 잘 안 되는 경우 있음
```

```javascript
// firstChild vs firstElementChild
ul.firstChild         // 텍스트 노드일 수 있음 (공백!)
ul.firstElementChild  // 첫 번째 엘리먼트만 (안전)
```

| 기능 | 메서드 | 주의점 |
|------|--------|--------|
| 동적 생성 | `createElement` | 노드 기반으로 조립 |
| 속성 추가 | `setAttribute` | 없는 속성은 생성 후 값 설정 |
| 속성 확인 | `hasAttribute` | 존재 여부에 따라 분기 |
| 속성 삭제 | `removeAttribute` | 이벤트 속성도 삭제 가능 |

**핵심 키워드:** `#createElement` `#appendChild` `#setAttribute` `#removeAttribute` `#hasAttribute`

---

## 3. 엘리먼트 추가, 삽입, 이동

```javascript
const parent = document.getElementById('area1');
const newDiv = document.createElement('div');
newDiv.textContent = "새 요소";

// 뒤에 추가
parent.appendChild(newDiv);

// 앞에 삽입
parent.insertBefore(newDiv, parent.firstElementChild);

// 이동 (기존 위치에서 떼어져 새 위치로)
const area2 = document.getElementById('area2');
area2.appendChild(newDiv);  // area1에서 사라지고 area2로 이동

// 복사 (원본 유지)
const copy = newDiv.cloneNode(true);  // true = 자식까지 복사
area2.appendChild(copy);
```

| 작업 | 메서드 | 비고 |
|------|--------|------|
| 뒤에 추가 | `appendChild(node)` | 마지막 자식으로 |
| 앞에 삽입 | `insertBefore(node, ref)` | ref 앞에 삽입 |
| 이동 | 기존 노드를 다시 append | 자동으로 이전 위치에서 제거 |
| 복사 | `cloneNode(true)` | 원본 유지 |

**핵심 키워드:** `#insertBefore` `#firstElementChild` `#cloneNode` `#appendChild` `#move`

---

## 4. 실시간 테이블 변경과 이벤트 위임

```javascript
// 폼 값 읽기
const id = document.FRM.id.value;   // 폼 name 활용
const name = document.FRM.name.value;

// 로우 수 제한
const tbody = document.getElementById('tbody');
if (tbody.children.length >= 10) {
    alert("10개까지만 가능합니다.");
    return;
}

// 이벤트 위임 (동적 생성 요소 이벤트 처리)
tbody.addEventListener('click', function(e) {
    const tr = e.target.closest('tr');  // 클릭된 요소에서 가장 가까운 tr
    if (!tr) return;

    // dataset으로 식별자 저장
    const rowId = tr.dataset.rowId;

    if (e.target.classList.contains('del-btn')) {
        tbody.removeChild(tr);
    }
});
```

| 문제 상황 | 해결 전략 |
|---------|---------|
| 동적 생성 요소에 이벤트가 안 먹힘 | 상위 요소에 이벤트 위임 + `event.target`으로 판별 |
| 클릭된 요소가 td/input 등 다양함 | `closest('tr')`로 기준 행 찾기 |
| 행 식별 필요 | `dataset.rowId`로 식별자 부여 |

**핵심 키워드:** `#event.target` `#closest` `#dataset` `#children` `#remove`

---

## 5. Node.js와 npm

```bash
# 버전 확인
node -v
npm -v
npx -v

# 프로젝트 초기화
npm init

# 패키지 설치
npm i axios

# JS 파일 실행
node variable.js
```

| 구분 | 목적 |
|------|------|
| Node.js | 자바스크립트 런타임 (브라우저 밖 실행) |
| npm | 패키지 설치/의존성 관리 |
| npx | 패키지 일회성 실행 |

> ⚠️ PowerShell에서 npm 차단 시 → 관리자 권한으로 실행 정책 조정

**핵심 키워드:** `#Node.js` `#npm` `#package.json` `#axios` `#ExecutionPolicy`

---

## 6. ES6 핵심 문법

### var / let / const 비교

| 키워드 | 스코프 | 재선언 | 호이스팅 |
|--------|--------|--------|---------|
| `var` | 함수 스코프 | 가능 | undefined로 초기화 |
| `let` | 블록 스코프 | 불가 | TDZ (접근 시 오류) |
| `const` | 블록 스코프 | 불가 | TDZ (초기화 필수) |

### IIFE — 즉시 실행 함수 (전역 오염 방지)

```javascript
(function() {
    var localVar = "전역에 안 보임";
    // 이 안에서만 존재
})();
```

### 화살표 함수

```javascript
// 기본
const add = (a, b) => a + b;

// 파라미터 1개 → 괄호 생략
const double = x => x * 2;

// 여러 줄 → 중괄호 + return 필요
const calc = (a, b) => {
    const result = a + b;
    return result;
};
```

```
화살표 함수 제약:
  - 항상 익명 함수
  - this/arguments/super 자체 바인딩 X
  - 생성자(new)로 사용 불가
```

**핵심 키워드:** `#let` `#const` `#IIFE` `#hoisting` `#arrow_function`

---

## 7. Promise와 async/await, Axios 비동기 처리

### Promise 기본

```javascript
const promise = new Promise((resolve, reject) => {
    const success = true;
    if (success) resolve("성공!");
    else reject("실패!");
});

promise
    .then(data => console.log(data))   // "성공!"
    .catch(err => console.log(err))
    .finally(() => console.log("완료"));
```

### Axios 사용

```javascript
const axios = require('axios');

// Promise 체이닝
axios.get('https://api.example.com/users')
    .then(response => console.log(response.data))
    .catch(err => console.log(err))
    .finally(() => console.log("완료"));
```

### async/await

```javascript
async function fetchData() {
    try {
        const response = await axios.get('https://api.example.com/users');
        console.log(response.data);   // 실제 데이터
    } catch (err) {
        console.log("에러:", err);
    }
}
```

```
Promise 상태:
  pending    → 대기 중 (초기)
  fulfilled  → 성공 (resolve 호출)
  rejected   → 실패 (reject 호출)

Axios 응답: response.data에 실제 데이터
```

| 방식 | 성공 처리 | 실패 처리 | 특징 |
|------|---------|---------|------|
| Promise 체이닝 | `.then()` | `.catch()` | 상태 기반 연결 |
| async/await | `await` 이후 | `try/catch` | 동기식처럼 읽힘 |

**핵심 키워드:** `#Promise` `#then` `#catch` `#async/await` `#axios`

---

## 오늘의 핵심 요약

1. `childNodes` = 텍스트/주석 포함 / `children` = 엘리먼트만 (권장)
2. `querySelector` = 단일 객체 (length 없음) / `querySelectorAll` = NodeList (length 있음)
3. `append()` = 문자열도 받음 / `appendChild()` = 노드 객체만
4. 기존 노드를 다시 `appendChild` → 자동으로 이전 위치에서 이동
5. `cloneNode(true)` = 자식까지 복사, 원본 유지
6. 동적 생성 요소 이벤트 → 이벤트 위임 (상위 요소 + `event.target.closest()`)
7. `var` = 함수 스코프/재선언 가능 / `let` = 블록 스코프/재선언 불가
8. 화살표 함수 = 항상 익명, `this` 자체 바인딩 X, `new` 사용 불가
9. IIFE = 즉시 실행 함수, 전역 오염 방지
10. `async/await` = Promise를 동기식처럼 작성, 오류는 `try/catch`
