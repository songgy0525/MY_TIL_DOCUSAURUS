---
title: "[TIL] JPA 기본 CRUD REST API, 도커"
date: 2026-04-30
tags: [JPA, REST, Docker]
---
> 부트캠프 백엔드 과정 · 2026.04.30

## 1. JPA 기본 CRUD REST API

### @RestController + JpaRepository 조합

```java
@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentRepository studentRepository;

    // 전체 조회
    @GetMapping
    public List<StudentEntity> getAll() {
        return studentRepository.findAll();
    }

    // 단건 조회
    @GetMapping("/{id}")
    public ResponseEntity<StudentEntity> getOne(@PathVariable Long id) {
        StudentEntity student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("학생 없음"));
        return ResponseEntity.ok(student);
    }

    // 등록
    @PostMapping
    public StudentEntity create(@RequestBody StudentEntity student) {
        return studentRepository.save(student);
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
        StudentEntity student = studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("학생 없음"));
        studentRepository.delete(student);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
```

### 기본 CRUD 메서드

| 구분 | 메서드 | 사용 의도 |
|------|--------|---------|
| 전체 조회 | `findAll()` | 테이블 전체 목록 |
| 단건 조회 | `findById(id)` | Optional 반환 |
| 저장 | `save(entity)` | 단일 저장 |
| 다건 저장 | `saveAll(list)` | 여러 건 한 번에 |
| 삭제 | `deleteById(id)` or `delete(entity)` | 식별자/객체로 삭제 |

### 영속성 컨텍스트와 더티 체킹 (수정)

```java
@Transactional
public StudentEntity update(Long id, String name) {
    StudentEntity student = studentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("학생 없음"));

    // setter만 호출해도 트랜잭션 종료 시 UPDATE 자동 실행!
    student.setName(name);

    return student;  // save() 호출 불필요
}
```

> `@Transactional(readOnly=true)` = 더티 체킹 동작 X → 수정 로직에 사용 금지

**핵심 키워드:** `#JpaRepository` `#findAll` `#saveAll` `#@RestController` `#Jackson`

---

## 2. JPQL, Optional, 중복 검증

```java
// JPQL - 엔티티 기준으로 작성 (테이블명 X, 엔티티명 O)
@Query("SELECT s FROM StudentEntity s WHERE s.email = ?1")
Optional<StudentEntity> findByEmail(String email);
```

```java
// 중복 이메일 검증 서비스
public void addStudent(StudentEntity student) {
    Optional<StudentEntity> existing = studentRepository.findByEmail(student.getEmail());
    if (existing.isPresent()) {
        throw new IllegalStateException("이미 사용 중인 이메일");
    }
    studentRepository.save(student);
}
```

| 단계 | 처리 | 목적 |
|------|------|------|
| 1 | `findByEmail(email)` 조회 | 중복 여부 확인 |
| 2 | 존재하면 예외 발생 | 저장 차단 |
| 3 | 없으면 `save()` | 정상 저장 |

**핵심 키워드:** `#JPQL` `#@Query` `#Optional` `#isPresent` `#orElseThrow`

---

## 3. ResponseEntity 응답 설계

```java
// 상태코드 + 바디 함께 반환
@DeleteMapping("/{id}")
public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id) {
    // ...
    Map<String, Object> result = new HashMap<>();
    result.put("status", HttpStatus.OK.value());
    result.put("message", "삭제 완료");
    result.put("deleted", student);
    return new ResponseEntity<>(result, HttpStatus.OK);

    // 또는 정적 팩토리 방식 (실무 권장)
    // return ResponseEntity.ok(result);
}
```

**핵심 키워드:** `#@DeleteMapping` `#@PathVariable` `#ResponseEntity` `#HttpStatus` `#deleteById`

---

## 4. 다대다 정규화와 DDL 작성

```
학생(Student) ←→ 과목(Subject) : 다대다
→ student_enrolled 중간 테이블로 분해 (1:N 구조)

교사(Teacher) → 과목(Subject) : 1:N
→ Subject 테이블에 teacher_id FK
```

```sql
-- 중간 테이블 (복합 PK로 중복 수강 방지)
CREATE TABLE student_enrolled (
    student_id BIGINT,
    subject_id BIGINT,
    PRIMARY KEY (student_id, subject_id),
    FOREIGN KEY (student_id) REFERENCES student(id),
    FOREIGN KEY (subject_id) REFERENCES subject(id)
);
```

> DDL 먼저 설계 → JPA 매핑 = 실무 흐름에 가까운 방식

**핵심 키워드:** `#다대다` `#조인 테이블` `#BCNF` `#DDL` `#복합키`

---

## 5. 관계 매핑: @ManyToMany, @JoinTable

```java
// Subject (과목) - 주인 쪽
@ManyToMany
@JoinTable(
    name = "student_enrolled",
    joinColumns = @JoinColumn(name = "subject_id"),
    inverseJoinColumns = @JoinColumn(name = "student_id")
)
private List<StudentEntity> enrolledStudents;

// Student (학생) - 역방향
@ManyToMany(mappedBy = "enrolledStudents")
private List<Subject> subjects;
```

> `mappedBy` = "상대 엔티티의 필드명" (테이블 컬럼명 X)

### JSON 재귀 참조 해결

```java
// 방법 1: 특정 필드 무시
@JsonIgnore
private List<Subject> subjects;

// 방법 2: 단방향 기준 직렬화
@JsonManagedReference  // 이쪽 기준 직렬화
@JsonBackReference     // 반대 방향 차단
```

**핵심 키워드:** `#@ManyToMany` `#@JoinTable` `#joinColumns` `#inverseJoinColumns` `#mappedBy`

---

## 오늘의 핵심 요약

1. 더티 체킹 = `@Transactional` 범위에서 엔티티 변경 → UPDATE 자동 실행
2. `@Transactional(readOnly=true)` = 더티 체킹 X → 수정에 사용 금지
3. JPA 삭제 = `deleteById()` or 조회 후 `delete(entity)`
4. `ResponseEntity.ok(data)` = 상태코드 200 + 바디
5. JPQL = 테이블명이 아닌 **엔티티명** 기준으로 작성
6. 다대다 = 중간 테이블로 분해해 1:N 구조로 정규화
7. `mappedBy` = 연관관계 주인 반대편, 읽기 전용
8. `@JsonIgnore` = 재귀 참조 차단
9. DDL 먼저 → JPA 매핑 = 실무 흐름
10. `FLUSH PRIVILEGES` 빠뜨리면 권한 변경 안 됨
