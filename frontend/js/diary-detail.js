// diary-detail.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const urlParams  = new URLSearchParams(window.location.search);
    const dreamId    = parseInt(urlParams.get('id'));
    const container  = document.getElementById('detail-container');
    const actionBtns = document.getElementById('action-buttons');
    const analysisBtnsContainer = document.getElementById('analysis-buttons');

    const taskAModal   = new bootstrap.Modal(document.getElementById('taskAModal'));
    const loadingUI    = document.getElementById('taskA-loading');
    const resultUI     = document.getElementById('taskA-result');
    const keywordBox   = document.getElementById('taskA-keywords');
    const secKeywordBox = document.getElementById('taskA-secondary-keywords');
    const terKeywordBox = document.getElementById('taskA-tertiary-keywords');
    const summaryBox   = document.getElementById('taskA-summary');

    const res = await apiFetch(`${API_BASE}/diary/${dreamId}`);
    if (!res || !res.ok) {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <h5>존재하지 않거나 삭제된 꿈일기입니다.</h5>
                <button class="btn btn-primary-custom mt-3" onclick="location.href='diary-list.html'">목록으로 돌아가기</button>
            </div>
        `;
        return;
    }

    let dream = await res.json();

    container.innerHTML = `
        <div class="mb-4 d-flex justify-content-between align-items-center">
            <span class="badge bg-primary-subtle text-primary px-3 py-2 fs-6">기록일: ${dream.date}</span>
        </div>
        <div class="diary-paper p-4 p-md-5 rounded shadow-sm text-light-emphasis">
            ${dream.content.replace(/\n/g, '<br>')}
        </div>
    `;
    actionBtns.style.setProperty('display', 'flex', 'important');

    function populateResultUI(resultData) {
        keywordBox.innerHTML    = resultData.keywords.map(kw => `<span class="badge bg-primary-subtle text-primary">${kw}</span>`).join('');
        secKeywordBox.innerHTML = resultData.secondaryKeywords.map(kw => `<span class="badge border border-secondary text-secondary">${kw}</span>`).join('');
        terKeywordBox.innerHTML = resultData.tertiaryKeywords.map(kw => `<span class="badge border border-secondary text-secondary" style="font-size: 0.65rem;">${kw}</span>`).join('');
        summaryBox.textContent  = resultData.summary;
    }

    function renderAnalysisButtons() {
        if (dream.task_a_result) {
            analysisBtnsContainer.innerHTML = `
                <button id="btn-taskA" class="btn btn-primary-custom shadow-sm">✨ 간단 해몽 결과 보기</button>
                <button class="btn btn-outline-info shadow-sm" onclick="location.href='analysis-d.html?dreamId=${dreamId}'">🔍 심층 해석 분석하기</button>
            `;
        } else {
            analysisBtnsContainer.innerHTML = `
                <button id="btn-taskA" class="btn btn-outline-primary shadow-sm">✨ 간단 해몽 분석하기</button>
                <button class="btn btn-outline-info shadow-sm" onclick="location.href='analysis-d.html?dreamId=${dreamId}'">🔍 심층 해석 분석하기</button>
            `;
        }
        document.getElementById('btn-taskA').addEventListener('click', handleTaskAClick);
    }

    renderAnalysisButtons();

    function handleTaskAClick() {
        taskAModal.show();

        if (dream.task_a_result) {
            loadingUI.classList.add('d-none');
            resultUI.classList.remove('d-none');
            populateResultUI(dream.task_a_result);
            return;
        }

        loadingUI.classList.remove('d-none');
        resultUI.classList.add('d-none');

        // TODO: 실제 AI API 연동 시 이 부분 교체
        setTimeout(() => {
            const mockResult = {
                keywords: ['하늘', '비행', '자유', '해방감'],
                secondaryKeywords: ['구름', '시원한 바람', '새'],
                tertiaryKeywords: ['파란색', '높은 곳', '빠른 속도'],
                summary: '현재 억눌린 상황이나 스트레스에서 벗어나 자유를 갈망하고 있는 심리가 강하게 반영된 꿈입니다. 새로운 도전을 하기에 좋은 심리 상태입니다.',
            };
            dream.task_a_result = mockResult;
            loadingUI.classList.add('d-none');
            resultUI.classList.remove('d-none');
            populateResultUI(mockResult);
            renderAnalysisButtons();
        }, 3000);
    }

    document.getElementById('btn-delete').addEventListener('click', async () => {
        if (!confirm('정말 이 꿈일기를 삭제하시겠습니까?\n(분석 결과도 함께 삭제됩니다)')) return;
        const res = await apiFetch(`${API_BASE}/diary/${dreamId}`, { method: 'DELETE' });
        if (!res || (res.status !== 204 && !res.ok)) { alert('삭제에 실패했습니다.'); return; }
        alert('삭제가 완료되었습니다.');
        location.href = 'diary-list.html';
    });

    document.getElementById('btn-edit').addEventListener('click', () => {
        location.href = `diary-form.html?editId=${dreamId}`;
    });
});
