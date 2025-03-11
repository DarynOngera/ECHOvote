// Show toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Hide all main content sections
function hideAllSections() {
    document.querySelector('#pollsList').classList.add('d-none');
    document.querySelector('#authForms').classList.add('d-none');
    document.querySelector('#createPollForm').classList.add('d-none');
    document.querySelector('#liveChat').classList.add('d-none');
}

// Handle navigation
function handleNavigation() {
    const hash = window.location.hash.slice(1) || 'login';
    hideAllSections();
    
    // If user is not authenticated, only allow login and register
    if (!auth.isAuthenticated()) {
        if (!['login', 'register'].includes(hash)) {
            window.location.hash = 'login';
            return;
        }
    }
    
    switch (hash) {
        case 'home':
            polls.showPolls();
            break;
        case 'create':
            polls.showCreatePollForm();
            break;
        case 'chat':
            chat.showChat();
            break;
        case 'login':
            auth.showLoginForm();
            break;
        case 'register':
            auth.showRegisterForm();
            break;
        default:
            if (auth.isAuthenticated()) {
                polls.showPolls();
            } else {
                auth.showLoginForm();
            }
    }
}

// Initialize
window.addEventListener('load', () => {
    // Set initial route to login if not authenticated
    if (!auth.isAuthenticated() && !window.location.hash) {
        window.location.hash = 'login';
    }
    
    handleNavigation();
    window.addEventListener('hashchange', handleNavigation);
});
