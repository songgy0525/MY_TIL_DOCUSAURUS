---
title: "[TIL] 도커 CI/CD 완성 + K8S 기초 + 스프링 부트 실무 설계"
date: 2026-06-05
tags: [Docker, CI/CD, Kubernetes, SpringBoot, GitHubActions, Flyway, Linux, Next.js]
---

## 1. Docker Compose + 멀티 스테이지 빌드

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: springboot_server
    ports:
      - "9090:9090"
    networks:
      - app_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: react_front
    ports:
      - "5173:80"
    depends_on:
      - backend
    networks:
      - app_network

networks:
  app_network:
    driver: bridge
```

```
멀티 스테이지 빌드 개념:
빌드 환경 (Maven/Node) → 산출물(JAR/dist) → 런타임 이미지에 COPY만
→ 최종 이미지에 빌드 도구 안 들어감 = 이미지 사이즈 절약
```

> `depends_on` = 컨테이너 시작 순서 제어. 프론트가 백엔드 먼저 떠야 하는 구조에서 필수

**핵심 키워드:** `#DockerCompose` `#multi-stage` `#bridge-network` `#depends_on`

---

## 2. GitHub Actions - Docker Hub 자동 빌드/푸시 (CI)

```yaml
on:
  push:
    branches: [ "main" ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Maven build
        run: mvn -f backend/pom.xml verify   # 모노레포면 -f로 경로 지정!

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/myapp:latest
```

| 빌드 도구 | 산출물 폴더 |
|---|---|
| Vite 기반 React | `dist/` |
| Create React App | `build/` |

> YAML 들여쓰기 한 칸 틀려도 워크플로 즉시 실패 → 들여쓰기 정렬 습관화 필수

> 코드에 토큰 하드코딩하면 GitHub가 자동 감지해서 푸시 차단 → Secrets 필수

**핵심 키워드:** `#GitHubActions` `#workflow` `#jobs/steps` `#secrets` `#Docker-Hub-push`

---

## 3. 서버 자동 배포 (CD) + ngrok SSH 연결

```bash
# GitHub Actions에서 서버로 SSH 접속 후 실행하는 스크립트
docker stop myapp || true
docker rm myapp || true
docker pull <user>/myapp:latest
docker image prune -f
docker run -d -p 9090:9090 --name myapp <user>/myapp:latest
```

```bash
# 서버 상태 점검
ss -lnnt              # 포트 리스닝 확인
systemctl status nginx  # 서비스 상태 확인
```

> GitHub Secrets에 SSH 접속 정보(host, port, username, password) 저장 → 리포지토리 단위로 관리

> `image prune -f` = 디스크 절약용. 단, 운영에서는 롤백 고려해서 팀 규칙에 맞게 제한적으로 쓸 것

**핵심 키워드:** `#CD` `#ngrok` `#ss-lnnt` `#systemctl` `#SSH-secrets`

---

## 4. 리눅스 계정/권한/파일 유형

```bash
# 그룹 확인
cat /etc/group

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER   # -a 필수! 없으면 기존 그룹 다 날아감
newgrp docker                   # 즉시 반영 (로그아웃 불필요)

# 파일 목록 + 권한 확인
ls -l
# drwxr-xr-x  → d = 디렉터리
# -rw-r--r--  → - = 일반 파일
# lrwxrwxrwx  → l = 심볼릭 링크

# 파일 이동 (와일드카드)
mv ./dist/* /var/www/html/
```

```
권한 읽는 법:
rwx r-x r--
7   5   4
소유자 그룹 기타
```

> `-aG` = append + group 지정 / `-G`만 쓰면 기존 그룹 삭제됨 → 실수하면 sudo 권한 날아갈 수 있음

**핵심 키워드:** `#usermod-aG` `#ls-l` `#permissions` `#symbolic-link` `#mv`

---

## 5. WS vs WAS - 면접 답변 정리

| 구분 | 대표 도구 | 역할 |
|---|---|---|
| WS (Web Server) | Nginx, Apache | 정적 파일 반환, 리버스 프록시, 포트 라우팅 |
| WAS (Web App Server) | Tomcat | 비즈니스 로직, DB 접근, 동적 HTML 생성 |

```
면접 질문 유형별 답변:
"WAS 써봤나요?" → "Tomcat 사용했습니다"
"WS/WAS 같이 써봤나요?" → "Nginx(WS) + Tomcat(WAS) 구조로 라우팅했습니다"
```

> JSP = Jasper 엔진이 컴파일 후 HTML 생성. 이 흐름 설명할 수 있으면 면접에서 +

**핵심 키워드:** `#WS` `#WAS` `#Nginx` `#Tomcat` `#reverse-proxy`

---

## 6. 쿠버네티스(K8S) 개요

```
K8S가 자동화하는 것들:
- 컨테이너 죽으면 → 자동 복구
- 트래픽 늘면 → 파드 수 자동 확장
- 업데이트 시 → 롤링 업데이트로 무중단 배포
```

