document.addEventListener('DOMContentLoaded', () => {
    const app = {
        isLoggedIn: false,
        // DOM Elements
        elements: {
            // New modal elements
            loginModalOverlay: document.getElementById('login-modal-overlay'),
            openLoginBtn: document.getElementById('open-login-button'),
            closeModalBtn: document.getElementById('close-modal-button'),
            
            // Existing elements
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
            this.switchView('public'); // Default to public view on load
        },

        attachEventListeners() {
            // Modal controls
            this.elements.openLoginBtn.addEventListener('click', () => this.showModal(true));
            this.elements.closeModalBtn.addEventListener('click', () => this.showModal(false));
            this.elements.loginModalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.loginModalOverlay) this.showModal(false);
            });

            // Login logic
            this.elements.loginButton.addEventListener('click', () => this.handleLogin());
            this.elements.passwordInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.handleLogin());
            
            // View switcher
            this.elements.viewAdminBtn.addEventListener('click', () => this.switchView('admin'));
            this.elements.viewPublicBtn.addEventListener('click', () => this.switchView('public'));
            
            // Admin actions
            this.elements.addCompanyBtn.addEventListener('click', () => this.addCompany());
            this.elements.adminContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-model-button')) this.addModel(e.target.dataset.company);
                if (e.target.classList.contains('delete-model')) this.deleteModel(e.target.dataset.company, e.target.dataset.modelId);
            });
        },
        
        showModal(show) {
            this.elements.loginModalOverlay.classList.toggle('hidden', !show);
        },

        handleLogin() {
            if (this.elements.passwordInput.value === 'admin') {
                this.isLoggedIn = true;
                this.showModal(false);
                this.elements.openLoginBtn.classList.add('hidden'); // Hide login button
                this.elements.viewSwitcher.classList.remove('hidden'); // Show view switcher
                this.switchView('admin');
            } else {
                this.elements.loginError.style.visibility = 'visible';
                this.elements.passwordInput.value = '';
            }
        },

        async switchView(view) {
            const data = await this.fetchData();
            if (view === 'public' || !this.isLoggedIn) {
                this.renderPublicView(data);
                this.elements.publicView.classList.remove('hidden');
                this.elements.adminPanel.classList.add('hidden');
                if (this.isLoggedIn) {
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
        
        async fetchData() { /* ... unchanged ... */ },
        async addCompany() { /* ... unchanged ... */ },
        async addModel(companyName) { /* ... unchanged ... */ },
        async deleteModel(companyName, modelId) { /* ... unchanged ... */ },
        renderAdminView(data) { /* ... unchanged ... */ },
        renderPublicView(data) { /* ... unchanged ... */ },
    };

    // Copy the unchanged methods from the previous script.js version
    const unchangedMethods = {
        async fetchData() {
            const response = await fetch('/api/data');
            return response.json();
        },
        async addCompany() {
            const companyName = app.elements.newCompanyNameInput.value.trim();
            if (!companyName) return;
            await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyName }) });
            app.elements.newCompanyNameInput.value = '';
            app.switchView('admin');
        },
        async addModel(companyName) {
            const name = document.getElementById(`model-name-${companyName}`).value.trim();
            const htmlContent = document.getElementById(`model-html-${companyName}`).value.trim();
            if (!name || !htmlContent) return alert('Model name and HTML content are required.');
            await fetch(`/api/companies/${companyName}/models`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, htmlContent }) });
            app.switchView('admin');
        },
        async deleteModel(companyName, modelId) {
            if (!confirm('Are you sure?')) return;
            await fetch(`/api/models/${companyName}/${modelId}`, { method: 'DELETE' });
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