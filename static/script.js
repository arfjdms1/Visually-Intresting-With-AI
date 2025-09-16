document.addEventListener('DOMContentLoaded', () => {
    // All application logic is now cleanly contained within this single object.
    const app = {
        elements: {
            siteHeader: document.getElementById('site-header'),
            loginModalOverlay: document.getElementById('login-modal-overlay'),
            openLoginBtn: document.getElementById('open-login-button'),
            closeModalBtn: document.getElementById('close-modal-button'),
            passwordInput: document.getElementById('password'),
            loginButton: document.getElementById('login-button'),
            loginError: document.getElementById('login-error'),
            viewSwitcher: document.getElementById('view-switcher'),
            viewAdminBtn: document.getElementById('view-admin-button'),
            viewPublicBtn: document.getElementById('view-public-button'),
            adminPanel: document.getElementById('admin-panel'),
            publicView: document.getElementById('public-view'),
            addCompanyBtn: document.getElementById('add-company-button'),
            newCompanyNameInput: document.getElementById('new-company-name'),
            adminContainer: document.getElementById('companies-container-admin'),
            publicContainer: document.getElementById('companies-container-public'),
        },
        
        init() {
            this.attachEventListeners();
            this.checkLoginState();
        },

        attachEventListeners() {
            window.addEventListener('scroll', () => this.handleHeaderScroll());
            this.elements.openLoginBtn.addEventListener('click', () => this.handleAuthAction());
            this.elements.closeModalBtn.addEventListener('click', () => this.showModal(false));
            this.elements.loginModalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.loginModalOverlay) this.showModal(false);
            });
            this.elements.loginButton.addEventListener('click', () => this.handleLoginAttempt());
            this.elements.passwordInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.handleLoginAttempt());
            this.elements.viewAdminBtn.addEventListener('click', () => this.switchView('admin'));
            this.elements.viewPublicBtn.addEventListener('click', () => this.switchView('public'));
            this.elements.addCompanyBtn.addEventListener('click', () => this.addCompany());
            this.elements.adminContainer.addEventListener('click', (e) => {
                if (e.target.closest('.add-model-button')) this.addModel(e.target.closest('.add-model-button').dataset.company);
                if (e.target.classList.contains('delete-model')) this.deleteModel(e.target.dataset.company, e.target.dataset.modelId);
            });
        },
        
        handleHeaderScroll() {
            if (window.scrollY > 10) {
                this.elements.siteHeader.classList.add('scrolled');
            } else {
                this.elements.siteHeader.classList.remove('scrolled');
            }
        },
        
        applyFadeInAnimation(container) {
            container.childNodes.forEach((child, index) => {
                if (child.nodeType === 1) {
                    child.style.animationDelay = `${index * 100}ms`;
                    child.classList.add('fade-in');
                }
            });
        },

        getToken() { return sessionStorage.getItem('authToken'); },

        checkLoginState() {
            const token = this.getToken();
            if (token) {
                this.elements.openLoginBtn.textContent = 'Logout';
                this.elements.openLoginBtn.classList.remove('btn-secondary');
                this.elements.openLoginBtn.classList.add('btn-gradient');
                this.elements.viewSwitcher.classList.remove('hidden');
                this.switchView('admin');
            } else {
                this.elements.openLoginBtn.textContent = 'Admin Login';
                this.elements.openLoginBtn.classList.add('btn-secondary');
                this.elements.openLoginBtn.classList.remove('btn-gradient');
                this.elements.viewSwitcher.classList.add('hidden');
                this.switchView('public');
            }
        },

        showModal(show) {
            this.elements.loginModalOverlay.classList.toggle('hidden', !show);
            if (show) {
                this.elements.passwordInput.focus();
                this.elements.loginError.style.visibility = 'hidden';
            }
        },

        handleAuthAction() {
            if (this.getToken()) {
                sessionStorage.removeItem('authToken');
                this.checkLoginState();
            } else {
                this.showModal(true);
            }
        },

        async handleLoginAttempt() {
            const formData = new FormData();
            formData.append('username', 'admin');
            formData.append('password', this.elements.passwordInput.value);
            try {
                const response = await fetch('/token', { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Login failed');
                const data = await response.json();
                sessionStorage.setItem('authToken', data.access_token);
                this.elements.passwordInput.value = '';
                this.showModal(false);
                this.checkLoginState();
            } catch (error) {
                this.elements.loginError.style.visibility = 'visible';
            }
        },

        async switchView(view) {
            const data = await this.fetchData();
            const isLoggedIn = !!this.getToken();
            if (view === 'public' || !isLoggedIn) {
                this.renderPublicView(data);
                this.elements.publicView.classList.remove('hidden');
                this.elements.adminPanel.classList.add('hidden');
            } else {
                this.renderAdminView(data);
                this.elements.adminPanel.classList.remove('hidden');
                this.elements.publicView.classList.add('hidden');
            }
        },

        getAuthHeaders() {
            const token = this.getToken();
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        },

        async fetchData() {
            const response = await fetch('/api/data');
            return response.json();
        },

        async addCompany() {
            const companyName = this.elements.newCompanyNameInput.value.trim();
            if (!companyName) return;
            await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() }, body: JSON.stringify({ companyName }) });
            this.elements.newCompanyNameInput.value = '';
            this.switchView('admin');
        },

        async addModel(companyName) {
            const name = document.getElementById(`model-name-${companyName}`).value.trim();
            const htmlContent = document.getElementById(`model-html-${companyName}`).value.trim();
            if (!name || !htmlContent) return alert('Model name and HTML content are required.');
            await fetch(`/api/companies/${companyName}/models`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() }, body: JSON.stringify({ name, htmlContent }) });
            this.switchView('admin');
        },

        async deleteModel(companyName, modelId) {
            if (!confirm('Are you sure?')) return;
            await fetch(`/api/models/${companyName}/${modelId}`, { method: 'DELETE', headers: this.getAuthHeaders() });
            this.switchView('admin');
        },

        renderAdminView(data) {
            this.elements.adminContainer.innerHTML = '';
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span>${model.name}</span><button class="delete-model" data-company="${companyName}" data-model-id="${model.id}">&times;</button></li>`).join('');
                this.elements.adminContainer.innerHTML += `<div class="company-card"><h3>${companyName}</h3><div class="add-model-form"><input type="text" id="model-name-${companyName}" placeholder="New Model Name" class="ui-input"><textarea id="model-html-${companyName}" placeholder="Paste model HTML payload..."></textarea><button class="ui-button btn-gradient add-model-button" data-company="${companyName}"><span>Add Model</span></button></div><div class="model-list"><ul>${modelListHTML}</ul></div></div>`;
            }
            this.applyFadeInAnimation(this.elements.adminContainer);
        },

        renderPublicView(data) {
            this.elements.publicContainer.innerHTML = '';
            if (Object.keys(data).length === 0) {
                this.elements.publicContainer.innerHTML = '<div class="ui-panel" style="text-align: center; color: var(--text-secondary);">No models have been registered yet.</div>';
                return;
            }
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span class="model-name">${model.name}</span><a href="/models/${model.id}" target="_blank" class="ui-button btn-secondary">View Payload</a></li>`).join('');
                this.elements.publicContainer.innerHTML += `<div class="company-card"><h3>${companyName}</h3><div class="model-list"><ul>${modelListHTML}</ul></div></div>`;
            }
            this.applyFadeInAnimation(this.elements.publicContainer);
        },
    };

    // Initialize the application
    app.init();
});
