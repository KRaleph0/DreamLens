// frontend/js/experience.js (목록 전용 로직)

document.addEventListener('DOMContentLoaded', () => {
    const expListContainer = document.getElementById('exp-list');

    // 데이터 불러오기
    let experienceData = JSON.parse(localStorage.getItem('experienceList') || '[]');

    function renderList() {
        // 데이터가 없을 때의 UI
        if (experienceData.length === 0) {
            expListContainer.innerHTML = `
                <div class="text-center py-5 bg-dark border border-secondary rounded shadow-sm">
                    <p class="text-secondary mb-3">아직 등록된 경험 기록이 없습니다.</p>
                    <a href="experience-form.html" class="btn btn-warning fw-bold" style="color: #212529;">첫 경험 기록하기</a>
                </div>
            `;
            return;
        }

        // 목록 그리기
        expListContainer.innerHTML = experienceData.map(exp => `
            <div class="p-4 border border-secondary-subtle rounded bg-dark position-relative hover-glow"
                 style="cursor: pointer;"
                 onclick="location.href='experience-detail.html?id=${exp.id}'">
                
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0 fw-bold">${exp.title}</h5>
                    <div>
                        ${exp.status === 'pending' ? '<span class="badge bg-warning text-dark me-1">요약 생성 중 ⏳</span>' : '<span class="badge bg-success me-1">요약 완료</span>'}
                        <span class="badge bg-secondary">${exp.timeText}</span>
                    </div>
                </div>
                
                <p class="text-secondary mb-3" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6;">
                    ${exp.content}
                </p>
                
                <div class="text-end small text-warning fw-bold">${exp.tokens} 토큰</div>
            </div>
        `).join('');
    }

    // 초기 화면 그리기
    renderList();
});