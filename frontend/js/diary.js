// frontend/js/diary.js (풀버전)

document.addEventListener('DOMContentLoaded', () => {
    // 1. HTML에서 요소들 정확하게 가져오기
    const dateInput = document.getElementById('diary-date');
    const contentInput = document.getElementById('diary-content');
    const charCount = document.getElementById('char-count');
    const saveStatus = document.getElementById('save-status');
    const diaryForm = document.getElementById('diary-form'); // 폼 자체를 가져옵니다

    // 2. 날짜 기본값을 '오늘'로 설정 [FR-DREAM-01]
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // 3. 글자 수 실시간 카운팅
    contentInput.addEventListener('input', () => {
        const length = contentInput.value.length;
        charCount.textContent = length;
        if (length < 20) {
            charCount.classList.add('text-danger');
        } else {
            charCount.classList.remove('text-danger');
        }
    });

    // 4. 미저장 draft 복원 안내 [FR-DREAM-04]
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

    // 5. 30초마다 자동 임시 저장 (Auto-save) 로직 [FR-DREAM-04]
    setInterval(() => {
        const currentContent = contentInput.value;
        // 내용이 5글자 이상일 때만 자동 저장
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

    // 🌟 6. 대망의 '진짜 저장' 로직 (폼 제출 이벤트 사용)
    // 버튼 클릭을 찾는 게 아니라, 엔터를 치든 버튼을 누르든 폼이 '제출'될 때 발동합니다.
    diaryForm.addEventListener('submit', (e) => {
        // [아주 중요!] 폼의 기본 기능(새로고침)을 막아줍니다. 이거 없으면 1초 만에 화면이 날아갑니다.
        e.preventDefault(); 

        const date = dateInput.value;
        const content = contentInput.value;

        // 방어 코드: 혹시라도 빈칸이 있으면 막기
        if (!date || !content) {
            alert("날짜와 내용을 모두 입력해주세요!");
            return;
        }

        // [BACKEND 연동 포인트] 
        // 나중에 fetch('/api/dreams', { method: 'POST', body: JSON.stringify(newDream) }) 로 수정할 영역
        const newDream = {
            id: Date.now(), // 임시 고유 ID
            date: date,
            content: content,
            createdAt: new Date().toISOString()
        };

        // 1. 기존 리스트 꺼내기 (없으면 빈 배열 [])
        const existingDreams = JSON.parse(localStorage.getItem('dreamList') || '[]');
    
        // 2. 새 꿈일기를 리스트 맨 앞에 밀어넣기
        existingDreams.unshift(newDream);
    
        // 3. 변경된 리스트를 다시 로컬 스토리지에 덮어쓰기
        localStorage.setItem('dreamList', JSON.stringify(existingDreams));

        // 4. 정식 저장이 끝났으니 임시 저장(Draft) 찌꺼기는 깨끗하게 삭제
        localStorage.removeItem('dream_draft_content');
        localStorage.removeItem('dream_draft_date');

        // 완료 알림
        alert("꿈일기가 성공적으로 기록되었습니다! 🌙");
    
        // 메인 화면으로 멋지게 이동
        location.href = '../index.html'; 
    });
});