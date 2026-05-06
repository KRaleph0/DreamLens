// frontend/js/diary.js

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('diary-date');
    const contentInput = document.getElementById('diary-content');
    const charCount = document.getElementById('char-count');
    const saveStatus = document.getElementById('save-status');
    const diaryForm = document.getElementById('diary-form');

    // ✨ [추가] 주소창에서 수정할 일기의 ID 확인 (?editId=123)
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId') ? parseInt(urlParams.get('editId')) : null;

    // 모드 판별: editId가 있으면 수정 모드, 없으면 새 글 작성 모드
    const isEditMode = editId !== null;

    if (isEditMode) {
        // [수정 모드 로직]
        document.querySelector('h2.fw-bold').textContent = "꿈일기 수정하기";
        diaryForm.querySelector('button[type="submit"]').textContent = "수정 완료";

        // 기존 데이터 불러와서 폼에 채워 넣기
        const dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');
        const existingDream = dreamList.find(d => d.id === editId);

        if (existingDream) {
            dateInput.value = existingDream.date;
            contentInput.value = existingDream.content;
            charCount.textContent = existingDream.content.length;
        } else {
            alert("존재하지 않는 일기입니다.");
            location.href = 'diary-list.html';
            return;
        }
    } else {
        // [새 글 작성 모드 로직] (기존과 동일)
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;

        // 미저장 draft 복원 (새 글 작성일 때만 작동)
        const savedDraft = localStorage.getItem('dream_draft_content');
        if (savedDraft) {
            if (confirm("작성 중이던 임시 저장본이 있습니다. 복원하시겠습니까?")) {
                contentInput.value = savedDraft;
                charCount.textContent = savedDraft.length;
                saveStatus.textContent = "임시 저장본 복원됨";
            } else {
                localStorage.removeItem('dream_draft_content');
            }
        }
    }

    // 3. 글자 수 실시간 카운팅
    contentInput.addEventListener('input', () => {
        const length = contentInput.value.length;
        charCount.textContent = length;
        charCount.classList.toggle('text-danger', length < 20);
    });

    // 4. 30초마다 자동 임시 저장 (수정 모드일 때도 백업 용도로 작동)
    setInterval(() => {
        const currentContent = contentInput.value;
        if (currentContent.length > 5) {
            saveStatus.textContent = "임시 저장 중...";
            // 팁: 수정 모드일 때는 다른 키워드로 저장하여 원본을 지키는 것도 좋습니다만, 지금은 심플하게 덮어씁니다.
            localStorage.setItem('dream_draft_content', currentContent);
            localStorage.setItem('dream_draft_date', dateInput.value);

            setTimeout(() => {
                const now = new Date();
                saveStatus.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} 자동 저장됨`;
            }, 500);
        }
    }, 30000);

    // 🌟 5. 정식 저장 / 수정 완료 로직
    diaryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const date = dateInput.value;
        const content = contentInput.value;

        if (!date || !content) {
            alert("날짜와 내용을 모두 입력해주세요!");
            return;
        }

        let dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');

        if (isEditMode) {
            // [수정 완료 처리]
            // 기존 배열에서 id가 일치하는 항목을 찾아서 내용만 업데이트
            const targetIndex = dreamList.findIndex(d => d.id === editId);
            if (targetIndex !== -1) {
                dreamList[targetIndex].date = date;
                dreamList[targetIndex].content = content;
                // updated_at 등을 추가해도 좋습니다.
            }
            localStorage.setItem('dreamList', JSON.stringify(dreamList));
            alert("수정되었습니다.");
            location.href = `diary-detail.html?id=${editId}`; // 수정한 일기 상세로 돌아가기

        } else {
            // [새 글 저장 처리]
            const newDream = {
                id: Date.now(),
                date: date,
                content: content,
                createdAt: new Date().toISOString()
            };
            dreamList.unshift(newDream);
            localStorage.setItem('dreamList', JSON.stringify(dreamList));
            alert("꿈일기가 성공적으로 기록되었습니다! 🌙");
            location.href = '../index.html';
        }

        // 임시 저장 찌꺼기 삭제
        localStorage.removeItem('dream_draft_content');
        localStorage.removeItem('dream_draft_date');
    });
});