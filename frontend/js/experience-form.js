// frontend/js/experience-form.js

document.addEventListener('DOMContentLoaded', () => {
    const expForm = document.getElementById('exp-form');
    const titleInput = document.getElementById('exp-title');
    const timeSelect = document.getElementById('exp-time');
    const expContent = document.getElementById('exp-content');
    const tokenCalc = document.getElementById('exp-token-calc');
    const saveStatus = document.getElementById('save-status');
    const pageTitle = document.getElementById('form-page-title');
    const submitBtn = document.getElementById('submit-btn');

    // ✨ 주소창에서 수정할 ID 가져오기 (?editId=123)
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId') ? parseInt(urlParams.get('editId')) : null;
    const isEditMode = editId !== null;

    let experienceData = JSON.parse(localStorage.getItem('experienceList') || '[]');

    // ── 1. 모드 판별 및 데이터 채우기 (수정 모드 vs 새 글 모드) ──
    if (isEditMode) {
        pageTitle.textContent = "경험 수정하기";
        submitBtn.textContent = "수정 완료";

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

    // ── 2. 실시간 토큰 수 가계산 ──
    expContent.addEventListener('input', () => {
        const textLength = expContent.value.length;
        const estimatedTokens = Math.ceil(textLength * 1.5);
        tokenCalc.textContent = estimatedTokens;
    });

    // ── 3. 30초마다 자동 임시 저장 ──
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

    // ── 4. 경험 등록/수정 폼 제출 ──
    expForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = titleInput.value;
        const timeText = timeSelect.options[timeSelect.selectedIndex].text;
        const timeValue = timeSelect.value;
        const content = expContent.value;
        const tokens = tokenCalc.textContent;

        if (isEditMode) {
            // [수정 모드]
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
            location.href = `experience-detail.html?id=${editId}`;
        } else {
            // [새 글 모드]
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

            alert("경험이 등록되었습니다! (백그라운드에서 요약이 생성됩니다)");
            clearDraft();
            location.href = 'experience.html'; // 저장 후 목록 페이지로 이동
        }
    });
});