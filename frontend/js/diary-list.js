// diary-list.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const listContainer = document.getElementById('full-diary-list');
    const sortSelect    = document.getElementById('sort-select');

    let diaries = [];
    try {
        const res = await apiFetch(`${API_BASE}/diary`);
        if (!res || !res.ok) throw new Error();
        diaries = await res.json();
    } catch {
        listContainer.innerHTML = '<div class="text-center py-5 text-secondary">불러오기에 실패했습니다.</div>';
        return;
    }

    function renderList(list) {
        if (list.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 bg-dark border border-secondary rounded shadow-sm">
                    <p class="text-secondary mb-3">아직 작성된 꿈일기가 없습니다.</p>
                    <a href="diary-form.html" class="btn btn-primary-custom">첫 일기 쓰러 가기</a>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = list.map(dream => `
            <div class="card bg-dark border-secondary shadow-sm dream-card hover-lift"
                 style="cursor: pointer; transition: transform 0.2s;"
                 onclick="location.href='diary-detail.html?id=${dream.id}'"
                 onmouseover="this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.transform='translateY(0)'">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-primary-subtle text-primary fs-6 px-3 py-2">${dream.date}</span>
                        <span class="text-secondary small">상세보기 &gt;</span>
                    </div>
                    <p class="card-text text-light-emphasis m-0" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${dream.content}
                    </p>
                </div>
            </div>
        `).join('');
    }

    function sortAndRender(sortType) {
        let sorted = [...diaries];
        if (sortType === 'date-desc') sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
        else if (sortType === 'date-asc') sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
        else if (sortType === 'alpha-asc') sorted.sort((a, b) => a.content.localeCompare(b.content));
        renderList(sorted);
    }

    sortSelect.addEventListener('change', (e) => sortAndRender(e.target.value));
    sortAndRender(sortSelect.value);
});
