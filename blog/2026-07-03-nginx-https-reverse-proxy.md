---
title: "[개발노트] Nginx HTTPS 리버스 프록시 — Let's Encrypt 인증서 발급까지"
date: 2026-07-03
tags: [Nginx, HTTPS, 배포]
---

> Prodio 프로젝트 · Oracle Cloud 배포

## 구성한 것

Nginx를 리버스 프록시로 두고 Spring Boot 앱(8080) 앞에서 HTTPS를 처리하도록 구성했다.

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Let's Encrypt + Certbot으로 무료 인증서 발급:
```bash
sudo certbot --nginx -d example.com
```

## 새로 알게 된 것

**`X-Forwarded-Proto` 헤더가 중요하다**
- Nginx가 HTTPS를 받아서 HTTP로 백엔드에 전달하면, Spring은 자기가 HTTP로 서비스하는 줄 앎
- 이 헤더를 전달해야 Spring이 HTTPS 환경임을 인식하고 redirect URL을 올바르게 생성
- Spring Boot에서는 `server.forward-headers-strategy=native` 또는 `FRAMEWORK` 설정 필요

**80 → 443 리다이렉트는 필수**
- HTTP로 접근하면 자동으로 HTTPS로 보내야 함
- `return 301 https://$host$request_uri;`

**Certbot 자동 갱신**
- Let's Encrypt 인증서는 90일 유효
- `sudo certbot renew --dry-run`으로 자동 갱신 테스트
- cron 또는 systemd timer로 주기적 갱신 설정

**Oracle Cloud 방화벽 설정도 해줘야 한다**
- 보안 목록(Security List)에서 80, 443 포트 인바운드 허용
- OS 레벨에서도 `iptables` 또는 `firewalld`로 포트 열기

---
