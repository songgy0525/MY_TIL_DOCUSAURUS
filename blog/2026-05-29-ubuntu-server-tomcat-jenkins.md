---
title: "[TIL] 우분투 서버 구축, Tomcat, Jenkins"
date: 2026-05-29
tags: [Ubuntu, Tomcat, Jenkins]
---
> 부트캠프 백엔드 과정 · 2026.05.29

## 1. 우분투 서버 기본 준비

```bash
# OS 버전 확인
lsb_release -a

# 패키지 최신화
sudo apt update     # 설치 가능 목록 갱신
sudo apt upgrade    # 실제 패키지 업그레이드

# 루트 전환
sudo -i
sudo -s
```

### 리눅스 디렉터리 구조

| 디렉터리 | 역할 |
|---------|------|
| `/` | 최상위 루트 |
| `/bin` | 기본 명령어 바이너리 |
| `/etc` | 시스템 설정 파일 |
| `/home` | 일반 사용자 홈 |
| `/usr/local` | 수동 설치 소프트웨어 |
| `/var` | 로그 등 가변 데이터 |
| `/tmp` | 임시 파일 |

---

## 2. OpenJDK 21 설치와 환경변수

```bash
# 설치
apt install openjdk-21-jdk

# 설치 경로 확인
java -version
find / -name java

# 환경변수 설정
vi /etc/profile
```

```bash
# /etc/profile 내용 추가
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$PATH:$JAVA_HOME/bin
```

```bash
# /etc/environment 내용 추가
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"

# 즉시 반영
source /etc/profile
source /etc/environment
echo $JAVA_HOME
```

| 파일 | 방식 | 목적 |
|------|------|------|
| `/etc/profile` | `export KEY=VALUE` | 쉘 세션용 전역 설정 |
| `/etc/environment` | `KEY="VALUE"` | 시스템 전역 변수 |

**핵심 키워드:** `#OpenJDK` `#JAVA_HOME` `#PATH` `/etc/profile` `/etc/environment`

---

## 3. Tomcat 10 수동 설치

```bash
# 다운로드
cd /tmp
wget <tomcat-tar.gz-url>
tar xvzf apache-tomcat-10.x.x.tar.gz

# 이동 + 권한
mv apache-tomcat-10.x.x /usr/local/tomcat10
chmod -R 755 /usr/local/tomcat10

# 환경변수 추가
# /etc/profile에 추가
export CATALINA_HOME=/usr/local/tomcat10
```

### 주요 설정 파일

```xml
<!-- conf/tomcat-users.xml - 관리자 계정 -->
<role rolename="manager-gui"/>
<role rolename="manager-script"/>
<user username="admin" password="admin"
      roles="manager-gui,manager-script,manager-jmx,manager-status"/>

<!-- webapps/manager/WEB-INF/web.xml - 업로드 용량 확장 -->
<!-- 50MB → 300MB (314572800 bytes) -->

<!-- webapps/manager/META-INF/context.xml - 외부 접근 허용 -->
<!-- RemoteAddrValve 주석 처리 -->
```

```bash
# 기동/종료
/usr/local/tomcat10/bin/startup.sh
/usr/local/tomcat10/bin/shutdown.sh

# 확인
curl http://localhost:8080
```

**핵심 키워드:** `#Tomcat` `#CATALINA_HOME` `#tomcat-users.xml` `#systemd service` `#server.xml`

---

## 4. systemd 서비스 등록 (자동 기동)

```bash
# Tomcat 전용 계정 생성
groupadd tomcat
useradd -s /bin/nologin -g tomcat -d /usr/local/tomcat10 tomcat
chown -PR tomcat:tomcat /usr/local/tomcat10
```

```ini
# /etc/systemd/system/tomcat10.service
[Unit]
Description=Tomcat 10 Web Server
After=network.target

[Service]
Type=forking
User=tomcat
Group=tomcat
Environment="JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
Environment="CATALINA_HOME=/usr/local/tomcat10"
ExecStart=/usr/local/tomcat10/bin/startup.sh
ExecStop=/usr/local/tomcat10/bin/shutdown.sh

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable tomcat10.service
systemctl start tomcat10.service
systemctl status tomcat10.service

# 포트 확인
ss -lntp
```

| `chmod` | 소유자/그룹/기타 권한 변경 |
|---------|------------------------|
| `chown` | 소유자/그룹 변경 |
| `-R` | 하위 폴더까지 재귀 적용 |
| `nologin` | 대화형 로그인 불가 서비스 계정 |

**핵심 키워드:** `#systemd` `#systemctl` `#useradd` `#chown` `#ss`

---

## 5. Jenkins 설치 + 포트 충돌 해결

```bash
# Jenkins 공식 문서 기준 설치
# → 설치 후 systemd 서비스로 자동 등록

# 기본 포트 8080 → Tomcat과 충돌!
# 8181로 변경

# 변경 위치 1
vi /etc/default/jenkins
# HTTP_PORT=8181 로 수정

# 변경 위치 2 (서비스 유닛 파일)
vi /lib/systemd/system/jenkins.service
# Environment="JENKINS_PORT=8181" 로 수정

systemctl daemon-reload
systemctl start jenkins
systemctl status jenkins

# 초기 비밀번호 확인
cat /var/lib/jenkins/secrets/initialAdminPassword
```

```
브라우저: http://localhost:8181
1. 초기 비밀번호 입력
2. Suggested plugins 설치
3. 관리자 계정 생성 (반드시!)
```

**핵심 키워드:** `#Jenkins` `#CI` `#포트 충돌` `#systemd` `#GitHub Actions`

---

## 오늘의 핵심 요약

1. `apt update` = 목록 갱신 / `apt upgrade` = 실제 업그레이드
2. `/etc/profile` = export 방식 / `/etc/environment` = 키=값 방식
3. `source` = 재부팅 없이 즉시 반영
4. Tomcat = apt 말고 tar.gz 수동 설치 (원하는 버전 선택)
5. 권한 7 = rwx (4+2+1) / 5 = r-x / 0 = ---
6. `chown` = 소유자 변경 / `chmod` = 권한 변경
7. `nologin` 계정 = 서비스 전용, 직접 로그인 불가
8. `systemctl enable` = 부팅 시 자동 실행 등록
9. Jenkins 기본 포트 = 8080 → Tomcat과 충돌 → 양쪽 설정 파일 모두 변경 필요
10. `daemon-reload` = systemd 유닛 파일 변경 후 반드시 실행
