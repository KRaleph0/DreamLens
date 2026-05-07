// frontend/js/main.js

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
async function refreshAccessToken() {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST', credentials: 'include',
        });
        if (!res.ok) return null;
        const data = await res.json();
        saveAccessToken(data.access_token);
        return data.access_token;
    } catch { return null; }
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
        else { clearAccessToken(); location.href = 'pages/login.html'; }
    }, delay);
}

// ── 로그인 여부 확인 ───────────────────────────────────────────
async function checkAuth() {
    let token = getAccessToken();

    if (token && !isTokenExpired(token)) {
        scheduleTokenRefresh(token);
        return true;
    }

    // access token 없거나 만료 → refresh token 쿠키로 재발급 시도
    token = await refreshAccessToken();
    if (token) {
        scheduleTokenRefresh(token);
        return true;
    }

    clearAccessToken();
    location.href = 'pages/login.html';
    return false;
}

// ── 로그아웃 ──────────────────────────────────────────────────
async function logout() {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    if (_refreshTimer) clearTimeout(_refreshTimer);
    localStorage.removeItem('userNickname');
    localStorage.removeItem('userProfile');
    clearAccessToken();

    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}

    location.href = 'pages/login.html';
}

// ── 상세 보기 함수 (조회 기능 - Alert 제거 후 링크 이동) ────────────────
function showDreamDetail(id) {
    location.href = `pages/diary-detail.html?id=${id}`;
}

// ── 메인 실행 로직 (통합 리스너) ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 인증 체크 (백엔드 문지기)
    const isAuth = await checkAuth();
    if (!isAuth) return;

    // 2. 상단 UI 업데이트 (환영 문구 & 아바타)
    const nickname = localStorage.getItem('userNickname') || '사용자';
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `${nickname}님, 어제는 어떤 꿈을 꾸셨나요?`;

    const avatar = document.getElementById('profile-avatar');
    if (avatar) {
        // 프로필 이미지가 저장되어 있다면 이미지로, 없으면 이니셜로 표시
        const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        if (savedProfile.profileImage) {
            avatar.innerHTML = `<img src="${savedProfile.profileImage}" class="rounded-circle" style="width:100%; height:100%; object-fit:cover;">`;
            avatar.classList.remove('bg-primary');
        } else {
            avatar.textContent = nickname.charAt(0).toUpperCase();
        }
    }

    // 3. 로그아웃 버튼 이벤트 바인딩
    const logoutBtn = document.getElementById('logout-btn') || document.querySelector('button.btn-outline-light');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            logout();
        };
    }

    // 🌟 4. 꿈일기 목록 렌더링 (사라졌던 배열 기반 로직 복구)
    const listContainer = document.getElementById('recent-dreams-list');
    if (listContainer) {
        const dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');

        if (dreamList.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 text-secondary">
                    <p>아직 기록된 꿈이 없습니다.</p>
                    <a href="./pages/diary-form.html" class="btn btn-sm btn-outline-primary">첫 일기 쓰기</a>
                </div>
            `;
        } else {
            // 저장된 배열을 순회하며 카드 UI 생성
            listContainer.innerHTML = dreamList.map(dream => `
                <div class="card bg-dark border-secondary mb-3 shadow-sm dream-card" 
                     style="cursor: pointer;" onclick="showDreamDetail(${dream.id})">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-primary-subtle text-primary">${dream.date}</span>
                            <small class="text-secondary">상세보기 &gt;</small>
                        </div>
                        <p class="card-text text-truncate text-light-emphasis">${dream.content}</p>
                    </div>
                </div>
            `).join('');
        }
    }
});