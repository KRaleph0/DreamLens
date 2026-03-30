// frontend/js/result.js

document.addEventListener('DOMContentLoaded', () => {
    // 지금은 하드코딩된 HTML을 보여주지만, 나중에는 아래처럼 백엔드 API에서 데이터를 받아와서 화면에 뿌려주는 로직이 들어갑니다.
    
    // TODO: 백엔드 API 연동 (GET /api/analysis/{analysis_id})
    /*
    const analysisId = new URLSearchParams(window.location.search).get('id');
    
    fetch(`/api/analysis/${analysisId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                renderKeywords(data.data.keywords);
                document.getElementById('interpretation-content').innerHTML = data.data.interpretation;
            }
        });
    */

    console.log("분석 결과 화면 로드 완료. (API 연동 대기 중)");
});

// 키워드 티어별로 색상을 다르게 렌더링하는 헬퍼 함수 (PB-032)
function renderKeywords(keywordsArray) {
    const container = document.getElementById('keyword-container');
    container.innerHTML = ''; // 기존 내용 비우기

    keywordsArray.forEach(kw => {
        let badgeClass = 'bg-secondary'; // 기본값 T(배경)
        
        if (kw.tier === 'P') {
            badgeClass = 'bg-danger'; // 핵심은 빨간색
        } else if (kw.tier === 'S') {
            badgeClass = 'bg-warning text-dark'; // 보조는 노란색
        }

        const span = document.createElement('span');
        span.className = `badge ${badgeClass} fs-6`;
        span.textContent = `${kw.tier}: ${kw.word}`;
        
        container.appendChild(span);
    });
}