// analysis-list.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 로그인 인증 확인 (공통 모듈)
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const listContainer = document.getElementById('analysis-full-list');
    const sortSelect = document.getElementById('analysis-sort-select');

    let currentData = [];

    async function loadAnalysisData() {
        try {
            const res = await apiFetch(`${API_BASE}/analysis`);
            if (res && res.ok) {
                currentData = await res.json();
            } else {
                throw new Error("API Fetch Failed");
            }
            applySortAndRender();
        } catch (err) {
            console.error("분석 목록 로드 실패:", err);
            listContainer.innerHTML = '<div class="text-center py-5 text-secondary">분석 결과를 불러오지 못했습니다.</div>';
        }
    }

    // ── 정렬 및 렌더링 처리 함수 ──────────────────────────────────────────
    function applySortAndRender() {
        const sortType = sortSelect.value;

        // 정렬 조건 제어 (최신순 vs 오래된순)
        if (sortType === 'latest') {
            currentData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortType === 'oldest') {
            currentData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }

        renderList(currentData);
    }

    // ── HTML 동적 카드 생성 함수 ──────────────────────────────────────────
    function renderList(items) {
        if (!items || items.length === 0) {
            listContainer.innerHTML = '<div class="text-center py-5 text-secondary">완료된 AI 분석 리포트 이력이 없습니다.</div>';
            return;
        }

        listContainer.innerHTML = items.map(item => {
            // 날짜 포맷 변환 (ISO 스트링 -> YYYY.MM.DD)
            const dateStr = item.created_at.split('T')[0].replace(/-/g, '.');

            // 타입 분류 라벨링
            const typeLabel = item.type === 'deep' ? '[심층 해석]' : '[간단 해몽]';

            // ✨ 라우팅 버그 수정 완료: 작성 폼 화면(a, d)이 아닌, 최종 상세 결과를 보여주는 analysis-result.html로 경로 강제 통일!
            const detailLink = `analysis-result.html?id=${item.id}`;

            return `
                <div class="card bg-dark border-secondary mb-2 shadow-sm hover-lift"
                     style="cursor: pointer; transition: transform 0.2s;"
                     onmouseover="this.style.transform='translateY(-2px)'"
                     onmouseout="this.style.transform='translateY(0)'"
                     onclick="location.href='${detailLink}'">
                    <div class="card-body p-3 d-flex justify-content-between align-items-center">
                        <div class="text-truncate" style="max-width: 80%;">
                            <span class="text-primary-custom fw-bold small me-2">${typeLabel}</span>
                            <span class="text-light-emphasis small fw-bold">${item.dream_title}</span>
                        </div>
                        <span class="text-secondary small ms-2" style="min-width: 85px; text-align: right;">${dateStr}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── 이벤트 바인딩 ──────────────────────────────────────────────────────
    sortSelect.addEventListener('change', applySortAndRender);

    // 최초 화면 진입 시 로드 실행
    loadAnalysisData();
});