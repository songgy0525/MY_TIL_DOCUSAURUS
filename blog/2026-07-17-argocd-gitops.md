---
title: "[개발노트] ArgoCD GitOps — Git이 배포 상태의 단일 진실 공급원"
date: 2026-07-17
tags: [ArgoCD, GitOps, Kubernetes, CI/CD]
---

> k8s 배포 환경 구성

## GitOps가 뭔데

기존 CI/CD는 파이프라인이 직접 서버에 `kubectl apply`를 날린다. GitOps는 반대다.

```
[개발자] git push
    ↓
[CI] 이미지 빌드 → DockerHub push → k8s manifest의 이미지 태그 업데이트 → git push
    ↓
[ArgoCD] Git 변경 감지 → 클러스터 상태를 Git과 동기화
```

ArgoCD가 Git을 계속 바라보면서, 클러스터 상태가 Git과 다르면 자동으로 맞춰준다.

## 새로 알게 된 것

**배포 상태가 Git에 기록된다**
- "지금 운영에 어느 버전이 떠있어?"를 Git 히스토리로 추적 가능
- 롤백 = `git revert` 또는 이전 커밋으로 `checkout` → ArgoCD가 알아서 이전 버전으로 복구

**CI와 CD를 분리하는 게 핵심**
- CI: 코드 빌드 + 이미지 생성 (GitHub Actions)
- CD: 클러스터에 배포 (ArgoCD)
- 두 역할을 분리하면 배포 권한 관리가 깔끔해짐

**이미지 태그를 `latest`로 쓰면 안 된다**
- ArgoCD는 manifest의 변경을 감지해서 동기화하는데, `latest`면 변경이 없어 보임
- `커밋 SHA` 또는 `빌드 번호`를 태그로 써야 CI가 manifest 파일을 업데이트하고 ArgoCD가 감지함

```yaml
# k8s/deployment.yaml
image: myapp:abc1234  # CI가 커밋 SHA로 자동 업데이트
```

**`auto-sync` 설정 주의**
- 자동 동기화 켜두면 Git push만으로 배포 → 편하지만 실수도 바로 반영됨
- PR 리뷰 → merge → 자동 배포 플로우를 팀 내 합의해야 함

---
