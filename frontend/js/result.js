// result.js — Task A 간단 해몽 결과 뷰어 (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const diaryId = new URLSearchParams(window.location.search).get('diaryId');
    if (!diaryId) {
        alert('잘못된 접근입니다.');
        location.href = '../index.html';
        return;
    }

    const res = await apiFetch(`${API_BASE}/diary/${diaryId}`);
    if (!res || !res.ok) {
        alert('꿈일기 정보를 불러올 수 없습니다.');
        location.href = '../index.html';
        return;
    }

    const diary = await res.json();

    if (!diary.task_a_result) {
        alert('아직 해몽 분석이 완료되지 않았습니다.\n꿈일기 상세 페이지에서 분석을 먼저 실행해주세요.');
        location.href = `diary-detail.html?id=${diaryId}`;
        return;
    }

    const ta = diary.task_a_result;

    // 날짜 표시
    document.getElementById('dream-date').textContent = `${diary.date} 기록된 꿈`;
    document.getElementById('analysis-date').textContent = '간단 해몽 완료';

    // 키워드 렌더링
    const primary   = ta.primary_keywords   ?? ta.keywords            ?? [];
    const secondary = ta.secondary_keywords ?? ta.secondaryKeywords   ?? [];
    const tertiary  = ta.tertiary_keywords  ?? ta.tertiaryKeywords    ?? [];

    renderKeywordBadges('keyword-primary',   primary,   'bg-danger');
    renderKeywordBadges('keyword-secondary', secondary, 'bg-warning text-dark');
    renderKeywordBadges('keyword-tertiary',  tertiary,  'bg-secondary');

    // 해석 결과
    const interpretation = ta.interpretation ?? ta.summary ?? '';
    document.getElementById('interpretation-content').innerHTML =
        interpretation.replace(/\n/g, '<br>') || '해석 결과가 없습니다.';
});

function renderKeywordBadges(containerId, keywords, badgeClass) {
    const container = document.getElementById(containerId);
    if (!keywords || keywords.length === 0) {
        container.innerHTML = '<span class="text-secondary small">-</span>';
        return;
    }
    container.innerHTML = keywords
        .map(kw => `<span class="badge ${badgeClass} fs-6">${kw}</span>`)
        .join('');
}
