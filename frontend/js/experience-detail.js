// experience-detail.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const urlParams  = new URLSearchParams(window.location.search);
    const expId      = parseInt(urlParams.get('id'));
    const container  = document.getElementById('detail-container');
    const actionBtns = document.getElementById('action-buttons');

    const res = await apiFetch(`${API_BASE}/experience/${expId}`);
    if (!res || !res.ok) {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <h5>존재하지 않거나 삭제된 기록입니다.</h5>
                <button class="btn btn-primary-custom mt-3" onclick="location.href='experience-list.html'">목록으로 돌아가기</button>
            </div>
        `;
        return;
    }

    const exp    = await res.json();
    const tokens = Math.ceil(exp.content.length * 1.5);

    const statusBadge = exp.status === 'pending'
        ? '<span class="badge bg-warning text-dark me-2">요약 생성 중 ⏳</span>'
        : exp.status === 'failed'
        ? `<span class="badge bg-danger me-2">요약 실패 ⚠️</span>
           <button id="btn-retry-summary" class="btn btn-sm btn-outline-warning me-2">재시도</button>`
        : '<span class="badge bg-success me-2">요약 완료</span>';

    container.innerHTML = `
        <div class="mb-4 d-flex justify-content-between align-items-start">
            <div>
                <h2 class="fw-bold mb-2">${exp.title}</h2>
                <span class="badge bg-secondary me-2">${exp.time_text || ''}</span>
                <span class="text-secondary small">${new Date(exp.created_at).toLocaleDateString()} 등록</span>
            </div>
            <div class="text-end">
                ${statusBadge}
                <div class="text-primary-custom fw-bold small mt-2">${tokens} 토큰</div>
            </div>
        </div>
        <div class="exp-paper p-4 p-md-5 rounded shadow-sm text-light-emphasis">
            ${exp.content.replace(/\n/g, '<br>')}
        </div>
        ${exp.summary ? `
        <div class="mt-4 p-3 bg-dark border border-success border-opacity-25 rounded">
            <h6 class="text-success mb-2 fw-bold">✨ AI 요약</h6>
            <p class="small text-light-emphasis mb-0">${exp.summary}</p>
        </div>
        ` : ''}
    `;
    actionBtns.style.setProperty('display', 'flex', 'important');

    if (exp.status === 'failed') {
        document.getElementById('btn-retry-summary').addEventListener('click', async () => {
            const btn = document.getElementById('btn-retry-summary');
            btn.disabled = true;
            btn.textContent = '재시도 중...';
            const r = await apiFetch(`${API_BASE}/experience/${expId}/summarize`, { method: 'POST' });
            if (r && r.ok) {
                alert('요약 재요청이 완료됐습니다. 잠시 후 새로고침해주세요.');
            } else {
                alert('재시도 요청에 실패했습니다.');
                btn.disabled = false;
                btn.textContent = '재시도';
            }
        });
    }

    document.getElementById('btn-delete').addEventListener('click', async () => {
        if (!confirm('이 경험 기록을 삭제하시겠습니까?')) return;
        const res = await apiFetch(`${API_BASE}/experience/${expId}`, { method: 'DELETE' });
        if (!res || (res.status !== 204 && !res.ok)) { alert('삭제에 실패했습니다.'); return; }
        alert('삭제되었습니다.');
        location.href = 'experience-list.html';
    });

    document.getElementById('btn-edit').addEventListener('click', () => {
        location.href = `experience-form.html?editId=${expId}`;
    });
});
