// frontend/js/auth.js

const API_BASE = '/api';

// ── 공통 유틸 ───────────────────────────────────────────────
function showError(message) {
    const existing = document.querySelector('.alert-danger');
    if (existing) existing.remove();

    const alert = document.createElement('div');
    alert.className = 'alert alert-danger mt-3 py-2 small';
    alert.textContent = message;

    const cardBody = document.querySelector('.card-body');
    cardBody.appendChild(alert);

    setTimeout(() => alert.remove(), 4000);
}

function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.textContent = loading ? '처리 중...' : btn.dataset.originalText;
}

// ── Access Token 저장/조회 ───────────────────────────────────
function saveAccessToken(token) {
    sessionStorage.setItem('access_token', token);
}

function getAccessToken() {
    return sessionStorage.getItem('access_token');
}

// ── API fetch 공통 함수 ──────────────────────────────────────
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Refresh Token 쿠키 포함
        body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.detail || '오류가 발생했습니다.');
    }
    return data;
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // 버튼 원본 텍스트 저장
    loginForm.querySelector('button[type=submit]').dataset.originalText    = '로그인';
    registerForm.querySelector('button[type=submit]').dataset.originalText = '가입하기';

    // ── 로그인 ──────────────────────────────────────────────
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn      = loginForm.querySelector('button[type=submit]');
        const email    = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        setLoading(btn, true);
        try {
            const data = await apiPost('/auth/login', { email, password });
            saveAccessToken(data.access_token);
            location.href = '../index.html';
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(btn, false);
        }
    });

    // ── 회원가입 ─────────────────────────────────────────────
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn      = registerForm.querySelector('button[type=submit]');
        const email    = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const nickname = document.getElementById('reg-nickname').value;
        const gender   = document.getElementById('reg-gender').value;
        const age      = document.getElementById('reg-age').value;

        if (password.length < 6) {
            showError('비밀번호는 6자리 이상이어야 합니다.');
            return;
        }

        setLoading(btn, true);
        try {
            await apiPost('/auth/register', {
                email, password, nickname, gender, age_group: age
            });

            // 회원가입 성공 → 로그인 탭으로 전환
            const loginTab = new bootstrap.Tab(document.getElementById('login-tab'));
            loginTab.show();
            registerForm.reset();

            // 성공 메시지
            const alert = document.createElement('div');
            alert.className = 'alert alert-success mt-3 py-2 small';
            alert.textContent = `환영합니다, ${nickname}님! 로그인해주세요.`;
            document.querySelector('.card-body').appendChild(alert);
            setTimeout(() => alert.remove(), 4000);

        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(btn, false);
        }
    });
});