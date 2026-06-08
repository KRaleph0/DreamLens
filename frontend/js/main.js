// index.html 전용 로직 (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    // ── 1. 상단 UI 업데이트 (웰컴 메시지 & 프로필 아바타) ─────────────────
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

    // ── 2. 최근 꿈일기 목록 불러오기 (최신순 3개) ─────────────────────────
    const dreamListEl = document.getElementById('recent-dreams-list');
    if (dreamListEl) {
        try {
            const res = await apiFetch(`${API_BASE}/diary`);
            if (!res || !res.ok) throw new Error();
            const diaries = await res.json();

            // [정렬 보정] 최신 등록순(내림차순) 정렬 후 상위 3개 자르기
            diaries.sort((a, b) => new Date(b.created_at || b.createdAt || b.date) - new Date(a.created_at || a.createdAt || a.date));
            const recent = diaries.slice(0, 3);

            if (recent.length === 0) {
                dreamListEl.innerHTML = `
                    <div class="text-center py-5 text-secondary">
                        <p>아직 기록된 꿈이 없습니다.</p>
                        <a href="./pages/diary-form.html" class="btn btn-sm btn-outline-primary">첫 일기 쓰기</a>
                    </div>
                `;
            } else {
                dreamListEl.innerHTML = recent.map(d => {
                    const displayDate = d.date || (d.created_at || d.createdAt || '').split('T')[0] || '날짜 없음';
                    return `
                    <div class="card bg-dark border-secondary mb-3 shadow-sm dream-card hover-lift"
                         style="cursor: pointer; transition: transform 0.2s;"
                         onmouseover="this.style.transform='translateY(-3px)'"
                         onmouseout="this.style.transform='translateY(0)'"
                         onclick="location.href='pages/diary-detail.html?id=${d.id}'">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-primary-subtle text-primary">${displayDate}</span>
                                <small class="text-secondary">상세보기 &gt;</small>
                            </div>
                            <p class="card-text text-truncate text-light-emphasis">${d.content}</p>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        } catch {
            dreamListEl.innerHTML = '<div class="text-center py-4 text-secondary small">불러오기 실패</div>';
        }
    }

    // ── 3. 최근 경험 기록 목록 불러오기 (최신순 3개) ───────────────────────
    const expListEl = document.getElementById('recent-experience-list');
    if (expListEl) {
        try {
            const res = await apiFetch(`${API_BASE}/experience`);
            if (!res || !res.ok) throw new Error();
            const exps = await res.json();

            // [정렬 보정] 최신 등록순 정렬 후 상위 3개 자르기
            exps.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
            const recent = exps.slice(0, 3);

            if (recent.length === 0) {
                expListEl.innerHTML = '<div class="text-center py-4 text-secondary small">기록된 경험이 없습니다.</div>';
            } else {
                expListEl.innerHTML = recent.map(exp => `
                    <div class="card bg-dark border-secondary mb-2 shadow-sm hover-glow-warning"
                         style="cursor: pointer; transition: transform 0.2s;"
                         onmouseover="this.style.transform='translateY(-3px)'"
                         onmouseout="this.style.transform='translateY(0)'"
                         onclick="location.href='pages/experience-detail.html?id=${exp.id}'">
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

    // ── 4. 최근 AI 분석 결과 목록 불러오기 (최신순 3개) ──────────────────────
    const analysisListEl = document.getElementById('recent-analysis-list');
    if (analysisListEl) {
        try {
            const res = await apiFetch(`${API_BASE}/analysis`);
            if (!res || !res.ok) throw new Error();
            let analysisData = await res.json();

            analysisData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const recent = analysisData.slice(0, 3);

            if (recent.length === 0) {
                analysisListEl.innerHTML = '<div class="text-center py-4 text-secondary small">아직 완료된 AI 분석 결과가 없습니다.</div>';
            } else {
                analysisListEl.innerHTML = recent.map(an => {
                    const dateStr = an.created_at.split('T')[0].replace(/-/g, '.');
                    const typeLabel = an.type === 'deep' ? '[심층 해석]' : '[간단 해몽]';
                    const detailLink = `pages/analysis-result.html?id=${an.id}`;

                    return `
                    <div class="card bg-dark border-secondary mb-2 shadow-sm hover-lift"
                         style="cursor: pointer; transition: transform 0.2s;"
                         onmouseover="this.style.transform='translateY(-3px)'"
                         onmouseout="this.style.transform='translateY(0)'"
                         onclick="location.href='${detailLink}'">
                        <div class="card-body p-3 d-flex justify-content-between align-items-center">
                            <span class="text-light-emphasis small text-truncate" style="max-width: 75%;">${typeLabel} ${an.dream_title || ''}</span>
                            <span class="text-secondary small ms-2" style="min-width: 70px; text-align: right;">${dateStr}</span>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error("AI 분석 결과 로드 실패:", err);
            analysisListEl.innerHTML = '<div class="text-center py-3 text-secondary small">데이터를 불러오지 못했습니다.</div>';
        }
    }
});

function showDreamDetail(id) {
    location.href = `pages/diary-detail.html?id=${id}`;
}