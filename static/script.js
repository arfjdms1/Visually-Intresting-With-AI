document.addEventListener('DOMContentLoaded', () => {
    const app = {
        // No isLoggedIn state needed, the presence of a token is the state.
        elements: {
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
                if (e.target.classList.contains('add-model-button')) this.addModel(e.target.dataset.company);
                if (e.target.classList.contains('delete-model')) this.deleteModel(e.target.dataset.company, e.target.dataset.modelId);
            });
        },
        
        getToken() {
            return sessionStorage.getItem('authToken');
        },

        checkLoginState() {
            const token = this.getToken();
            if (token) {
                this.elements.openLoginBtn.textContent = 'Logout';
                this.elements.openLoginBtn.classList.replace('button-secondary', 'button-primary');
                this.elements.viewSwitcher.classList.remove('hidden');
                this.switchView('admin'); // Default to admin view if logged in
            } else {
                this.elements.openLoginBtn.textContent = 'Admin Login';
                this.elements.openLoginBtn.classList.replace('button-primary', 'button-secondary');
                this.elements.viewSwitcher.classList.add('hidden');
                this.switchView('public'); // Default to public view
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
                // If logged in, the button is a logout button
                sessionStorage.removeItem('authToken');
                this.checkLoginState();
            } else {
                // If logged out, the button opens the login modal
                this.showModal(true);
            }
        },

        async handleLoginAttempt() {
            const formData = new FormData();
            formData.append('username', 'admin'); // Hardcoded username
            formData.append('password', this.elements.passwordInput.value);

            try {
                const response = await fetch('/token', { method: 'POST', body: formData });
                if (!response.ok) {
                    throw new Error('Login failed');
                }
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
                if (isLoggedIn) {
                    this.elements.viewPublicBtn.classList.replace('button-secondary', 'button-primary');
                    this.elements.viewAdminBtn.classList.replace('button-primary', 'button-secondary');
                }
            } else { // Admin view
                this.renderAdminView(data);
                this.elements.adminPanel.classList.remove('hidden');
                this.elements.publicView.classList.add('hidden');
                this.elements.viewAdminBtn.classList.replace('button-secondary', 'button-primary');
                this.elements.viewPublicBtn.classList.replace('button-primary', 'button-secondary');
            }
        },
        
        getAuthHeaders() {
            const token = this.getToken();
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        },

        async fetchData() { /* ... unchanged but using headers ... */ },
        async addCompany() { /* ... unchanged but using headers ... */ },
        async addModel(companyName) { /* ... unchanged but using headers ... */ },
        async deleteModel(companyName, modelId) { /* ... unchanged but using headers ... */ },
        renderAdminView(data) { /* ... same rendering logic ... */ },
        renderPublicView(data) { /* ... same rendering logic ... */ },
    };

    // Methods that need auth headers now get them automatically
    const unchangedMethods = {
        async fetchData() {
            const response = await fetch('/api/data');
            return response.json();
        },
        async addCompany() {
            const companyName = app.elements.newCompanyNameInput.value.trim();
            if (!companyName) return;
            await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json', ...app.getAuthHeaders() }, body: JSON.stringify({ companyName }) });
            app.elements.newCompanyNameInput.value = '';
            app.switchView('admin');
        },
        async addModel(companyName) {
            const name = document.getElementById(`model-name-${companyName}`).value.trim();
            const htmlContent = document.getElementById(`model-html-${companyName}`).value.trim();
            if (!name || !htmlContent) return alert('Model name and HTML content are required.');
            await fetch(`/api/companies/${companyName}/models`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...app.getAuthHeaders() }, body: JSON.stringify({ name, htmlContent }) });
            app.switchView('admin');
        },
        async deleteModel(companyName, modelId) {
            if (!confirm('Are you sure?')) return;
            await fetch(`/api/models/${companyName}/${modelId}`, { method: 'DELETE', headers: app.getAuthHeaders() });
            app.switchView('admin');
        },
        renderAdminView(data) {
            app.elements.adminContainer.innerHTML = '';
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span>${model.name}</span><button class="delete-model" data-company="${companyName}" data-model-id="${model.id}">&times;</button></li>`).join('');
                app.elements.adminContainer.innerHTML += `<div class="company-card"><h3>${companyName}</h3><div class="add-model-form"><input type="text" id="model-name-${companyName}" placeholder="New Model Name"><textarea id="model-html-${companyName}" placeholder="Paste HTML content here..."></textarea><button class="add-model-button button-secondary" data-company="${companyName}">Add Model</button></div><div class="model-list"><ul>${modelListHTML}</ul></div></div>`;
            }
        },
        renderPublicView(data) {
            app.elements.publicContainer.innerHTML = '';
            if (Object.keys(data).length === 0) { app.elements.publicContainer.innerHTML = '<p>No companies have been added yet. An admin can add them.</p>'; return; }
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span class="model-name">${model.name}</span><a href="/models/${model.id}" target="_blank" class="button-primary">What they created</a></li>`).join('');
                app.elements.publicContainer.innerHTML += `<div class="company-card"><h3>${companyName}</h3><div class="model-list"><ul>${modelListHTML}</ul></div></div>`;
            }
        },
    };
    Object.assign(app, unchangedMethods);

    app.init();
});
