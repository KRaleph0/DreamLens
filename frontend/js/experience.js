// frontend/js/experience.js

document.addEventListener('DOMContentLoaded', () => {
    const expForm = document.getElementById('exp-form');
    const expContent = document.getElementById('exp-content');
    const tokenCalc = document.getElementById('exp-token-calc');
    const expList = document.getElementById('exp-list');

    // 1. 실시간 토큰 수 가계산 (한국어 1글자 ≒ 1.5 토큰으로 임시 계산)
    expContent.addEventListener('input', () => {
        const textLength = expContent.value.length;
        // 나중에 백엔드의 실제 토크나이저 API와 연동될 때까지 임시로 사용하는 공식입니다.
        const estimatedTokens = Math.ceil(textLength * 1.5); 
        tokenCalc.textContent = estimatedTokens;
    });

    // 2. 경험 등록 폼 제출 시 리스트에 추가 (UI 시뮬레이션)
    expForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 입력값 가져오기
        const title = document.getElementById('exp-title').value;
        const timeSelect = document.getElementById('exp-time');
        const timeText = timeSelect.options[timeSelect.selectedIndex].text;
        const content = expContent.value;
        const tokens = tokenCalc.textContent;

        // 새로운 리스트 아이템 HTML 조립
        const newItemHTML = `
            <div class="p-3 border border-secondary-subtle rounded bg-dark position-relative">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0 fw-bold">${title}</h6>
                    <span class="badge bg-secondary">${timeText}</span>
                </div>
                <p class="small text-secondary mb-2 text-truncate">${content}</p>
                <div class="text-end small text-primary-custom fw-bold">${tokens} 토큰</div>
            </div>
        `;

        // 리스트 맨 위(afterbegin)에 추가
        expList.insertAdjacentHTML('afterbegin', newItemHTML);

        // 폼 초기화 (다음 입력을 위해)
        expForm.reset();
        tokenCalc.textContent = '0';
        
        // TODO: 백엔드 API (POST /api/experiences) 연동 시 여기에 fetch 로직 추가
        console.log("백엔드로 전송될 가상 데이터:", { title, timeTag: timeSelect.value, content, tokens });
    });
});