// analysis-result.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 로그인 인증 확인 (공통 모듈)
    const isAuth = await checkAuth();
    if (!isAuth) return;

    // 2. URL 파라미터에서 분석 결과 ID(?id=X) 추출하기
    const urlParams = new URLSearchParams(window.location.search);
    const analysisId = urlParams.get('id');

    const typeBadge = document.getElementById('analysis-type-badge');
    const dateEl = document.getElementById('analysis-date');
    const titleEl = document.getElementById('analysis-title');
    const dreamContentEl = document.getElementById('original-dream-content');
    const expSection = document.getElementById('combined-experience-section');
    const expContainer = document.getElementById('experience-cards-container');
    const keywordsContainer = document.getElementById('analysis-keywords');
    const aiReportEl = document.getElementById('ai-report-text');

    async function loadDetailData() {
        if (!analysisId) {
            alert("잘못된 접근입니다. 리포트 ID가 존재하지 않습니다.");
            location.href = "analysis-list.html";
            return;
        }

        try {
            const res = await apiFetch(`${API_BASE}/analysis/${analysisId}`);
            if (res && res.ok) {
                const data = await res.json();
                renderDetail(data);
            } else {
                throw new Error("API Fetch Failed");
            }
        } catch (err) {
            console.error("리포트 상세 데이터 로드 실패:", err);
            alert("분석 결과를 불러오지 못했습니다.");
            location.href = "analysis-list.html";
        }
    }

    // ── 데이터 바인딩 및 UI 렌더링 함수 ────────────────────────────────────
    function renderDetail(data) {
        // 1. 기본 텍스트 꽂기
        const formattedDate = data.created_at.split('T')[0].replace(/-/g, '.');
        dateEl.textContent = formattedDate;
        titleEl.textContent = data.dream_title;
        dreamContentEl.textContent = data.dream_content;
        aiReportEl.textContent = data.ai_report;

        // 2. 타입 배지 분기 처리 (심층 해석 vs 간단 해몽)
        if (data.type === 'deep') {
            typeBadge.textContent = '🔮 AI 심층 해석 리포트';
            typeBadge.className = 'badge bg-primary fs-6';

            // 심층 해석일 때만 결합된 현실 경험 영역 활성화
            expSection.classList.remove('d-none');
            renderExperiences(data.experiences);
        } else {
            typeBadge.textContent = '✨ AI 간단 해몽 리포트';
            typeBadge.className = 'badge bg-info text-dark fs-6';
            expSection.classList.add('d-none'); // 간단 해몽일 땐 숨김
        }

        // 3. 키워드 해시태그 렌더링
        if (data.keywords && data.keywords.length > 0) {
            keywordsContainer.innerHTML = data.keywords.map(kw =>
                `<span class="badge bg-secondary p-2 fw-medium"># ${kw}</span>`
            ).join('');
        } else {
            keywordsContainer.innerHTML = '';
        }
    }

    // ── 심층 해석 전용: 결합 경험 카드 생성 함수 ───────────────────────────
    function renderExperiences(exps) {
        if (!exps || exps.length === 0) {
            expContainer.innerHTML = '<div class="text-center py-3 text-secondary small">결합된 현실 경험 정보가 없습니다.</div>';
            return;
        }

        expContainer.innerHTML = exps.map(exp => `
            <div class="card bg-black border-secondary shadow-sm">
                <div class="card-body p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-warning text-dark me-2" style="font-size: 0.7rem;">${exp.category}</span>
                        <span class="text-light-emphasis small fw-bold">${exp.title}</span>
                    </div>
                    <small class="text-secondary">${exp.date}</small>
                </div>
            </div>
        `).join('');
    }

    // 초기화 실행
    loadDetailData();
});