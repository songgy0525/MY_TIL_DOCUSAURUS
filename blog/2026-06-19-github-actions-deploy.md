---
title: "[개발노트] GitHub Actions로 배포 자동화 — push만 해도 배포되게"
date: 2026-06-19
tags: [GitHub Actions, CI/CD, Docker]
---

> 프로젝트 배포 자동화 구성

## 구성한 것

`main` 브랜치에 push되면 자동으로 빌드 → Docker 이미지 빌드 → 서버 배포까지 돌아가는 파이프라인을 GitHub Actions로 구성했다.

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Build with Maven
        run: mvn -B package -DskipTests

      - name: Build Docker image
        run: docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/app:latest .

      - name: Push to DockerHub
        run: |
          echo ${{ secrets.DOCKERHUB_TOKEN }} | docker login -u ${{ secrets.DOCKERHUB_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/app:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull ${{ secrets.DOCKERHUB_USERNAME }}/app:latest
            docker compose up -d
```

## 새로 알게 된 것

**Secrets는 Settings → Secrets and variables → Actions에서 관리**
- API 키, SSH 키, DockerHub 토큰 등 민감 정보는 절대 코드에 넣으면 안 됨
- `${{ secrets.변수명 }}`으로 참조

**`-DskipTests`는 CI에서 신중하게**
- 테스트가 오래 걸릴 때 스킵하고 싶지만, 테스트가 배포 전 안전망이기도 함
- 빠른 단위 테스트는 돌리고, 느린 통합 테스트만 분리해 스킵하는 게 낫다

**`appleboy/ssh-action`이 SSH 배포에 편하다**
- 서버에 직접 SSH 접속해서 스크립트 실행
- 단점: 서버가 여러 대면 관리가 복잡해짐 → 그때는 ArgoCD 같은 GitOps 도구로

---