| 구성 요소 | 역할 |
|---|---|
| 클러스터 (Cluster) | K8S가 관리하는 전체 실행/관리 영역 |
| 컨트롤 플레인 (Control Plane) | 상태 감시 + 스케줄링 = 관제탑 |
| 워커 노드 (Worker Node) | 실제 컨테이너(파드)가 돌아가는 작업 노드 |
| 파드 (Pod) | 최소 배포 단위. 1개 이상의 컨테이너 포함 |
| 리플리카셋 (ReplicaSet) | 지정된 파드 개수 유지 |
| 디플로이먼트 (Deployment) | 리플리카셋 관리 + 롤링 업데이트 전략 |
| 서비스 (Service) | 파드 집합에 대한 접근 주소 제공 |
| 인그레스 (Ingress) | 외부 HTTP/HTTPS 라우팅 규칙 정의 |

> AWS EKS 같은 매니지드 K8S는 비쌈 → 개인 실습은 KinD(로컬 클러스터) 쓰는 게 안전

**핵심 키워드:** `#K8S` `#orchestration` `#control-plane` `#pod` `#deployment`

---

## 7. K8S 프로젝트 시나리오 기술 스택

```
[Spring Boot REST API]  ←→  [Next.js UI]
        ↓                        ↓
   PostgreSQL              Nginx (서빙)
        ↓
    Flyway (스키마 버전 관리)
        ↓
  Docker Compose → K8S 클러스터 배포
```

| 도구 | 역할 |
|---|---|
| Flyway | SQL 파일 기반 DB 스키마 버전 관리 |
| Testcontainers | 테스트 시 도커 컨테이너 자동 실행 (PostgreSQL 등) |
| Buildpacks / Jib | Dockerfile 없이 이미지 자동 빌드 |
| Next.js | SSR/SSG + 파일 기반 라우팅 |

> Buildpacks/Jib 경험을 이력서에 명확히 설명할 수 있으면 차별점이 됨

**핵심 키워드:** `#Flyway` `#Testcontainers` `#Next.js` `#Buildpacks` `#Jib`

---

## 8. Next.js 핵심 개념

| 개념 | 설명 |
|---|---|
| SSR | 서버에서 HTML 렌더링 → SEO, 초기 로딩 유리 |
| SSG | 빌드 타임에 정적 HTML 생성 → 매우 빠른 응답 |
| 파일 기반 라우팅 | `pages/` 또는 `app/` 디렉터리 구조 = 자동 라우트 생성 |
| TypeScript | 타입 안정성 ↑, 초기 생산성 ↓, 협업/유지보수 ↑↑ |

> 기존 React Router는 route/path/element 수동 연결 → Next.js는 파일 위치가 곧 라우트

**핵심 키워드:** `#Next.js` `#SSR` `#SSG` `#file-based-routing` `#TypeScript`

---

## 9. 스프링 부트 Bookmark API - 기본 계층 구조

```java
// Entity
@Entity
@Table(name = "bookmarks")
public class Bookmark {
    @Id
    @SequenceGenerator(name = "bookmark_seq", sequenceName = "bookmark_seq", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "bookmark_seq")
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String url;
}
```

```java
// Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {}

// Service
@Service
@Transactional(readOnly = true)  // 조회 전용 최적화
public class BookmarkService {
    private final BookmarkRepository bookmarkRepository;
    // ...
}

// Controller
@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController { ... }
```

> 엔티티 직접 반환 → 더티 체킹 위험 + 순환참조 가능성. 반드시 DTO로 변환해서 내려줄 것

**핵심 키워드:** `#@Entity` `#JpaRepository` `#@Transactional` `#@RestController` `#SequenceGenerator`

---

## 10. 페이징 처리 + 응답 DTO 설계

```java
// Controller
@GetMapping
public PageResponseDTO<BookmarkDTO> list(
    @RequestParam(defaultValue = "1") int page) {
    return bookmarkService.findAll(page);
}

// Service
public PageResponseDTO<BookmarkDTO> findAll(int page) {
    if (page < 1) page = 1;
    Pageable pageable = PageRequest.of(page - 1, 10,  // JPA는 0-based!
                        Sort.Direction.DESC, "createdAt");
    Page<Bookmark> result = bookmarkRepository.findAll(pageable);
    return new PageResponseDTO<>(result);
}
```

```java
// 응답 DTO 예시
public class PageResponseDTO<T> {
    private List<T> content;
    private int totalPages;
    private long totalElements;

    @JsonProperty("isFirst")   // Jackson이 isFirst → first로 바꾸는 것 방지
    private boolean isFirst;

    @JsonProperty("isLast")
    private boolean isLast;
}
```

> `Page.getContent()` = 데이터만. 페이지 메타(총 개수, 다음 페이지 여부 등)는 Page 객체에서 따로 꺼내야 함

**핵심 키워드:** `#Pageable` `#PageRequest` `#Sort` `#@JsonProperty` `#pagination-DTO`

---

## 11. Flyway 마이그레이션 - 파일 규칙 + 벤더 분기

