// frontend/js/main.js

const API_BASE = '/api';

// ── Access Token 관리 (백엔드 인프라) ──────────────────────────
function getAccessToken() { return sessionStorage.getItem('access_token'); }
function saveAccessToken(token) { sessionStorage.setItem('access_token', token); }
function clearAccessToken() { sessionStorage.removeItem('access_token'); }

// ── Access Token 갱신 (백엔드 인프라) ──────────────────────────
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

// ── 로그아웃 처리 ─────────────────────────────────────────────
async function logout() {
    if (!confirm("로그아웃 하시겠습니까?")) return;

    // 1. 프론트엔드 임시 데이터 삭제 (✨ sessionStorage 추가)
    localStorage.removeItem('userNickname');
    localStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('isLoggedIn');
    clearAccessToken();

    // 2. 백엔드 세션 종료 시도
    try {
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
        console.log("로컬 테스트: API 로그아웃 생략");
    }

    alert("로그아웃 되었습니다.");
    location.href = 'pages/login.html';
}

// ── 로그인 여부 확인 (깡통 + 백엔드 융합) ───────────────────────
async function checkAuth() {
    // ✨ [변경] 자동(local) 또는 일회성(session) 둘 중 하나라도 true면 통과
    if (localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true') {
        return true;
    }

    let token = getAccessToken();
    if (!token) {
        token = await refreshAccessToken();
        if (!token) {
            location.href = 'pages/login.html';
            return false;
        }
    }
    return true;
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

// ── [추가] 최근 경험 기록 3개 렌더링 ──
const recentExpList = document.getElementById('recent-experience-list');
if (recentExpList) {
    const expData = JSON.parse(localStorage.getItem('experienceList') || '[]');
    const recentExps = expData.slice(0, 3); // 최신 3개만 자르기

    if (recentExps.length === 0) {
        recentExpList.innerHTML = '<div class="text-center py-4 text-secondary small">기록된 경험이 없습니다.</div>';
    } else {
        recentExpList.innerHTML = recentExps.map(exp => `
                <div class="card bg-dark border-secondary mb-2 shadow-sm hover-glow-warning" 
                     style="cursor: pointer;" 
                     onclick="location.href='pages/experience-detail.html?id=${exp.id}'">
                    <div class="card-body p-3 d-flex justify-content-between align-items-center">
                        <span class="text-light-emphasis small text-truncate" style="max-width: 70%;">${exp.title}</span>
                        <span class="badge bg-secondary" style="font-size: 0.7rem;">${exp.timeText}</span>
                    </div>
                </div>
            `).join('');
    }
}