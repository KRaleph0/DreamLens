// analysis-b.js (api.js가 먼저 로드되어야 함)

const TOTAL_BUDGET = 1500;

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const expListContainer = document.getElementById('exp-selection-list');
    const btnStart = document.getElementById('btn-start-analysis');

    document.getElementById('total-budget-display').textContent = TOTAL_BUDGET;

    let expList = [];

    // ── 경험 목록 로드 ─────────────────────────────
    try {
        const expRes = await apiFetch(`${API_BASE}/experience`);
        if (expRes && expRes.ok) expList = await expRes.json();
    } catch {
        expListContainer.innerHTML = '<div class="text-center py-4 text-secondary">불러오기에 실패했습니다.</div>';
        return;
    }

    if (expList.length === 0) {
        expListContainer.innerHTML = `
            <div class="text-center py-4 bg-dark border border-secondary rounded" style="transform: none !important;">
                <p class="text-secondary small mb-3">등록된 경험 기록이 없습니다.</p>
                <a href="experience-form.html" class="btn btn-sm btn-warning" style="color: #111;">경험 기록하러 가기</a>
            </div>
        `;
        return;
    }

    expList.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

    // ── 경험 카드 렌더링 ──────────────────────────────────────────
    expListContainer.innerHTML = expList.map(exp => {
        const contentTokens = parseInt(exp.tokens) || Math.ceil(exp.content.length * 1.5);
        const summaryTokens = exp.summary ? Math.ceil(exp.summary.length * 1.5) : Math.ceil(contentTokens * 0.3);
        const summaryDisabled = exp.status === 'pending' ? 'disabled' : '';
        const summaryLabel = exp.status !== 'pending' ? `요약본 (${summaryTokens}t)` : '요약 생성중 ⏳';

        const createdDate = new Date(exp.created_at || exp.createdAt);
        const year = createdDate.getFullYear();
        const month = String(createdDate.getMonth() + 1).padStart(2, '0');
        const day = String(createdDate.getDate()).padStart(2, '0');
        const dateString = isNaN(createdDate.getTime()) ? '' : `${year}-${month}-${day}`;

        return `
        <!-- ✨ 개별 경험 카드 전체에만 확실하게 호버 효과 적용! -->
        <div class="exp-item card bg-dark border-secondary p-3 mb-2 hover-lift" 
             style="cursor: pointer; transition: transform 0.2s;"
             onmouseover="this.style.transform='translateY(-3px)'"
             onmouseout="this.style.transform='translateY(0)'"
             data-exp-id="${exp.id}" data-date="${dateString}"
             data-content-tokens="${contentTokens}" data-summary-tokens="${summaryTokens}">
            <div class="d-flex align-items-start gap-3">
                <div class="pt-1">
                    <input type="checkbox" class="exp-checkbox form-check-input" id="exp-cb-${exp.id}" style="width: 1.2rem; height: 1.2rem;">
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="fw-bold mb-0 user-select-none" for="exp-cb-${exp.id}" style="cursor: pointer;">${exp.title}</label>
                        <span class="badge bg-secondary" style="font-size: 0.7rem;">${dateString}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-secondary">원문 ~${contentTokens} 토큰</small>
                    </div>
                    <div class="mode-buttons mt-2 gap-2 flex-wrap" role="group">
                        <input type="radio" class="btn-check type-radio" name="mode-${exp.id}" id="mode-original-${exp.id}" value="original" checked>
                        <label class="btn btn-sm btn-outline-secondary" for="mode-original-${exp.id}">원문</label>

                        <input type="radio" class="btn-check type-radio" name="mode-${exp.id}" id="mode-summary-${exp.id}" value="summary" ${summaryDisabled}>
                        <label class="btn btn-sm btn-outline-info ${summaryDisabled ? 'opacity-50' : ''}" for="mode-summary-${exp.id}">${summaryLabel}</label>

                        <input type="radio" class="btn-check type-radio" name="mode-${exp.id}" id="mode-compress-${exp.id}" value="compress">
                        <label class="btn btn-sm btn-outline-warning" for="mode-compress-${exp.id}">자동압축</label>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // ── 이벤트 바인딩 & 토큰 예산 관리 ────────────
    document.querySelectorAll('.exp-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetTag = e.target.tagName.toLowerCase();
            if (targetTag === 'input' || targetTag === 'label') return;
            const cb = item.querySelector('.exp-checkbox');
            if (cb && !cb.disabled) {
                cb.checked = !cb.checked;
                handleBudgetChange(cb);
            }
        });
    });

    document.querySelectorAll('.exp-checkbox, .btn-check').forEach(el => {
        el.addEventListener('change', (e) => handleBudgetChange(e.target));
    });

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

        if (fixedTokens > TOTAL_BUDGET) {
            if (targetElement && targetElement.type === 'checkbox' && targetElement.checked) {
                targetElement.closest('.exp-item').querySelector('input[value="compress"]').checked = true;
                return handleBudgetChange(targetElement.closest('.exp-item').querySelector('input[value="compress"]'));
            } else if (targetElement && targetElement.type === 'radio') {
                alert(`⚠️ 예산 초과!\n해당 모드를 선택하면 최대 예산(${TOTAL_BUDGET} 토큰)을 초과합니다.`);
                targetElement.closest('.exp-item').querySelector('input[value="compress"]').checked = true;
                return renderBudgetUI();
            }
        }
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
        });

        const remaining = Math.max(0, TOTAL_BUDGET - fixedTokens);
        let compressEstTotal = 0;

        if (compressItems.length > 0) {
            const compressEstPerItem = Math.floor(remaining / compressItems.length);
            compressItems.forEach(item => {
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
    }

    // ── 날짜 필터 로직 ─────────────────────────────────────────────
    const dateFilterInput = document.getElementById('exp-date-filter');
    document.getElementById('btn-clear-filter').addEventListener('click', () => {
        dateFilterInput.value = '';
        applyDateFilter();
    });
    dateFilterInput.addEventListener('change', applyDateFilter);

    function applyDateFilter() {
        const filterDate = dateFilterInput.value;
        document.querySelectorAll('.exp-item').forEach(item => {
            item.style.display = (!filterDate || item.dataset.date === filterDate) ? '' : 'none';
        });
    }

    // ── 분석 시작 버튼 클릭 ───────────────────────
    btnStart.addEventListener('click', async () => {
        const selectedPeriod = document.querySelector('input[name="period"]:checked').value;
        const resultSection = document.getElementById('analysis-result-section');
        const aiResultText = document.getElementById('ai-synthesis-result');

        btnStart.disabled = true;
        btnStart.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> 데이터 집계 및 AI 분석 중...';

        // 선택된 경험 정보 수집
        const checked = [...document.querySelectorAll('.exp-checkbox:checked')];
        const experiences = checked.map(cb => {
            const item = cb.closest('.exp-item');
            const mode = item.querySelector('.btn-check:checked').value;
            const id = parseInt(item.dataset.expId);
            const exp = expList.find(e => e.id === id);
            let text;
            if (mode === 'original') text = exp.content;
            else if (mode === 'summary') text = exp.summary || exp.content;
            else text = exp.content; // compress: 별도 압축 미수행, 원문 전달
            return { exp_id: id, title: exp.title, text, mode, time_text: exp.time_text || '' };
        });

        try {
            const res = await apiFetch(`${API_BASE}/analysis/broad`, {
                method: 'POST',
                body: JSON.stringify({ period: selectedPeriod, experiences }),
            });

            if (!res || !res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'API 오류');
            }

            const data = await res.json();
            const periodText = selectedPeriod === '1w' ? '최근 1주일' : selectedPeriod === '1m' ? '최근 1개월' : '최근 3개월';

            resultSection.classList.remove('d-none');
            btnStart.style.display = 'none';
            renderCharts(data.keyword_freq || [], data.categories || []);

            aiResultText.innerHTML = `
                <p><strong>[${periodText}]</strong> 동안 기록된 꿈과 경험을 종합 분석한 결과입니다.</p>
                <p>${data.ai_report.replace(/\n/g, '<br>')}</p>
            `;
        } catch (err) {
            btnStart.disabled = false;
            btnStart.innerHTML = '🔮 AI 종합 분석 시작';
            alert(`AI 분석 중 오류가 발생했습니다.\n${err.message}`);
        }
    });

    // ── Chart.js 렌더링 함수 ─────────────────────────────────────────────
    // kwFreq: [{keyword, count}, ...]  categories: [{name, percentage}, ...]
    let barChartInstance = null;
    let doughnutChartInstance = null;

    const CAT_COLORS = ['#dc3545', '#198754', '#0dcaf0', '#6c757d', '#ffc107', '#6f42c1'];

    function renderCharts(kwFreq, categories) {
        Chart.defaults.color = '#adb5bd';

        // ── 키워드 막대 차트 ──────────────────────────────
        const barCtx = document.getElementById('keywordBarChart').getContext('2d');
        if (barChartInstance) barChartInstance.destroy();

        const barLabels = kwFreq.length > 0 ? kwFreq.map(k => k.keyword) : ['데이터 없음'];
        const barData   = kwFreq.length > 0 ? kwFreq.map(k => k.count)   : [0];

        barChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: barLabels,
                datasets: [{
                    label: '등장 횟수',
                    data: barData,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // ── 카테고리 도넛 차트 ──────────────────────────────
        const doughnutCtx = document.getElementById('categoryDoughnutChart').getContext('2d');
        if (doughnutChartInstance) doughnutChartInstance.destroy();

        const catLabels = categories.length > 0 ? categories.map(c => c.name)       : ['분석 결과 없음'];
        const catData   = categories.length > 0 ? categories.map(c => c.percentage) : [100];
        const catColors = categories.length > 0
            ? CAT_COLORS.slice(0, categories.length)
            : ['#6c757d'];

        doughnutChartInstance = new Chart(doughnutCtx, {
            type: 'doughnut',
            data: {
                labels: catLabels,
                datasets: [{
                    data: catData,
                    backgroundColor: catColors,
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                cutout: '70%'
            }
        });
    }
});