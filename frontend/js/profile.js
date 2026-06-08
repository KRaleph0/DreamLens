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
    async function loadInitialProfile() {
        // 서버 프로필 로드 시도
        try {
            const res = await apiFetch(`${API_BASE}/user/profile`);
            if (res && res.ok) {
                const profile = await res.json();

                nicknameInput.value = profile.nickname || '사용자';
                genderSelect.value = profile.gender || 'unselected';
                ageSelect.value = profile.age_group || 'unselected';

                // localStorage도 동기화 (메인 대시보드 아바타용)
                localStorage.setItem('userNickname', profile.nickname || '사용자');

                if (profile.profile_image) {
                    const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                    savedProfile.profileImage = profile.profile_image;
                    localStorage.setItem('userProfile', JSON.stringify(savedProfile));

                    avatarContainer.innerHTML = `<img src="${profile.profile_image}" style="width: 100%; height: 100%; object-fit: cover;">`;
                    avatarContainer.classList.remove('bg-primary');
                } else {
                    const initial = (profile.nickname || '사').charAt(0).toUpperCase();
                    avatarContainer.innerHTML = initial;
                    avatarContainer.classList.add('bg-primary');
                }

                originalData = {
                    nickname: nicknameInput.value,
                    gender: genderSelect.value,
                    age: ageSelect.value,
                    profileImage: profile.profile_image || null,
                };
                return;
            }
        } catch (_) { /* fallback to localStorage */ }

        // localStorage fallback
        const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        const currentNickname = localStorage.getItem('userNickname') || '사용자';

        nicknameInput.value = currentNickname;
        genderSelect.value = savedProfile.gender || 'unselected';
        ageSelect.value = savedProfile.age || 'unselected';

        if (savedProfile.profileImage) {
            avatarContainer.innerHTML = `<img src="${savedProfile.profileImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
            avatarContainer.classList.remove('bg-primary');
        } else {
            const initial = currentNickname.charAt(0).toUpperCase();
            avatarContainer.innerHTML = initial;
            avatarContainer.classList.add('bg-primary');
        }

        originalData = {
            nickname: nicknameInput.value,
            gender: genderSelect.value,
            age: ageSelect.value,
            profileImage: savedProfile.profileImage || null,
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
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nickname = nicknameInput.value;
        const gender = genderSelect.value;
        const age_group = ageSelect.value;
        const profile_image = tempImageBase64 || originalData.profileImage || null;

        try {
            const res = await apiFetch(`${API_BASE}/user/profile`, {
                method: 'PUT',
                body: JSON.stringify({ nickname, gender, age_group, profile_image }),
            });

            if (!res || !res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || '저장 실패');
            }
        } catch (err) {
            alert(`프로필 저장 중 오류가 발생했습니다.\n${err.message}`);
            return;
        }

        // localStorage도 동기화 (메인 대시보드 아바타용)
        const profileData = {
            nickname,
            gender,
            age: age_group,
            profileImage: profile_image,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('userProfile', JSON.stringify(profileData));
        localStorage.setItem('userNickname', nickname);

        alert('프로필 정보가 성공적으로 변경되었습니다!');
        location.href = '../index.html';
    });

    // 화면 켜지자마자 초기 프로필 데이터 로드
    loadInitialProfile();
});