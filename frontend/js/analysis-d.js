// frontend/js/analysis-d.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dreamId = parseInt(urlParams.get('dreamId'));

    const dreamContainer = document.getElementById('target-dream-container');
    const expListContainer = document.getElementById('exp-selection-list');
    const btnStart = document.getElementById('btn-start-analysis');

    let dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');
    let expList = JSON.parse(localStorage.getItem('experienceList') || '[]');

    let selectedExpId = null;
    const targetDream = dreamList.find(d => d.id === dreamId);

    // 1. 타겟 꿈일기 렌더링
    if (targetDream) {
        dreamContainer.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span class="badge bg-primary-subtle text-primary">${targetDream.date}</span>
            </div>
            <p class="text-light-emphasis mb-0 small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${targetDream.content}
            </p>
        `;
    } else {
        alert('잘못된 접근입니다.');
        history.back();
        return;
    }

    // 2. 경험 리스트 렌더링 및 선택 로직
    if (expList.length === 0) {
        expListContainer.innerHTML = `
            <div class="text-center py-4 bg-dark border border-secondary rounded">
                <p class="text-secondary small mb-3">등록된 경험 기록이 없습니다.</p>
                <a href="experience-form.html" class="btn btn-sm btn-warning" style="color: #111;">경험 기록하러 가기</a>
            </div>
        `;
    } else {
        expListContainer.innerHTML = expList.map(exp => `
            <div class="card bg-dark border-secondary p-3 exp-select-card" data-exp-id="${exp.id}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="fw-bold mb-1">${exp.title}</h6>
                        <span class="badge bg-secondary" style="font-size: 0.7rem;">${exp.timeText}</span>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input border-secondary" type="radio" name="expRadio" style="pointer-events: none;">
                    </div>
                </div>
            </div>
        `).join('');

        // 카드 클릭 이벤트 달기
        const cards = document.querySelectorAll('.exp-select-card');
        cards.forEach(card => {
            card.addEventListener('click', function () {
                // 기존 선택 해제
                cards.forEach(c => {
                    c.classList.remove('selected');
                    c.querySelector('input[type="radio"]').checked = false;
                });

                // 현재 카드 선택
                this.classList.add('selected');
                this.querySelector('input[type="radio"]').checked = true;
                selectedExpId = parseInt(this.getAttribute('data-exp-id'));

                // 버튼 활성화
                btnStart.classList.remove('disabled');
            });
        });
    }

    // 3. 심층 해석 시작 (가상 API 호출 및 모달)
    const taskDModal = new bootstrap.Modal(document.getElementById('taskDModal'));

    btnStart.addEventListener('click', () => {
        if (!selectedExpId) return;

        taskDModal.show();

        // 3초 대기 후 모의 결과 렌더링
        setTimeout(() => {
            document.getElementById('taskD-loading').classList.add('d-none');
            document.getElementById('taskD-result').classList.remove('d-none');

            const selectedExp = expList.find(e => e.id === selectedExpId);

            // 가짜 결과 주입
            document.getElementById('result-dream-kw').innerHTML = `
                <span class="badge bg-secondary">자아 성찰</span>
                <span class="badge bg-secondary">불안감</span>
                <span class="badge bg-secondary">새로운 출발</span>
            `;
            document.getElementById('result-exp-link').textContent = `선택하신 '${selectedExp.title}' 경험에서 느꼈던 억눌린 감정이 꿈의 상징들과 강하게 연결되어 나타났습니다.`;
            document.getElementById('result-summary').innerHTML = `
                이 꿈은 단순한 환상이 아니라, 과거의 경험(<strong>${selectedExp.title}</strong>)에서 비롯된 미해결 과제를 무의식이 처리하고 있는 과정입니다.<br><br>
                당시 느꼈던 감정들이 꿈속에서는 과장된 형태로 나타났지만, 이는 본질적으로 당신이 그 상황을 극복하고 한 단계 성장할 준비가 되었다는 긍정적인 신호로 해석됩니다.
            `;
        }, 3000);
    });
});