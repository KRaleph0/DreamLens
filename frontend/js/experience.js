// frontend/js/experience.js

document.addEventListener('DOMContentLoaded', () => {
    const expForm = document.getElementById('exp-form');
    const titleInput = document.getElementById('exp-title');
    const timeSelect = document.getElementById('exp-time');
    const expContent = document.getElementById('exp-content');
    const tokenCalc = document.getElementById('exp-token-calc');
    const expListContainer = document.getElementById('exp-list');
    const saveStatus = document.getElementById('save-status');

    // ✨ 주소창에서 수정할 ID 가져오기 (?editId=123)
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId') ? parseInt(urlParams.get('editId')) : null;
    const isEditMode = editId !== null;

    // ── 1. 기존 데이터 불러오기 및 리스트 렌더링 ──
    let experienceData = JSON.parse(localStorage.getItem('experienceList') || '[]');

    function renderList() {
        if (experienceData.length === 0) {
            expListContainer.innerHTML = '<div class="text-center py-5 text-secondary small">등록된 경험이 없습니다.</div>';
            return;
        }

        expListContainer.innerHTML = experienceData.map(exp => `
            <div class="p-3 border border-secondary-subtle rounded bg-dark position-relative mb-2 hover-glow"
                 style="cursor: pointer;"
                 onclick="location.href='experience-detail.html?id=${exp.id}'">
                
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

    renderList();

    // ── ✨ 2. 모드 판별 및 데이터 채우기 (수정 모드 vs 새 글 모드) ──
    if (isEditMode) {
        // UI 텍스트를 '수정'에 맞게 변경
        expForm.previousElementSibling.textContent = "경험 수정하기";
        expForm.querySelector('button[type="submit"]').textContent = "수정 완료";

        // 기존 데이터 찾아서 폼에 채워넣기
        const existingExp = experienceData.find(e => e.id === editId);
        if (existingExp) {
            titleInput.value = existingExp.title;
            timeSelect.value = existingExp.timeValue;
            expContent.value = existingExp.content;
            tokenCalc.textContent = existingExp.tokens;
        } else {
            alert("존재하지 않는 경험 기록입니다.");
            location.href = 'experience.html';
            return;
        }
    } else {
        // [새 글 모드] 미저장 draft 복원 안내
        const savedDraftContent = localStorage.getItem('exp_draft_content');
        if (savedDraftContent) {
            if (confirm("작성 중이던 경험 기록이 있습니다. 복원하시겠습니까?")) {
                expContent.value = savedDraftContent;
                titleInput.value = localStorage.getItem('exp_draft_title') || '';
                timeSelect.value = localStorage.getItem('exp_draft_tag') || '';

                tokenCalc.textContent = Math.ceil(savedDraftContent.length * 1.5);
                saveStatus.textContent = "임시 저장본 복원됨";
            } else {
                clearDraft();
            }
        }
    }

    // ── 3. 실시간 토큰 수 가계산 ──
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

    // ── 5. 경험 등록/수정 폼 제출 ──
    expForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = titleInput.value;
        const timeText = timeSelect.options[timeSelect.selectedIndex].text;
        const timeValue = timeSelect.value;
        const content = expContent.value;
        const tokens = tokenCalc.textContent;

        if (isEditMode) {
            // ✨ [수정 모드] 기존 배열 요소 내용 덮어쓰기
            const targetIndex = experienceData.findIndex(e => e.id === editId);
            if (targetIndex !== -1) {
                experienceData[targetIndex].title = title;
                experienceData[targetIndex].timeValue = timeValue;
                experienceData[targetIndex].timeText = timeText;
                experienceData[targetIndex].content = content;
                experienceData[targetIndex].tokens = tokens;
            }
            localStorage.setItem('experienceList', JSON.stringify(experienceData));

            alert("성공적으로 수정되었습니다!");
            clearDraft();
            location.href = `experience-detail.html?id=${editId}`; // 다시 상세 페이지로 튕겨줌

        } else {
            // ✨ [새 글 모드] 리스트 맨 위에 새로 추가
            const newExperience = {
                id: Date.now(),
                title: title,
                timeValue: timeValue,
                timeText: timeText,
                content: content,
                tokens: tokens,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            experienceData.unshift(newExperience);
            localStorage.setItem('experienceList', JSON.stringify(experienceData));

            renderList(); // 목록 다시 그리기
            expForm.reset(); // 폼 비우기
            tokenCalc.textContent = '0';
            saveStatus.textContent = '';
            clearDraft();

            alert("경험이 등록되었습니다! (백그라운드에서 요약이 생성됩니다)");
        }
    });
});