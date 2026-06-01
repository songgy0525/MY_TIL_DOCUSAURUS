---
title: "[TIL] JDBC CRUD와 Maven 기초"
date: 2026-03-19
tags: [Java, JDBC, Maven, CRUD]
---

> 부트캠프 백엔드 과정 · 2026.03.19

## 오늘 배운 흐름 한눈에 보기

```
JDBC 6단계 + OCP Repository 구조
→ SQL CRUD 검증 → PreparedStatement 바인딩 → JUnit 테스트
→ 웹 프로젝트 세팅 (Eclipse + Tomcat + web.xml)
→ Maven 구조 + pom.xml 핵심 태그
```

---

## 1. JDBC 6단계와 OCP Repository

### JDBC 6단계

```
[1] 드라이버 로딩       ─┐
[2] Connection 획득     ─┤  공통 모듈(Database 클래스)
[6] 자원 해제(close)    ─┘

[3] PreparedStatement 생성 + 바인딩  ─┐
[4] 쿼리 실행 (executeQuery/Update)  ─┤  Repository 구현체
[5] ResultSet → DTO 매핑             ─┘
```

```java
// 공통 모듈 활용 패턴
Connection conn = Database.getConnection();
PreparedStatement pstmt = null;
ResultSet rs = null;

try {
    String sql = "SELECT empno, ename, sal FROM emp WHERE deptno = ?";
    pstmt = conn.prepareStatement(sql);
    pstmt.setInt(1, deptno);             // ? 바인딩 (1부터 시작)
    rs = pstmt.executeQuery();

    List<EmpDTO> list = new ArrayList<>();
    while (rs.next()) {
        EmpDTO dto = new EmpDTO();
        dto.setEmpno(rs.getInt("EMPNO")); // 컬럼명 대소문자 주의
        dto.setEname(rs.getString("ENAME"));
        list.add(dto);
    }
    return list;
} finally {
    Database.close(rs, pstmt, conn);     // 반드시 해제
}
```

### OCP Repository 구조

```
IEmpRepository (인터페이스)
    findAll()      → List<EmpDTO>
    findById(int)  → EmpDTO
    save(EmpDTO)   → int
    delete(int)    → int
    update(EmpDTO) → int
         ↑
EmpRepositoryImpl (구현체)
    → JDBC 6단계로 각 메서드 구현
```

> 💡 메서드 시그니처 = 쿼리를 그대로 옮긴 것
> WHERE 조건 값 → 메서드 파라미터
> 결과 여러 행  → `List<DTO>` 반환
> 결과 단건     → `DTO` 반환
> DML           → `int` 반환 (영향받은 행 수)

**핵심 키워드:** `#JDBC_6단계` `#PreparedStatement` `#ResultSet` `#OCP` `#Repository`

---

## 2. SQL CRUD 검증과 JUnit 테스트

### CRUD → JDBC 변환 포인트

| 작업 | SQL 관점 | JDBC 변환 포인트 |
|------|---------|----------------|
| 전체 조회 | SELECT + JOIN/ORDER BY | `executeQuery()` → `while(rs.next())` → List 누적 |
| 상세 조회 | WHERE로 단일 행 | `?` 바인딩 → DTO 1개 매핑 |
| 입력 | INSERT + 서브쿼리/함수 | `executeUpdate()` → int 반환 |
| 삭제 | WHERE로 대상 키 | 바인딩 타입/인덱스 순서 정확히 |
| 수정 | SET + WHERE | `executeUpdate()`, 바인딩 순서 엄격 |

```java
// INSERT 예시 (다음 EMPNO = MAX+1 서브쿼리)
String sql = "INSERT INTO emp(empno, ename, sal, deptno) "
           + "VALUES((SELECT NVL(MAX(empno),0)+1 FROM emp), ?, ?, ?)";
pstmt = conn.prepareStatement(sql);
pstmt.setString(1, dto.getEname());  // ? 인덱스 1부터
pstmt.setDouble(2, dto.getSal());
pstmt.setInt(3, dto.getDeptno());
int cnt = pstmt.executeUpdate();
```

> ⚠️ SQL 문자열에서 세미콜론(;) 제거 필수 — JDBC로 넘길 때 오류 발생

### JUnit 테스트 패턴

```java
IEmpRepository repo;

@Before
public void setUp() {
    repo = new EmpRepositoryImpl();  // 인터페이스 타입으로 선언 (다형성)
}

@Test
public void testFindAll() {
    List<EmpDTO> list = repo.findAll();
    assertNotEquals(0, list.size());  // 결과 있는지 확인
}

@Test
public void testFindById() {
    EmpDTO dto = repo.findById(7369);
    assertNotNull(dto);               // 단건 조회 성공
}

@Test
public void testSave() {
    EmpDTO dto = new EmpDTO("홍길동", 3000, 10);
    int cnt = repo.save(dto);
    assertEquals(1, cnt);             // 1행 삽입 성공
}
```

**핵심 키워드:** `#CRUD` `#바인딩` `#executeQuery` `#executeUpdate` `#JUnit`

---

## 3. 웹 프로젝트 세팅과 Tomcat, web.xml 정합성

### Eclipse 환경 세팅 체크리스트

