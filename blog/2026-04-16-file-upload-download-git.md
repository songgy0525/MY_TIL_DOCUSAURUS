---
title: "[TIL] 파일 업로드, 다운로드와 Git 설정"
date: 2026-04-16
tags: [Java, Servlet, Git, 파일업로드]
---
> 부트캠프 백엔드 과정 · 2026.04.16

## 1. 파일 업로드 — @MultipartConfig + Parts

```java
@WebServlet("/upload")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,  // 1MB
    maxFileSize = 50 * 1024 * 1024,   // 50MB
    maxRequestSize = 50 * 1024 * 1024
)
public class UploadServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse res)
            throws IOException, ServletException {

        String uploadPath = req.getServletContext().getRealPath("/uploads/");
        File uploadDir = new File(uploadPath);
        if (!uploadDir.exists()) uploadDir.mkdirs();  // 폴더 생성

        // 파일 Parts 처리
        for (Part part : req.getParts()) {
            String fileName = part.getSubmittedFileName();
            if (fileName == null || fileName.isEmpty()) continue;  // 텍스트 필드 제외

            // UUID로 저장명 생성 (중복 방지)
            String ext = fileName.substring(fileName.lastIndexOf('.'));
            String savedName = UUID.randomUUID().toString() + ext;

            part.write(uploadPath + File.separator + savedName);
        }
    }
}
```

> ⚠️ 실서비스 = 외부 저장소 사용 (서버 재시작 시 파일 초기화 위험)
> `mkdir()` = 단일 폴더 / `mkdirs()` = 상위 폴더까지 생성 (권장)

---

## 2. 파일 다운로드 응답 헤더

```java
// 다운로드 서블릿
String fileName = req.getParameter("fileName");
String filePath = req.getServletContext().getRealPath("/uploads/") + fileName;
File file = new File(filePath);

if (!file.exists()) { res.sendError(404); return; }

// 한글 파일명 인코딩
String encodedName = URLEncoder.encode(fileName, "UTF-8");

res.setContentType("application/octet-stream");
res.setHeader("Content-Disposition", "attachment; filename=\"" + encodedName + "\"");
res.setContentLength((int) file.length());

// 스트림 전송 (try-with-resources)
try (InputStream in = new FileInputStream(file);
     OutputStream out = res.getOutputStream()) {
    byte[] buffer = new byte[4096];
    int len;
    while ((len = in.read(buffer)) != -1) {
        out.write(buffer, 0, len);
    }
}
```

---

## 3. Ajax(FormData) 업로드 + 미리보기

```javascript
// DataTransfer로 파일 선택 누적
const dataTransfer = new DataTransfer();
const fileInput = document.getElementById('files');

fileInput.addEventListener('change', function() {
    Array.from(this.files).forEach(file => {
        // 유효성 검사
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png','gif'].includes(ext)) {
            alert("이미지만 업로드 가능");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("5MB 이하만 가능");
            return;
        }
        dataTransfer.items.add(file);
    });
    fileInput.files = dataTransfer.files;
    renderPreview();
});

// 미리보기 렌더링
function renderPreview() {
    const list = document.getElementById('preview-list');
    list.innerHTML = "";

    Array.from(dataTransfer.files).forEach((file, idx) => {
        const li = document.createElement('li');
        li.textContent = file.name;

        // 이미지 미리보기
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);  // 임시 URL
            img.width = 100;
            li.prepend(img);
        }

        // 삭제 버튼
        const delBtn = document.createElement('button');
        delBtn.textContent = "삭제";
        delBtn.dataset.index = idx;
        li.append(delBtn);
        list.append(li);
    });
}

// 이벤트 위임으로 삭제
document.getElementById('preview-list').addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
        const idx = parseInt(e.target.dataset.index);
        dataTransfer.items.remove(idx);
        fileInput.files = dataTransfer.files;
        renderPreview();
    }
});
```

> FormData 전송 시 `Content-Type` 직접 지정하지 말 것! (브라우저가 boundary 자동 설정)

---

## 4. 스프링 부트 대비 Git 설정

```bash
# Git 사용자 설정 (커밋 작성자 정보)
git config --global user.name "이름"
git config --global user.email "이메일@gmail.com"
```

```
GitHub 인증:
  로그인 = 계정 비밀번호
  push/pull = Personal Access Token (PAT) 필요
  발급: Developer settings > Personal access tokens (classic)
  만료: No expiration (실습 편의)

Eclipse 인코딩:
  Preferences > General > Content Types
  CSS/HTML/JS/JSON/Properties/YAML 등 UTF-8 설정 + Update
```

---

## 오늘의 핵심 요약

1. `@MultipartConfig` = 서블릿 파일 업로드 활성화 필수
2. `part.getSubmittedFileName()` = null이면 텍스트 필드 → continue
3. UUID = 파일명 중복 방지 (`UUID.randomUUID().toString()`)
4. `mkdirs()` = 상위 폴더까지 생성 (mkdir보다 안전)
5. 다운로드 = `Content-Disposition: attachment` + `application/octet-stream`
6. 한글 파일명 = `URLEncoder.encode(fileName, "UTF-8")`
7. DataTransfer = `input.files` 직접 교체로 파일 선택 누적
8. `URL.createObjectURL()` = 브라우저에서 파일 임시 URL
9. FormData 전송 = Content-Type 직접 지정 X (자동 boundary)
10. Git PAT = 계정 비밀번호 대신 도구 인증에 사용
