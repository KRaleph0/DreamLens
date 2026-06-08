// analysis-d.js (api.js가 먼저 로드되어야 함)

const TOTAL_BUDGET = 1500;

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const urlParams = new URLSearchParams(window.location.search);
    const dreamId = parseInt(urlParams.get('dreamId'));
    const dreamContainer = document.getElementById('target-dream-container');
    const expListContainer = document.getElementById('exp-selection-list');
    const btnStart = document.getElementById('btn-start-analysis');

    document.getElementById('total-budget-display').textContent = TOTAL_BUDGET;

    const taskDModal = new bootstrap.Modal(document.getElementById('taskDModal'));
    const noExpConfirmModal = new bootstrap.Modal(document.getElementById('noExpConfirmModal'));
    const expDetailModal = new bootstrap.Modal(document.getElementById('expDetailModal'));

    let expList = [];

    // ── 꿈일기 로드 ──────────────────────────────────────────────
    const dreamRes = await apiFetch(`${API_BASE}/diary/${dreamId}`);
    if (!dreamRes || !dreamRes.ok) {
        alert('잘못된 접근입니다. 꿈일기 정보를 불러올 수 없습니다.');
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

    expList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // ── 경험 카드 렌더링 ──────────────────────────────────────────
    expListContainer.innerHTML = expList.map(exp => {
        const contentTokens = parseInt(exp.tokens) || Math.ceil(exp.content.length * 1.5);
        const summaryTokens = exp.summary ? Math.ceil(exp.summary.length * 1.5) : Math.ceil(contentTokens * 0.3);
        const summaryDisabled = exp.status === 'pending' ? 'disabled' : '';
        const summaryLabel = exp.status !== 'pending'
            ? `요약본 (${summaryTokens}t)`
            : '요약 생성중 ⏳';

        const tooltipText = exp.summary ? exp.summary.substring(0, 100).replace(/"/g, '&quot;') + '...' : 'AI가 요약을 생성하는 중입니다.';

        // 1. 내 컴퓨터(KST) 시계 기준으로 날짜 텍스트 조립
        const createdDate = new Date(exp.created_at || exp.createdAt);
        const year = createdDate.getFullYear();
        const month = String(createdDate.getMonth() + 1).padStart(2, '0');
        const day = String(createdDate.getDate()).padStart(2, '0');
        const dateString = isNaN(createdDate.getTime()) ? '' : `${year}-${month}-${day}`;

        // 2. 화면(HTML) 그리기
        return `
        <div class="exp-item card bg-dark border-secondary p-3" title="${tooltipText}"
             data-exp-id="${exp.id}"
             data-date="${dateString}"
             data-content-tokens="${contentTokens}"
             data-summary-tokens="${summaryTokens}"
             data-title="${exp.title.replace(/"/g, '&quot;')}">

            <div class="d-flex align-items-start gap-3">
                <div class="pt-1">
                    <input type="checkbox" class="exp-checkbox form-check-input"
                           id="exp-cb-${exp.id}" style="width: 1.2rem; height: 1.2rem;">
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="fw-bold mb-0 user-select-none" for="exp-cb-${exp.id}"
                               style="cursor: pointer;">${exp.title}</label>
                        <span class="badge bg-secondary" style="font-size: 0.7rem;">${exp.time_text || ''}</span>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-secondary">원문 ~${contentTokens} 토큰</small>
                        <span class="badge border border-info text-info view-exp-btn" data-exp-content="${exp.content.replace(/"/g, '&quot;')}">🔍 원문 보기</span>
                    </div>

                    <div class="mode-buttons mt-3 gap-2 flex-wrap" role="group">
                        <input type="radio" class="btn-check type-radio" name="mode-${exp.id}"
                               id="mode-original-${exp.id}" value="original" checked>
                        <label class="btn btn-sm btn-outline-secondary"
                               for="mode-original-${exp.id}">원문 (${contentTokens}t)</label>

                        <input type="radio" class="btn-check type-radio" name="mode-${exp.id}"
                               id="mode-summary-${exp.id}" value="summary" ${summaryDisabled}>
                        <label class="btn btn-sm btn-outline-info ${summaryDisabled ? 'opacity-50' : ''}"
                               for="mode-summary-${exp.id}">${summaryLabel}</label>

                        <input type="radio" class="btn-check type-radio" name="mode-${exp.id}"
                               id="mode-compress-${exp.id}" value="compress">
                        <label class="btn btn-sm btn-outline-warning"
                               for="mode-compress-${exp.id}">자동압축(C-Ext)</label>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // ── 이벤트 바인딩 ─────────────────────────────────────────────

    // 카드 전체 영역 클릭 시 체크박스 연동
    document.querySelectorAll('.exp-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', (e) => {
            const targetTag = e.target.tagName.toLowerCase();
            if (targetTag === 'input' || targetTag === 'label' || e.target.classList.contains('view-exp-btn')) {
                return;
            }
            const cb = item.querySelector('.exp-checkbox');
            if (cb && !cb.disabled) {
                cb.checked = !cb.checked;
                handleBudgetChange(cb);
            }
        });
    });

    document.querySelectorAll('.view-exp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('expDetailTitle').textContent = e.target.closest('.exp-item').dataset.title;
            document.getElementById('expDetailContent').innerHTML = e.target.dataset.expContent.replace(/\n/g, '<br>');
            expDetailModal.show();
        });
    });

    document.querySelectorAll('.exp-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => handleBudgetChange(e.target));
    });

    document.querySelectorAll('.btn-check').forEach(radio => {
        radio.addEventListener('change', (e) => handleBudgetChange(e.target));
    });

    // ── 토큰 예산 계산 및 방어 로직 ────────────────────

    function handleBudgetChange(targetElement) {
        let fixedTokens = 0;
        const checked = [...document.querySelectorAll('.exp-checkbox:checked')];

        checked.forEach(cb => {
            const item = cb.closest('.exp-item');
            const mode = item.querySelector('.btn-check:checked').value;
            const cTok = parseInt(item.dataset.contentTokens);
            const sTok = parseInt(item.dataset.summaryTokens) || 0;

            if (mode === 'original') fixedTokens += cTok;
            else if (mode === 'summary') fixedTokens += sTok || 50;
        });

        // 🚨 예산 초과 시 방어 로직
        if (fixedTokens > TOTAL_BUDGET) {

            // 💡 [UX 핵심 개선] 체크박스를 눌러서 카드를 처음 열 때 초과한 경우
            if (targetElement && targetElement.type === 'checkbox' && targetElement.checked) {
                // 튕겨내지 말고, 이 카드의 모드를 '자동압축'으로 몰래 바꾼다!
                const compressRadio = targetElement.closest('.exp-item').querySelector('input[value="compress"]');
                compressRadio.checked = true;

                // 사용자에게 친절하게 상황 설명
                alert(`💡 예산 자동 조정\n원문 토큰이 예산을 초과하여 해당 경험이 '자동압축(C-Ext)' 모드로 열렸습니다.`);

                // 모드를 바꿨으니, 바뀐 '자동압축' 라디오 버튼을 기준으로 처음부터 재계산!
                return handleBudgetChange(compressRadio);
            }

            // 💡 이미 카드가 열려있는 상태에서 라디오 버튼(원문/요약)을 직접 눌러서 초과한 경우
            else if (targetElement && targetElement.type === 'radio') {
                alert(`⚠️ 예산 초과!\n해당 모드를 선택하면 최대 예산(${TOTAL_BUDGET} 토큰)을 초과합니다.`);
                // 튕겨내고 안전한 '자동압축'으로 강제 복귀
                targetElement.closest('.exp-item').querySelector('input[value="compress"]').checked = true;
                return renderBudgetUI();
            }
        }

        // 아무 문제 없으면 정상적으로 화면 그리기
        renderBudgetUI();
    }

    function renderBudgetUI() {
        let fixedTokens = 0;
        const compressItems = [];
        const checked = [...document.querySelectorAll('.exp-checkbox:checked')];

        checked.forEach(cb => {
            const item = cb.closest('.exp-item');
            const mode = item.querySelector('.btn-check:checked').value;
            const cTok = parseInt(item.dataset.contentTokens);
            const sTok = parseInt(item.dataset.summaryTokens) || 0;

            if (mode === 'original') fixedTokens += cTok;
            else if (mode === 'summary') fixedTokens += sTok || 50;
            else compressItems.push({ cb, cTok });

            item.classList.add('checked');
        });

        document.querySelectorAll('.exp-checkbox:not(:checked)').forEach(cb => cb.closest('.exp-item').classList.remove('checked'));

        const remaining = Math.max(0, TOTAL_BUDGET - fixedTokens);
        let compressEstTotal = 0;
        let compressEstPerItem = 0;

        if (compressItems.length > 0) {
            compressEstPerItem = Math.floor(remaining / compressItems.length);
            compressItems.forEach(item => {
                // 💡 버그 수정: 분배된 예산이 원문 크기보다 크면 원문 크기까지만 더하도록 상한선 설정!
                compressEstTotal += Math.min(compressEstPerItem, item.cTok);
            });
        }

        const totalEst = fixedTokens + compressEstTotal;
        const pct = Math.min(100, Math.round(totalEst / TOTAL_BUDGET * 100));

        const bar = document.getElementById('budget-bar');
        bar.style.width = `${pct}%`;
        bar.className = `progress-bar ${pct > 90 ? 'bg-danger' : pct > 70 ? 'bg-warning' : 'bg-info'}`;

        const usedTokensEl = document.getElementById('used-tokens');
        usedTokensEl.textContent = totalEst;
        usedTokensEl.className = `fw-bold fs-5 ${pct > 90 ? 'text-danger' : 'text-warning'}`;

        const badge = document.getElementById('compress-count-badge');
        if (compressItems.length > 0) {
            badge.textContent = `자동압축 ${compressItems.length}개 (최대 ~${compressEstPerItem}t/개)`;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }

    // ── 분석 시작 분기 로직 ──────────────────────────────
    btnStart.addEventListener('click', () => {
        const checked = [...document.querySelectorAll('.exp-checkbox:checked')];
        if (checked.length === 0) {
            noExpConfirmModal.show();
        } else {
            executeAnalysis();
        }
    });

    document.getElementById('btn-proceed-no-exp').addEventListener('click', () => {
        noExpConfirmModal.hide();
        executeAnalysis();
    });

    // ── 백엔드 API 연동 분석 로직 ───────────────────────
    async function executeAnalysis() {
        const checked = [...document.querySelectorAll('.exp-checkbox:checked')];

        let fixedTokens = 0;
        const selections = checked.map(cb => {
            const item = cb.closest('.exp-item');
            const mode = item.querySelector('.btn-check:checked').value;
            const cTok = parseInt(item.dataset.contentTokens);
            const sTok = parseInt(item.dataset.summaryTokens) || 0;
            const id = parseInt(item.dataset.expId);
            const exp = expList.find(e => e.id === id);

            if (mode !== 'compress') {
                fixedTokens += mode === 'original' ? cTok : (sTok || 50);
            }
            return { id, mode, exp };
        });

        const compressItems = selections.filter(s => s.mode === 'compress');
        const remainingBudget = TOTAL_BUDGET - fixedTokens;
        const targetPerItem = compressItems.length > 0
            ? Math.max(50, Math.floor(remainingBudget / compressItems.length))
            : 0;

        taskDModal.show();

        // 1단계: compress 모드 경험 압축
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
                        item.compressedText = data.summary;
                        item.compressedTokens = data.token_count;
                    } else {
                        throw new Error('API Failed');
                    }
                } catch {
                    item.compressedText = item.exp.content;
                    item.compressedTokens = parseInt(document.querySelector(`[data-exp-id="${item.id}"]`).dataset.contentTokens);
                }
            }
            document.getElementById('taskD-compressing').classList.add('d-none');
        }

        // 2단계: Task D AI 분석 요청
        document.getElementById('taskD-loading').classList.remove('d-none');

        const experiencePayload = selections.map(s => {
            let text;
            if (s.mode === 'original') text = s.exp.content;
            else if (s.mode === 'summary') text = s.exp.summary || s.exp.content;
            else text = s.compressedText || s.exp.content;

            return {
                exp_id: s.id,
                title: s.exp.title,
                text,
                mode: s.mode,
                time_text: s.exp.time_text || '',
            };
        });

        try {
            const res = await apiFetch(`${API_BASE}/analysis/deep`, {
                method: 'POST',
                body: JSON.stringify({ diary_id: dreamId, experiences: experiencePayload }),
            });

            if (!res || !res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'API 오류');
            }

            const { id: newId } = await res.json();
            location.href = `analysis-result.html?id=${newId}`;
        } catch (err) {
            document.getElementById('taskD-loading').classList.add('d-none');
            alert(`AI 분석 중 오류가 발생했습니다.\n${err.message}`);
        }
    }
    // ── 날짜 필터 로직 (PB-040) ─────────────────────────────────────────────
    const dateFilterInput = document.getElementById('exp-date-filter');
    const btnClearFilter = document.getElementById('btn-clear-filter');

    function applyDateFilter() {
        const filterDate = dateFilterInput.value;

        document.querySelectorAll('.exp-item').forEach(item => {
            const itemDate = item.dataset.date;

            console.log(`선택한 날짜: [${filterDate}], 카드의 날짜: [${itemDate}]`);

            // 필터 날짜가 없거나(비어있거나), 아이템의 날짜와 일치하면 보여주고 아니면 숨김
            if (!filterDate || itemDate === filterDate) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // 달력에서 날짜를 고를 때마다 즉시 필터링
    dateFilterInput.addEventListener('change', applyDateFilter);

    // 초기화 버튼 누르면 원래대로 다 보여주기
    btnClearFilter.addEventListener('click', () => {
        dateFilterInput.value = '';
        applyDateFilter();
    });
});