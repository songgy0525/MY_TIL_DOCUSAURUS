---
title: "[TIL] 스프링 부트 파일 업로드, 다운로드, WebSocket"
date: 2026-04-28
tags: [SpringBoot, 파일업로드, WebSocket]
---
> 부트캠프 백엔드 과정 · 2026.04.28

## 1. 스프링 부트 파일 업로드 설정

```properties
# application.properties
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB

# 커스텀 업로드 경로 (선택)
upload.location=/data/uploads
```

### 업로드 컨트롤러

```java
@Controller
public class UploadController {

    @Value("${upload.location}")
    private String uploadPath;

    // GET: 업로드 폼
    @GetMapping("/upload")
    public String uploadForm() {
        return "upload/form";
    }

    // POST: 업로드 처리
    @PostMapping("/upload")
    public String upload(@RequestParam("file") List<MultipartFile> files,
                         @RequestParam("desc") String desc,
                         Model model) throws Exception {

        List<String> originNames = new ArrayList<>();
        List<String> savedNames = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;  // 빈 파일 건너뛰기

            String originName = file.getOriginalFilename();

            // UUID로 저장명 생성 (중복 방지)
            String ext = originName.substring(originName.lastIndexOf('.'));
            String savedName = UUID.randomUUID().toString() + ext;

            // 폴더 생성
            File dir = new File(uploadPath);
            if (!dir.exists()) dir.mkdirs();  // mkdir() 아닌 mkdirs() 사용!

            // 파일 저장 (스트림 불필요!)
            file.transferTo(new File(dir, savedName));

            originNames.add(originName);
            savedNames.add(savedName);
        }

        model.addAttribute("originNames", originNames);
        model.addAttribute("savedNames", savedNames);
        model.addAttribute("uploadPath", uploadPath);
        return "upload/result";
    }
}
```

> 실서비스 = 외부 저장소 (NAS, FTP, Object Storage) 사용
> `getRealPath()` = 배포 시 파일 초기화 위험 → 절대 경로 권장

**핵심 키워드:** `#MultipartFile` `#transferTo` `#UUID` `#mkdirs` `#application.properties`

---

## 2. 업로드 폼 HTML

```html
<!-- multipart/form-data 필수! -->
<form method="post" enctype="multipart/form-data" th:action="@{/upload}">
    <input type="file" name="file" multiple>
    <input type="text" name="desc" placeholder="설명">
    <button type="submit">업로드</button>
</form>
```

> `name="file"` = 컨트롤러 `@RequestParam("file")` 키와 정확히 일치해야 함

**핵심 키워드:** `#multipart/form-data` `#@RequestParam` `#name매칭` `#Model` `#Thymeleaf`

---

## 3. 파일 다운로드 응답

```java
@GetMapping("/download")
@ResponseBody
public ResponseEntity<byte[]> download(@RequestParam String savedName,
                                       @RequestParam String originName)
        throws Exception {

    File file = new File(uploadPath, savedName);
    if (!file.exists()) return ResponseEntity.notFound().build();

    // 한글 파일명 인코딩
    String encodedName = URLEncoder.encode(originName, "UTF-8");

    HttpHeaders headers = new HttpHeaders();
    headers.add("Content-Disposition", "attachment; filename=\"" + encodedName + "\"");
    headers.add("Content-Type", "application/octet-stream");
    headers.add("Content-Length", String.valueOf(file.length()));

    byte[] bytes = FileCopyUtils.copyToByteArray(file);
    return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
}
```

| 헤더 | 값 예시 | 목적 |
|------|---------|------|
| `Content-Disposition` | `attachment; filename="..."` | 브라우저 다운로드 강제 |
| `Content-Type` | `application/octet-stream` | 범용 바이너리 |
| `Content-Length` | `bytes.length` | 진행률 표시 |

> `FileCopyUtils.copyToByteArray()` = 수동 스트림 복사 대체

**핵심 키워드:** `#Content-Disposition` `#attachment` `#FileCopyUtils` `#application/octet-stream` `#@ResponseBody`

---

## 4. Ajax(FormData) 업로드 + 미리보기

```javascript
// FormData 전송 — Content-Type 직접 지정 절대 X!
// (지정하면 boundary 깨져서 서버가 파싱 실패)

const fileInput = document.getElementById('files');

fileInput.addEventListener('change', function() {
    Array.from(this.files).forEach(file => {
        // 유효성 검사
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['jpg','png','gif'].includes(ext)) {
            alert("이미지만 업로드 가능");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("5MB 이하만 가능");
            return;
        }

        // 미리보기
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);  // 임시 URL 생성
            img.width = 100;
            document.getElementById('preview').append(img);
        }
    });
});

// 이벤트 위임으로 삭제 처리
document.getElementById('preview').addEventListener('click', function(e) {
    if (e.target.classList.contains('del-btn')) {
        e.target.closest('li').remove();
    }
});

// 전송 (Content-Type 지정 X → 브라우저가 자동 처리)
function upload() {
    const formData = new FormData();
    // 보이는 파일만 추출해서 append
    document.querySelectorAll('.file-name').forEach(el => {
        formData.append("file", 파일객체);
    });

    fetch('/ajax-upload', {
        method: 'POST',
        body: formData
        // headers 설정 X!
    }).then(res => res.json()).then(data => console.log(data));
}
```

