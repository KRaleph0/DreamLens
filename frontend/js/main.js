// frontend/js/main.js

const API_BASE = '/api';

// ── Access Token 관리 ────────────────────────────────────────
function getAccessToken() {
    return sessionStorage.getItem('access_token');
}

function saveAccessToken(token) {
    sessionStorage.setItem('access_token', token);
}

function clearAccessToken() {
    sessionStorage.removeItem('access_token');
}

// ── Access Token 갱신 (Refresh Token 쿠키 사용) ──────────────
async function refreshAccessToken() {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',  // Refresh Token 쿠키 자동 포함
        });
        if (!res.ok) return null;
        const data = await res.json();
        saveAccessToken(data.access_token);
        return data.access_token;
    } catch {
        return null;
    }
}

// ── 인증 fetch (401 시 자동 갱신) ───────────────────────────
async function authFetch(path, options = {}) {
    let token = getAccessToken();

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
        credentials: 'include',
    });

    // 401이면 토큰 갱신 후 재시도
    if (res.status === 401) {
        token = await refreshAccessToken();
        if (!token) {
            // 갱신 실패 → 로그인 페이지로
            clearAccessToken();
            location.href = 'pages/login.html';
            return null;
        }
        return fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
            credentials: 'include',
        });
    }

    return res;
}

// ── 로그아웃 ─────────────────────────────────────────────────
async function logout() {
    await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });
    clearAccessToken();
    location.href = 'pages/login.html';
}

// ── 로그인 여부 확인 ─────────────────────────────────────────
async function checkAuth() {
    let token = getAccessToken();

    if (!token) {
        // Access Token 없으면 Refresh Token으로 갱신 시도
        token = await refreshAccessToken();
        if (!token) {
            location.href = 'pages/login.html';
            return false;
        }
    }
    return true;
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    // 로그아웃 버튼 연동
    const logoutBtn = document.querySelector('button.btn-outline-light');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // TODO: 최근 꿈일기 목록 API 연동 (Sprint 1 완료 후)
    // loadRecentDreams();

    // TODO: 최근 분석 결과 API 연동 (Sprint 3 완료 후)
    // loadRecentAnalysis();
});