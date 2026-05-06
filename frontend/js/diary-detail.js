document.addEventListener('DOMContentLoaded', () => {
    // 1. 주소창에서 id 값 뽑아오기
    const urlParams = new URLSearchParams(window.location.search);
    const dreamId = parseInt(urlParams.get('id'));

    const container = document.getElementById('detail-container');
    const actionBtns = document.getElementById('action-buttons');

    // 2. 데이터 불러오기
    let dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');
    const dream = dreamList.find(d => d.id === dreamId);

    // 3. 화면 렌더링
    if (dream) {
        container.innerHTML = `
            <div class="mb-4">
                <span class="badge bg-primary-subtle text-primary px-3 py-2 fs-6 mb-3">기록일: ${dream.date}</span>
            </div>
            <div class="diary-paper p-4 p-md-5 rounded shadow-sm text-light-emphasis">
                ${dream.content.replace(/\n/g, '<br>')}
            </div>
        `;
        actionBtns.style.setProperty('display', 'flex', 'important');

        // ✨ [핵심] 수정/삭제 버튼 이벤트 연결
        const btnEdit = document.getElementById('btn-edit');
        const btnDelete = document.getElementById('btn-delete');

        // [삭제 로직]
        btnDelete.addEventListener('click', () => {
            if (confirm("정말 이 꿈일기를 삭제하시겠습니까?\n(삭제 후 복구할 수 없습니다)")) {
                // 현재 일기(dreamId)와 아이디가 '다른' 일기들만 남겨서 새로운 배열 만듦
                dreamList = dreamList.filter(d => d.id !== dreamId);

                // 로컬 스토리지에 덮어쓰기
                localStorage.setItem('dreamList', JSON.stringify(dreamList));

                alert("삭제가 완료되었습니다.");
                location.href = 'diary-list.html'; // 삭제 후 목록 페이지로 강제 이동
            }
        });

        // [수정 로직]
        btnEdit.addEventListener('click', () => {
            // 작성 폼 페이지로 이동하되, 주소창에 '수정할 일기의 번호'를 꼬리표로 달고 감
            location.href = `diary-form.html?editId=${dreamId}`;
        });

    } else {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <h5>존재하지 않거나 삭제된 꿈일기입니다.</h5>
                <button class="btn btn-primary-custom mt-3" onclick="location.href='diary-list.html'">목록으로 돌아가기</button>
            </div>
        `;
    }
});