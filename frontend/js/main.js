// index.html 전용 로직 (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    // 상단 UI 업데이트
    const nickname = localStorage.getItem('userNickname') || '사용자';
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `${nickname}님, 어제는 어떤 꿈을 꾸셨나요?`;

    const avatar = document.getElementById('profile-avatar');
    if (avatar) {
        const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        if (savedProfile.profileImage) {
            avatar.innerHTML = `<img src="${savedProfile.profileImage}" class="rounded-circle" style="width:100%; height:100%; object-fit:cover;">`;
            avatar.classList.remove('bg-primary');
        } else {
            avatar.textContent = nickname.charAt(0).toUpperCase();
        }
    }

    const logoutBtn = document.getElementById('logout-btn') || document.querySelector('button.btn-outline-light');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => { e.preventDefault(); logout(); };
    }

    // 최근 꿈일기 목록
    const dreamListEl = document.getElementById('recent-dreams-list');
    if (dreamListEl) {
        try {
            const res = await apiFetch(`${API_BASE}/diary`);
            if (!res || !res.ok) throw new Error();
            const diaries = await res.json();
            const recent = diaries.slice(0, 3);

            if (recent.length === 0) {
                dreamListEl.innerHTML = `
                    <div class="text-center py-5 text-secondary">
                        <p>아직 기록된 꿈이 없습니다.</p>
                        <a href="./pages/diary-form.html" class="btn btn-sm btn-outline-primary">첫 일기 쓰기</a>
                    </div>
                `;
            } else {
                dreamListEl.innerHTML = recent.map(d => `
                    <div class="card bg-dark border-secondary mb-3 shadow-sm dream-card"
                         style="cursor: pointer;" onclick="location.href='pages/diary-detail.html?id=${d.id}'">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-primary-subtle text-primary">${d.date}</span>
                                <small class="text-secondary">상세보기 &gt;</small>
                            </div>
                            <p class="card-text text-truncate text-light-emphasis">${d.content}</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch {
            dreamListEl.innerHTML = '<div class="text-center py-4 text-secondary small">불러오기 실패</div>';
        }
    }

    // 최근 경험 기록 목록
    const expListEl = document.getElementById('recent-experience-list');
    if (expListEl) {
        try {
            const res = await apiFetch(`${API_BASE}/experience`);
            if (!res || !res.ok) throw new Error();
            const exps = await res.json();
            const recent = exps.slice(0, 3);

            if (recent.length === 0) {
                expListEl.innerHTML = '<div class="text-center py-4 text-secondary small">기록된 경험이 없습니다.</div>';
            } else {
                expListEl.innerHTML = recent.map(exp => `
                    <div class="card bg-dark border-secondary mb-2 shadow-sm hover-glow-warning"
                         style="cursor: pointer;" onclick="location.href='pages/experience-detail.html?id=${exp.id}'">
                        <div class="card-body p-3 d-flex justify-content-between align-items-center">
                            <span class="text-light-emphasis small text-truncate" style="max-width: 70%;">${exp.title}</span>
                            <span class="badge bg-secondary" style="font-size: 0.7rem;">${exp.time_text || ''}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch {
            expListEl.innerHTML = '<div class="text-center py-4 text-secondary small">불러오기 실패</div>';
        }
    }
});

function showDreamDetail(id) {
    location.href = `pages/diary-detail.html?id=${id}`;
}