```
파일명 규칙:
V1__create_bookmarks_table.sql
 ↑  ↑↑
 버전 구분자(언더스코어 2개!)
```

```sql
-- V1__create_bookmarks_table.sql
CREATE SEQUENCE bookmark_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE bookmarks (
    id        BIGINT       PRIMARY KEY DEFAULT NEXTVAL('bookmark_seq'),
    title     VARCHAR(200) NOT NULL,
    url       TEXT         NOT NULL,
    del_flag  CHAR(1)      DEFAULT 'N',
    created_at TIMESTAMP   DEFAULT NOW()
);
```

```sql
-- V2__sample_insert_data.sql
INSERT INTO bookmarks (title, url) VALUES ('Google', 'https://google.com');
INSERT INTO bookmarks (title, url) VALUES ('GitHub', 'https://github.com');
```

```yaml
# application.yml - 벤더별 스크립트 자동 선택
spring:
  flyway:
    locations: classpath:db/migration/${vendor}
# → db/migration/h2/ 또는 db/migration/postgresql/ 폴더 자동 선택
```

| 접두어 | 의미 |
|---|---|
| `V` | 버전 마이그레이션 (1회 적용) |
| `U` | Undo (롤백용) |
| `R` | 반복 실행 가능 스크립트 |

> 적용 확인 = H2 콘솔에서 `flyway_schema_history` 테이블 조회

**핵심 키워드:** `#Flyway` `#V1__` `#flyway_schema_history` `#vendor` `#db/migration`

---

## 12. 엔티티 vs DTO - 계층 분리 원칙

```java
// DTO 변환 - 서비스/매퍼에서 처리
public BookmarkDTO toDTO(Bookmark bookmark) {
    return new BookmarkDTO(
        bookmark.getId(),
        bookmark.getTitle(),
        bookmark.getUrl()
    );
}

// 리스트 변환
List<BookmarkDTO> dtoList = bookmarks.stream()
    .map(this::toDTO)
    .collect(Collectors.toList());

// JPQL 프로젝션 방식 (레포지토리에서 바로 DTO 생성)
@Query("SELECT new com.example.dto.BookmarkDTO(b.id, b.title, b.url) FROM Bookmark b")
List<BookmarkDTO> findAllAsDTO();
```

```
역할 분리 원칙:
엔티티 → DB와 대화하는 객체 (영속성 컨텍스트와 묶여있음)
DTO    → 클라이언트와 대화하는 객체 (계약 명확, 안전)
```

> 엔티티 그대로 반환 = 더티 체킹 + 순환참조 + 데이터 과다 전송 문제 발생 가능

**핵심 키워드:** `#dirty-checking` `#persistence-context` `#DTO` `#projection` `#JPQL-new-DTO`

---

## 13. 스프링 부트 주요 의존성 정리

| 의존성 | 핵심 역할 |
|---|---|
| DevTools | 자동 재시작, 개발 중 캐시 비활성화 |
| Configuration Processor | `application.yml` 설정 메타데이터 처리 |
| Actuator | `/actuator/health` 등 모니터링 엔드포인트 제공 |
| Flyway | SQL 파일 기반 DB 스키마 버전 관리 |
| Testcontainers | 테스트 시 도커 컨테이너 자동 실행 |

> Flyway + Testcontainers = "왜 쓰는지" 사례로 설명할 수 있어야 면접에서 차별화됨

**핵심 키워드:** `#DevTools` `#Actuator` `#Flyway` `#Testcontainers` `#Configuration-Processor`

---

## 다음 수업 예고

- Testcontainers로 PostgreSQL 컨테이너 띄워서 통합 테스트 구성
- H2 인메모리 vs 실제 PostgreSQL 방언 차이 → 배포 전 리스크 줄이기
- Redis, Kafka 등 외부 의존성도 동일한 방식으로 테스트 자동화 가능

---

## 오늘의 핵심 요약

1. Docker Compose `down` ≠ `stop` → 재기동만 필요하면 `stop` 쓸 것
2. GitHub Actions YAML 들여쓰기 한 칸 틀려도 워크플로 즉시 실패
3. 모노레포에서 Maven 빌드 시 `-f pom.xml경로` 로 위치 명시 필수
4. `usermod -aG` → `-a` 빠지면 기존 그룹 삭제됨. 실수하면 sudo 날아감
5. WAS 물어보면 Tomcat, WS/WAS 같이 물어보면 Nginx + Tomcat 구조로 답할 것
6. K8S = 죽은 컨테이너 복구, 확장, 무중단 배포를 자동화하는 오케스트레이션 플랫폼
7. Flyway 파일명 규칙 = `V1__설명.sql` (언더스코어 **2개**, 대문자 V)
8. JPA 페이징은 0-based → 컨트롤러에서 받은 page에 `-1` 보정 필수
9. `@JsonProperty("isFirst")` = Jackson이 isFirst → first 로 바꾸는 것 방지
10. 엔티티는 DB 전용, DTO는 클라이언트 전용 → 계층 분리 원칙 지키기
