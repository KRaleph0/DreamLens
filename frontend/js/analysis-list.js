// analysis-list.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 로그인 인증 확인 (공통 모듈)
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const listContainer = document.getElementById('analysis-full-list');
    const sortSelect = document.getElementById('analysis-sort-select');

    // ─────────────────────────────────────────────────────────────────────────
    // 💡 백엔드 AI 분석 결과 연동용 가짜 데이터 (Mock Data)
    //    서버 API가 완성되면 실제 데이터 포맷을 이 구조에 맞추시면 됩니다!
    // ─────────────────────────────────────────────────────────────────────────
    const mockAnalysisList = [
        {
            id: 1,
            type: 'deep', // 'deep': 심층 해석, 'simple': 간단 해몽
            dream_title: '하늘을 날며 무언가로부터 필사적으로 도망치던 꿈',
            created_at: '2026-03-22T10:30:00.000Z'
        },
        {
            id: 2,
            type: 'simple',
            dream_title: '불이 다 꺼진 학교에서 끝없이 이어지는 복도를 걷는 꿈',
            created_at: '2026-03-20T14:15:00.000Z'
        },
        {
            id: 3,
            type: 'deep',
            dream_title: '중요한 시험을 보는데 연필이 통째로 으스러져 움직이지 않는 꿈',
            created_at: '2026-02-15T09:00:00.000Z'
        },
        {
            id: 4,
            type: 'simple',
            dream_title: '넓고 푸른 바다 한가운데에 홀로 둥둥 떠 있는 꿈',
            created_at: '2026-01-05T18:45:00.000Z'
        }
    ];

    let currentData = [];

    // ── 데이터 로드 함수 (백엔드 연동 대응 완비) ──────────────────────────────
    async function loadAnalysisData() {
        try {
            // 🛠️ 백엔드 연동 가이드: API 배포 후 아래 주석을 해제하고 연동하세요!
            /*
            const res = await apiFetch(`${API_BASE}/analysis`);
            if (res && res.ok) {
                currentData = await res.json();
            } else {
                throw new Error("API Fetch Failed");
            }
            */

            // API 배포 전까지 프론트 자체 테스트 및 데모 시연을 위해 가짜 데이터를 바인딩합니다.
            currentData = [...mockAnalysisList];

            // 데이터 로드 성공 시 정렬 후 화면 렌더링
            applySortAndRender();

        } catch (err) {
            console.error("데이터 로드 실패, Fallback 데이터 전환:", err);
            // API 에러 발생 시에도 화면이 깨지지 않고 테스트가 가능하도록 방어 코드 구축
            currentData = [...mockAnalysisList];
            applySortAndRender();
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