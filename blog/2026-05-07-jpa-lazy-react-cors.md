---
title: "[TIL] JPA 레이지로딩 해결, React 연동"
date: 2026-05-07
tags: [JPA, React, CORS]
---
> 부트캠프 백엔드 과정 · 2026.05.07

## 1. 레이지 로딩 no session 해결 4가지

### 문제

```
LAZY 로딩 → 영속성 컨텍스트 밖에서 접근 → no session 예외
```

| 해결 방식 | 핵심 아이디어 | 장점 | 단점 |
|---------|------------|------|------|
| DTO + `@Transactional` 강제 초기화 | 트랜잭션 내부에서 컬렉션 접근 후 DTO 복사 | 재사용성 높음 | 초기화 코드 잊으면 재발 |
| JPQL 패치 조인 | `left join fetch`로 즉시 로딩 | 쿼리 1회, 성능 좋음 | 문자열 오타에 취약 |
| `@EntityGraph` | 메서드에 로드 속성 선언 | 선언형, 간단 | 속성명 정확성 중요 |
| `Hibernate.initialize()` | 명시적 컬렉션 초기화 | 트랜잭션 없이도 가능 | Hibernate 구현체 종속 |

### 방법 1: 트랜잭션 + 강제 초기화

```java
@Transactional
public OwnerDTO getOwnerWithCars(Long id) {
    Owner owner = ownerRepository.findById(id).orElseThrow();
    owner.getCars().size();  // 강제 초기화 (접근만 해도 됨)
    return new OwnerDTO(owner.getId(), owner.getName(), owner.getCars());
}
```

### 방법 2: JPQL 패치 조인

```java
@Query("SELECT o FROM Owner o LEFT JOIN FETCH o.cars WHERE o.id = :ownerId")
Optional<Owner> findByIdWithCars(@Param("ownerId") Long ownerId);
```

### 방법 3: @EntityGraph

```java
@EntityGraph(attributePaths = {"cars"})
Optional<Owner> findById(Long id);
```

### 방법 4: Hibernate.initialize()

```java
Hibernate.initialize(owner.getCars());
```

> ⚠️ 엔티티에 `@ToString` = 연관 엔티티 접근 → 추가 쿼리 or no session
> → 엔티티에는 toString 적용 매우 조심!

**핵심 키워드:** `#레이지로딩` `#영속성컨텍스트` `#패치조인` `#엔티티그래프` `#Hibernate.initialize`

---

## 2. EntityManager, save, flush 차이

| 구분 | 주체 | 동작 | 결과 |
|------|------|------|------|
| `save()` | Spring Data JPA | 영속화/병합 | SQL이 즉시 실행 안 될 수 있음 |
| `flush()` | JPA(EntityManager) | DB에 즉시 동기화 | SQL 즉시 실행, 컨텍스트는 유지 |

> `flush()` = 컨텍스트를 비우는 게 아니라 **동기화만** 수행

---

## 3. Spring Boot JPA 백엔드 구축

### application.properties

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/employee?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul
spring.datasource.username=test
spring.datasource.password=password

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

### 패키지 아키텍처

```
controller/   → REST API 엔드포인트
exception/    → 예외 처리 클래스
model/        → JPA 엔티티
repository/   → Spring Data JPA Repository
```

### Employee 엔티티

```java
@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // MySQL 자동 증가
    private Long id;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "email_id")
    private String emailId;
}
```

> `GenerationType.IDENTITY` = MySQL, `SEQUENCE` = Oracle/PostgreSQL

**핵심 키워드:** `#application.properties` `#@Entity` `#JpaRepository` `#CommandLineRunner` `#@RestController`

---

## 4. React(Vite) + Axios + CORS 연동

```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install axios
```

### CORS 해결

```java
// 컨트롤러 레벨 (간단한 방법)
@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class EmployeeController { ... }
```

### React 기본 패턴

```javascript
import { useState, useEffect } from "react";
import axios from "axios";

function EmployeeList() {
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        axios.get("http://localhost:8080/api/employees")
            .then(res => setEmployees(res.data))
            .catch(err => console.log(err));
    }, []);  // [] = 최초 1회만 실행

    return (
        <table>
            {employees.map(emp => (
                <tr key={emp.id}>
                    <td>{emp.firstName}</td>
                </tr>
            ))}
        </table>
    );
}
```

> `useEffect` 의존성 배열 없으면 → 렌더링마다 실행 → 무한 호출!

**핵심 키워드:** `#Vite` `#Axios` `#useEffect` `#CORS` `#@CrossOrigin`

---

## 5. React Router + Outlet 레이아웃

```jsx
// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="/employees" element={<EmployeeList />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

// Layout.jsx
function Layout() {
    return (
        <div>
            <Header />
            <Outlet />  {/* 여기에 하위 라우트 렌더링 */}
            <Footer />
        </div>
    );
}
```

| 구성 요소 | 역할 |
|---------|------|
| `BrowserRouter` | 라우팅 컨텍스트 최상단 래퍼 |
| `Routes` / `Route` | URL 경로와 컴포넌트 매핑 |
| `Outlet` | 하위 라우트 렌더링 위치 |
| `Link` | 새로고침 없이 경로 이동 |

**핵심 키워드:** `#react-router-dom` `#BrowserRouter` `#Routes` `#Outlet` `#레이아웃`

---

## 오늘의 핵심 요약

1. LAZY 로딩 no session → DTO + `@Transactional` or 패치 조인 or `@EntityGraph`
2. 엔티티에 `@ToString` → 연관 엔티티 접근 가능성 → 매우 조심
3. `flush()` = DB 동기화만, 컨텍스트 비우는 게 아님
4. `GenerationType.IDENTITY` = MySQL 자동 증가
5. `allowPublicKeyRetrieval=true` = Docker/클라우드 MySQL 연결 시 필요
6. `@CrossOrigin` = 실습용 간단 해결책, 실무는 WebMvcConfigurer 사용
7. `useEffect(fn, [])` = 최초 1회만 실행, 빈 배열 필수
8. `Outlet` = 레이아웃에서 하위 라우트 렌더링 위치
9. `Link` = SPA 방식 라우팅, `<a>` 쓰면 페이지 리로드
10. `axios` 응답 = `response.data`에 실제 데이터
