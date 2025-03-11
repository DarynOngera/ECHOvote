class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user'));
        this.setupEventListeners();
        this.updateNavigation();
    }

    setupEventListeners() {
        // Login form
        document.querySelector('#loginForm form').addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const email = form.querySelector('input[type="email"]').value;
            const password = form.querySelector('input[type="password"]').value;
            this.login(email, password);
        });

        // Register form
        document.querySelector('#registerForm form').addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const username = form.querySelector('input[type="text"]').value;
            const email = form.querySelector('input[type="email"]').value;
            const password = form.querySelector('input[type="password"]').value;
            this.register(username, email, password);
        });

        // Navigation links
        document.querySelector('#loginLink').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = 'login';
        });
        
        document.querySelector('#registerLink').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = 'register';
        });
    }

    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            this.setSession(data.token, data.user);
            this.updateNavigation();
            showToast('Login successful!', 'success');
            window.location.hash = 'home';
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async register(username, email, password) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            this.setSession(data.token, data.user);
            this.updateNavigation();
            showToast('Registration successful!', 'success');
            window.location.hash = 'home';
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    setSession(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.updateNavigation();
        window.location.hash = 'login';
        showToast('Logged out successfully', 'success');
    }

    updateNavigation() {
        const authNav = document.querySelector('#authNav');
        const createPollLink = document.querySelector('#createPollLink');
        const chatLink = document.querySelector('#chatLink');
        const homeLink = document.querySelector('#homeLink');

        if (this.isAuthenticated()) {
            // Add admin link if user is admin
            const adminLink = this.user.role === 'admin' ? 
                `<a class="nav-link" href="/admin" target="_blank">
                    <i class="bi bi-speedometer2 me-1"></i>Admin Dashboard
                </a>` : '';

            authNav.innerHTML = `
                <span class="nav-link text-light">Welcome, ${this.user.username}</span>
                ${adminLink}
                <a class="nav-link" href="#" onclick="auth.logout(); return false;">
                    <i class="bi bi-box-arrow-right me-1"></i>Logout
                </a>
            `;
            createPollLink?.classList.remove('d-none');
            chatLink?.classList.remove('d-none');
            homeLink?.classList.remove('d-none');
        } else {
            authNav.innerHTML = `
                <a class="nav-link" href="#login" id="loginLink">
                    <i class="bi bi-box-arrow-in-right me-1"></i>Login
                </a>
                <a class="nav-link" href="#register" id="registerLink">
                    <i class="bi bi-person-plus-fill me-1"></i>Register
                </a>
            `;
            createPollLink?.classList.add('d-none');
            chatLink?.classList.add('d-none');
            homeLink?.classList.add('d-none');
        }
    }

    showLoginForm() {
        document.querySelector('#authForms').classList.remove('d-none');
        document.querySelector('#loginForm').classList.remove('d-none');
        document.querySelector('#registerForm').classList.add('d-none');
        document.querySelector('#pollsList').classList.add('d-none');
        document.querySelector('#createPollForm').classList.add('d-none');
        document.querySelector('#liveChat').classList.add('d-none');
        
        // Add register link below login form
        const loginForm = document.querySelector('#loginForm');
        let registerPrompt = loginForm.querySelector('.register-prompt');
        if (!registerPrompt) {
            registerPrompt = document.createElement('div');
            registerPrompt.className = 'register-prompt text-center mt-3';
            registerPrompt.innerHTML = `
                <p class="text-muted">Don't have an account? 
                    <a href="#register" class="text-primary">Register here</a>
                </p>
            `;
            loginForm.appendChild(registerPrompt);
        }
    }

    showRegisterForm() {
        document.querySelector('#authForms').classList.remove('d-none');
        document.querySelector('#loginForm').classList.add('d-none');
        document.querySelector('#registerForm').classList.remove('d-none');
        document.querySelector('#pollsList').classList.add('d-none');
        document.querySelector('#createPollForm').classList.add('d-none');
        document.querySelector('#liveChat').classList.add('d-none');
        
        // Add login link below register form
        const registerForm = document.querySelector('#registerForm');
        let loginPrompt = registerForm.querySelector('.login-prompt');
        if (!loginPrompt) {
            loginPrompt = document.createElement('div');
            loginPrompt.className = 'login-prompt text-center mt-3';
            loginPrompt.innerHTML = `
                <p class="text-muted">Already have an account? 
                    <a href="#login" class="text-primary">Login here</a>
                </p>
            `;
            registerForm.appendChild(loginPrompt);
        }
    }

    isAuthenticated() {
        return !!this.token;
    }

    getAuthHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }
}

const auth = new Auth();

// Show toast messages
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    new bootstrap.Toast(toast).show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}
