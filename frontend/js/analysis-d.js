// analysis-d.js (api.js가 먼저 로드되어야 함)

const TOTAL_BUDGET = 1500;

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const urlParams        = new URLSearchParams(window.location.search);
    const dreamId          = parseInt(urlParams.get('dreamId'));
    const dreamContainer   = document.getElementById('target-dream-container');
    const expListContainer = document.getElementById('exp-selection-list');
    const btnStart         = document.getElementById('btn-start-analysis');
    const budgetPanel      = document.getElementById('token-budget-panel');

    document.getElementById('total-budget-display').textContent = TOTAL_BUDGET;

    let expList = [];

    // ── 꿈일기 로드 ──────────────────────────────────────────────
    const dreamRes = await apiFetch(`${API_BASE}/diary/${dreamId}`);
    if (!dreamRes || !dreamRes.ok) {
        alert('잘못된 접근입니다.');
        history.back();
        return;
    }
    const targetDream = await dreamRes.json();

    dreamContainer.innerHTML = `
        <div class="d-flex justify-content-between mb-2">
            <span class="badge bg-primary-subtle text-primary">${targetDream.date}</span>
        </div>
        <p class="text-light-emphasis mb-0 small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${targetDream.content}
        </p>
    `;

    // ── 경험 목록 로드 ────────────────────────────────────────────
    const expRes = await apiFetch(`${API_BASE}/experience`);
    if (expRes && expRes.ok) expList = await expRes.json();

    if (expList.length === 0) {
        expListContainer.innerHTML = `
            <div class="text-center py-4 bg-dark border border-secondary rounded">
                <p class="text-secondary small mb-3">등록된 경험 기록이 없습니다.</p>
                <a href="experience-form.html" class="btn btn-sm btn-warning" style="color: #111;">경험 기록하러 가기</a>
            </div>
        `;
        return;
    }

    // ── 경험 카드 렌더링 ──────────────────────────────────────────
    expListContainer.innerHTML = expList.map(exp => {
        const contentTokens = Math.ceil(exp.content.length * 1.5);
        const summaryTokens = exp.summary ? Math.ceil(exp.summary.length * 1.5) : 0;
        const summaryDisabled = !exp.summary ? 'disabled' : '';
        const summaryLabel = exp.summary
            ? `한줄요약 (~${summaryTokens}t)`
            : '한줄요약 (생성중)';

        return `
        <div class="exp-item card bg-dark border-secondary p-3"
             data-exp-id="${exp.id}"
             data-content-tokens="${contentTokens}"
             data-summary-tokens="${summaryTokens}"
             data-title="${exp.title.replace(/"/g, '&quot;')}">

            <div class="d-flex align-items-start gap-3">
                <div class="pt-1">
                    <input type="checkbox" class="exp-checkbox form-check-input"
                           id="exp-cb-${exp.id}" style="width: 1.2rem; height: 1.2rem;">
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center">
                        <label class="fw-bold mb-1 user-select-none" for="exp-cb-${exp.id}"
                               style="cursor: pointer;">${exp.title}</label>
                        <span class="badge bg-secondary" style="font-size: 0.7rem;">${exp.time_text || ''}</span>
                    </div>
                    <small class="text-secondary">원문 ~${contentTokens} 토큰</small>
                    ${exp.status === 'pending' ? '<span class="badge bg-warning text-dark ms-2" style="font-size:0.65rem;">요약 생성 중</span>' : ''}

                    <!-- 모드 선택 (체크 시 표시) -->
                    <div class="mode-buttons mt-2 gap-1 flex-wrap" role="group">
                        <input type="radio" class="btn-check" name="mode-${exp.id}"
                               id="mode-original-${exp.id}" value="original" checked>
                        <label class="btn btn-sm btn-outline-secondary"
                               for="mode-original-${exp.id}">원문 (${contentTokens}t)</label>

                        <input type="radio" class="btn-check" name="mode-${exp.id}"
                               id="mode-summary-${exp.id}" value="summary" ${summaryDisabled}>
                        <label class="btn btn-sm btn-outline-info ${summaryDisabled ? 'opacity-50' : ''}"
                               for="mode-summary-${exp.id}">${summaryLabel}</label>

                        <input type="radio" class="btn-check" name="mode-${exp.id}"
                               id="mode-compress-${exp.id}" value="compress">
                        <label class="btn btn-sm btn-outline-warning"
                               for="mode-compress-${exp.id}">자동압축</label>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // ── 이벤트 바인딩 ─────────────────────────────────────────────
    document.querySelectorAll('.exp-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const item = cb.closest('.exp-item');
            item.classList.toggle('checked', cb.checked);
            updateBudget();
        });
    });

    document.querySelectorAll('.btn-check').forEach(radio => {
        radio.addEventListener('change', updateBudget);
    });

    // ── 토큰 예산 업데이트 ────────────────────────────────────────
    function updateBudget() {
        const checked = [...document.querySelectorAll('.exp-checkbox:checked')];

        if (checked.length === 0) {
            budgetPanel.classList.add('d-none');
            btnStart.classList.add('disabled');
            return;
        }

        budgetPanel.classList.remove('d-none');
        btnStart.classList.remove('disabled');

        let fixedTokens   = 0;
        let compressCount = 0;

        checked.forEach(cb => {
            const item   = cb.closest('.exp-item');
            const mode   = item.querySelector('.btn-check:checked').value;
            const cTok   = parseInt(item.dataset.contentTokens);
            const sTok   = parseInt(item.dataset.summaryTokens) || 0;

            if (mode === 'original') fixedTokens += cTok;
            else if (mode === 'summary') fixedTokens += sTok || 50;
            else compressCount++;
        });

        // 자동압축 미확정 토큰: 남은 예산을 n등분으로 추정
        const remaining = TOTAL_BUDGET - fixedTokens;
        const compressEst = compressCount > 0 ? Math.floor(remaining / compressCount) : 0;
        const totalEst    = fixedTokens + (compressCount > 0 ? remaining : 0);

        const pct = Math.min(100, Math.round(totalEst / TOTAL_BUDGET * 100));
        const bar = document.getElementById('budget-bar');
        bar.style.width = `${pct}%`;
        bar.className   = `progress-bar ${pct > 90 ? 'bg-danger' : pct > 70 ? 'bg-warning' : 'bg-info'}`;

        document.getElementById('used-tokens').textContent = totalEst;

        const badge = document.getElementById('compress-count-badge');
        if (compressCount > 0) {
            badge.textContent = `자동압축 ${compressCount}개 (~${compressEst}t/개)`;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }

        const warn = document.getElementById('budget-warning');
        warn.classList.toggle('d-none', totalEst <= TOTAL_BUDGET);
    }

    // ── 분석 시작 ─────────────────────────────────────────────────
    const taskDModal = new bootstrap.Modal(document.getElementById('taskDModal'));

    btnStart.addEventListener('click', async () => {
        const checked = [...document.querySelectorAll('.exp-checkbox:checked')];
        if (checked.length === 0) return;

        // 선택된 경험 및 모드 수집
        let fixedTokens = 0;
        const selections = checked.map(cb => {
            const item = cb.closest('.exp-item');
            const mode = item.querySelector('.btn-check:checked').value;
            const cTok = parseInt(item.dataset.contentTokens);
            const sTok = parseInt(item.dataset.summaryTokens) || 0;
            const id   = parseInt(item.dataset.expId);
            const exp  = expList.find(e => e.id === id);

            if (mode !== 'compress') {
                fixedTokens += mode === 'original' ? cTok : (sTok || 50);
            }
            return { id, mode, exp };
        });

        const compressItems  = selections.filter(s => s.mode === 'compress');
        const remainingBudget = TOTAL_BUDGET - fixedTokens;
        const targetPerItem  = compressItems.length > 0
            ? Math.max(50, Math.floor(remainingBudget / compressItems.length))
            : 0;

        taskDModal.show();

        // 1단계: 자동압축 API 호출
        if (compressItems.length > 0) {
            document.getElementById('taskD-compressing').classList.remove('d-none');
            document.getElementById('taskD-loading').classList.add('d-none');

            for (let i = 0; i < compressItems.length; i++) {
                const item = compressItems[i];
                document.getElementById('compress-progress-text').textContent =
                    `"${item.exp.title}" 압축 중... (${i + 1}/${compressItems.length})`;

                try {
                    const res = await apiFetch(
                        `${API_BASE}/experience/${item.id}/compress`,
                        { method: 'POST', body: JSON.stringify({ target_tokens: targetPerItem }) }
                    );
                    if (res && res.ok) {
                        const data = await res.json();
                        item.compressedText  = data.summary;
                        item.compressedTokens = data.token_count;
                    }
                } catch {
                    // 압축 실패 시 원문으로 fallback
                    item.compressedText  = item.exp.content;
                    item.compressedTokens = parseInt(document.querySelector(`[data-exp-id="${item.id}"]`).dataset.contentTokens);
                }
            }

            document.getElementById('taskD-compressing').classList.add('d-none');
            document.getElementById('taskD-loading').classList.remove('d-none');
        }

        // 2단계: 분석 (현재 mock — Task D AI 연동 시 교체)
        await new Promise(r => setTimeout(r, 2500));

        document.getElementById('taskD-loading').classList.add('d-none');
        document.getElementById('taskD-result').classList.remove('d-none');

        // 사용 경험 목록 렌더링
        const modeLabel = { original: '원문', summary: '한줄요약', compress: '자동압축' };
        document.getElementById('result-exp-list').innerHTML = selections.map(s => {
            let tokInfo = '';
            if (s.mode === 'compress' && s.compressedTokens) {
                tokInfo = `→ ${s.compressedTokens}t 압축`;
            }
            return `<span class="text-light-emphasis small">
                <span class="badge bg-secondary me-1">${modeLabel[s.mode]}</span>
                ${s.exp.title} ${tokInfo}
            </span>`;
        }).join('');

        const expTitles = selections.map(s => s.exp.title).join(', ');
        document.getElementById('result-dream-kw').innerHTML = `
            <span class="badge bg-secondary">자아 성찰</span>
            <span class="badge bg-secondary">불안감</span>
            <span class="badge bg-secondary">새로운 출발</span>
        `;
        document.getElementById('result-exp-link').textContent =
            `선택하신 경험(${expTitles})에서 느꼈던 억눌린 감정이 꿈의 상징들과 강하게 연결되어 나타났습니다.`;
        document.getElementById('result-summary').innerHTML = `
            이 꿈은 단순한 환상이 아니라, 과거의 경험(<strong>${expTitles}</strong>)에서 비롯된 미해결 과제를 무의식이 처리하고 있는 과정입니다.<br><br>
            당시 느꼈던 감정들이 꿈속에서는 과장된 형태로 나타났지만, 이는 본질적으로 당신이 그 상황을 극복하고 한 단계 성장할 준비가 되었다는 긍정적인 신호로 해석됩니다.
        `;
    });
});