```
✅ 퍼스펙티브: J2EE (웹 개발용)
✅ 인코딩: Preferences → Content Types → 각 항목 UTF-8
   (JSP, HTML, CSS, JS, SQL Script 등)
✅ TODO 표시: Task Tags 활성화
✅ XML 외부 DTD: 다운로드 설정 (빨간 줄 방지)
```

### Tomcat 연결 순서

```
1. Tomcat 설치 (10.1 계열 권장)
2. Eclipse → Preferences → Server Runtime Environments
   → Apache Tomcat 추가
3. "Create new local server" 체크 → Server 뷰에 자동 등록
4. Dynamic Web Project에서 Runtime 지정
```

> ⚠️ Server 뷰가 안 보이면 → Eclipse 웹 개발용 배포판 설치 확인

### web.xml DTD 정합성

```xml
<!-- 서버 Tomcat 버전과 web.xml DTD 버전 일치 필수 -->
<!-- 불일치 → 빨간 줄 / import 실패 / 서버 실행 오류 -->

<!DOCTYPE web-app PUBLIC
  "-//Sun Microsystems, Inc.//DTD Web Application 2.3//EN"
  "http://java.sun.com/dtd/web-app_2_3.dtd">
```

**핵심 키워드:** `#Tomcat` `#WAS` `#web.xml` `#DTD` `#UTF-8`

---

## 4. Maven 프로젝트 구조와 pom.xml 핵심

### Maven 프로젝트 디렉토리 구조

```
프로젝트 루트
├── pom.xml                    ← 빌드/의존성/플러그인 중심 설정
├── src/
│   ├── main/
│   │   ├── java/              ← 배포 대상 자바 소스
│   │   ├── resources/         ← XML, properties, yml 설정 파일
│   │   └── webapp/            ← 웹 리소스 (WEB-INF, JSP 등)
│   └── test/
│       ├── java/              ← JUnit 테스트 소스 (배포 X)
│       └── resources/         ← 테스트용 리소스 (배포 X)
└── target/                    ← 빌드 결과 (클래스, WAR 등)
```

```
~/.m2/repository/              ← 의존성 라이브러리 로컬 캐시
```

### pom.xml 핵심 태그

```xml
<project>
  <!-- 프로젝트 좌표 -->
  <groupId>com.company</groupId>      <!-- 조직 식별 (도메인 역순) -->
  <artifactId>myproject</artifactId>  <!-- 프로젝트명 = JAR/WAR 파일명 -->
  <version>1.0-SNAPSHOT</version>     <!-- SNAPSHOT = 개발 중 버전 -->
  <packaging>war</packaging>          <!-- jar 또는 war -->

  <!-- 공용 속성 (버전 변수화) -->
  <properties>
    <java.version>21</java.version>
    <spring.version>6.0.0</spring.version>
  </properties>

  <!-- 저장소 (Central 외 추가 저장소) -->
  <repositories>
    <repository>
      <id>nexus</id>
      <url>http://사내넥서스/repository/</url>
    </repository>
  </repositories>

  <!-- 의존성 -->
  <dependencies>
    <dependency>
      <groupId>junit</groupId>
      <artifactId>junit</artifactId>
      <version>4.13.2</version>
      <scope>test</scope>             <!-- 테스트에만 사용, 배포 X -->
    </dependency>
  </dependencies>

  <!-- 빌드 설정 -->
  <build>
    <finalName>myproject</finalName>  <!-- 최종 파일명 -->
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <configuration>
          <source>21</source>
          <target>21</target>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
```

### scope 종류

| scope | 컴파일 | 실행 | 패키징 포함 | 대표 사용처 |
|-------|--------|------|------------|------------|
| `compile` (기본) | ✅ | ✅ | ✅ | 일반 라이브러리 |
| `provided` | ✅ | ✅ | ❌ | 서블릿 API (서버에 이미 있음) |
| `runtime` | ❌ | ✅ | ✅ | JDBC 드라이버 |
| `test` | ❌ | ❌ | ❌ | JUnit |
| `system` | ✅ | ✅ | ❌/환경의존 | 로컬 경로 라이브러리 (이식성 낮음) |

**핵심 키워드:** `#Maven` `#pom.xml` `#WAR` `#properties` `#아키타입`

---

## 오늘의 핵심 요약

1. JDBC 6단계 중 1, 2, 6단계 → 공통 모듈 / 3, 4, 5단계 → Repository 구현체
2. `?` 바인딩 인덱스는 **1부터 시작**, SQL 등장 순서대로 setXxx() 호출
3. `SELECT` → `executeQuery()` + `while(rs.next())` / `DML` → `executeUpdate()` + `int`
4. 컬럼명 대소문자 정합성 → `rs.getXxx("컬럼명")` 오타 시 "열 이름이 부적절" 오류
5. SQL 문자열에서 세미콜론(;) 반드시 제거
6. JUnit `@Before` = 각 테스트 전 준비 / `assertEquals(1, cnt)` = DML 검증
7. Tomcat 버전 ↔ web.xml DTD 버전 정합성 필수
8. Maven `scope` = 컴파일/실행/패키징 포함 범위 결정
9. `SNAPSHOT` = 개발 중 버전, 배포 시 정식 버전으로 변경
10. `~/.m2` = 의존성 로컬 캐시, 오프라인 환경에서 압축본으로 배포하기도 함
