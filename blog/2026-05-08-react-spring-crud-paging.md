---
title: "[TIL] React-Spring CRUD 완성, 페이징"
date: 2026-05-08
tags: [React, SpringBoot]
---
> 부트캠프 백엔드 과정 · 2026.05.08

## 1. 사원 등록 API + React 연동

### 백엔드 POST

```java
@PostMapping("/employees")
public Employee createEmployee(@RequestBody Employee employee) {
    return employeeRepository.save(employee);
}
```

### React 폼 - 두 가지 방식

```javascript
// 방법 1: 개별 state (직관적, 반복 많음)
const [firstName, setFirstName] = useState('');
const [email, setEmail] = useState('');

// 방법 2: 단일 객체 state (확장성 좋음) ← 권장
const [employee, setEmployee] = useState({
    firstName: '', lastName: '', emailId: ''
});

const handleChange = (e) => {
    setEmployee({ ...employee, [e.target.name]: e.target.value });
};
```

```javascript
// 제출
const handleSubmit = (e) => {
    e.preventDefault();  // 브라우저 기본 동작 방지
    axios.post('http://localhost:8080/api/employees', employee)
        .then(() => navigate('/employees'));
};
```

> `e.target.name` = input의 name 속성 → state 키와 반드시 일치해야 함

**핵심 키워드:** `#@RequestBody` `#POST` `#Content-Type` `#JPA save()` `#엔티티 필드명`

---

## 2. 단건 조회 + 상세 화면 (useParams)

```java
// 백엔드
@GetMapping("/employees/{id}")
public ResponseEntity<Employee> getEmployee(@PathVariable Long id) {
    Employee emp = employeeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("사원 없음: " + id));
    return ResponseEntity.ok(emp);
}
```

```javascript
// React 상세 화면
import { useParams, useEffect, useState } from "react";

function ViewEmployee() {
    const { id } = useParams();           // URL 파라미터 수신
    const [employee, setEmployee] = useState({});

    useEffect(() => {
        axios.get(`http://localhost:8080/api/employees/${id}`)
            .then(res => setEmployee(res.data));
    }, [id]);  // id가 바뀌면 재요청

    return <div>{employee.firstName}</div>;
}
```

**핵심 키워드:** `#useParams` `#useEffect` `#의존성 배열` `#axios res.data` `#상세 조회`

---

## 3. 수정 (PATCH) + 더티 체킹

```java
// PATCH - 부분 수정
@PatchMapping("/employees/{id}")
@Transactional
public ResponseEntity<Employee> updateEmployee(
        @PathVariable Long id,
        @RequestParam(required = false) String firstName,
        @RequestParam(required = false) String email) {

    Employee emp = employeeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("사원 없음"));

    // 값이 있을 때만 변경 (Apache Commons Lang3)
    if (StringUtils.isNotBlank(firstName)) emp.setFirstName(firstName);
    if (StringUtils.isNotBlank(email)) emp.setEmailId(email);

    return ResponseEntity.ok(emp);  // save() 불필요! 더티 체킹
}
```

| HTTP 메서드 | 의미 | 비고 |
|-----------|------|------|
| PATCH | 포함된 항목만 변경 | 부분 수정에 적합 |
| PUT | 전체 교체 | 전체 필드 전송 |

> `StringUtils.isNotBlank()` = null/빈문자/공백 모두 걸러냄

**핵심 키워드:** `#@PatchMapping` `#@Transactional` `#더티 체킹` `#StringUtils.isNotBlank` `#부분 수정`

---

## 4. 삭제 + filter 기반 즉시 반영

```java
// 백엔드
@DeleteMapping("/employees/{id}")
public ResponseEntity<Map<String, Object>> deleteEmployee(@PathVariable Long id) {
    Employee emp = employeeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("사원 없음"));
    employeeRepository.delete(emp);
    return ResponseEntity.ok(Map.of("deleted", true));
}
```

```javascript
// React - 삭제 후 재조회 없이 state만 갱신 (SPA 방식)
const deleteEmployee = (id) => {
    axios.delete(`http://localhost:8080/api/employees/${id}`)
        .then(() => {
            setEmployees(employees.filter(emp => emp.id !== id));
        });
};
```

> `filter()` 방식 = API 호출 1번으로 끝 + 깜빡임 없음

**핵심 키워드:** `#@DeleteMapping` `#Map 응답` `#deleted: true` `#filter` `#상태 갱신`

---

## 5. 페이징

### 프론트 연산 페이징 (slice)

```javascript
const postsPerPage = 5;
const indexOfLast = currentPage * postsPerPage;
const indexOfFirst = indexOfLast - postsPerPage;
const currentPosts = employees.slice(indexOfFirst, indexOfLast);
```

### 서버 페이징 (Spring Data Page/Pageable)

```java
@GetMapping("/api/page")
public Page<Employee> getPage(
        @PageableDefault(size = 5, sort = "id", direction = Sort.Direction.DESC)
        Pageable pageable) {
    return employeeRepository.findAll(pageable);
}
```

```javascript
// 프론트에서 호출
axios.get(`/api/page?page=0&size=5`)
    .then(res => {
        // res.data.content → 현재 페이지 데이터
        // res.data.totalPages → 전체 페이지 수
        // res.data.totalElements → 전체 건수
    });
```

| Page 주요 필드 | 의미 |
|-------------|------|
| `content` | 현재 페이지 데이터 목록 |
| `totalElements` | 전체 데이터 건수 |
| `totalPages` | 전체 페이지 수 |
| `number` / `size` | 현재 페이지 번호(0-base) / 페이지 크기 |

**핵심 키워드:** `#slice` `#페이지 그룹` `#Page` `#Pageable` `#@PageableDefault`

---

## 오늘의 핵심 요약

1. 단일 객체 state + `[e.target.name]` = 폼 필드 수 상관없이 핸들러 1개
2. `e.preventDefault()` = 폼 제출 기본 동작(새로고침) 차단
3. `useParams()` = URL 경로 변수 수신, `useEffect([id])` = id 변경 시 재요청
4. PATCH + `@Transactional` = setter만 호출해도 더티 체킹으로 UPDATE
5. `StringUtils.isNotBlank()` = null/빈문자/공백 모두 false → 선택적 수정
6. 삭제 후 `filter()` = 재조회 없이 state만 갱신 → SPA 방식
7. `Page` 객체 = content + 페이지 메타데이터 함께 제공
8. `@PageableDefault` = 기본 페이지 크기, 정렬 방향 설정
9. 프론트 slice 페이징 = 전체 데이터 받아서 잘라내기
10. 서버 페이징 = DB에서 필요한 부분만 조회 → 성능 유리
