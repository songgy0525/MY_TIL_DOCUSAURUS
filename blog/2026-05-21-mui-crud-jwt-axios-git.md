---
title: "[TIL] MUI CRUD, JWT, Axios 인터셉터, Git"
date: 2026-05-21
tags: [MUI, JWT, Axios, Git]
---
> 부트캠프 백엔드 과정 · 2026.05.21

## 1. MUI DataGrid 삭제 + Snackbar

```javascript
// 삭제 버튼 컬럼 (renderCell)
{
    field: 'actions',
    sortable: false,
    filterable: false,
    renderCell: (params) => (
        <Button onClick={() => handleDelete(params.row)}>삭제</Button>
    )
}

// 삭제 처리
const handleDelete = (row) => {
    const url = row._links.self.href;  // HATEOAS 링크에서 URL 추출
    fetch(url, { method: 'DELETE' })
        .then(res => {
            if (res.ok) {
                fetchCars();         // 재조회
                setSnackOpen(true);  // 알림 표시
            } else {
                alert("삭제 실패");
            }
        });
};

// Snackbar 알림
<Snackbar
    open={snackOpen}
    autoHideDuration={3000}
    onClose={() => setSnackOpen(false)}
    message="삭제되었습니다"
/>
```

**핵심 키워드:** `#MUI DataGrid` `#renderCell` `#getRowId` `#DELETE` `#Snackbar`

---

## 2. Dialog 기반 등록/수정 모달

```javascript
// AddCar 컴포넌트
function AddCar({ onCarAdded }) {
    const [open, setOpen] = useState(false);
    const [car, setCar] = useState({
        brand: '', model: '', color: '', price: ''
    });

    const handleChange = (e) => {
        setCar({ ...car, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        fetch('http://localhost:8080/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(car)
        })
        .then(res => {
            if (res.ok) {
                onCarAdded();          // 부모에서 재조회
                setOpen(false);        // 모달 닫기
                setCar({ brand: '', model: '', color: '', price: '' });  // 초기화
            }
        });
    };

    return (
        <>
            <Button onClick={() => setOpen(true)}>추가</Button>
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>차량 등록</DialogTitle>
                <DialogContent>
                    <TextField name="brand" label="브랜드"
                        value={car.brand} onChange={handleChange} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSave}>저장</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
```

> 모달 닫을 때 입력값 초기화 필수 → 다음 열기 시 이전 값 안 남게

**핵심 키워드:** `#Dialog` `#객체형 useState` `#onChange` `#POST` `#Spring Data REST`

---

## 3. 수정(PUT) 모달 - 기존 값 주입

```javascript
// EditCar - 기존 값으로 초기화
function EditCar({ data, onCarUpdated }) {
    const [open, setOpen] = useState(false);
    const [car, setCar] = useState({});

    const handleOpen = () => {
        // 모달 열 때 기존 row 데이터 주입
        setCar({
            brand: data.row.brand,
            model: data.row.model,
            color: data.row.color,
        });
        setOpen(true);
    };

    const handleUpdate = () => {
        const url = data.row._links.self.href;  // HATEOAS URL
        fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(car)
        })
        .then(res => {
            if (res.ok) {
                onCarUpdated();
                setOpen(false);
            }
        });
    };

    return (
        <>
            {/* onClick 바인딩 주의! */}
            <Button onClick={handleOpen}>수정</Button>
            {/* ... */}
        </>
    );
}
```

### onClick 바인딩 주의

```javascript
// ❌ 렌더링 시점에 즉시 실행됨!
onClick={editCar(id)}

// ✅ 이벤트 발생 시 실행
onClick={() => editCar(id)}
```

**핵심 키워드:** `#PUT` `#props` `#row 데이터` `#disableColumnMenu` `#상태 주입`

---

## 4. Spring Security + JWT 로그인 연동

```javascript
// 로그인
const login = () => {
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => {
        if (res.ok) {
            const token = res.headers.get('Authorization');  // 헤더에서 토큰 추출
            sessionStorage.setItem('token', token);
            setIsLoggedIn(true);
            navigate('/cars');
        } else {
            alert("로그인 실패");
        }
    });
};
```

> `res.headers.get('Authorization')` = `Access-Control-Expose-Headers` 설정 필요

---

## 5. Axios 인터셉터 공통화

```javascript
// api/axiosConfig.js
import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:8080",
    withCredentials: true,
});

// 요청 인터셉터 - JWT 자동 첨부
API.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("token");
    if (token) config.headers.Authorization = token;
    return config;
});

// 응답 인터셉터 - 인증 만료 공통 처리
API.interceptors.response.use(
    (res) => res,
    (err) => {
        if ([401, 403].includes(err.response?.status)) {
            alert("세션이 만료되었습니다");
            sessionStorage.removeItem("token");
            window.location.href = '/';
        }
        return Promise.reject(err);
    }
);

export default API;
```

| 영역 | fetch 방식 | Axios 인터셉터 |
|------|-----------|-------------|
| baseURL | 매 요청마다 작성 | 한 번만 설정 |
| JWT 헤더 | 각 함수에서 직접 추가 | 인터셉터가 자동 처리 |
| 401/403 처리 | 각 요청에서 분기 | 인터셉터에서 공통 처리 |
| 응답 데이터 | `response.json()` 필요 | `response.data` 직접 접근 |

**핵심 키워드:** `#Axios` `#인터셉터` `#baseURL` `#response.data` `#401/403 처리`

---

## 6. Git 기초 용어

| 용어 | 의미 |
|------|------|
| Repository | 코드/이력 관리 공간 |
| Commit | 변경 이력 기록 단위 |
| Branch | 독립 작업 공간 |
| Push/Pull | 원격에 반영/원격에서 가져오기 |
| PR (Pull Request) | 브랜치 병합 요청 |
| Conflict | 동일 파일 충돌 |

```bash
git config --global user.name "이름"
git config --global user.email "이메일"
git add .
git commit -m "feat: 차량 CRUD 완성"
git push origin main
```

**핵심 키워드:** `#SVN` `#Git` `#브랜치` `#스테이징` `#push/pull`

---

## 오늘의 핵심 요약

1. `renderCell` = DataGrid 셀에 버튼 등 커스텀 렌더링
2. `params.row` = 현재 행 데이터 전체 접근
3. Dialog 모달 닫을 때 state 초기화 필수
4. `onClick={fn()}` X → `onClick={() => fn()}` O (렌더링 시 즉시 실행 방지)
5. `res.headers.get('Authorization')` = CORS `exposedHeaders` 설정 필요
6. Axios 인터셉터 = JWT 자동 첨부 + 만료 공통 처리
7. `API.defaults.headers` 또는 인터셉터로 공통 헤더 설정
8. Spring Data REST HATEOAS = `row._links.self.href`에서 URL 추출
9. PUT = 전체 교체 / PATCH = 부분 수정
10. `git commit -m "feat: ..."` = 타입 기반 커밋 메시지 권장
