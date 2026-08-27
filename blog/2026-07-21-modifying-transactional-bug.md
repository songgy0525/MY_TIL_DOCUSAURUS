---
title: "[개발노트] @Modifying @Transactional 누락 — 런타임에서 터진 버그"
date: 2026-07-21
tags: [JPA, Spring Boot, 버그수정]
---

> Expopass 프로젝트 · 배너 광고 도메인

## 상황

`BannerImpressionRepository`에 벌크 업데이트 쿼리를 작성했는데, 서버 띄우고 호출하자마자 아래 에러가 났다.

```
org.springframework.dao.InvalidDataAccessApiUsageException:
Executing an update/delete query; nested exception is
javax.persistence.TransactionRequiredException
```

## 원인

```java
// 잘못된 코드
@Modifying
@Query("UPDATE BannerImpression b SET b.count = b.count + 1 WHERE b.id = :id")
void incrementCount(@Param("id") Long id);
```

`@Modifying`만 붙이고 `@Transactional`을 빠뜨렸다. JPA에서 update/delete 쿼리는 트랜잭션이 필수인데, 호출하는 서비스 메서드에 `@Transactional`이 없으면 런타임에 터진다.

## 수정

```java
@Modifying
@Transactional
@Query("UPDATE BannerImpression b SET b.count = b.count + 1 WHERE b.id = :id")
void incrementCount(@Param("id") Long id);
```

## 새로 알게 된 것

**`@Modifying`은 `@Transactional` 없이는 무용지물**
- `@Modifying`은 "이 쿼리는 select가 아니다"를 JPA에 알리는 힌트일 뿐
- 실제 실행에는 트랜잭션이 있어야 한다
- Repository 레벨에 붙이거나, 호출하는 서비스 메서드에 `@Transactional` 필요

**컴파일 타임에 안 잡힌다**
- 이 에러는 런타임에만 나온다 — 테스트 없이 배포하면 운영에서 처음 알게 됨
- Repository의 `@Modifying` 메서드에는 반드시 `@Transactional` 체크를 습관화

**`clearAutomatically = true` 옵션도 있다**
- 벌크 update 후 영속성 컨텍스트가 stale 상태가 될 수 있음
- `@Modifying(clearAutomatically = true)`로 1차 캐시를 비워줘야 이후 조회가 DB에서 다시 읽어옴

---
