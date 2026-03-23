// frontend/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // 1. 로그인 처리 로직
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // 기본 폼 제출 새로고침 방지

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // TODO: 백엔드 API 연동 시 실제 fetch 로직이 들어갈 곳 (POST /api/login)
        console.log(`로그인 시도 - 이메일: ${email}`);

        // 가상 로그인 성공 처리
        alert('로그인에 성공했습니다!');
        
        // 로그인 성공 시 메인 대시보드로 리다이렉트
        location.href = '../index.html';
    });

    // 2. 회원가입 처리 로직 (FR-USER-01, 02)
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const nickname = document.getElementById('reg-nickname').value;
        const gender = document.getElementById('reg-gender').value;
        const age = document.getElementById('reg-age').value;

        // 간단한 유효성 검사 (비밀번호 길이 등)
        if (password.length < 6) {
            alert('비밀번호는 6자리 이상이어야 합니다.');
            return;
        }

        // TODO: 백엔드 API 연동 시 실제 fetch 로직이 들어갈 곳 (POST /api/register)
        const payload = {
            email: email,
            password: password,
            nickname: nickname,
            gender: gender,
            age_group: age
        };
        console.log('회원가입 페이로드:', payload);

        // 가상 회원가입 성공 처리
        alert(`환영합니다, ${nickname}님! 회원가입이 완료되었습니다.\n다시 로그인해주세요.`);
        
        // 회원가입 성공 후 '로그인' 탭으로 전환 (부트스트랩 JS API 활용)
        const loginTab = new bootstrap.Tab(document.getElementById('login-tab'));
        loginTab.show();
        
        // 회원가입 폼 초기화
        registerForm.reset();
    });
});