document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('recent-dreams-list');
    
    // [BACKEND 연동 포인트]
    // 나중에 fetch('/api/dreams') 를 통해 DB 데이터를 가져올 영역입니다.
    const dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');

    // 데이터가 없을 때 처리
    if (dreamList.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <p>아직 기록된 꿈이 없습니다.</p>
                <a href="./pages/diary-form.html" class="btn btn-sm btn-outline-primary">첫 일기 쓰기</a>
            </div>
        `;
        return;
    }

    // 데이터를 HTML 카드로 변환하여 삽입 (PB-014 목록 조회 구현)
    listContainer.innerHTML = dreamList.map(dream => `
        <div class="card bg-dark border-secondary mb-3 shadow-sm dream-card" 
             style="cursor: pointer;" onclick="showDreamDetail(${dream.id})">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-primary-subtle text-primary">${dream.date}</span>
                    <small class="text-secondary">상세보기 &gt;</small>
                </div>
                <p class="card-text text-truncate text-light-emphasis">${dream.content}</p>
            </div>
        </div>
    `).join('');
});

// 상세 보기 함수 (PB-017 상세 보기 깡통)
function showDreamDetail(id) {
    const dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');
    const dream = dreamList.find(d => d.id === id);
    
    if (dream) {
        // 나중에 예쁜 모달창으로 교체할 예정입니다. 우선은 alert으로 흐름만 확인!
        alert(`[${dream.date} 기록]\n\n${dream.content}`);
    }
}