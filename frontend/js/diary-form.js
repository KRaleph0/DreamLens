// frontend/js/diary-form.js

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('diary-date');
    const contentInput = document.getElementById('diary-content');
    const charCount = document.getElementById('char-count');
    const saveStatus = document.getElementById('save-status');
    const diaryForm = document.getElementById('diary-form');

    // 주소창에서 수정할 일기의 ID 확인 (?editId=123)
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
        // [새 글 작성 모드 로직]
        // 오늘 날짜로 폼 초기화 (한국 시간 기준)
        const today = new Date();
        const kstDate = new Date(today.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
        dateInput.value = kstDate;

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

    // 4. 30초마다 자동 임시 저장
    setInterval(() => {
        const currentContent = contentInput.value;
        if (currentContent.length > 5) {
            saveStatus.textContent = "임시 저장 중...";
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
            const targetIndex = dreamList.findIndex(d => d.id === editId);
            if (targetIndex !== -1) {
                dreamList[targetIndex].date = date;
                dreamList[targetIndex].content = content;

                // ✨ 내용이 바뀌었으므로 기존 AI 분석 결과를 삭제하여 재분석 유도
                delete dreamList[targetIndex].taskAResult;
            }
            localStorage.setItem('dreamList', JSON.stringify(dreamList));

            alert("수정되었습니다. (변경사항이 있어 재분석이 필요합니다)");
            location.href = `diary-detail.html?id=${editId}`; // 상세 페이지로 돌아가기

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
            location.href = 'diary-list.html'; // 저장 후 목록으로 가기
        }

        // 임시 저장 찌꺼기 삭제
        localStorage.removeItem('dream_draft_content');
        localStorage.removeItem('dream_draft_date');
    });
});