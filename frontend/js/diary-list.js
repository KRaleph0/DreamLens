document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('full-diary-list');
    const sortSelect = document.getElementById('sort-select');

    // 1. 로컬 스토리지에서 일기 데이터 불러오기
    // (테스트용 데이터가 없다면 임시로 빈 배열 '[]' 반환)
    let dreamList = JSON.parse(localStorage.getItem('dreamList') || '[]');

    // 2. 리스트를 화면에 그리는 함수
    function renderList(list) {
        // 일기가 없을 때 처리
        if (list.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-5 bg-dark border border-secondary rounded shadow-sm">
                    <p class="text-secondary mb-3">아직 작성된 꿈일기가 없습니다.</p>
                    <a href="diary-form.html" class="btn btn-primary-custom">첫 일기 쓰러 가기</a>
                </div>
            `;
            return;
        }

        // HTML 렌더링
        // ✨ [수정된 부분] onclick 이벤트에 상세 페이지 URL 이동 로직 적용
        listContainer.innerHTML = list.map(dream => `
            <div class="card bg-dark border-secondary shadow-sm dream-card hover-lift" 
                 style="cursor: pointer; transition: transform 0.2s;" 
                 onclick="location.href='diary-detail.html?id=${dream.id}'"
                 onmouseover="this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.transform='translateY(0)'">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="badge bg-primary-subtle text-primary fs-6 px-3 py-2">${dream.date}</span>
                        <span class="text-secondary small">상세보기 &gt;</span>
                    </div>
                    <p class="card-text text-light-emphasis m-0" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${dream.content}
                    </p>
                </div>
            </div>
        `).join('');
    }

    // 3. 정렬 로직 함수
    function sortAndRender(sortType) {
        // 원본 배열이 변형되지 않도록 깊은 복사(...) 후 정렬
        let sortedList = [...dreamList];

        if (sortType === 'date-desc') {
            // 최신순 (날짜 내림차순)
            sortedList.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortType === 'date-asc') {
            // 오래된순 (날짜 오름차순)
            sortedList.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (sortType === 'alpha-asc') {
            // 가나다순 (문자열 오름차순: localeCompare 사용)
            sortedList.sort((a, b) => a.content.localeCompare(b.content));
        }

        renderList(sortedList);
    }

    // 4. 셀렉트박스 변경 시 이벤트 리스너
    sortSelect.addEventListener('change', (e) => {
        sortAndRender(e.target.value);
    });

    // 5. 초기 화면 로딩 시 기본 설정값(최신순)으로 렌더링
    sortAndRender(sortSelect.value);
});