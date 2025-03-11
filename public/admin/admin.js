class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user'));
        
        if (!this.token || !this.user || this.user.role !== 'admin') {
            window.location.href = '/';
            return;
        }

        this.setupEventListeners();
        this.handleHashChange();
        this.loadDashboardData();
    }

    setupEventListeners() {
        window.addEventListener('hashchange', () => this.handleHashChange());
        
        document.querySelector('#logoutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Search event listeners
        document.querySelector('#userSearch')?.addEventListener('input', (e) => {
            this.filterUsers(e.target.value);
        });

        document.querySelector('#pollSearch')?.addEventListener('input', (e) => {
            this.filterPolls(e.target.value);
        });

        document.querySelector('#pollStatusFilter')?.addEventListener('change', (e) => {
            this.filterPolls(document.querySelector('#pollSearch').value, e.target.value);
        });
    }

    handleHashChange() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.showSection(hash);
        
        if (hash === 'users') {
            this.loadUsers();
        } else if (hash === 'polls') {
            this.loadPolls();
        } else if (hash === 'analytics') {
            this.loadAnalytics();
        }
    }

    showSection(section) {
        // Hide all sections
        ['dashboard', 'users', 'polls', 'analytics'].forEach(s => {
            document.querySelector(`#${s}Section`)?.classList.add('d-none');
        });
        
        // Show selected section
        document.querySelector(`#${section}Section`)?.classList.remove('d-none');
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${section}`) {
                link.classList.add('active');
            }
        });
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/api/admin/dashboard', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load dashboard data');
            
            const data = await response.json();
            
            // Update dashboard cards
            document.querySelector('#totalUsers').textContent = data.totalUsers;
            document.querySelector('#activePolls').textContent = data.activePolls;
            document.querySelector('#totalVotes').textContent = data.totalVotes;
            document.querySelector('#newThisMonth').textContent = data.newPollsThisMonth;
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load users');
            
            const users = await response.json();
            const tbody = document.querySelector('#usersList');
            tbody.innerHTML = '';
            
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">
                            ${user.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>${user.createdPolls?.length || 0}</td>
                    <td>${new Date(user.lastLogin).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'}"
                                onclick="admin.toggleUserStatus('${user._id}', ${!user.isActive})">
                            ${user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async loadPolls() {
        try {
            const response = await fetch('/api/admin/polls', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load polls');
            
            const polls = await response.json();
            const tbody = document.querySelector('#pollsList');
            tbody.innerHTML = '';
            
            polls.forEach(poll => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${poll.title}</td>
                    <td>${poll.creator.username}</td>
                    <td>
                        <span class="badge ${poll.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                            ${poll.status}
                        </span>
                    </td>
                    <td>${poll.totalVotes}</td>
                    <td>${new Date(poll.createdAt).toLocaleDateString()}</td>
                    <td>
                        ${poll.status === 'active' ? `
                            <button class="btn btn-sm btn-warning me-1" 
                                    onclick="admin.updatePollStatus('${poll._id}', 'closed')">
                                Close
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger"
                                onclick="admin.deletePoll('${poll._id}')">
                            Delete
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch('/api/admin/analytics', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) throw new Error('Failed to load analytics');
            
            const data = await response.json();
            
            // User Growth Chart
            new Chart(document.querySelector('#userGrowthChart'), {
                type: 'line',
                data: {
                    labels: data.userGrowth.labels,
                    datasets: [{
                        label: 'New Users',
                        data: data.userGrowth.data,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                }
            });
            
            // Poll Activity Chart
            new Chart(document.querySelector('#pollActivityChart'), {
                type: 'bar',
                data: {
                    labels: data.pollActivity.labels,
                    datasets: [{
                        label: 'Polls Created',
                        data: data.pollActivity.data,
                        backgroundColor: 'rgb(54, 162, 235)'
                    }]
                }
            });
            
            // User Engagement Chart
            new Chart(document.querySelector('#userEngagementChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Active Users', 'Inactive Users'],
                    datasets: [{
                        data: [data.activeUsers, data.inactiveUsers],
                        backgroundColor: ['rgb(75, 192, 192)', 'rgb(255, 99, 132)']
                    }]
                }
            });
            
            // Poll Categories Chart
            new Chart(document.querySelector('#pollCategoriesChart'), {
                type: 'pie',
                data: {
                    labels: data.pollCategories.labels,
                    datasets: [{
                        data: data.pollCategories.data,
                        backgroundColor: [
                            'rgb(255, 99, 132)',
                            'rgb(54, 162, 235)',
                            'rgb(255, 206, 86)',
                            'rgb(75, 192, 192)'
                        ]
                    }]
                }
            });
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async toggleUserStatus(userId, newStatus) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: newStatus })
            });
            
            if (!response.ok) throw new Error('Failed to update user status');
            
            this.showToast(`User ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
            this.loadUsers();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async updatePollStatus(pollId, newStatus) {
        try {
            const response = await fetch(`/api/admin/polls/${pollId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) throw new Error('Failed to update poll status');
            
            this.showToast('Poll status updated successfully', 'success');
            this.loadPolls();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async deletePoll(pollId) {
        if (!confirm('Are you sure you want to delete this poll?')) return;
        
        try {
            const response = await fetch(`/api/admin/polls/${pollId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!response.ok) throw new Error('Failed to delete poll');
            
            this.showToast('Poll deleted successfully', 'success');
            this.loadPolls();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    filterUsers(query) {
        const rows = document.querySelectorAll('#usersList tr');
        query = query.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }

    filterPolls(query, status = 'all') {
        const rows = document.querySelectorAll('#pollsList tr');
        query = query.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const pollStatus = row.querySelector('.badge').textContent.toLowerCase();
            const matchesQuery = text.includes(query);
            const matchesStatus = status === 'all' || pollStatus === status;
            
            row.style.display = matchesQuery && matchesStatus ? '' : 'none';
        });
    }

    showToast(message, type = 'info') {
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

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Initialize admin dashboard
const admin = new AdminDashboard();
