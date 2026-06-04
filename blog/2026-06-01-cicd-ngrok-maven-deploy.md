---
title: "[TIL] 온프레미스 CI/CD - ngrok, Maven 배포"
date: 2026-06-01
tags: [CI/CD]
---
> 부트캠프 백엔드 과정 · 2026.06.01

## 1. WSL 백업/복구

```bash
# 배포판 이름 확인
wsl -l -v

# 백업
wsl --export Ubuntu-22.04 D:\backup\ubuntu.tar

# 복구
wsl --import Ubuntu-22.04 C:\wsl\ubuntu D:\backup\ubuntu.tar

# 삭제 후 재설치
wsl --unregister Ubuntu-22.04
wsl --install -d Ubuntu-22.04
```

> PC 포맷/환경 재구성 시 export로 백업 보관 필수!

---

## 2. SSH 키 기반 외부 접속

```bash
# 서버 IP 확인
apt install net-tools
ifconfig

# known_hosts 충돌 해결 (WSL 재설치 시)
ssh-keygen -R <서버IP>

# Windows로 개인키 복사
scp ubuntu@<IP>:~/.ssh/id_rsa ./id_rsa
```

```bash
# MobaXterm 접속 설정
# Session → SSH → Host: <IP> → Use private key → PPK 파일 지정
```

---

## 3. Docker Engine 설치 + 권한

```bash
# 공식 문서 기준 설치 (Ubuntu)
# 키링 등록 → 레포지토리 추가 → apt install docker-ce

# 권한 문제 해결 (-a 옵션 필수!)
sudo usermod -aG docker $USER    # 도커 그룹에 추가
newgrp docker                    # 즉시 반영
docker images                    # 확인

# 소켓 권한 임시 완화 (대안)
sudo chmod 666 /var/run/docker.sock
```

> `-aG` = 기존 그룹 유지하면서 추가 / `-G`만 쓰면 기존 그룹 삭제!

**핵심 키워드:** `#Docker Engine` `#docker.sock` `#usermod -aG` `#newgrp` `#Permission denied`

---

## 4. ngrok으로 퍼블릭 URL 구성

```bash
# 설치 후 authtoken 등록
ngrok config add-authtoken <TOKEN>

# ngrok.yml에 tunnels 정의
vi ~/.config/ngrok/ngrok.yml
```

```yaml
# ~/.config/ngrok/ngrok.yml
authtoken: <TOKEN>
tunnels:
  tomcat:
    proto: http
    addr: 8080
  jenkins:
    proto: http
    addr: 8181
```

```bash
# 백그라운드 실행
nohup ./ngrok start --all > /var/log/ngrok.log 2>&1 &

# URL 확인 (로컬 4040 API)
curl http://127.0.0.1:4040/api/tunnels | grep public_url

# 프로세스 확인 + 종료
ps -ef | grep ngrok
pkill ngrok
# 또는
kill -9 <PID>
```

> YAML 들여쓰기 오류 = ngrok 실행 실패의 주요 원인

**핵심 키워드:** `#ngrok` `#authtoken` `#ngrok.yml` `#nohup` `#4040 API`

---

## 5. Maven + Tomcat 원격 배포

```xml
<!-- pom.xml - packaging 설정 -->
<packaging>war</packaging>

<!-- maven-war-plugin -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-war-plugin</artifactId>
    <configuration>
        <warSourceDirectory>src/main/webapp</warSourceDirectory>
        <webXml>src/main/webapp/WEB-INF/web.xml</webXml>
    </configuration>
</plugin>

<!-- tomcat-maven-plugin -->
<plugin>
    <groupId>org.apache.tomcat.maven</groupId>
    <artifactId>tomcat7-maven-plugin</artifactId>
    <configuration>
        <url>http://localhost:8080/manager/text</url>
        <server>TomcatServer</server>
        <path>/myapp</path>
    </configuration>
</plugin>
```

```bash
# Maven 배포 명령
mvn tomcat7:deploy      # 최초 배포
mvn tomcat7:redeploy    # 변경 후 재배포
```

```
배포 흐름:
소스 수정 → mvn tomcat7:redeploy → Tomcat Manager → 앱 재기동
→ 브라우저에서 변경사항 확인
```

> 이 흐름이 Jenkins + Webhook 자동화의 기반!

---

## 6. 전체 구성 정리

```
사용자 (외부)
    ↓
ngrok 퍼블릭 URL
    ↓
Ubuntu 서버 (WSL)
    ├── Tomcat (8080) ← WAR 배포
    └── Jenkins (8181) ← CI 서버
```

---

## 오늘의 핵심 요약

1. WSL 재설치 시 `ssh-keygen -R <IP>` = known_hosts 충돌 해결
2. `usermod -aG docker` = `-a` 필수 (기존 그룹 유지)
3. `newgrp docker` = 로그아웃 없이 그룹 변경 즉시 반영
4. ngrok YAML 들여쓰기 오류 = 파서 에러 → 공백 확인
5. `nohup ... 2>&1 &` = 백그라운드 실행 + 로그 파일 저장
6. `curl http://127.0.0.1:4040/api/tunnels` = ngrok 퍼블릭 URL 확인
7. `pkill ngrok` = 이름 기반 종료 간편
8. Maven `mvn tomcat7:deploy` = 최초 / `redeploy` = 수정 후 재배포
9. WAR 배포 성공 = 톰캣 매니저에서 목록 확인
10. Maven 배포 자동화 = Jenkins Webhook 연결의 기반
