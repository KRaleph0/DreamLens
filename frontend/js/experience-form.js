// experience-form.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const expForm    = document.getElementById('exp-form');
    const titleInput = document.getElementById('exp-title');
    const timeSelect = document.getElementById('exp-time');
    const expContent = document.getElementById('exp-content');
    const tokenCalc  = document.getElementById('exp-token-calc');
    const saveStatus = document.getElementById('save-status');
    const pageTitle  = document.getElementById('form-page-title');
    const submitBtn  = document.getElementById('submit-btn');

    const urlParams  = new URLSearchParams(window.location.search);
    const editId     = urlParams.get('editId') ? parseInt(urlParams.get('editId')) : null;
    const isEditMode = editId !== null;

    if (isEditMode) {
        pageTitle.textContent  = '경험 수정하기';
        submitBtn.textContent  = '수정 완료';

        const res = await apiFetch(`${API_BASE}/experience/${editId}`);
        if (!res || !res.ok) {
            alert('존재하지 않는 경험 기록입니다.');
            location.href = 'experience-list.html';
            return;
        }
        const exp = await res.json();
        titleInput.value       = exp.title;
        timeSelect.value       = exp.time_value || '';
        expContent.value       = exp.content;
        tokenCalc.textContent  = Math.ceil(exp.content.length * 1.5);
    } else {
        const savedDraftContent = localStorage.getItem('exp_draft_content');
        if (savedDraftContent) {
            if (confirm('작성 중이던 경험 기록이 있습니다. 복원하시겠습니까?')) {
                expContent.value      = savedDraftContent;
                titleInput.value      = localStorage.getItem('exp_draft_title') || '';
                timeSelect.value      = localStorage.getItem('exp_draft_tag') || '';
                tokenCalc.textContent = Math.ceil(savedDraftContent.length * 1.5);
                saveStatus.textContent = '임시 저장본 복원됨';
            } else {
                clearDraft();
            }
        }
    }

    expContent.addEventListener('input', () => {
        tokenCalc.textContent = Math.ceil(expContent.value.length * 1.5);
    });

    setInterval(() => {
        if (expContent.value.length > 5) {
            saveStatus.textContent = '임시 저장 중...';
            localStorage.setItem('exp_draft_content', expContent.value);
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

    expForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title     = titleInput.value;
        const timeValue = timeSelect.value;
        const timeText  = timeSelect.options[timeSelect.selectedIndex].text;
        const content   = expContent.value;

        if (isEditMode) {
            const res = await apiFetch(`${API_BASE}/experience/${editId}`, {
                method: 'PUT',
                body: JSON.stringify({ title, time_value: timeValue, time_text: timeText, content }),
            });
            if (!res || !res.ok) { alert('수정에 실패했습니다.'); return; }
            alert('성공적으로 수정되었습니다!');
            clearDraft();
            location.href = `experience-detail.html?id=${editId}`;
        } else {
            const res = await apiFetch(`${API_BASE}/experience`, {
                method: 'POST',
                body: JSON.stringify({ title, time_value: timeValue, time_text: timeText, content }),
            });
            if (!res || !res.ok) { alert('저장에 실패했습니다.'); return; }
            alert('경험이 등록되었습니다!');
            clearDraft();
            location.href = 'experience-list.html';
        }
    });
});
