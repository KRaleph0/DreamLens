// profile.js

document.addEventListener('DOMContentLoaded', () => {
    const pfpInput = document.getElementById('pfp-input');
    const pfpLabel = document.getElementById('pfp-label');
    const pfpHelpText = document.getElementById('pfp-help-text');
    const avatarContainer = document.getElementById('avatar-container');
    const profileForm = document.getElementById('profile-form');

    // 입력 필드 요소들
    const nicknameInput = document.getElementById('user-nickname');
    const genderSelect = document.getElementById('user-gender');
    const ageSelect = document.getElementById('user-age');

    // 버튼 그룹 요소들
    const viewActions = document.getElementById('view-actions');
    const editActions = document.getElementById('edit-actions');
    const btnEnterEdit = document.getElementById('btn-enter-edit');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    // 🌟 상태 관리 변수들
    let selectedFile = null;
    let tempImageBase64 = null; // 수정 중 선택한 이미지 임시 보관용
    let originalData = {};     // [취소] 버튼 클릭 시 복구할 원본 데이터 보관소

    // ── 1. 초기 데이터 로드 및 조회 모드 세팅 ──────────────────────────────
    function loadInitialProfile() {
        const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        const currentNickname = localStorage.getItem('userNickname') || '사용자';

        // 폼 필드에 기존 정보 안전하게 채워넣기 (조건문 분리하여 데이터 누수 방지)
        nicknameInput.value = currentNickname;
        genderSelect.value = savedProfile.gender || 'unselected';
        ageSelect.value = savedProfile.age || 'unselected';

        // 📸 프로필 아바타 렌더링 (메인 화면 로직과 완벽 동기화)
        if (savedProfile.profileImage) {
            avatarContainer.innerHTML = `<img src="${savedProfile.profileImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
            avatarContainer.classList.remove('bg-primary');
        } else {
            // 저장된 이미지가 없으면 이름 첫 글자 이니셜 노출
            const initial = currentNickname.charAt(0).toUpperCase();
            avatarContainer.innerHTML = initial;
            avatarContainer.classList.add('bg-primary');
        }

        // 현재 렌더링된 값을 원본 데이터로 백업 (취소 시 복구용)
        originalData = {
            nickname: nicknameInput.value,
            gender: genderSelect.value,
            age: ageSelect.value,
            profileImage: savedProfile.profileImage || null
        };
    }

    // ── 2. 조회 모드 ↔️ 수정 모드 UI 토글 함수 ─────────────────────────────
    function toggleEditMode(isEdit) {
        if (isEdit) {
            // 🔓 수정 모드 활성화
            nicknameInput.disabled = false;
            genderSelect.disabled = false;
            ageSelect.disabled = false;

            pfpLabel.classList.remove('d-none');
            pfpHelpText.classList.remove('d-none');
            editActions.classList.remove('d-none');
            viewActions.classList.add('d-none');
        } else {
            // 🔒 조회 모드로 잠금
            nicknameInput.disabled = true;
            genderSelect.disabled = true;
            ageSelect.disabled = true;

            pfpLabel.classList.add('d-none');
            pfpHelpText.classList.add('d-none');
            editActions.classList.add('d-none');
            viewActions.classList.remove('d-none');

            selectedFile = null;
            tempImageBase64 = null;
        }
    }

    // ── 3. 이미지 선택 시 실시간 프리뷰 및 Base64 인코딩 ──────────────────────
    pfpInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file; // 백엔드 전송용 파일 객체 보관

            // ✨ 프론트엔드 데모 고도화: 선택한 이미지를 Base64 스트링으로 변환하여 
            //    로컬스토리지에 저장하므로, 메인 대시보드 아바타와도 실시간 연동됩니다!
            const reader = new FileReader();
            reader.onload = (event) => {
                tempImageBase64 = event.target.result;
                avatarContainer.innerHTML = `<img src="${tempImageBase64}" style="width: 100%; height: 100%; object-fit: cover;">`;
                avatarContainer.classList.remove('bg-primary');
            };
            reader.readAsDataURL(file);
        }
    });

    // ── 4. 이벤트 바인딩 (수정 진입 / 수정 취소) ───────────────────────────

    // [프로필 수정하기] 버튼 클릭 시
    btnEnterEdit.addEventListener('click', () => {
        toggleEditMode(true);
    });

    // [수정 취소] 버튼 클릭 시 기존 정보로 원상복구(롤백)
    btnCancelEdit.addEventListener('click', () => {
        nicknameInput.value = originalData.nickname;
        genderSelect.value = originalData.gender;
        ageSelect.value = originalData.age;

        if (originalData.profileImage) {
            avatarContainer.innerHTML = `<img src="${originalData.profileImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
            avatarContainer.classList.remove('bg-primary');
        } else {
            avatarContainer.innerHTML = originalData.nickname.charAt(0).toUpperCase();
            avatarContainer.classList.add('bg-primary');
        }

        toggleEditMode(false); // 조회 모드로 원위치
    });

    // ── 5. 변경사항 최종 저장 로직 ─────────────────────────────────────────
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nickname = nicknameInput.value;
        const gender = genderSelect.value;
        const age = ageSelect.value;

        // ─────────────────────────────────────────────────────────────────
        // 🛠️ [병창님(백엔드) 연동 시 가이드]
        //    실제 서버 통신 시에는 FormData를 생성하여 이미지 파일(selectedFile)과 
        //    텍스트 데이터를 함께 멀티파트(Multipart) 전송하시면 됩니다!
        // ─────────────────────────────────────────────────────────────────
        /*
        const formData = new FormData();
        formData.append('nickname', nickname);
        formData.append('gender', gender);
        formData.append('age', age);
        if (selectedFile) {
            formData.append('profile_image', selectedFile);
        }
        
        // 공통 apiFetch를 이용한 서버 전송 예시
        const res = await apiFetch(`${API_BASE}/user/profile`, {
            method: 'PUT',
            body: formData // Content-Type은 브라우저가 자동으로 세팅하도록 비워둠
        });
        */

        // 로컬 스토리지 텍스트 및 이미지 데이터 반영
        const profileData = {
            nickname: nickname,
            gender: gender,
            age: age,
            // 새 이미지가 있으면 변경하고, 없으면 기존 이미지를 유지합니다.
            profileImage: tempImageBase64 || originalData.profileImage,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem('userProfile', JSON.stringify(profileData));
        localStorage.setItem('userNickname', nickname);

        alert("🎉 프로필 정보가 성공적으로 변경되었습니다!");

        // 저장 성공 후 메인 대시보드로 기분 좋게 리다이렉트
        location.href = '../index.html';
    });

    // 화면 켜지자마자 초기 프로필 데이터 로드
    loadInitialProfile();
});