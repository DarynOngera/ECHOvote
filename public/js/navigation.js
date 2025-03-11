class Navigation {
    constructor() {
        this.currentPage = window.location.hash.slice(1) || 'home';
        this.navbar = document.querySelector('.navbar');
        this.navbarCollapse = document.querySelector('.navbar-collapse');
        this.setupEventListeners();
        this.handleNavigation();
    }

    setupEventListeners() {
        // Handle hash changes
        window.addEventListener('hashchange', () => this.handleNavigation());

        // Close mobile menu on click outside
        document.addEventListener('click', (e) => {
            if (this.navbarCollapse.classList.contains('show') &&
                !e.target.closest('.navbar')) {
                this.navbarCollapse.classList.remove('show');
            }
        });

        // Close mobile menu when clicking a nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) { // Bootstrap lg breakpoint
                    this.navbarCollapse.classList.remove('show');
                }
            });
        });

        // Handle scroll behavior
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            // Show/hide navbar on scroll
            if (currentScroll > lastScroll && currentScroll > 100) {
                // Scrolling down & past navbar
                this.navbar.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up or at top
                this.navbar.style.transform = 'translateY(0)';
            }
            lastScroll = currentScroll;
        });
    }

    handleNavigation() {
        const hash = window.location.hash.slice(1) || 'home';
        this.currentPage = hash;

        // Update active states
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkHash = link.getAttribute('href')?.slice(1);
            if (linkHash === hash) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });

        // Show/hide sections based on auth state
        if (auth.isAuthenticated()) {
            document.querySelectorAll('.nav-link.d-none').forEach(link => {
                link.classList.remove('d-none');
            });
        }

        // Handle section visibility
        this.showCurrentSection();
    }

    showCurrentSection() {
        // First, hide all sections
        const sections = ['pollsList', 'createPollForm', 'authForms', 'liveChat'];
        sections.forEach(section => {
            document.getElementById(section)?.classList.add('d-none');
        });

        // Show appropriate section based on hash
        switch (this.currentPage) {
            case 'home':
                if (auth.isAuthenticated()) {
                    document.getElementById('pollsList').classList.remove('d-none');
                    // Load polls when showing the polls list
                    polls.showPolls();
                } else {
                    document.getElementById('authForms').classList.remove('d-none');
                    document.getElementById('loginForm').classList.remove('d-none');
                    document.getElementById('registerForm').classList.add('d-none');
                }
                break;

            case 'create':
                if (!auth.isAuthenticated()) {
                    window.location.hash = 'login';
                    showToast('Please login to create a poll', 'warning');
                    return;
                }
                document.getElementById('createPollForm').classList.remove('d-none');
                break;

            case 'chat':
                if (!auth.isAuthenticated()) {
                    window.location.hash = 'login';
                    showToast('Please login to access chat', 'warning');
                    return;
                }
                document.getElementById('liveChat').classList.remove('d-none');
                break;

            case 'login':
                document.getElementById('authForms').classList.remove('d-none');
                document.getElementById('loginForm').classList.remove('d-none');
                document.getElementById('registerForm').classList.add('d-none');
                break;

            case 'register':
                document.getElementById('authForms').classList.remove('d-none');
                document.getElementById('loginForm').classList.add('d-none');
                document.getElementById('registerForm').classList.remove('d-none');
                break;
        }

        // Add fade-in animation to the visible section
        document.querySelectorAll('.d-none').forEach(el => el.classList.remove('fade-in'));
        document.querySelectorAll(':not(.d-none)').forEach(el => el.classList.add('fade-in'));

        // Update page title
        const titles = {
            home: 'Home',
            create: 'Create Poll',
            chat: 'Live Chat',
            login: 'Login',
            register: 'Register'
        };
        document.title = `${titles[this.currentPage] || 'Home'} | Opinion Poll Platform`;
    }

    // Public method to update chat badge
    updateChatBadge(count) {
        const badge = document.querySelector('#chatBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
    }
}

// Initialize navigation
const navigation = new Navigation();
