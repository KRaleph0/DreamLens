# DreamLens — AI 꿈 해석 & 꿈일기 서비스

꿈일기와 현실의 경험 기록을 결합해 LLM으로 꿈을 해석하고, 기간별 꿈 키워드 통계로 심리 패턴을 분석해 주는 웹 서비스입니다.

- **개발 기간**: 2026.03 ~ 2026.06
- **팀 구성**: 팀 프로젝트 (본인: 백엔드·인프라·AI 연동 / 팀원: 프론트엔드 UI 등)
- **원본 저장소**: GitLab (팀 저장소) → 포트폴리오용으로 GitHub에 이관

> 이 저장소에서 **KRaleph0**(커밋 작성자 `KRaleph0`, `pagan`, `Aleph` — 모두 본인)은
> **백엔드 전체, 인프라, AI 추론 서버(RunPod) 연동, 프론트엔드–API 연동**을 담당했습니다.
> 자세한 내용은 [내 역할](#-내-역할-kraleph0) 참고.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| 꿈일기 CRUD | 꿈 내용 작성·수정·삭제, 목록/상세 조회 |
| 경험 기록 | 현실에서 겪은 사건·감정 기록, LLM으로 한줄 요약 자동 생성 (Task C) |
| 간단 해몽 (Task A) | 꿈일기 저장 시 백그라운드로 LLM 해몽 + 키워드 추출 |
| 심층 해석 (Task D) | 꿈 + 선택한 경험들을 묶어 맥락 기반 해석 |
| 기간별 종합 분석 (Task B-1/B-2) | 1주/1개월/3개월 단위 키워드 통계 → 티어별 분석 → 최종 종합 리포트 |
| 회원 인증 | JWT Access + Refresh Token(HttpOnly 쿠키), 자동 로그인, reCAPTCHA v3 |
| 마이페이지 | 프로필 조회/수정 |

## 기술 스택

| 영역 | 기술 |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), asyncpg, Pydantic v2, httpx |
| Auth | python-jose (JWT), passlib/bcrypt, Google reCAPTCHA v3 |
| Database | PostgreSQL 16 |
| AI 추론 | RunPod Serverless (`runsync` API) |
| Infra | Docker, Docker Compose, Cloudflare Tunnel |
| Frontend | Vanilla JS, HTML, CSS |

## 아키텍처

```
[Browser]  Vanilla JS (api.js: fetch 래퍼 + 토큰 자동 갱신)
    │  HTTPS (Cloudflare Tunnel)
    ▼
[dreamlens-api]  FastAPI (Docker)
    ├─ routers/   auth · diary · experience · analysis · user
    ├─ runpod.py  RunPodTask (Strategy 패턴) ── HTTPS ──▶ [RunPod Serverless LLM]
    └─ SQLAlchemy async
    │
    ▼
[dreamlens-db]  PostgreSQL 16 (Docker, healthcheck)
```

---

## 🙋 내 역할 (KRaleph0)

전체 73개 커밋 중 **26개(merge 제외)**, 코드 기준 약 **+3,700 / −1,350 라인**(venv 제외)을 작성했습니다.
백엔드·DB·인프라 코드는 전부 직접 설계/구현했고, 프론트엔드는 팀원이 만든 UI에 **실제 API를 연동**하는 작업을 맡았습니다.

### 1. 인프라 구축 (2026.03 ~ 04)
- `docker-compose.yml`로 **PostgreSQL + FastAPI** 컨테이너 구성, DB `healthcheck` 기반 기동 순서 제어 (`2349a86`, `d458bb6`, `3b2838c`)
- 백엔드 `Dockerfile` / `.dockerignore` 작성, 외부 네트워크(`dreamlens-net`)로 Cloudflare Tunnel과 연결
- 초기 Oracle XE 설정에서 **PostgreSQL로 전환**, `.env.example` 기반 환경변수 관리 체계 정리
- 팀원용 로컬 실행 가이드 [LOCAL_SETUP.md](LOCAL_SETUP.md) 작성 (`f6b6a75`)

### 2. DB 설계
- [db/schema.sql](db/schema.sql) — `users`, `refresh_tokens`, `dreams`, `experiences`, `analysis_a/b/d`, 경험–분석 매핑 테이블 등 **9개 테이블** 설계 (`3b2838c`)

