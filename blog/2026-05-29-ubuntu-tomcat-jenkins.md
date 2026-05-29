---
title: "[TIL] Ubuntu 서버 구축 + Tomcat 배포 + Jenkins 설치까지"
date: 2026-05-29
tags: [Ubuntu, Java, Tomcat, Jenkins, Linux, CI/CD]
---

> 부트캠프 백엔드 과정 · 2026.05.29

## 🗺 오늘 배운 흐름 한눈에 보기

로컬에서 개발한 앱을 실제 서버에 올려서 외부에서 접근 가능하게 만드는 전체 흐름을 실습했다.

```
OS 준비 → Java 설치 → Tomcat 10 → systemd 등록 → Jenkins CI/CD
(Ubuntu 22.04)  (OpenJDK 21)  (WAR 배포)  (자동 기동)   (자동화)
```

---

## 1️⃣ 서버 구축 기반 — OS와 SSH

서버는 로컬 IDE 실행과 다르다. 외부 사용자가 접근 가능한 환경이 돼야 하기 때문에 OS 설치, 네트워크, 권한 관리가 전부 엮여있다.

:::info 클라우드 vs 온프레미스
AWS, Azure 같은 클라우드는 인프라(IaaS)를 빌리는 것. 보안 요구가 높은 기업은 직접 서버를 구축하는 온프레미스를 선택하기도 한다. 오늘 실습은 로컬 PC를 서버처럼 써서 온프레미스 흐름을 경험하는 방식이었다.
:::

### SSH 키 기반 인증

ID/PW 방식보다 키 기반 인증이 안전하다. 공개키는 서버에, 개인키는 클라이언트에 보관한다.

| 단계 | 명령어 | 목적 |
|------|--------|------|
| 키 생성 | `ssh-keygen -t rsa -b 4096` | 공개키/개인키 쌍 생성 |
| 키 위치 | `~/.ssh/id_rsa.pub` | 공개키 서버에 등록 |
| PPK 변환 | PuTTYgen | PuTTY 접속용 변환 |

**핵심 키워드:** `IaaS` `온프레미스` `LTS` `CLI` `SSH`

---

## 2️⃣ OpenJDK 21 설치와 환경변수

오라클 JDK는 기업 환경에서 유료(코어당 과금)가 될 수 있어서 OpenJDK를 쓰는 게 일반적이다. Spring Boot 3.x는 Java 17 이상을 요구하는 경우가 많아서 21 LTS를 선택했다.

```bash
# 패키지 목록 업데이트 후 설치
apt update && apt upgrade
apt install openjdk-21-jdk

# 설치 확인
java -version
find / -name java
```

### 환경변수 설정 — /etc/profile vs /etc/environment

| 파일 | 목적 | 형식 |
|------|------|------|
| `/etc/profile` | 쉘 시작 시 전역 설정 | `export` 사용, PATH 확장에 적합 |
| `/etc/environment` | 시스템 전역 변수 선언 | `export` 없이 `KEY="VALUE"` |

```bash
# 설정 즉시 반영
source /etc/profile
source /etc/environment

# 적용 확인
echo $JAVA_HOME
```

**핵심 키워드:** `OpenJDK` `JAVA_HOME` `PATH` `source` `Vim`

---

## 3️⃣ Tomcat 10 수동 설치와 WAR 배포

`apt`로 설치 가능한 버전과 실제 필요한 버전이 다를 수 있어서, 실무에서는 `tar.gz`로 직접 설치한다.

### 설치 절차

1. `wget`으로 tar.gz 다운로드 후 `/tmp`에 압축 해제
2. `/usr/local/tomcat10`으로 이동 (실행파일은 `/usr` 계열)
3. `chmod -R 755`으로 하위까지 실행 권한 부여
4. `CATALINA_HOME` 환경변수 설정
5. `tomcat-users.xml`에서 관리자 계정 추가
6. `context.xml`에서 RemoteAddrValve 주석 처리 (외부 접근 허용)

:::warning
`context.xml`의 RemoteAddrValve 제한 해제는 보안상 민감한 설정이다. 실무에서는 IP 제한을 유지하고 허용 대상을 최소화하는 게 일반적이다.
:::

```bash
# 기동 / 종료
./bin/startup.sh
./bin/shutdown.sh

# 기동 확인
curl http://localhost:8080
```

**핵심 키워드:** `Tomcat` `CATALINA_HOME` `tomcat-users.xml` `context.xml` `WAR`

---

## 4️⃣ systemd로 Tomcat 서비스 등록

수동 실행은 서버 재부팅 후 매번 사람이 기동해야 해서 운영에 부적합하다. systemd에 등록하면 부팅 시 자동 기동된다.

### 서비스 전용 계정 만들기

```bash
# 그룹 및 nologin 계정 생성
groupadd tomcat
useradd -s /bin/nologin -g tomcat -d /usr/local/tomcat10 tomcat

# 소유권 이전 (chmod: 권한비트 변경 / chown: 소유자 변경)
chown -PR tomcat:tomcat /usr/local/tomcat10
```

:::info
`nologin` 계정은 대화형 로그인이 불가능한 서비스 전용 계정이다. 보안을 위해 서비스는 전용 계정으로 실행한다.
:::

### 서비스 파일 핵심 구성

| 항목 | 의미 |
|------|------|
| `User, Group` | 서비스 실행 계정/그룹 (tomcat) |
| `Environment` | JAVA_HOME, CATALINA_HOME 경로 |
| `ExecStart/ExecStop` | 기동/종료 스크립트 연결 |
| `WantedBy` | `multi-user.target` (부팅 단계 연결) |

```bash
# 서비스 등록 및 관리
systemctl daemon-reload
systemctl enable tomcat10.service
systemctl start tomcat10.service
systemctl status tomcat10.service

# 포트 점유 확인 (-l 리스닝 -n 숫자 -t TCP -p 프로세스)
ss -lntp
```

**핵심 키워드:** `systemd` `systemctl` `useradd` `chown` `ss`

---

## 5️⃣ Jenkins 설치와 포트 충돌 해결

Jenkins는 Git push 이벤트를 받아 소스 체크아웃 → 빌드 → 배포를 자동화하는 CI 서버다. 설치 후 Tomcat(8080)과 포트 충돌이 발생해서 8181로 변경했다.

```
Git push → (webhook) → Jenkins → (Maven 빌드) → WAR 생성 → Tomcat 배포 → 서비스
```

### 포트 충돌 해결 포인트

:::danger 핵심
`/etc/default/jenkins`와 systemd 서비스 파일 **두 곳 모두** 포트를 일치시켜야 한다. 한 곳만 바꾸면 적용이 안 된다.
:::

```bash
# 두 곳 다 8181로 변경 필요
# 1. /etc/default/jenkins → HTTP_PORT=8181
# 2. jenkins.service → JENKINS_PORT=8181

systemctl daemon-reload
systemctl start jenkins
systemctl status jenkins
```

### Jenkins 초기 설정 순서

1. `http://localhost:8181` 접속
2. `cat <initialAdminPassword 경로>` 로 초기 비번 확인
3. Install suggested plugins 선택
4. 관리자 계정 생성 (꼭 해야 이후 설정이 편함)

**핵심 키워드:** `Jenkins` `CI` `포트 충돌` `systemd` `GitHub Actions`

---

## 🔜 다음에 이어질 내용

오늘 Jenkins 초기 설정 화면까지 진행했고, 다음에는 이걸 이어서 진행할 예정이다.

- Docker 설치
- ngrok으로 외부 접근 (포트포워딩 대체)
- Git 연동 → CI/CD 파이프라인 완성
