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

document.addEventListener('DOMContentLoaded', () => {
    // 1. 로그인 여부 확인 및 닉네임 표시
    const nickname = localStorage.getItem('userNickname') || '여행자';
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `${nickname}님, 어제는 어떤 꿈을 꾸셨나요?`;

    // 2. 로그아웃 버튼 기능 연결
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("로그아웃 하시겠습니까?")) {
                // 깡통 로직: 로컬 스토리지 비우기 (실제로는 세션/토큰 삭제)
                localStorage.removeItem('userNickname');
                localStorage.removeItem('isLoggedIn'); // 로그인 상태값 예시
                
                alert("로그아웃 되었습니다. 안전하게 대기실로 이동합니다.");
                location.href = './pages/login.html';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 1. 로그인 여부 확인 및 닉네임 가져오기
    const nickname = localStorage.getItem('userNickname') || '사용자';
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `${nickname}님, 어제는 어떤 꿈을 꾸셨나요?`;

    // 🌟 [추가된 부분] 프로필 아바타에 닉네임 첫 글자 넣기
    const avatar = document.getElementById('profile-avatar');
    if (avatar) {
        // 닉네임의 첫 글자만 떼어서 대문자로 변환해 넣음
        avatar.textContent = nickname.charAt(0).toUpperCase(); 
    }

    // 2. 로그아웃 버튼 기능
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("로그아웃 하시겠습니까?")) {
                localStorage.removeItem('userNickname');
                localStorage.removeItem('isLoggedIn'); 
                
                alert("안전하게 로그아웃 되었습니다.");
                location.href = './pages/login.html';
            }
        });
    }
    
    // ... (이후 꿈일기 목록 렌더링 로직 등등) ...
});