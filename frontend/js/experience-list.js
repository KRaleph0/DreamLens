// experience-list.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    // 💡 HTML ID도 꿈일기(full-diary-list)와 유사하게 변경
    const listContainer = document.getElementById('full-exp-list');
    const sortSelect = document.getElementById('sort-select');

    let experiences = [];
    try {
        const res = await apiFetch(`${API_BASE}/experience`);
        if (!res || !res.ok) throw new Error();
        experiences = await res.json();
    } catch {
        listContainer.innerHTML = '<div class="text-center py-5 text-secondary">불러오기에 실패했습니다.</div>';
        return;
    }

    // 💡 [로직 통일] 렌더링 전용 함수
    function renderList(list) {
        if (list.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 bg-dark border border-secondary rounded shadow-sm">
                    <p class="text-secondary mb-3">아직 등록된 경험 기록이 없습니다.</p>
                    <a href="experience-form.html" class="btn btn-warning fw-bold" style="color: #212529;">첫 경험 기록하기</a>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = list.map(exp => {
            const createdDate = new Date(exp.created_at || exp.createdAt);
            const dateString = isNaN(createdDate.getTime()) ? '' : createdDate.toISOString().split('T')[0];
            const tokens = exp.tokens || Math.ceil(exp.content.length * 1.5);

            // 💡 [UI 통일] 꿈일기 카드 디자인(hover-lift, 내부 패딩 등) 완벽 이식
            return `
            <div class="card bg-dark border-secondary shadow-sm hover-lift"
                 style="cursor: pointer; transition: transform 0.2s;"
                 onclick="location.href='experience-detail.html?id=${exp.id}'"
                 onmouseover="this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.transform='translateY(0)'">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 class="mb-1 fw-bold text-light">${exp.title}</h5>
                            <span class="badge bg-secondary-subtle text-secondary fs-6 px-3 py-2 mt-1 border border-secondary-subtle">${dateString}</span>
                        </div>
                        <div class="text-end">
                            <div class="mb-1">
                                ${exp.status === 'pending' ? '<span class="badge bg-warning text-dark me-1">요약 생성 중 ⏳</span>' : exp.status === 'failed' ? '<span class="badge bg-danger me-1">요약 실패 ⚠️</span>' : '<span class="badge bg-success me-1">요약 완료</span>'}
                                <span class="badge bg-secondary">${exp.time_text || ''}</span>
                            </div>
                            <small class="text-warning fw-bold">${tokens} 토큰</small>
                        </div>
                    </div>
                    <p class="card-text text-light-emphasis m-0" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6;">
                        ${exp.content}
                    </p>
                </div>
            </div>
            `;
        }).join('');
    }

    // 💡 [로직 통일] 정렬 및 렌더링 호출 함수
    function sortAndRender(sortType) {
        let sorted = [...experiences];

        // 정렬 기준을 생성일(created_at)로 통일
        if (sortType === 'date-desc') {
            sorted.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
        } else if (sortType === 'date-asc') {
            sorted.sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
        } else if (sortType === 'alpha-asc') {
            // 가나다순은 제목(title) 기준 정렬
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        }

        renderList(sorted);
    }

    // 이벤트 리스너 등록 및 최초 렌더링
    sortSelect.addEventListener('change', (e) => sortAndRender(e.target.value));
    sortAndRender(sortSelect.value); // 초기 렌더링 호출
});