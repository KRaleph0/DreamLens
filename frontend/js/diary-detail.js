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
        const primary   = resultData.primary_keywords   ?? resultData.keywords            ?? [];
        const secondary = resultData.secondary_keywords ?? resultData.secondaryKeywords   ?? [];
        const tertiary  = resultData.tertiary_keywords  ?? resultData.tertiaryKeywords    ?? [];
        const summary   = resultData.interpretation     ?? resultData.summary             ?? '';

        keywordBox.innerHTML    = primary.map(kw => `<span class="badge bg-primary-subtle text-primary">${kw}</span>`).join('');
        secKeywordBox.innerHTML = secondary.map(kw => `<span class="badge border border-secondary text-secondary">${kw}</span>`).join('');
        terKeywordBox.innerHTML = tertiary.map(kw => `<span class="badge border border-secondary text-secondary" style="font-size: 0.65rem;">${kw}</span>`).join('');
        summaryBox.textContent  = summary;
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

    let _pollTimer = null;
    let _pollTimeout = null;

    function _stopPoll() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
        if (_pollTimeout) { clearTimeout(_pollTimeout); _pollTimeout = null; }
    }

    async function handleTaskAClick() {
        taskAModal.show();

        if (dream.task_a_result) {
            loadingUI.classList.add('d-none');
            resultUI.classList.remove('d-none');
            populateResultUI(dream.task_a_result);
            return;
        }

        loadingUI.classList.remove('d-none');
        resultUI.classList.add('d-none');
        _stopPoll();

        // 분석 시작 (즉시 202 반환 — 결과를 기다리지 않음)
        const startRes = await apiFetch(`${API_BASE}/diary/${dreamId}/analyze`, { method: 'POST' });
        if (!startRes || (startRes.status !== 202 && !startRes.ok)) {
            loadingUI.classList.add('d-none');
            alert('해몽 분석 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        // 5초마다 GET /diary/{id} 폴링
        _pollTimer = setInterval(async () => {
            const res = await apiFetch(`${API_BASE}/diary/${dreamId}`);
            if (!res || !res.ok) return;
            const updated = await res.json();
            if (updated.task_a_result) {
                _stopPoll();
                dream.task_a_result = updated.task_a_result;
                loadingUI.classList.add('d-none');
                resultUI.classList.remove('d-none');
                populateResultUI(dream.task_a_result);
                renderAnalysisButtons();
            }
        }, 5000);

        // 5분 후 타임아웃
        _pollTimeout = setTimeout(() => {
            _stopPoll();
            if (!dream.task_a_result) {
                loadingUI.classList.add('d-none');
                alert('해몽 분석이 오래 걸리고 있습니다. 잠시 후 다시 시도해주세요.');
            }
        }, 300000);
    }

    // 모달 닫으면 폴링 정지
    document.getElementById('taskAModal').addEventListener('hidden.bs.modal', _stopPoll);

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
