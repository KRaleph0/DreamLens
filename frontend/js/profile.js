document.addEventListener('DOMContentLoaded', () => {
    const pfpInput = document.getElementById('pfp-input');
    const avatarContainer = document.getElementById('avatar-container');
    const profileForm = document.getElementById('profile-form');

    // 🌟 백엔드 전송을 위한 파일 객체 보관용 변수
    let selectedFile = null;

    // 1. 초기 데이터 로드 및 UI 설정
    const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const currentNickname = localStorage.getItem('userNickname') || '사용자';

    // 닉네임, 성별, 연령대 폼 채우기
    if (savedProfile.nickname) {
        document.getElementById('user-nickname').value = savedProfile.nickname;
        document.getElementById('user-gender').value = savedProfile.gender || 'unselected';
        document.getElementById('user-age').value = savedProfile.age || 'unselected';
    }

    // 🌟 버그 해결: 메인 화면과 동일하게 이니셜 우선 표시
    const initial = currentNickname.charAt(0).toUpperCase();
    avatarContainer.innerHTML = initial;

    // 2. 이미지 선택 시 미리보기 로직 (버그 해결: 겹침 방지)
    pfpInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file; // 파일 객체 저장

            // 미리보기용 임시 URL 생성
            const objectUrl = URL.createObjectURL(file);

            // 컨테이너 내부를 <img> 태그로 싹 갈아끼움 (글자 삭제됨)
            avatarContainer.innerHTML = `<img src="${objectUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;

            // 메모리 해제
            avatarContainer.querySelector('img').onload = () => URL.revokeObjectURL(objectUrl);
        }
    });

    // 3. 저장 로직
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nickname = document.getElementById('user-nickname').value;
        const gender = document.getElementById('user-gender').value;
        const age = document.getElementById('user-age').value;

        // [병창님(백엔드) 연동 시 가이드]
        // 실제로는 FormData를 생성하여 이미지 파일(selectedFile)과 함께 서버로 보냅니다.
        // const formData = new FormData();
        // formData.append('nickname', nickname);
        // if(selectedFile) formData.append('profile_image', selectedFile);

        // 로컬 스토리지 텍스트 정보 업데이트
        const profileData = {
            nickname: nickname,
            gender: gender,
            age: age,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem('userProfile', JSON.stringify(profileData));
        localStorage.setItem('userNickname', nickname);

        alert("프로필 정보가 성공적으로 저장되었습니다!");
        location.href = '../index.html';
    });
});