// frontend/js/experience.js

document.addEventListener('DOMContentLoaded', () => {
    const expForm = document.getElementById('exp-form');
    const titleInput = document.getElementById('exp-title');
    const timeSelect = document.getElementById('exp-time');
    const expContent = document.getElementById('exp-content');
    const tokenCalc = document.getElementById('exp-token-calc');
    const expListContainer = document.getElementById('exp-list');
    const saveStatus = document.getElementById('save-status');

    // ── 1. 기존 데이터 불러오기 및 리스트 렌더링 ──
    let experienceData = JSON.parse(localStorage.getItem('experienceList') || '[]');

    function renderList() {
        if (experienceData.length === 0) {
            expListContainer.innerHTML = '<div class="text-center py-5 text-secondary small">등록된 경험이 없습니다.</div>';
            return;
        }

        expListContainer.innerHTML = experienceData.map(exp => `
            <div class="p-3 border border-secondary-subtle rounded bg-dark position-relative mb-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0 fw-bold">${exp.title}</h6>
                    <div>
                        ${exp.status === 'pending' ? '<span class="badge bg-warning text-dark me-1">요약 생성 중 ⏳</span>' : '<span class="badge bg-success me-1">요약 완료</span>'}
                        <span class="badge bg-secondary">${exp.timeText}</span>
                    </div>
                </div>
                <p class="small text-secondary mb-2" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${exp.content}
                </p>
                <div class="text-end small text-primary-custom fw-bold">${exp.tokens} 토큰</div>
            </div>
        `).join('');
    }

    // 초기 화면 그리기
    renderList();

    // ── 2. 미저장 draft 복원 안내 ──
    const savedDraftContent = localStorage.getItem('exp_draft_content');
    if (savedDraftContent) {
        if (confirm("작성 중이던 경험 기록이 있습니다. 복원하시겠습니까?")) {
            expContent.value = savedDraftContent;
            titleInput.value = localStorage.getItem('exp_draft_title') || '';
            timeSelect.value = localStorage.getItem('exp_draft_tag') || '';

            // 토큰 수 다시 계산
            tokenCalc.textContent = Math.ceil(savedDraftContent.length * 1.5);
            saveStatus.textContent = "임시 저장본 복원됨";
        } else {
            clearDraft();
        }
    }

    // ── 3. 실시간 토큰 수 가계산 (기존 로직 유지) ──
    expContent.addEventListener('input', () => {
        const textLength = expContent.value.length;
        const estimatedTokens = Math.ceil(textLength * 1.5);
        tokenCalc.textContent = estimatedTokens;
    });

    // ── 4. 30초마다 자동 임시 저장 ──
    setInterval(() => {
        const currentContent = expContent.value;
        if (currentContent.length > 5) {
            saveStatus.textContent = "임시 저장 중...";
            localStorage.setItem('exp_draft_content', currentContent);
            localStorage.setItem('exp_draft_title', titleInput.value);
            localStorage.setItem('exp_draft_tag', timeSelect.value);

            setTimeout(() => {
                const now = new Date();
                saveStatus.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} 자동 저장됨`;
            }, 500);
        }
    }, 30000);

    function clearDraft() {
        localStorage.removeItem('exp_draft_content');
        localStorage.removeItem('exp_draft_title');
        localStorage.removeItem('exp_draft_tag');
    }

    // ── 5. 경험 등록 폼 제출 (진짜 저장) ──
    expForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = titleInput.value;
        const timeText = timeSelect.options[timeSelect.selectedIndex].text;
        const timeValue = timeSelect.value;
        const content = expContent.value;
        const tokens = tokenCalc.textContent;

        // 새 데이터 객체 생성 (요약 상태는 'pending'으로 설정)
        const newExperience = {
            id: Date.now(),
            title: title,
            timeValue: timeValue,
            timeText: timeText,
            content: content,
            tokens: tokens,
            status: 'pending', // 나중에 백엔드 작업 완료 시 'completed'로 바뀔 예정
            createdAt: new Date().toISOString()
        };

        // 로컬 스토리지에 저장
        experienceData.unshift(newExperience);
        localStorage.setItem('experienceList', JSON.stringify(experienceData));

        // 목록 다시 그리기
        renderList();

        // 폼 초기화 및 임시저장 삭제
        expForm.reset();
        tokenCalc.textContent = '0';
        saveStatus.textContent = '';
        clearDraft();

        alert("경험이 등록되었습니다! (백그라운드에서 요약이 생성됩니다)");
    });
});