# 로컬 개발 환경 설정

## 요구사항

- Docker Desktop
- Python 3.11+
- VS Code + [Live Server 확장](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

---

## 1단계 — .env 파일 생성

프로젝트 루트에 `.env` 파일을 생성합니다.

```env
# DB
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dreamlens
DB_USER=dreamlens
DB_PASSWORD=비밀번호_설정

# JWT
JWT_SECRET_KEY=32자_이상_랜덤_문자열
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI (RunPod)
RUNPOD_API_KEY=발급받은_API_키

# CORS
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

> JWT_SECRET_KEY 생성: `openssl rand -hex 32`
>
> DB_PORT: 로컬에 PostgreSQL이 이미 설치되어 5432를 사용 중이라면 `5433`으로 변경하고
> docker-compose.yml의 ports를 `"5433:5432"`로 수정하세요.

---

## 2단계 — frontend API 주소 변경

로컬에서는 nginx 없이 직접 uvicorn에 요청해야 합니다.

**`frontend/js/api.js`** 와 **`frontend/js/auth.js`** 의 첫 번째 상수를 변경:

```js
// 변경 전
const API_BASE = '/api';

// 변경 후
const API_BASE = (['localhost', '127.0.0.1'].includes(location.hostname) && location.port && location.port !== '80')
    ? 'http://localhost:8000'
    : '/api';
```

> 커밋 전에 반드시 원래대로 되돌리세요.

---

## 3단계 — backend config 경로 변경

**`backend/app/config.py`** 의 `env_file` 수정:

```python
# 변경 전
env_file = "/home/aleph/projects/dreamlens/.env"

# 변경 후
env_file = ("/home/aleph/projects/dreamlens/.env", "../../.env", "../.env", ".env")
```

> 커밋 전에 반드시 원래대로 되돌리세요.

---

## 4단계 — DB 컨테이너 실행

```bash
docker network create dreamlens-net   # 최초 1회만
docker compose up db -d
```

---

## 5단계 — 백엔드 실행

`backend/` 디렉토리 안에서 실행:

```bash
cd backend
pip install -r requirements.txt   # 최초 1회만
uvicorn app.main:app --reload --port 8000
```

터미널에 `DB 연결 성공!` 이 출력되면 정상입니다.

---

## 6단계 — 프론트엔드 실행

VS Code에서 `frontend/index.html` 우클릭 → **Open with Live Server**

브라우저가 `http://127.0.0.1:5500` 으로 열리면 준비 완료입니다.

---

## 주의사항

| 항목 | 내용 |
|------|------|
| `.env` 수정 후 | uvicorn 수동 재시작 필요 (`--reload`는 Python 파일만 감지) |
| 커밋 전 | 2단계, 3단계에서 변경한 파일 원래대로 복구 |
| `.env` | git에 올라가지 않도록 `.gitignore` 확인 |
