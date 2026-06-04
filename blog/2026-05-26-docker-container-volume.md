---
title: "[TIL] 도커 핵심 개념, 컨테이너, 볼륨"
date: 2026-05-26
tags: [Docker]
---
> 부트캠프 백엔드 과정 · 2026.05.26

## 1. 도커 핵심 개념 정리

```
도커 = 리눅스 기반 컨테이너 기술
컨테이너 = 호스트 OS 커널 공유 + 필요한 실행 환경만 캡슐화
→ OS 전체 포함하는 VM보다 가볍고 빠름
```

| 용어 | 의미 |
|------|------|
| Image | 실행 환경 설계도 (CD/USB에 비유) |
| Container | 이미지를 실행한 인스턴스 |
| Docker Hub | 이미지 공유 레지스트리 |
| Volume | 컨테이너 외부 데이터 저장소 |

> 컨테이너는 "일회성" → 삭제 시 내부 데이터도 사라짐 → **데이터는 볼륨으로 분리 필수**

---

## 2. 도커 CLI 핵심 명령

```bash
# 이미지
docker images                    # 로컬 이미지 목록
docker pull nginx                # 이미지 다운로드
docker rmi nginx                 # 이미지 삭제 (컨테이너 먼저 삭제 필요)

# 컨테이너
docker run --name myapp -d -p 8080:80 nginx   # 실행
docker ps                        # 실행 중 컨테이너
docker ps -a                     # 전체 컨테이너 (종료 포함)
docker stop myapp                # 중지
docker rm myapp                  # 삭제
docker exec -it myapp bash       # 내부 진입
```

### 주요 옵션

| 옵션 | 의미 |
|------|------|
| `-d` | 백그라운드 실행 |
| `-it` | 대화형 + TTY |
| `--name` | 컨테이너 이름 지정 |
| `-p 외부:내부` | 포트 포워딩 |
| `-e KEY=VALUE` | 환경변수 설정 |
| `-v 볼륨:경로` | 볼륨 마운트 |

> 경량 이미지 (BusyBox, Alpine) = `bash` 없음 → `sh` 사용

**핵심 키워드:** `#docker run` `#docker ps` `#exec` `#httpd` `#busybox`

---

## 3. 브릿지 네트워크와 포트 포워딩

```bash
# 브릿지 게이트웨이 확인
docker network inspect bridge | grep Gateway
# → 172.17.0.1

# 포트 점유 확인
ss -lntp                         # Linux
netstat -ano | findstr 3306      # Windows
```

| 구분 | 의미 |
|------|------|
| 외부 포트 | 호스트에서 접근하는 포트 |
| 내부 포트 | 컨테이너 내부 서비스 포트 |
| 포트 포워딩 | `-p 3307:3306` 형태로 연결 |

---

## 4. MySQL 8 컨테이너 구성

```bash
# MySQL 8 실행 (태그로 버전 고정!)
docker run --name docker-mysql8 \
  -d -p 3307:3306 \
  -e MYSQL_ROOT_PASSWORD=DV## \
  mysql:8

# 내부 접속
docker exec -it docker-mysql8 bash
mysql -u root -p

# 로케일 설정 (한글 깨짐 방지)
export LC_ALL="C.UTF-8"
export LANG="C.UTF-8"
```

**핵심 키워드:** `#mysql:8` `#태그` `-e` `#DBeaver` `#locale`

---

## 5. 볼륨 (데이터 영속성)

### 볼륨 마운트 vs 바인드 마운트

| 구분 | 저장 위치 | 장점 | 주의점 |
|------|---------|------|--------|
| 볼륨 마운트 | 도커 엔진 관리 영역 | 성능, 격리 유리 | 직접 조작 어려움 |
| 바인드 마운트 | 호스트 디렉터리 | 확인/백업 쉬움 | 실수로 데이터 훼손 가능 |

```bash
# 볼륨 생성 및 관리
docker volume create httpd_volume
docker volume ls
docker volume inspect httpd_volume
docker volume prune               # 사용 안 하는 볼륨 일괄 삭제

# 컨테이너에 볼륨 연결
docker run -d --name httpd_v \
  -p 8484:80 \
  -v httpd_volume:/usr/local/apache2/htdocs \
  httpd
```

> 바인드 마운트에서 **빈 호스트 폴더 연결** → 컨테이너 내부 파일이 가려짐 주의!

**핵심 키워드:** `#docker volume create` `#docker volume inspect` `#docker volume prune` `-v` `#유지`

---

## 6. 볼륨 백업/복구 (tar)

```bash
# 백업 (임시 컨테이너 활용)
docker stop httpd_v   # 데이터 정합성을 위해 먼저 중지
docker run --rm \
  -v httpd_volume:/source \
  -v C:\docker\backup:/target \
  busybox \
  tar czvf /target/backup.tar.gz -C /source .

# 복구
docker volume create httpd_volume2
docker run --rm \
  -v httpd_volume2:/source \
  -v C:\docker\backup:/target \
  busybox \
  tar xzvf /target/backup.tar.gz -C /source
```

| 명령 | 의미 |
|------|------|
| `tar czvf` | 압축 생성 |
| `tar xzvf` | 압축 해제 |
| `--rm` | 작업 완료 후 임시 컨테이너 자동 삭제 |

**핵심 키워드:** `#tar` `#backup` `#restore` `#--rm` `#volume`

---

## 7. inspect, save/load, export/import, commit

```bash
# 상세 정보 확인
docker inspect <컨테이너명>

# 이미지 백업 (레이어/메타데이터 유지)
docker save -o backup.tar busybox
docker load -i backup.tar

# 컨테이너 변경분 백업 (레이어 통합)
docker export -o container.tar <컨테이너ID>
docker import container.tar myrepo/myimage:1.0

# 컨테이너 → 새 이미지
docker commit <컨테이너ID> myrepo/myimage:2.0
```

| 구분 | 대상 | 레이어 유지 | 사용 상황 |
|------|------|-----------|---------|
| save/load | 이미지 | ✅ | 폐쇄망 이미지 배포 |
| export/import | 컨테이너 | ❌ (통합) | 수정된 실행환경 공유 |
| commit | 컨테이너 → 이미지 | ✅ (추가) | 변경사항 이미지화 |

**핵심 키워드:** `#inspect` `#레이어` `#save/load` `#export/import` `#commit`

---

## 오늘의 핵심 요약

1. 컨테이너 삭제 = 내부 데이터도 삭제 → DB는 반드시 볼륨 연결
2. 이미지 삭제 = 컨테이너 먼저 제거 후 `rmi` 가능
3. `-p 외부:내부` = 포트 포워딩, 포트 충돌 사전 확인 필수
4. `docker ps -a` = 종료된 컨테이너까지 확인
5. 볼륨 마운트 = 도커 관리 / 바인드 마운트 = 호스트 폴더 직접 연결
6. `docker volume prune` = 미사용 볼륨 일괄 삭제 → 용량 주의
7. 볼륨 백업 = 임시 컨테이너 + tar 조합 패턴
8. save/load = 이미지 단위, export/import = 컨테이너 단위
9. 경량 이미지 = `bash` 없으면 `sh` 사용
10. MySQL 태그 = `mysql:8` (버전 고정 안 하면 latest = 예상치 못한 버전)
