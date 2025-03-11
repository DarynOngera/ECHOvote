class Polls {
    constructor() {
        this.setupEventListeners();
        // Initialize if we're on the home page
        if (window.location.hash === '' || window.location.hash === '#home') {
            this.showPolls();
        }
    }

    setupEventListeners() {
        // Create poll form
        const createPollForm = document.querySelector('#createPollForm form');
        if (createPollForm) {
            createPollForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createPoll(e.target);
            });

            // Add option button
            document.querySelector('#addOption')?.addEventListener('click', () => {
                const optionsDiv = document.querySelector('#pollOptions');
                const newOption = document.createElement('div');
                newOption.className = 'mb-3';
                newOption.innerHTML = `
                    <div class="input-group">
                        <input type="text" class="form-control" placeholder="Option ${optionsDiv.children.length + 1}" required>
                        <button type="button" class="btn btn-outline-danger" onclick="polls.removeOption(this)">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
                optionsDiv.appendChild(newOption);
            });
        }
    }

    removeOption(button) {
        const optionDiv = button.closest('.mb-3');
        if (document.querySelectorAll('#pollOptions .mb-3').length > 2) {
            optionDiv.remove();
            // Update placeholders
            document.querySelectorAll('#pollOptions input[type="text"]').forEach((input, index) => {
                input.placeholder = `Option ${index + 1}`;
            });
        } else {
            showToast('A poll must have at least 2 options', 'warning');
        }
    }

    async createPoll(form) {
        try {
            const title = form.querySelector('input[type="text"]').value.trim();
            const description = form.querySelector('textarea').value.trim();
            const endDate = form.querySelector('#endDate').value;
            const options = Array.from(form.querySelectorAll('#pollOptions input[type="text"]'))
                .map(input => input.value.trim())
                .filter(value => value);

            if (options.length < 2) {
                showToast('Please provide at least 2 options', 'warning');
                return;
            }

            const response = await fetch('/api/polls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...auth.getAuthHeader()
                },
                body: JSON.stringify({
                    title,
                    description,
                    options,
                    endDate: endDate || null
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            showToast('Poll created successfully!', 'success');
            form.reset();
            window.location.hash = 'home';
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async showPolls() {
        try {
            const response = await fetch('/api/polls', {
                headers: auth.getAuthHeader()
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            const pollsList = document.querySelector('#pollsList');
            if (!pollsList) return;

            pollsList.innerHTML = '';

            if (data.length === 0) {
                pollsList.innerHTML = `
                    <div class="col-12 text-center">
                        <div class="card shadow-sm">
                            <div class="card-body">
                                <h3><i class="bi bi-emoji-neutral me-2"></i>No Polls Yet</h3>
                                <p class="text-muted">Be the first to create a poll!</p>
                                <a href="#create" class="btn btn-primary">
                                    <i class="bi bi-plus-circle me-2"></i>Create Poll
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            data.forEach(poll => {
                const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                const hasVoted = auth.isAuthenticated() && poll.voters.includes(auth.user._id);
                const isCreator = auth.isAuthenticated() && poll.creator._id === auth.user._id;
                const isActive = !poll.endDate || new Date(poll.endDate) > new Date();

                const pollCard = document.createElement('div');
                pollCard.className = 'col-md-6 col-lg-4 mb-4 fade-in';
                pollCard.innerHTML = `
                    <div class="card h-100 shadow-sm">
                        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">${poll.title}</h5>
                            ${isCreator ? `
                                <button class="btn btn-sm btn-light" onclick="polls.deletePoll('${poll._id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="card-body">
                            <p class="text-muted mb-3">${poll.description || 'No description provided.'}</p>
                            <div class="options-list">
                                ${poll.options.map(option => {
                                    const percentage = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0;
                                    return `
                                        <div class="mb-3">
                                            <div class="d-flex justify-content-between mb-1">
                                                <span>${option.text}</span>
                                                <span class="text-muted">${option.votes} votes (${percentage}%)</span>
                                            </div>
                                            <div class="progress" style="height: 10px;">
                                                <div class="progress-bar" role="progressbar" 
                                                    style="width: ${percentage}%" 
                                                    aria-valuenow="${percentage}" 
                                                    aria-valuemin="0" 
                                                    aria-valuemax="100">
                                                </div>
                                            </div>
                                            ${!hasVoted && isActive && auth.isAuthenticated() ? `
                                                <button class="btn btn-outline-primary btn-sm mt-2 w-100" 
                                                    onclick="polls.vote('${poll._id}', '${option._id}')">
                                                    <i class="bi bi-check2-circle me-1"></i>Vote
                                                </button>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div class="mt-3">
                                <small class="text-muted">
                                    <i class="bi bi-person-circle me-1"></i>Created by ${poll.creator.username}
                                </small>
                                ${poll.endDate ? `
                                    <br>
                                    <small class="text-muted">
                                        <i class="bi bi-clock me-1"></i>Ends at ${new Date(poll.endDate).toLocaleString()}
                                    </small>
                                ` : ''}
                            </div>
                        </div>
                        <div class="card-footer bg-light">
                            <small class="text-muted">
                                <i class="bi bi-bar-chart-fill me-1"></i>${totalVotes} total votes
                            </small>
                        </div>
                    </div>
                `;
                pollsList.appendChild(pollCard);
            });
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async vote(pollId, optionId) {
        if (!auth.isAuthenticated()) {
            showToast('Please login to vote', 'warning');
            window.location.hash = 'login';
            return;
        }

        try {
            const response = await fetch(`/api/polls/${pollId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...auth.getAuthHeader()
                },
                body: JSON.stringify({ optionId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            showToast('Vote recorded successfully!', 'success');
            this.showPolls();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async deletePoll(pollId) {
        if (!confirm('Are you sure you want to delete this poll?')) return;

        try {
            const response = await fetch(`/api/polls/${pollId}`, {
                method: 'DELETE',
                headers: auth.getAuthHeader()
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message);
            }

            showToast('Poll deleted successfully!', 'success');
            this.showPolls();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

// Initialize polls
const polls = new Polls();
