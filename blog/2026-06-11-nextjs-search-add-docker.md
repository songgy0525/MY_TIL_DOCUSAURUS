---
title: "[TIL] Next.js 검색, 입력, 도커 배포"
date: 2026-06-11
tags: [Next.js, Docker, CORS, SSR, CSR, 멀티스테이지빌드, DockerCompose]
---

## 오늘의 핵심 흐름

검색 기능을 추가하고 페이지네이션 이동 시 검색 조건이 유지되도록 쿼리스트링 전달 흐름을 잡았다. Add 페이지에서 클라이언트 컴포넌트 + 서버 POST 호출을 연결해 저장 기능, 오류 메시지 출력, CORS 설정까지 완성했다. 후반부에는 **멀티 스테이지 Dockerfile**, **환경변수 분리(SSR/CSR)**, **docker-compose 네트워크** 구성으로 UI/API/DB를 컨테이너로 함께 배포했다.

---

## 1. 검색 컴포넌트 — 쿼리스트링 연동

```tsx
// app/bookmarks/components/SearchForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = async (e: React.SyntheticEvent) => {
    e.preventDefault();  // 기본 폼 제출 동작 방지

    if (!query) {
      router.push("/bookmarks");
      return;
    }
    // 검색 시 항상 1페이지부터
    router.push(`/bookmarks?page=1&query=${query}`);
  };

  return (
    <form onSubmit={handleSearch}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색어 입력"
      />
      <button type="submit">Search</button>
    </form>
  );
}
```

> ⚠️ **검색 후 페이지네이션에서 검색어가 사라지는 문제:**  
> → Pagination 컴포넌트가 `query`를 props로 받아 Link 생성 시 계속 포함해야 함!

---

## 2. 입력(Add) 기능과 React 이벤트 타입

### 이벤트 타입 정리

| 이벤트 | React 타입 | 주요 사용 |
|--------|-----------|---------|
| Submit | `React.SyntheticEvent<HTMLFormElement>` | `e.preventDefault()` |
| Change | `React.ChangeEvent<HTMLInputElement>` | `e.target.value` |
| Click | `React.MouseEvent<HTMLButtonElement>` | 버튼 클릭 |
| KeyDown | `React.KeyboardEvent<HTMLInputElement>` | `e.key`, `e.code` |

### Add 페이지

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBookmark } from "@/services/api";

export default function AddPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title || !url) {
      setMessage("제목과 URL을 모두 입력해주세요.");
      return;
    }

    try {
      await saveBookmark(title, url);
      setTitle("");
      setUrl("");
      setMessage("저장되었습니다!");
      setTimeout(() => router.push("/bookmarks"), 1000);
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* value + onChange 세트로 반드시 제어 컴포넌트로 구성 */}
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" />
      <button type="submit">저장</button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

> ⚠️ `value`가 빠지면 입력이 화면에 반영되지 않거나 상태 동기화가 깨진다.  
> `value` + `onChange`는 반드시 세트로!

### POST 서비스 함수

```typescript
export async function saveBookmark(title: string, url: string) {
  try {
    await axios.post(`${API_BASE_URL}/api/bookmarks`, { title, url });
  } catch (err: any) {
    throw new Error(err.response?.data?.message ?? "저장 실패");
  }
}
```

---

## 3. CORS 설정

```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOriginPatterns("*")
            .allowedMethods("*")
            .allowedHeaders("*");
    }
}
```

> ⚠️ 서버 설정 변경 후 **반드시 클린 빌드 + 재시작** 필요  
> CORS 문제가 계속 난다면 서버가 이전 빌드로 떠 있는 경우가 대부분!

---

## 4. 컨테이너 환경의 URL 체계

| 실행 위치 | UI → API 호출 주소 | 의미 |
|----------|-----------------|------|
| UI 로컬, API 로컬 | `http://localhost:8080` | 동일 호스트 OS |
| UI 컨테이너, API 로컬 | `http://host.docker.internal:8080` | 컨테이너 → 호스트 탈출 |
| UI 컨테이너, API 컨테이너(동일 네트워크) | `http://bookmark-api:8080` | 서비스명 기반 내부 DNS |

---

## 5. SSR/CSR 환경변수 분리

```bash
# .env.local
# SSR — 서버(UI 컨테이너) 내부에서 API 컨테이너로 접근
SERVER_SIDE_API_BASE_URL=http://bookmark-api:8080

# CSR — 브라우저에서 호스트 포트로 접근 (NEXT_PUBLIC_ 접두사 필수!)
NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL=http://localhost:18080
```

```typescript
// 실행 위치(서버 vs 브라우저) 판단
const baseUrl =
  typeof window === "undefined"
    ? process.env.SERVER_SIDE_API_BASE_URL       // 서버 컨텍스트
    : process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL;  // 브라우저
```

> SSR 요청 = 컨테이너 내부에서 API로 → 내부 DNS 사용  
> CSR 요청 = 브라우저에서 호출 → 호스트 포트 사용

---

## 6. Next.js 멀티 스테이지 Dockerfile

```dockerfile
# Stage 1: 의존성 설치
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci  # lock 파일 기반 재현 가능한 설치

# Stage 2: 빌드
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: 실행
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.local ./.env.local  # ← 이 줄이 핵심!
RUN npm install --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

> ⚠️ `.env.local`을 최종 단계에서 COPY하지 않으면  
> 컨테이너에서 API URL이 `undefined`로 뜨는 문제 발생!

---

## 7. Docker Compose 네트워크로 UI/API/DB 묶기

```yaml
networks:
  bookmark-network:
    driver: bridge

services:
  postgres:
    networks:
      - bookmark-network

  bookmark-api:
    networks:
      - bookmark-network
    depends_on:
      postgres:
        condition: service_healthy

  bookmark-ui:
    build:
      context: ./ui
      dockerfile: Dockerfile.ui
    ports:
      - "13000:3000"
    env_file:
      - ./ui/.env.local
    networks:
      - bookmark-network
```

| 구성 요소 | 중요한 설정 | 기대 효과 |
|----------|-----------|---------|
| network(bridge) | `driver: bridge` | 컨테이너 간 통신 허용 |
| UI 서비스 | `env_file`, `ports` | 환경변수 주입 + 외부 접속 |
| API 서비스 | `depends_on` | DB 선행 기동 보장 |
| DB 서비스 | `healthcheck` | API가 의존하는 DB 가용성 확보 |

---

## 핵심 키워드

`#useRouter` `#searchParams` `#쿼리스트링` `#React.SyntheticEvent` `#axios.post` `#CORS` `#WebMvcConfigurer` `#SSR/CSR` `#NEXT_PUBLIC_` `#멀티스테이지 빌드` `#host.docker.internal` `#bridge 네트워크`