```java
// 서버
@RestController
public class AjaxUploadController {
    @PostMapping("/ajax-upload")
    public Map<String, Object> ajaxUpload(
            @RequestParam("file") List<MultipartFile> files) throws Exception {
        // 처리 후 결과 반환
        return Collections.singletonMap("success", true);
    }
}
```

| 개념 | 핵심 |
|------|------|
| FormData 전송 | `Content-Type` 직접 지정 X |
| 미리보기 | `URL.createObjectURL(file)` |
| 이벤트 위임 | 상위 요소에 이벤트 → `event.target`으로 판별 |

**핵심 키워드:** `#FormData` `#Content-Type미지정` `#URL.createObjectURL` `#이벤트위임` `#Fetch`

---

## 5. 순수 WebSocket 1:N 채팅 구성

```java
// 핸들러
@Component
public class ChatHandler extends TextWebSocketHandler {

    private List<WebSocketSession> sessions = new ArrayList<>();
    private Map<WebSocketSession, String> nickMap = new HashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        // 퇴장 메시지 브로드캐스트
        broadcast(nickMap.get(session) + "님이 퇴장했습니다.");
        nickMap.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();  // getPayload() 사용!

        // 닉네임 등록 (프리픽스 기반)
        if (payload.indexOf("#$nick") != -1) {
            String nick = payload.replace("#$nick", "");
            nickMap.put(session, nick);
            broadcast(nick + "님이 입장했습니다.");
        } else {
            broadcast(nickMap.get(session) + ": " + payload);
        }
    }

    private void broadcast(String msg) throws Exception {
        for (WebSocketSession s : sessions) {
            s.sendMessage(new TextMessage(msg));
        }
    }
}
```

| 오버라이드 메서드 | 시점 | 용도 |
|----------------|------|------|
| `afterConnectionEstablished` | 연결 직후 | 세션 리스트 추가 |
| `afterConnectionClosed` | 연결 종료 | 세션 제거, 퇴장 메시지 |
| `handleTextMessage` | 메시지 수신 | payload 추출 + 분기 |

> `getPayload()` 사용! (toString()과 구분)

**핵심 키워드:** `#TextWebSocketHandler` `#WebSocketSession` `#@EnableWebSocket` `#sendMessage` `#getPayload`

---

## 6. WebSocket 설정 클래스와 프론트 이벤트

```java
// 설정 클래스
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private ChatHandler chatHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatHandler, "/ws/chat")
                .setAllowedOrigins("*");  // CORS 허용
    }
}
```

```javascript
// 프론트 WebSocket 연결
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(protocol + '//' + location.host + '/ws/chat');

ws.onopen = function() {
    // 연결 완료 → 닉네임 등록
    ws.send("#$nick" + nickname);
};

ws.onmessage = function(e) {
    const div = document.createElement('div');
    div.textContent = e.data;
    document.getElementById('chatArea').appendChild(div);
    // 스크롤 자동 이동
    chatArea.scrollTop = chatArea.scrollHeight;
};

ws.onclose = function() { console.log("연결 종료"); };
ws.onerror = function(e) { console.log("에러", e); };

// 전송 전 연결 상태 확인
function sendMessage() {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(document.getElementById('msg').value);
    }
}

// 페이지 종료 시 소켓 닫기 (세션 누수 방지)
window.onbeforeunload = function() {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
};
```

| 이벤트 | 역할 |
|--------|------|
| `onopen` | 연결 성공 → 닉네임 send |
| `onmessage` | 메시지 수신 → DOM append |
| `onclose` | 연결 종료 → UI 리셋 |
| `onerror` | 오류 → 콘솔 로그 |

**핵심 키워드:** `#WebSocketConfigurer` `#registerWebSocketHandlers` `#readyState` `#onmessage` `#context-path`

---

## 오늘의 핵심 요약

1. `file.transferTo()` = 스트림 없이 파일 저장 (과거 스트림 복사 대체)
2. `mkdirs()` = 상위 폴더까지 생성 / `mkdir()` = 단일 폴더만
3. `UUID.randomUUID().toString()` = 파일명 중복 방지
4. 다운로드 = `Content-Disposition: attachment` + `application/octet-stream`
5. 한글 파일명 = `URLEncoder.encode(name, "UTF-8")` 처리
6. FormData 전송 = `Content-Type` 직접 지정 X (브라우저 자동 처리)
7. `URL.createObjectURL(file)` = 이미지 미리보기 임시 URL
8. 이벤트 위임 = 동적 생성 요소 이벤트 처리 (상위 요소에 등록)
9. WebSocket `getPayload()` 사용 (toString() 아님)
10. `ws.readyState === WebSocket.OPEN` = 전송 전 연결 상태 확인 필수
