// frontend/js/experience-detail.js

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const expId = parseInt(urlParams.get('id'));

    const container = document.getElementById('detail-container');
    const actionBtns = document.getElementById('action-buttons');

    let experienceData = JSON.parse(localStorage.getItem('experienceList') || '[]');
    const exp = experienceData.find(e => e.id === expId);

    if (exp) {
        const statusBadge = exp.status === 'pending'
            ? '<span class="badge bg-warning text-dark me-2">요약 생성 중 ⏳</span>'
            : '<span class="badge bg-success me-2">요약 완료</span>';

        container.innerHTML = `
            <div class="mb-4 d-flex justify-content-between align-items-start">
                <div>
                    <h2 class="fw-bold mb-2">${exp.title}</h2>
                    <span class="badge bg-secondary me-2">${exp.timeText}</span>
                    <span class="text-secondary small">${new Date(exp.createdAt).toLocaleDateString()} 등록</span>
                </div>
                <div class="text-end">
                    ${statusBadge}
                    <div class="text-primary-custom fw-bold small mt-2">${exp.tokens} 토큰</div>
                </div>
            </div>
            
            <div class="exp-paper p-4 p-md-5 rounded shadow-sm text-light-emphasis">
                ${exp.content.replace(/\n/g, '<br>')}
            </div>
            
            ${exp.summary ? `
            <div class="mt-4 p-3 bg-dark border border-success border-opacity-25 rounded">
                <h6 class="text-success mb-2 fw-bold">✨ AI 요약</h6>
                <p class="small text-light-emphasis mb-0">${exp.summary}</p>
            </div>
            ` : ''}
        `;
        actionBtns.style.setProperty('display', 'flex', 'important');

        const btnEdit = document.getElementById('btn-edit');
        const btnDelete = document.getElementById('btn-delete');

        // [삭제 기능]
        btnDelete.addEventListener('click', () => {
            if (confirm("이 경험 기록을 삭제하시겠습니까?")) {
                experienceData = experienceData.filter(e => e.id !== expId);
                localStorage.setItem('experienceList', JSON.stringify(experienceData));
                alert("삭제되었습니다.");
                location.href = 'experience-list.html'; // ✨ 변경됨
            }
        });

        // [수정 기능 연동 준비]
        btnEdit.addEventListener('click', () => {
            // ✨ 버그 수정 완료! (form 페이지로 정확히 이동)
            location.href = `experience-form.html?editId=${expId}`;
        });

    } else {
        container.innerHTML = `
            <div class="text-center py-5 text-secondary">
                <h5>존재하지 않거나 삭제된 기록입니다.</h5>
                <button class="btn btn-primary-custom mt-3" onclick="location.href='experience-list.html'">목록으로 돌아가기</button>
            </div>
        `;
    }
});