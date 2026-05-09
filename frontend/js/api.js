// 모든 페이지 공통: 인증 + API 호출 유틸리티

const API_BASE = '/api';

// ── Access Token 관리 ──────────────────────────────────────────
function getAccessToken() { return sessionStorage.getItem('access_token'); }
function saveAccessToken(token) { sessionStorage.setItem('access_token', token); }
function clearAccessToken() { sessionStorage.removeItem('access_token'); }

// ── JWT 만료 확인 ─────────────────────────────────────────────
function getTokenExpiry(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000;
    } catch { return null; }
}

function isTokenExpired(token) {
    const exp = getTokenExpiry(token);
    if (!exp) return true;
    return Date.now() >= exp - 60_000;
}

// ── Access Token 갱신 ──────────────────────────────────────────
let _isRefreshing = false;
let _refreshQueue = [];

async function refreshAccessToken() {
    if (_isRefreshing) {
        return new Promise(resolve => _refreshQueue.push(resolve));
    }
    _isRefreshing = true;
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST', credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        saveAccessToken(data.access_token);
        _refreshQueue.forEach(r => r(data.access_token));
        return data.access_token;
    } catch {
        _refreshQueue.forEach(r => r(null));
        return null;
    } finally {
        _isRefreshing = false;
        _refreshQueue = [];
    }
}

// ── 토큰 자동 갱신 타이머 ──────────────────────────────────────
let _refreshTimer = null;

function scheduleTokenRefresh(token) {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    const exp = getTokenExpiry(token);
    if (!exp) return;
    const delay = exp - Date.now() - 60_000;
    if (delay <= 0) return;
    _refreshTimer = setTimeout(async () => {
        const newToken = await refreshAccessToken();
        if (newToken) scheduleTokenRefresh(newToken);
        else { clearAccessToken(); location.href = _loginHref(); }
    }, delay);
}

function _loginHref() {
    return location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

// ── 로그인 여부 확인 ───────────────────────────────────────────
async function checkAuth() {
    let token = getAccessToken();
    if (token && !isTokenExpired(token)) {
        scheduleTokenRefresh(token);
        return true;
    }
    token = await refreshAccessToken();
    if (token) {
        scheduleTokenRefresh(token);
        return true;
    }
    clearAccessToken();
    location.href = _loginHref();
    return false;
}

// ── 인증 헤더 포함 fetch ───────────────────────────────────────
async function apiFetch(url, options = {}) {
    let token = getAccessToken();
    if (!token || isTokenExpired(token)) {
        token = await refreshAccessToken();
        if (!token) { location.href = _loginHref(); return null; }
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const res = await fetch(url, { ...options, headers, credentials: 'include' });

    if (res.status === 401) {
        token = await refreshAccessToken();
        if (!token) { location.href = _loginHref(); return null; }
        return fetch(url, {
            ...options,
            credentials: 'include',
            headers: { ...headers, 'Authorization': `Bearer ${token}` },
        });
    }

    return res;
}

// ── 로그아웃 ──────────────────────────────────────────────────
async function logout() {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    if (_refreshTimer) clearTimeout(_refreshTimer);
    localStorage.removeItem('userNickname');
    localStorage.removeItem('userProfile');
    clearAccessToken();
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    location.href = _loginHref();
}
