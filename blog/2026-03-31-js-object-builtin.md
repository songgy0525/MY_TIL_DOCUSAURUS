---
title: "[TIL] 자바스크립트 객체, 내장객체, 실습 정리"
date: 2026-03-31
tags: [JavaScript, 객체, 내장객체]
---
> 부트캠프 백엔드 과정 · 2026.03.31

## 오늘 배운 흐름 한눈에 보기

```
객체 생성 (명시적/익명) → 캡슐화/프로토타입
→ 호이스팅 → Number/DOM 입력
→ String → 개미수열 실습 → eval/형변환
→ Array → Date
```

---

## 1. 객체 생성과 캡슐화

### 명시적 방식 (생성자 함수 + new)

```javascript
function Class008() {
    this.name = "";           // public (외부 접근 가능)
    var name02 = "JavaScript"; // private (외부 접근 불가)

    this.getName02 = function() {
        return name02;         // 게터로 은닉값 노출
    };
}

var obj = new Class008();
obj.name = "사자";
console.log(obj.name);        // "사자"
console.log(obj.name02);      // undefined (private)
console.log(obj.getName02()); // "JavaScript"
```

### 익명 방식 (리터럴)

```javascript
// 즉시 생성, new 불필요
const person = {
    name: "홍길동",
    age: 25,
    greet: function() { return "안녕!"; }
};
```

```
this.속성    →  외부 공개 (public)
var 변수     →  내부 은닉 (private)
게터/세터    →  은닉값 노출 수단
```

**핵심 키워드:** `#객체` `#this` `#은닉화` `#게터/세터` `#리터럴`

---

## 2. 프로토타입 기반 확장

```javascript
function ClassProto() {
    this.name = "Lion";
}

// prototype에 메서드 추가 → 모든 인스턴스가 공유
ClassProto.prototype.printName = function() {
    alert("이름: " + this.name);
};

var p = new ClassProto();
p.printName();  // "이름: Lion"
```

```
객체를 + 로 문자열에 연결 → [object Object]로 보임
→ 디버깅 시 console.log()로 따로 출력할 것
```

**핵심 키워드:** `#Prototype` `#프로토타입체인` `#확장` `#this` `#콘솔출력`

---

## 3. 호이스팅과 var/let 차이 (시험 빈출 ⭐)

| 구분 | 선언 전 접근 | 결과 |
|------|------------|------|
| `var` | 가능 | `undefined` |
| `let`/`const` | 불가 | `ReferenceError` |

```javascript
console.log(x);  // undefined (호이스팅)
var x = 10;

console.log(y);  // ReferenceError (TDZ)
let y = 10;
```

> 💡 호이스팅 = 선언이 먼저 메모리에 올라가는 현상
> TDZ = Temporal Dead Zone (초기화 전 접근 불가 구간)

**핵심 키워드:** `#호이스팅` `#var` `#let` `#undefined` `#ReferenceError`

---

## 4. Number 객체와 비교/출력

```javascript
// 숫자 리터럴 vs Number 객체
typeof 7            // "number"
typeof new Number(7) // "object" ← 차이!

// 비교
7 == new Number(7)  // true  (느슨한 비교)
7 === new Number(7) // false (완전 비교, 타입 다름)

// 값 추출
new Number(7).valueOf()  // 7 (number 타입)
new Number(7).toString() // "7" (string 타입)

// 특수값
isNaN(NaN)       // true
isFinite(1/0)    // false
10 / 3           // 3.333... (정수 나눗셈 X)
Math.floor(10/3) // 3 (몫만 필요할 때)
```

**핵심 키워드:** `#Number` `#NaN` `#Infinity` `#===` `#valueOf`

---

## 5. DOM 입력값과 숫자 판별 (정규표현식 포함)

```javascript
// DOM에서 가져온 값은 항상 문자열!
const input = document.getElementById('num').value;  // "123" (문자열)

// 숫자로 변환 필수
const num = Number(input);    // 또는 parseInt(), parseFloat()

// "11" + 10 = "1110" (문자열 결합)
// Number("11") + 10 = 21 (숫자 연산)

// 숫자 판별 방법 1: isNaN
isNaN(parseInt(input))  // false = 숫자, true = 아님

// 숫자 판별 방법 2: 정규표현식
/^\d*$/.test(input)     // true = 숫자만으로 구성

// test() → true/false 반환
// match() → 매칭 결과 객체 반환 (있으면 truthy)
```

**핵심 키워드:** `#DOM` `#value` `#isNaN` `#정규표현식` `#test/match`

---

## 6. String 처리

```javascript
const str = "흥부와 놀부와 흥부";

// 검색
str.indexOf("놀부")         // 4 (앞에서)
str.lastIndexOf("놀부")     // 4 (뒤에서)
str.indexOf("놀부", 5)      // -1 (5번째 이후에서 검색)

// 추출 (end 미포함)
str.substring(0, 3)         // "흥부와"

// 분해 (주의: 구분자 연속이면 빈 문자열 포함)
"a__b".split("_")            // ["a", "", "b"] (3개!)

// 한 글자 추출
str.charAt(0)               // "흥"
```

