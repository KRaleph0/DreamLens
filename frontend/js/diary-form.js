// diary-form.js (api.js가 먼저 로드되어야 함)

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
    if (!isAuth) return;

    const dateInput   = document.getElementById('diary-date');
    const contentInput = document.getElementById('diary-content');
    const charCount   = document.getElementById('char-count');
    const saveStatus  = document.getElementById('save-status');
    const diaryForm   = document.getElementById('diary-form');

    const urlParams = new URLSearchParams(window.location.search);
    const editId    = urlParams.get('editId') ? parseInt(urlParams.get('editId')) : null;
    const isEditMode = editId !== null;

    if (isEditMode) {
        document.querySelector('h2.fw-bold').textContent = '꿈일기 수정하기';
        diaryForm.querySelector('button[type="submit"]').textContent = '수정 완료';

        const res = await apiFetch(`${API_BASE}/diary/${editId}`);
        if (!res || !res.ok) {
            alert('존재하지 않는 일기입니다.');
            location.href = 'diary-list.html';
            return;
        }
        const diary = await res.json();
        dateInput.value    = diary.date;
        contentInput.value = diary.content;
        charCount.textContent = diary.content.length;
    } else {
        const today = new Date();
        dateInput.value = new Date(today.getTime() + 9 * 3_600_000).toISOString().split('T')[0];

        const savedDraft = localStorage.getItem('dream_draft_content');
        if (savedDraft) {
            if (confirm('작성 중이던 임시 저장본이 있습니다. 복원하시겠습니까?')) {
                contentInput.value    = savedDraft;
                charCount.textContent = savedDraft.length;
                saveStatus.textContent = '임시 저장본 복원됨';
            } else {
                localStorage.removeItem('dream_draft_content');
            }
        }
    }

    contentInput.addEventListener('input', () => {
        const length = contentInput.value.length;
        charCount.textContent = length;
        charCount.classList.toggle('text-danger', length < 20);
    });

    setInterval(() => {
        if (contentInput.value.length > 5) {
            saveStatus.textContent = '임시 저장 중...';
            localStorage.setItem('dream_draft_content', contentInput.value);
            localStorage.setItem('dream_draft_date', dateInput.value);
            setTimeout(() => {
                const now = new Date();
                saveStatus.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} 자동 저장됨`;
            }, 500);
        }
    }, 30000);

    diaryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date    = dateInput.value;
        const content = contentInput.value;
        if (!date || !content) { alert('날짜와 내용을 모두 입력해주세요!'); return; }

        if (isEditMode) {
            const res = await apiFetch(`${API_BASE}/diary/${editId}`, {
                method: 'PUT',
                body: JSON.stringify({ date, content }),
            });
            if (!res || !res.ok) { alert('수정에 실패했습니다.'); return; }
            alert('수정되었습니다. (변경사항이 있어 재분석이 필요합니다)');
            location.href = `diary-detail.html?id=${editId}`;
        } else {
            const res = await apiFetch(`${API_BASE}/diary`, {
                method: 'POST',
                body: JSON.stringify({ date, content }),
            });
            if (!res || !res.ok) { alert('저장에 실패했습니다.'); return; }
            alert('꿈일기가 성공적으로 기록되었습니다! 🌙');
            location.href = 'diary-list.html';
        }

        localStorage.removeItem('dream_draft_content');
        localStorage.removeItem('dream_draft_date');
    });
});
