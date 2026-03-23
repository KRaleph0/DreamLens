document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('diary-date');
    const contentInput = document.getElementById('diary-content');
    const charCount = document.getElementById('char-count');
    const saveStatus = document.getElementById('save-status');
    const diaryForm = document.getElementById('diary-form');

    // 1. 날짜 기본값을 '오늘'로 설정 [FR-DREAM-01]
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // 2. 글자 수 실시간 카운팅
    contentInput.addEventListener('input', () => {
        const length = contentInput.value.length;
        charCount.textContent = length;
        if (length < 20) {
            charCount.classList.add('text-danger');
        } else {
            charCount.classList.remove('text-danger');
        }
    });

    // 3. 미저장 draft 복원 안내 [FR-DREAM-04]
    const savedDraft = localStorage.getItem('dream_draft_content');
    if (savedDraft) {
        const restore = confirm("작성 중이던 임시 저장본이 있습니다. 복원하시겠습니까?");
        if (restore) {
            contentInput.value = savedDraft;
            charCount.textContent = savedDraft.length;
            saveStatus.textContent = "임시 저장본 복원됨";
        } else {
            localStorage.removeItem('dream_draft_content');
        }
    }

    // 4. 30초마다 자동 임시 저장 (Auto-save) 로직 [FR-DREAM-04]
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

    // 5. 정식 저장 버튼 클릭 시 [FR-DREAM-04]
    diaryForm.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        if (contentInput.value.length < 20) {
            alert("꿈 내용은 최소 20자 이상 작성해야 합니다.");
            return;
        }

        alert('정식 저장이 완료되었습니다! (Task A 분석 대기)');
        
        localStorage.removeItem('dream_draft_content');
        localStorage.removeItem('dream_draft_date');
        
        location.href = '../index.html';
    });
});