**핵심 키워드:** `#concat` `#indexOf` `#substring` `#split` `#charAt`

---

## 7. 실습 — 개미수열 (DOM + 문자열)

```
개미수열 원리:
1 → 11 → 21 → 1211 → 111221 ...
"이전 단계를 읽어서" 다음 단계를 만드는 것

예) 1 = "1이 1개" → 11
    11 = "1이 2개" → 21
    21 = "2가 1개, 1이 1개" → 1211
```

```javascript
// 한 단계 생성 함수
function nextStage(unitValue) {
    let result = "";
    let i = 0;
    while (i < unitValue.length) {
        const current = unitValue.charAt(i);
        let count = 1;
        while (i + count < unitValue.length &&
               unitValue.charAt(i + count) === current) {
            count++;
        }
        result += count + current;
        i += count;
    }
    return result;
}

// DOM 출력 (innerHTML 사용 → <br> 포함)
function antQuiz() {
    const steps = parseInt(document.getElementById('step').value);
    let current = "1";
    let output = current;
    for (let i = 0; i < steps; i++) {
        current = nextStage(current);
        output += "<br>" + current;
    }
    document.getElementById('result').innerHTML = output;
}
```

**핵심 키워드:** `#개미수열` `#charAt` `#반복문` `#innerHTML` `#DOM탐색`

---

## 8. 형변환과 eval

```javascript
parseInt("3.14")   // 3 (정수만)
parseFloat("3.14") // 3.14
Number("abc")      // NaN (변환 실패)
typeof NaN         // "number" (타입은 number!)

// eval: 문자열 수식 계산
eval("1+10+5/5")   // 12
// ⚠️ 보안 위험 → 실무에서는 대체 파서 사용 권장
```

**핵심 키워드:** `#Number()` `#parseInt` `#parseFloat` `#NaN` `#eval`

---

## 9. Array 객체

```javascript
const arr = [1, "hello", true, null];  // 혼합 타입 가능
typeof arr  // "object" ← 배열도 object!

// 반복
for (let i = 0; i < arr.length; i++) { }       // 인덱스 기반
for (let key in arr) { }                         // 키(인덱스) 순회
for (let val of arr) { }                         // 값 순회
arr.forEach((val, idx) => { });                  // 콜백 기반

// 정렬 (중요!)
[3,1,2].sort()              // [1,2,3] (기본 = 문자열 기준)
[10,1,2].sort()             // [1,10,2] (❌ 숫자 정렬 아님!)
[10,1,2].sort((a,b) => a-b) // [1,2,10] (✅ 숫자 정렬)

// 스택/큐
arr.push(4)    // 뒤에 추가
arr.pop()      // 뒤에서 제거
arr.shift()    // 앞에서 제거

// 복제 (원본 유지)
arr.slice(1, 3) // 1~2번 인덱스 복제
```

**핵심 키워드:** `#Array` `#sort` `#push/shift/pop` `#slice` `#화살표함수`

---

## 10. Date 객체

```javascript
const now = new Date();

// 월은 0부터 시작! (출력 시 +1)
now.getFullYear()   // 2026
now.getMonth() + 1  // 실제 월 (0~11 → +1 필수)
now.getDate()       // 일
now.getDay()        // 요일 (0=일요일)

// input[type=date] 형식 맞추기 (YYYY-MM-DD)
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;

// 날짜 더하기
const d = new Date("2026-03-31");
d.setDate(d.getDate() + 7);  // 7일 후

// 디데이 계산
const target = new Date("2026-12-31");
const diff = target.getTime() - now.getTime();
const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
```

> ⚠️ 디데이 NaN → 대부분 DOM id 중복 오타 문제

**핵심 키워드:** `#Date` `#getMonth` `#padStart` `#setDate` `#getTime`

---

## 오늘의 핵심 요약

1. `this.속성` = public / `var 변수` = private
2. `prototype`에 메서드 추가 → 모든 인스턴스가 공유
3. `var` = 호이스팅 가능(undefined) / `let` = TDZ(ReferenceError)
4. DOM `.value` = 항상 문자열 → 산술 연산 전 형변환 필수
5. `split()` 구분자 연속 시 빈 문자열 포함 주의
6. 배열 `sort()` = 기본은 문자열 기준 → 숫자 정렬은 비교함수 필수
7. `Date.getMonth()` = 0부터 시작 → 출력 시 +1
8. `eval()` = 문자열 수식 계산 가능하나 보안 위험
9. 개미수열 = charAt + 연속 카운트 + innerHTML 출력
10. `typeof []` = "object" (배열도 객체!)
