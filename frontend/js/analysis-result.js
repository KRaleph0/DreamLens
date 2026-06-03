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

    // ─────────────────────────────────────────────────────────────────────────
    // 💡 백엔드 AI 분석 결과 상세 연동용 가짜 데이터 (Mock Data)
    //    실제 백엔드 DB에 저장될 리포트 상세 데이터 구조의 표준 규격입니다.
    // ─────────────────────────────────────────────────────────────────────────
    const mockDetails = {
        1: {
            type: 'deep',
            dream_title: '하늘을 날며 무언가로부터 필사적으로 도망치던 꿈',
            created_at: '2026-03-22T10:30:00.000Z',
            dream_content: '누군가 뒤에서 검은 그림자가 소리를 지르며 쫓아왔다. 잡히기 직전에 발을 굴렀더니 몸이 붕 뜨며 하늘로 날아올랐다. 아래를 내려다보니 추격자가 계속 나를 노려보고 있어서 심장이 터질 것처럼 두근거리는 상태로 계속 날아 도망쳤다.',
            keywords: ['도망', '하늘', '불안', '추격', '억압'],
            ai_report: '이 꿈은 현재 유저가 직면한 거대한 환경적 압박이나 마감 스트레스가 무의식에 깊이 반영된 결과입니다. \n\n특히 [심층 해석]을 통해 결합된 현실 맥락을 살펴보면, 최근 진행하신 "대규모 웹 서비스 개발 및 밤샘 디버깅" 과정에서 누적된 책임감과 기술적 압박이 꿈속에서 "검은 그림자의 추격"으로 의인화되어 나타난 것으로 분석됩니다. \n\n하늘로 날아오르는 행위는 문제로부터 해방되고 싶은 강한 회피 욕구와 통제력을 되찾으려는 무의식의 시도를 동시에 뜻합니다. 심리적 에너지가 많이 고갈된 상태이니 잠시 강제적인 휴식을 권장합니다.',
            // 심층 해석(deep)일 때만 결합되어 나타날 현실 경험 목록
            experiences: [
                { title: '첫 대규모 웹 서비스 개발과 밤샘 디버깅', category: '개발/업무', date: '2026-06-01' }
            ]
        },
        2: {
            type: 'simple',
            dream_title: '불이 다 꺼진 학교에서 끝없이 이어지는 복도를 걷는 꿈',
            created_at: '2026-03-20T14:15:00.000Z',
            dream_content: '고등학교 시절로 돌아간 것 같았다. 수업이 다 끝난 밤인데 불이 다 꺼진 학교 복도에 혼자 서 있었다. 출구를 찾으려고 계속 걸었지만, 모퉁이를 돌 때마다 똑같은 구조의 어두운 복도가 끝없이 이어져서 결국 밖으로 나가지 못하고 잠에서 깼다.',
            keywords: ['미로', '복도', '학교', '어둠', '고립'],
            ai_report: '이 꿈은 전형적인 "진로 및 목표에 대한 불확실성"을 나타내는 간단 해몽 리포트입니다. \n\n학교라는 공간은 평가와 성장을 상징하며, 불이 꺼진 채 끝없이 이어지는 복도는 현재 진행 중인 과업이나 프로젝트의 결론이 쉽게 보이지 않아 답답함을 느끼는 유저의 현재 심리적 교착 상태를 투영합니다. \n\n단기적인 결과에 연연하기보다, 가벼운 계획 단위로 쪼개어 성취감을 자주 획득하시는 것이 무의식적 막막함을 해소하는 데 큰 도움이 됩니다.',
            experiences: [] // 간단 해몽은 결합된 현실 경험이 없음
        },
        3: {
            type: 'deep',
            dream_title: '중요한 시험을 보는데 연필이 통째로 으스러져 움직이지 않는 꿈',
            created_at: '2026-02-15T09:00:00.000Z',
            dream_content: '시험 시작 종이 울렸고 문제를 풀어야 하는데 필통에 있는 모든 연필과 볼펜이 쥐는 족족 부러지거나 으스러졌다. 주변 사람들은 사각사각 글을 쓰는데 나만 손이 마비된 것처럼 굳어서 아무것도 적지 못해 식은땀을 흘렸다.',
            keywords: ['시험', '불합격', '마비', '도구', '초조'],
            ai_report: '이 리포트는 유저가 가진 "수행 불안(Performance Anxiety)"이 극대화된 상태를 나타냅니다. \n\n현실 맥락인 "중요한 프로젝트 발표 준비" 과정에서 교수님이나 팀원들의 피드백을 완벽하게 수용해야 한다는 강박적 스트레스가 도구의 파손 및 신체 마비라는 꿈의 상징으로 발현되었습니다. \n\n타인의 평가에 지나치게 몰두해 있을 가능성이 높으니, 본인의 역량을 신뢰하고 마인드 컨트롤을 시도하는 것이 시급합니다.',
            experiences: [
                { title: '교수님 피드백 반영을 위한 UI 레이아웃 전면 수정', category: '학업/발표', date: '2026-04-18' }
            ]
        }
    };

    // ── 데이터 상세 로드 함수 ──────────────────────────────────────────────
    async function loadDetailData() {
        if (!analysisId) {
            alert("잘못된 접근입니다. 리포트 ID가 존재하지 않습니다.");
            location.href = "analysis-list.html";
            return;
        }

        try {
            // 🛠️ 백엔드 연동 가이드: API 배포 완료 후 아래 주석을 해제하여 사용하세요!
            /*
            const res = await apiFetch(`${API_BASE}/analysis/${analysisId}`);
            if (res && res.ok) {
                const data = await res.json();
                renderDetail(data);
                return;
            } else {
                throw new Error("API Fetch Failed");
            }
            */

            // API 대기 중에는 상단의 가짜 데이터를 URL 파라미터 ID에 매핑하여 출력합니다.
            const data = mockDetails[analysisId] || mockDetails[1]; // 없을 경우 방어용으로 1번 매핑
            renderDetail(data);

        } catch (err) {
            console.error("리포트 상세 데이터 로드 실패, Fallback 데이터 전환:", err);
            const data = mockDetails[analysisId] || mockDetails[1];
            renderDetail(data);
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