### 3. 인증 시스템 (`01f462e`, `d9c620f`, `a817e61`, `4d13c4b`)
- bcrypt 비밀번호 해싱, **JWT Access Token + Refresh Token** 발급
- Refresh Token은 **SHA-256 해시로 DB 저장**, 클라이언트에는 HttpOnly 쿠키로 전달
- 자동 로그인(Remember me) 지원
- 프론트엔드에 **401 발생 시 토큰 자동 갱신 + 갱신 중 동시 요청 대기열 처리** 구현 (중복 refresh 방지)
- 회원가입/로그인에 **reCAPTCHA v3** 점수 검증 추가 (로컬 개발 시 자동 bypass)

### 4. 꿈일기 · 경험 REST API (`ec41bb3`)
- `diary`, `experience` 라우터 CRUD 및 `get_current_user_id` 의존성으로 사용자별 데이터 격리
- 프론트엔드가 **localStorage 기반 목업**으로 동작하던 것을 공통 `api.js` 래퍼를 만들어 **전 페이지 실제 API 호출로 전환** (29개 파일, +1,240 라인)

### 5. AI 추론 서버 연동 — RunPod (`86764bc`, `3f92393`, `76dd3c2`, `61ac2d0`)
- RunPod Serverless 호출 모듈 [backend/app/runpod.py](backend/app/runpod.py) 구현
- Task A/B/C/D 별 호출을 **Strategy 패턴(`RunPodTask` 추상 클래스 + 구체 Task 클래스)** 으로 리팩토링 → 새 분석 태스크 추가 시 클래스 하나만 추가하면 되도록 구조화
- 오래 걸리는 LLM 호출은 `BackgroundTasks`로 비동기 처리하고, `pending / done / failed` **상태 필드**로 진행 상황을 UI에 표시
- 서버 재시작 시 `pending` 상태로 남은 경험 요약 작업을 **startup 훅에서 자동 재큐잉** (`lifespan`)
- 요약 실패 시 재시도 버튼 제공 (`4346829`)

### 6. 분석 기능 (Task B · D) (`810fe84`, `61ac2d0`, `695c011`)
- **심층 해석(Task D)**: 사용자가 선택한 경험들을 DB에서 조회해 하나의 `experience_block`으로 구성해 꿈과 함께 LLM에 전달
- **기간별 분석(Task B-1/B-2)**: 기간(1주/1개월/3개월) 내 꿈 키워드를 `Counter`로 집계 → 카테고리(감정·상징·배경·인물 등) 매핑 → 티어(Primary/Secondary/Tertiary)별 통계 블록 생성 → 최종 종합 분석
- 모델 명세 변경(키워드 필드명 변경 등)에 맞춰 API 스키마 재정렬 및 통계 로직 수정
- 분석 결과 조회/목록 API, 마이페이지 프로필 API 구현

### 7. 운영 · 버그 수정
- 프론트엔드 스크립트 **캐시 버스팅(버전 쿼리)** 적용으로 배포 후 구버전 JS 문제 해결 (`47bac42`)
- 오류 메시지 처리 개선, RunPod 응답 검증(`output` 누락 시 상세 에러) 추가

### 팀원 기여
- **Lecpia** — 프론트엔드 UI/UX 전반 (메인 대시보드, 꿈일기/경험 작성·목록·상세, 분석 결과 화면, 마이페이지, 모달 등)
- **여용기** — GitLab 팀 저장소 생성

---

## 디렉토리 구조

```
dreamlens/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI 앱, lifespan(테이블 생성·pending 재처리)
│       ├── config.py        # pydantic-settings 환경변수
│       ├── database.py      # async engine / session
│       ├── dependencies.py  # 인증 의존성
│       ├── runpod.py        # RunPod Strategy 패턴 클라이언트
│       ├── constants.py     # 꿈 키워드 → 카테고리 매핑
│       ├── models/          # SQLAlchemy 모델
│       ├── schemas/         # Pydantic 스키마
│       └── routers/         # auth, diary, experience, analysis, user
├── db/schema.sql
├── frontend/                # index.html, pages/, js/, css/
├── docker-compose.yml
└── LOCAL_SETUP.md
```

## 실행 방법

```bash
cp .env.example .env         # DB / JWT / RunPod / reCAPTCHA 값 입력
docker network create dreamlens-net
docker compose up -d --build
```

로컬 개발 환경 상세는 [LOCAL_SETUP.md](LOCAL_SETUP.md) 참고.
