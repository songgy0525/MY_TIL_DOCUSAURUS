---
title: "[TIL] 자바스크립트 실습, DOM, 폼, 보안, 모듈"
date: 2026-04-01
tags: [JavaScript, DOM, 모듈]
---
> 부트캠프 백엔드 과정 · 2026.04.01

## 오늘 배운 흐름 한눈에 보기

```
홀수 마방진 → 테이블 innerHTML 출력
→ createElement + CSS transition
→ window.open 팝업 + opener 데이터 전달
→ 모달 구현 → ID 중복검사 팝업
→ 폼 전송 + HTTP + 서블릿 톰캣 임포트
→ 폼 입력요소 (select/radio/checkbox)
→ textarea + XSS 방어
→ ES Module export/import
```

---

## 1. 홀수 마방진 구현과 클래스화

```
마방진 규칙:
- 첫 행 중앙에 1 배치
- 이후 좌상향 이동
- 충돌 시(이미 값 있음) → 이전 위치에서 아래로 한 칸
- 인덱스 음수 → 끝으로 래핑
```

```javascript
// 핵심 충돌 판정: undefined 기준
if (magic[x][y] !== undefined) {
    x = tmpX + 1;   // 아래로 이동
    y = tmpY;        // y는 유지
}
magic[x][y] = i;

// 2차원 배열 생성
const n = 3;
const magic = [];
for (let i = 0; i < n; i++) {
    magic[i] = new Array(n);  // 각 행을 배열로
}
// 미할당 요소 = 0이 아니라 undefined!
```

**핵심 키워드:** `#홀수마방진` `#2차원배열` `#undefined` `#getter` `#좌표래핑`

---

## 2. 마방진 테이블 출력 (innerHTML)

```javascript
// 문자열 누적으로 테이블 조립
let html = "<table border='1'>";
for (let r = 0; r < magic.length; r++) {
    html += "<tr>";
    for (let c = 0; c < magic[r].length; c++) {
        html += "<td>" + magic[r][c] + "</td>";
    }
    html += "</tr>";
}
html += "</table>";

document.getElementById('output').innerHTML = html;
```

```
흐름: table 열기 → 행(tr) 반복 → 열(td) 반복 → 닫기
닫는 태그 누락 시 렌더링 깨짐 주의
```

**핵심 키워드:** `#innerHTML` `#table` `#이중for문` `#문자열누적` `#마방진검수`

---

## 3. DOM 생성(createElement)과 CSS transition

```javascript
// 동적 DOM 생성 (innerHTML 덮어쓰기 없이)
const div = document.createElement('div');
div.className = 'box';
div.textContent = '클릭!';
document.getElementById('container').append(div);
```

```css
/* CSS transition: 상태 변화에 시간 효과 */
.box {
    transition: transform 1s;  /* 원본 요소에 선언 */
}
.box:hover {
    transform: translate(100px, 0);  /* hover 시 이동 */
}
```

| 구분 | 핵심 API | 목적 |
|------|---------|------|
| DOM 생성 | `document.createElement()` | 태그를 코드로 생성 |
| DOM 부착 | `append()` | 부모에 자식 추가 |
| CSS 변형 | `transform` | 위치/크기/회전 |
| 애니메이션 | `transition` | 상태 변화에 시간 효과 |

**핵심 키워드:** `#createElement` `#append` `#transform` `#transition` `#window.onload`

---

## 4. window.open 팝업과 opener 데이터 전달

```javascript
// 부모창에서 팝업 열기
const popup = window.open('popup.html', '팝업', 'width=400,height=300');

// 자식창에서 부모창 DOM 접근
const msg = document.getElementById('input').value;
opener.document.getElementById('delivery').textContent = msg;

// 창 닫기
self.close();
// 닫기 전 확인
if (confirm("창을 닫겠습니까?")) self.close();
```

```
자식창에서:
  document        → 자식 창 문서
  opener.document → 부모 창 문서

주의: div는 value X → textContent로 읽기
```

**핵심 키워드:** `#window.open` `#opener` `#textContent` `#self.close` `#카카오우편번호`

---

## 5. 모달 구현

```javascript
// 열기
function openModal() {
    document.getElementById('modal').style.display = 'block';
    document.body.style.backgroundColor = '#ccc';

    // 배경 버튼 비활성화
    const btns = document.querySelectorAll('button.main-btn');
    btns.forEach(btn => btn.disabled = true);

    // 애니메이션 (scale 0.5 → 1)
    requestAnimationFrame(() => {
        document.getElementById('modal').style.transform = 'scale(1)';
    });
}

// 닫기
function closeModal() {
    document.getElementById('modal').style.transform = 'scale(0.5)';
    document.body.style.backgroundColor = '';
    document.querySelectorAll('button.main-btn').forEach(btn => btn.disabled = false);

    setTimeout(() => {
        document.getElementById('modal').style.display = 'none';
    }, 300);
}
```

> ⚠️ 폼 전송 요소는 반드시 `name` 속성 필요 → 없으면 서버에서 못 받음

**핵심 키워드:** `#모달` `#disabled` `#requestAnimationFrame` `#enctype` `#name속성`

---

## 6. 아이디 중복검사 팝업

