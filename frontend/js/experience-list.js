// experience-list.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const expListContainer = document.getElementById('exp-list');

    try {
        const res = await apiFetch(`${API_BASE}/experience`);
        if (!res || !res.ok) throw new Error();
        const experiences = await res.json();

        if (experiences.length === 0) {
            expListContainer.innerHTML = `
                <div class="text-center py-5 bg-dark border border-secondary rounded shadow-sm">
                    <p class="text-secondary mb-3">아직 등록된 경험 기록이 없습니다.</p>
                    <a href="experience-form.html" class="btn btn-warning fw-bold" style="color: #212529;">첫 경험 기록하기</a>
                </div>
            `;
        } else {
            expListContainer.innerHTML = experiences.map(exp => `
                <div class="p-4 border border-secondary-subtle rounded bg-dark position-relative hover-glow"
                     style="cursor: pointer;"
                     onclick="location.href='experience-detail.html?id=${exp.id}'">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="mb-0 fw-bold">${exp.title}</h5>
                        <div>
                            ${exp.status === 'pending' ? '<span class="badge bg-warning text-dark me-1">요약 생성 중 ⏳</span>' : exp.status === 'failed' ? '<span class="badge bg-danger me-1">요약 실패 ⚠️</span>' : '<span class="badge bg-success me-1">요약 완료</span>'}
                            <span class="badge bg-secondary">${exp.time_text || ''}</span>
                        </div>
                    </div>
                    <p class="text-secondary mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6;">
                        ${exp.content}
                    </p>
                    <div class="text-end small text-warning fw-bold">${Math.ceil(exp.content.length * 1.5)} 토큰</div>
                </div>
            `).join('');
        }
    } catch {
        expListContainer.innerHTML = '<div class="text-center py-5 text-secondary">불러오기에 실패했습니다.</div>';
    }
});
