document.addEventListener('DOMContentLoaded', () => {
    const app = {
        // DOM Elements
        elements: {
            loginSection: document.getElementById('login-section'),
            mainContent: document.getElementById('main-content'),
            loginButton: document.getElementById('login-button'),
            passwordInput: document.getElementById('password'),
            loginError: document.getElementById('login-error'),
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
            this.switchView('public');
        },

        attachEventListeners() {
            this.elements.loginButton.addEventListener('click', () => this.handleLogin());
            this.elements.passwordInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.handleLogin());
            this.elements.viewAdminBtn.addEventListener('click', () => this.switchView('admin'));
            this.elements.viewPublicBtn.addEventListener('click', () => this.switchView('public'));
            this.elements.addCompanyBtn.addEventListener('click', () => this.addCompany());
            this.elements.adminContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-model-button')) {
                    const companyName = e.target.dataset.company;
                    this.addModel(companyName);
                }
                if (e.target.classList.contains('delete-model')) {
                    const companyName = e.target.dataset.company;
                    const modelId = e.target.dataset.modelId;
                    this.deleteModel(companyName, modelId);
                }
            });
        },

        handleLogin() {
            if (this.elements.passwordInput.value === 'admin') {
                this.elements.loginSection.classList.add('hidden');
                this.elements.mainContent.classList.remove('hidden');
                this.switchView('admin');
            } else {
                this.elements.loginError.style.visibility = 'visible';
            }
        },

        async switchView(view) {
            const data = await this.fetchData();
            if (view === 'public') {
                this.renderPublicView(data);
                this.elements.publicView.classList.remove('hidden');
                this.elements.adminPanel.classList.add('hidden');
                this.elements.viewPublicBtn.classList.replace('button-secondary', 'button-primary');
                this.elements.viewAdminBtn.classList.replace('button-primary', 'button-secondary');
            } else {
                this.renderAdminView(data);
                this.elements.adminPanel.classList.remove('hidden');
                this.elements.publicView.classList.add('hidden');
                this.elements.viewAdminBtn.classList.replace('button-secondary', 'button-primary');
                this.elements.viewPublicBtn.classList.replace('button-primary', 'button-secondary');
            }
        },
        
        // --- API Communication ---
        async fetchData() {
            const response = await fetch('/api/data');
            return response.json();
        },

        async addCompany() {
            const companyName = this.elements.newCompanyNameInput.value.trim();
            if (!companyName) return;
            await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName })
            });
            this.elements.newCompanyNameInput.value = '';
            this.switchView('admin');
        },

        async addModel(companyName) {
            const name = document.getElementById(`model-name-${companyName}`).value.trim();
            const htmlContent = document.getElementById(`model-html-${companyName}`).value.trim();
            if (!name || !htmlContent) return alert('Model name and HTML content are required.');
            await fetch(`/api/companies/${companyName}/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, htmlContent })
            });
            this.switchView('admin');
        },

        async deleteModel(companyName, modelId) {
            if (!confirm('Are you sure?')) return;
            await fetch(`/api/models/${companyName}/${modelId}`, { method: 'DELETE' });
            this.switchView('admin');
        },

        // --- Rendering Logic ---
        renderAdminView(data) {
            this.elements.adminContainer.innerHTML = '';
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `
                    <li>
                        <span>${model.name}</span>
                        <button class="delete-model" data-company="${companyName}" data-model-id="${model.id}">&times;</button>
                    </li>`).join('');
                
                this.elements.adminContainer.innerHTML += `
                    <div class="company-card">
                        <h3>${companyName}</h3>
                        <div class="add-model-form admin-form-grid">
                            <input type="text" id="model-name-${companyName}" placeholder="Model Name">
                            <textarea id="model-html-${companyName}" placeholder="Paste HTML content here..."></textarea>
                            <button class="add-model-button button-secondary" data-company="${companyName}">Add Model</button>
                        </div>
                        <div class="model-list"><ul>${modelListHTML}</ul></div>
                    </div>`;
            }
        },

        renderPublicView(data) {
            this.elements.publicContainer.innerHTML = '';
            if (Object.keys(data).length === 0) {
                this.elements.publicContainer.innerHTML = '<p>No companies added yet.</p>';
                return;
            }
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `
                    <li>
                        <span class="model-name">${model.name}</span>
                        <a href="/models/${model.id}" target="_blank" class="button-primary">What they created</a>
                    </li>`).join('');

                this.elements.publicContainer.innerHTML += `
                    <div class="company-card">
                        <h3>${companyName}</h3>
                        <div class="model-list"><ul>${modelListHTML}</ul></div>
                    </div>`;
            }
        }
    };
    app.init();
});

// Add a little extra CSS for the admin form
const style = document.createElement('style');
style.textContent = `
.admin-form-grid { 
    display: grid; 
    grid-template-columns: 1fr; 
    gap: 1rem; 
    margin-bottom: 1rem;
}
.admin-form-grid textarea {
    grid-column: 1 / -1; /* Span full width */
    height: 120px;
    background-color: #2c2c2c;
    border: 1px solid #444;
    color: var(--text-color);
    padding: 0.8rem;
    border-radius: 4px;
    font-size: 0.9rem;
    font-family: monospace;
}
`;
document.head.append(style);