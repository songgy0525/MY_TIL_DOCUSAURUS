---
title: "[TIL] JPA 연관관계 CRUD와 캐스케이드"
date: 2026-05-06
tags: [JPA]
---
> 부트캠프 백엔드 과정 · 2026.05.06

## 1. 교수–과목 연관관계 매핑

```java
// Subject (과목) - ManyToOne, FK 보유
@ManyToOne
@JoinColumn(name = "teacher_id", referencedColumnName = "id")
private Teacher teacher;

// Teacher (교수) - OneToMany, 역방향
@OneToMany(mappedBy = "teacher")
private List<Subject> subjects;
```

| 항목 | Subject(과목) 측 | Teacher(교수) 측 |
|------|----------------|----------------|
| 관계 | `@ManyToOne` | `@OneToMany` |
| FK 보유 | ✅ | ❌ |
| 핵심 설정 | `@JoinColumn(name="teacher_id")` | `mappedBy="teacher"` |

**핵심 키워드:** `#ManyToOne` `#OneToMany` `#JoinColumn` `#mappedBy` `#순환참조`

---

## 2. 캐스케이드 타입

| 타입 | 의미 | 대표 사용 상황 |
|------|------|-------------|
| `PERSIST` | 부모 저장 시 자식도 저장 | 부모+자식 동시 신규 생성 |
| `MERGE` | 부모 병합 시 자식도 병합 | 기존 데이터 관계 갱신 |
| `REMOVE` | 부모 삭제 시 자식도 삭제 | 임시성 데이터 함께 삭제 |
| `DETACH` | 부모 준영속 시 자식도 준영속 | 영속성 컨텍스트 관리 범위 조정 |
| `ALL` | 위 전체 포함 | 학습/프로토타이핑 |

> ⚠️ `REMOVE`는 연쇄 삭제 → 실무에서 신중히 사용

---

## 3. Postman CRUD 시나리오

| 기능 | HTTP | 요청 형태 | 핵심 포인트 |
|------|------|---------|-----------|
| 전체 조회 | GET | 없음 | 컬렉션 반환 |
| 단건 조회 | GET `/{id}` | PathVariable | `orElseThrow` + DTO + 404 |
| 등록 | POST | JSON Body | `@RequestBody` → raw JSON 전송 |
| 수정 | PUT `/{id}?name=...` | Param | `@Transactional` + 더티 체킹 |
| 삭제 | DELETE `/{id}` | PathVariable | **연관 수강 관계 먼저 해제** 후 삭제 |

### 학생 삭제 시 연관관계 해제

```java
// 학생과 연결된 과목 컬렉션에서 학생 제거 먼저
for (Subject subject : student.getSubjects()) {
    subject.getEnrolledStudents().remove(student);
}
studentRepository.delete(student);
```

---

## 4. 교수 담당 과목 조회 - DTO 변환

```java
// 영속성/직렬화 문제 → DTO로 변환해서 반환
public TeacherDTO getTeacherWithSubjects(Long id) {
    Teacher teacher = teacherRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("교수 없음"));

    List<SubjectDTO> subjectDTOs = teacher.getSubjects().stream()
            .map(s -> new SubjectDTO(s.getId(), s.getTitle()))
            .collect(Collectors.toList());

    return new TeacherDTO(teacher.getId(), teacher.getName(), subjectDTOs);
}
```

**핵심 키워드:** `#프로덕션DTO` `#stream` `#filter` `#findFirst` `#지연로딩`

---

## 5. 패치 전략 (FetchType)

| 구분 | EAGER | LAZY |
|------|-------|------|
| 로딩 시점 | 조회 시 즉시 | 실제 접근 시 |
| 장점 | 즉시 사용 편리 | 필요 데이터만 → 효율적 |
| 단점 | N+1 문제, 과도한 조인 | 트랜잭션 밖 접근 시 준영속 예외 |
| 대응 | DTO/패치 조인 | 서비스 트랜잭션 or DTO 변환 |

> 실무 기본 = LAZY / 필요 시점에 EAGER or 패치 조인으로 제어

---

## 오늘의 핵심 요약

1. `@ManyToOne` = FK 보유 쪽 (자식), `@OneToMany(mappedBy=...)` = 역방향 (부모)
2. 삭제 전 양방향 연관관계 해제 필수
3. `CascadeType.REMOVE` = 연쇄 삭제 → 실무에서 신중하게
4. `mappedBy` 쪽 = 읽기 전용 → 여기서 save() 해도 DB 반영 안 됨
5. DTO 프로젝션 = 영속성/직렬화 문제 가장 안전한 해결책
6. `stream().filter().findFirst().orElseThrow()` = 컬렉션에서 특정 요소 추출
7. EAGER = N+1 문제 위험 → 기본은 LAZY 권장
8. 더티 체킹 = `@Transactional` 범위에서 setter만 호출해도 UPDATE
9. 프로덕션 DTO = 엔티티 직접 반환 대신 필요 필드만 담은 DTO
10. `Collectors.toList()` = 스트림 결과를 리스트로 수집
