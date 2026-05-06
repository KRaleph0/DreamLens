document.addEventListener('DOMContentLoaded', () => {
    // 1. 주소창에서 id 값 뽑아오기 (예: diary-detail.html?id=1 -> 1)
    const urlParams = new URLSearchParams(window.location.search);
    const dreamId = parseInt(urlParams.get('id'));

    const container = document.getElementById('detail-container');
    const actionBtns = document.getElementById('action-buttons');

    // 2. 로컬 스토리지에서 데이터 찾기
    const dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');
    const dream = dreamList.find(d => d.id === dreamId);

    // 3. 화면에 예쁘게 그리기
    if (dream) {
        container.innerHTML = `
            <div class="mb-4">
                <span class="badge bg-primary-subtle text-primary px-3 py-2 fs-6 mb-3">기록일: ${dream.date}</span>
            </div>
            <div class="diary-paper p-4 p-md-5 rounded shadow-sm text-light-emphasis">
                <!-- 내용의 줄바꿈(\n)을 <br>로 변환하여 그대로 유지 -->
                ${dream.content.replace(/\n/g, '<br>')}
            </div>
        `;
        actionBtns.style.setProperty('display', 'flex', 'important'); // 로딩 끝나면 버튼 보이기
    } else {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <h5>존재하지 않거나 삭제된 꿈일기입니다.</h5>
                <button class="btn btn-primary-custom mt-3" onclick="history.back()">목록으로 돌아가기</button>
            </div>
        `;
    }
});