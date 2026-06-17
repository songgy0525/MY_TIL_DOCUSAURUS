---
title: "[TIL] Next.js 스타일링, 라우팅, API 연동"
date: 2026-06-10
tags: [Next.js, TailwindCSS, DaisyUI, CSSModule, Axios, TypeScript, SpringBoot]
---

## 오늘의 핵심 흐름

Next.js App Router 기반 프로젝트에서 **스타일링 4가지 방식**(Global CSS, CSS Module, Tailwind, DaisyUI)을 정리하고, Bootstrap JS 로딩 방법을 실습했다. 이후 **Spring Boot API와 연동**해 북마크 리스트/페이징 UI를 구성했다. 서버/클라이언트 컴포넌트 분리, TypeScript 타입 정의, Axios 서비스 레이어 분리, 쿼리스트링 기반 페이징이 반복적으로 강조됐다.

---

## 1. Next.js 렌더링과 빌드 핵심 복습

| 구분 | 핵심 목적 | 특징 |
|------|----------|------|
| 정적 렌더링(ISR) | 캐시로 응답 안정화 | `revalidate` 단위로 재검증 |
| 동적 렌더링 | 매 요청마다 최신 데이터 | `cache: 'no-store'` |

- React → `dist` 빌드 결과, Next.js → `.next` 빌드 결과 (혼동 주의!)
- 개발 모드(`npm run dev`)와 배포 모드(`npm run build + npm start`)는 동작 맥락이 다름

---

## 2. Next.js 스타일링 4가지

| 방식 | 특징 | 사용처 |
|------|------|--------|
| **Global CSS** | 앱 전체 적용 | 공통 색상, 기본 폰트 등 최소한만 |
| **CSS Module** | 컴포넌트 범위 격리 | 컴포넌트별 세부 스타일 |
| **Tailwind CSS** | 유틸리티 클래스 조합 | 빠른 UI 구성 |
| **DaisyUI** | Tailwind 기반 컴포넌트 라이브러리 | 빠른 프로토타이핑 |

### CSS Module 사용법

```css
/* ProductCard.module.css */
.cardContainer {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}
```

```tsx
import styles from "./ProductCard.module.css";

export default function ProductCard() {
  // ⚠️ className="cardContainer" 문자열로 쓰면 동작 안 함!
  return <div className={styles.cardContainer}>...</div>;
}
```

### Tailwind 방향별 spacing 규칙

```
p   → 전체 padding
px  → 가로 (left + right)
py  → 세로 (top + bottom)
pt / pr / pb / pl  → 각 방향

m / mx / my / mt / mr / mb / ml  → margin도 동일한 패턴
```

### DaisyUI 설정

```html
<!-- layout.tsx 루트에 data-theme 지정 -->
<html data-theme="light">
```

---

## 3. Bootstrap JS 클라이언트 로딩

Bootstrap CSS는 전역 import로 충분하지만, JS는 서버 컴포넌트에서 직접 import할 수 없다.

```tsx
// app/components/BootstrapClient.tsx
"use client";

import { useEffect } from "react";

export default function BootstrapClient() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.min.js");
  }, []);

  return null;  // UI 없이 JS만 로드
}
```

```typescript
// app/types/bootstrap-js.d.ts — TypeScript 타입 에러 해결
declare module "bootstrap/dist/js/bootstrap.min.js" {
  const bootstrap: any;
  export default bootstrap;
}
```

| 대상 | 적용 위치 | 적용 방식 |
|------|----------|----------|
| Bootstrap CSS | `layout.tsx` | 전역 import |
| Bootstrap JS | 클라이언트 컴포넌트 | `useEffect` + dynamic import |
| TS 모듈 선언 | `*.d.ts` | `declare module ...` |

---

## 4. 레이아웃, 라우팅, Link

### 공통 레이아웃

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Navbar />
        <main className="container">{children}</main>
        <BootstrapClient />
      </body>
    </html>
  );
}
```

### 루트 리다이렉트 설정

```typescript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/bookmarks", permanent: true },
    ];
  },
};
export default nextConfig;
```

> ⚠️ `redirects()` 설정 변경 후에는 **서버 재시작** 필요  
> 내부 라우팅에는 `<a>` 태그 대신 반드시 `next/link`의 `Link` 컴포넌트 사용 (전체 리로드 방지)

---

## 5. TypeScript 타입, Axios 서비스, SSR 렌더링

### 타입 정의

```typescript
// types/bookmark.ts
export interface Bookmark {
  id: number;
  title: string;
  url: string;
}

export interface BookmarkResponse {
  content: Bookmark[];
  totalElements: number;
  totalPages: number;
  number: number;   // 0-based
  first: boolean;
  last: boolean;
}
```

### Axios 서비스 레이어 분리

```typescript
// services/api.ts
import axios from "axios";
import type { BookmarkResponse } from "@/types/bookmark";

const API_BASE_URL = "http://localhost:8080";

export async function fetchBookmarks(page = 1, query = ""): Promise<BookmarkResponse> {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.append("query", query);
  const response = await axios.get<BookmarkResponse>(`${API_BASE_URL}/api/bookmarks?${params}`);
  return response.data;
}
```

### 서버 컴포넌트 페이지 — async/await 패턴

```tsx
// app/bookmarks/page.tsx
const BookmarksPage = async ({
  searchParams,
}: {
  searchParams: { page?: string; query?: string };
}) => {
  const page = Number(searchParams.page ?? 1);
  const query = searchParams.query ?? "";
  const data = await fetchBookmarks(page, query);

  return (
    <>
      <Bookmarks bookmarks={data} />
      <Pagination bookmarks={data} query={query} />
    </>
  );
};

export default BookmarksPage;
```

---

## 6. 컴포넌트 분해와 타입 충돌 해결

### 컴포넌트 계층 구조

| 컴포넌트 | 역할 | 입력 Props | 출력 |
|---------|------|-----------|------|
| `page.tsx` | 서버 패칭 + 상위 배치 | `searchParams` | Bookmarks, Pagination 렌더링 |
| `Bookmarks.tsx` | 목록 렌더링 컨테이너 | `bookmarks: BookmarkResponse` | Bookmark를 map으로 출력 |
| `Bookmark.tsx` | 단건(행) UI | `bookmark: Bookmark` | 카드/링크/타이틀 표시 |
| `Pagination.tsx` | 이전/다음 이동 UI | `bookmarks`, `query?` | Link로 쿼리 변경 |

### 타입/컴포넌트 이름 충돌 해결

```typescript
// ❌ 충돌 발생: 컴포넌트 이름과 타입 이름이 같을 때
import { Bookmark } from "@/types/bookmark";  // 런타임 에러

// ✅ import type으로 해결
import type { Bookmark } from "@/types/bookmark";  // 타입 전용 import
```

### 페이징 Link — href 객체 형태

```tsx
<Link
  href={{
    pathname: "/bookmarks",
    query: { page: currentPage - 1, query: searchQuery },
  }}
  className={`page-link ${!bookmarks.hasPrevious ? "disabled" : ""}`}
>
  이전
</Link>
```

---

## 핵심 키워드

`#CSS Module` `#Tailwind CSS` `#DaisyUI` `#Bootstrap` `#"use client"` `#App Router` `#파일 기반 라우팅` `#next/link` `#redirects` `#Axios` `#TypeScript 타입` `#서비스 레이어` `#import type` `#searchParams` `#Pagination`
