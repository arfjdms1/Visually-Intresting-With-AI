/**
 * Main application script for the AI Model Showcase.
 * Handles:
 * - Token-based authentication (JWT).
 * - Toggling between public and admin views.
 * - All API communication with the FastAPI backend.
 * - Rendering of dynamic content.
 * - UI enhancements and animations.
 */
document.addEventListener('DOMContentLoaded', () => {
    const app = {
        // --- DOM Element Cache ---
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
        
        // --- App Initialization ---
        init() {
            this.attachEventListeners();
            this.checkLoginState();
        },

        // --- Event Listener Setup ---
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
        
        // --- Authentication & Token Handling ---
        getToken() {
            return sessionStorage.getItem('authToken');
        },

        checkLoginState() {
            const token = this.getToken();
            if (token) {
                this.elements.openLoginBtn.textContent = '[ LOGOUT ]';
                this.elements.viewSwitcher.classList.remove('hidden');
                this.switchView('admin');
            } else {
                this.elements.openLoginBtn.textContent = '[ SECURE LOGIN ]';
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

        // --- View Management ---
        async switchView(view) {
            const data = await this.fetchData();
            const isLoggedIn = !!this.getToken();

            if (view === 'public' || !isLoggedIn) {
                this.renderPublicView(data);
                this.elements.publicView.classList.remove('hidden');
                this.elements.adminPanel.classList.add('hidden');
                if (isLoggedIn) {
                    this.elements.viewPublicBtn.classList.remove('inactive');
                    this.elements.viewAdminBtn.classList.add('inactive');
                }
            } else { // Admin view
                this.renderAdminView(data);
                this.elements.adminPanel.classList.remove('hidden');
                this.elements.publicView.classList.add('hidden');
                this.elements.viewAdminBtn.classList.remove('inactive');
                this.elements.viewPublicBtn.classList.add('inactive');
            }
        },
        
        // --- API Communication ---
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
            if (!name || !htmlContent) return alert('ERROR: ENTITY NAME AND PAYLOAD REQUIRED.');
            await fetch(`/api/companies/${companyName}/models`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders() }, body: JSON.stringify({ name, htmlContent }) });
            this.switchView('admin');
        },

        async deleteModel(companyName, modelId) {
            if (!confirm('CONFIRM DELETION?')) return;
            await fetch(`/api/models/${companyName}/${modelId}`, { method: 'DELETE', headers: this.getAuthHeaders() });
            this.switchView('admin');
        },

        // --- Dynamic Rendering ---
        renderAdminView(data) {
            this.elements.adminContainer.innerHTML = '';
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span>${model.name}</span><button class="delete-model" data-company="${companyName}" data-model-id="${model.id}">[ X ]</button></li>`).join('');
                this.elements.adminContainer.innerHTML += `
                    <div class="company-card">
                        <h3>// ENTITY: ${companyName}</h3>
                        <div class="add-model-form">
                            <input type="text" id="model-name-${companyName}" placeholder="REGISTER NEW MODEL..." class="ui-input">
                            <textarea id="model-html-${companyName}" placeholder="PASTE MODEL HTML PAYLOAD HERE..."></textarea>
                            <button class="add-model-button ui-button" data-company="${companyName}">[ SUBMIT ]</button>
                        </div>
                        <div class="model-list">
                            <h4>// REGISTERED MODELS</h4>
                            <ul>${modelListHTML}</ul>
                        </div>
                    </div>`;
            }
        },

        renderPublicView(data) {
            this.elements.publicContainer.innerHTML = '';
            if (Object.keys(data).length === 0) { 
                this.elements.publicContainer.innerHTML = '<p>> NO ENTITIES IN REGISTRY. AWAITING ADMIN INPUT...</p>'; 
                return; 
            }
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span class="model-name">${model.name}</span><a href="/models/${model.id}" target="_blank" class="ui-button">[ VIEW PAYLOAD ]</a></li>`).join('');
                this.elements.publicContainer.innerHTML += `
                    <div class="company-card">
                        <h3>// ENTITY: ${companyName}</h3>
                        <div class="model-list"><ul>${modelListHTML}</ul></div>
                    </div>`;
            }
        },
    };

    // Initialize the application
    app.init();
});


// --- UI Enhancement Functions for Animations ---
function applyIntroAnimation() {
    const title = document.getElementById('site-title');
    if (title) {
        // Ensure animation only runs once by removing and re-adding the element to restart CSS animation
        const newTitle = title.cloneNode(true);
        title.parentNode.replaceChild(newTitle, title);
        newTitle.classList.add('text-flicker-in-glow');
    }
}

// Apply animations when the page is fully loaded
window.addEventListener('load', applyIntroAnimation);