```javascript
// 자식창: 중복 검사
const idList = ["user01", "admin", "guest"];  // 기존 목록

function checkDuplicate() {
    const id = document.getElementById('checkId').value;
    const exists = idList.indexOf(id) !== -1;

    if (exists) {
        document.getElementById('msg').innerHTML = "<font color='red'>사용 불가</font>";
    } else {
        document.getElementById('msg').innerHTML = "<font color='blue'>사용 가능</font>";

        // 사용 버튼 동적 생성
        const btn = document.createElement('button');
        btn.textContent = "사용하기";
        btn.onclick = function() {
            opener.document.getElementById('id').value = id;
            opener.document.getElementById('btnCheck').removeAttribute('onclick');
            self.close();
        };
        document.getElementById('msg').append(btn);
    }
}
```

**핵심 키워드:** `#indexOf` `#동적HTML` `#removeAttribute` `#Ajax` `#따옴표이스케이프`

---

## 7. 폼 전송과 HTTP 프로토콜

```
HTTP 메서드:
GET    → URL에 파라미터 노출 (조회/검색)
POST   → 바디에 담아 전송 (등록/로그인)
PUT    → 전체 수정
PATCH  → 부분 수정
DELETE → 삭제

URL 구조:
https://example.com/search?query=벚꽃&page=1
        └─ 도메인 ─┘└─ 경로 ─┘└─── 쿼리스트링 ───┘
```

```
서버 = IP + 포트 = 접근 가능한 주소 체계
폼의 name → 서버 파라미터 키
```

**핵심 키워드:** `#HTTP1.1` `#GET` `#POST` `#쿼리스트링` `#서버포트`

---

## 8. 서블릿 임포트와 톰캣

```
접근 URL: http://localhost:8080/{프로젝트명}/{매핑}

⚠️ 톰캣 10 = jakarta.servlet (패키지 변경!)
   톰캣 9 이하 = javax.servlet

서블릿 = HttpServlet 상속
  doGet()   → GET 요청 처리
  doPost()  → POST 요청 처리
  doPut()   → PUT 요청 처리
```

**핵심 키워드:** `#톰캣8080` `#HttpServlet` `#doGet` `#jakarta.servlet` `#컨텍스트경로`

---

## 9. 폼 입력요소 특성

| 요소 | 전송 단위 | 핵심 포인트 |
|------|---------|-----------|
| `select/option` | 단일 | `value`가 전송 (표시 텍스트와 분리 가능) |
| `radio` | 단일 | 같은 `name` 그룹에서 1개만 선택 |
| `checkbox` | 복수 | 여러 값 전송 → 서버에서 배열로 수신 |
| `number` | 단일 | `min`/`max`로 입력 범위 제한 |

```html
<!-- password 타입: F12로 type=text 변경 시 노출 가능! 보안 주의 -->
<input type="password" name="pw">
```

**핵심 키워드:** `#select` `#radio` `#checkbox` `#name매핑` `#parameterValues`

---

## 10. textarea와 XSS 방어

```javascript
// XSS 공격 예시
// textarea에 <script>alert('해킹!')</script> 입력 후
// innerHTML로 출력하면 실행됨!

// 방어 방법 1: 태그 제거
const cleaned = text.replace(/<[^>]+>/ig, "");

// 방어 방법 2: 엔티티 치환 + 줄바꿈
const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r\n|\n/g, "<br>");
```

| 대응 위치 | 방법 | 특징 |
|---------|------|------|
| 클라이언트 (입력) | 정규식 replace | 즉시 적용 가능 |
| JSP (출력) | `c:out` | 이스케이프 출력 |
| 서버 전역 | Filter + RequestWrapper | 가장 강력 |

**핵심 키워드:** `#XSS` `#textarea` `#value` `#정규표현식` `#엔티티치환`

---

## 11. ES Module export / import

```javascript
// ─── math.js ───
export const PI = 3.14;
export function add(a, b) { return a + b; }
export default class Calculator { ... }  // 대표 1개

// ─── main.js ───
import Calculator from './math.js';           // default import
import { PI, add } from './math.js';          // named import
import { add as plus } from './math.js';      // alias

// HTML에서 모듈 로딩 (type="module" 필수!)
// <script type="module" src="./js/main.js"></script>
```

| 문법 | 의미 |
|------|------|
| `export default` | 파일의 대표 1개 내보내기 |
| `export { a, b }` | 여러 개 이름으로 내보내기 |
| `import ... from` | 외부 모듈 가져오기 |
| `type="module"` | 없으면 import 문법 동작 안 함 |

> 💡 React의 `export default function Button(){ }` 이 ES Module 기반

**핵심 키워드:** `#ESModule` `#export` `#import` `#type=module` `#export_default`

---

## 오늘의 핵심 요약

1. 마방진 빈 칸 판정 = `undefined` (0이 아님!)
2. `innerHTML` = HTML 태그 해석 렌더링 / `textContent` = 텍스트만
3. `createElement` + `append` = innerHTML 덮어쓰기 없이 DOM 추가
4. 팝업에서 부모 접근: `opener.document.getElementById(...)`
5. 모달에서 배경 비활성화: `disabled = true` + 배경색 변경
6. 폼 `name` 속성 = 서버 파라미터 키 (없으면 서버에서 못 받음)
7. `radio` = 1개 선택 / `checkbox` = 다중 선택 (서버에서 배열 수신)
8. XSS = `innerHTML`로 사용자 입력 그대로 출력 시 스크립트 실행
9. XSS 방어 = 태그 제거(정규식) 또는 엔티티 치환 (`<` → `&lt;`)
10. ES Module = `type="module"` 필수, `export default` = 파일당 1개
