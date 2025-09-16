// --- DYNAMIC PARTICLE BACKGROUND SCRIPT ---
// This runs immediately to set up the animated background.
(function() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        console.error('Particle canvas not found.');
        return;
    }
    const ctx = canvas.getContext('2d');
    let particlesArray;

    function setupCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.color = `rgba(50, 183, 182, ${Math.random() * 0.5 + 0.2})`;
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
            if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
            this.x += this.speedX;
            this.y += this.speedY;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function init() {
        setupCanvas();
        particlesArray = [];
        let numberOfParticles = Math.floor((canvas.height * canvas.width) / 9000);
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
                if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                    opacityValue = 1 - (distance / 20000);
                    ctx.strokeStyle = `rgba(74, 137, 137, ${opacityValue})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesArray.forEach(p => { p.update(); p.draw(); });
        connect();
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', init);
    init();
    animate();
})();


// --- MAIN APPLICATION LOGIC ---
// This runs after the main HTML document has been loaded.
document.addEventListener('DOMContentLoaded', () => {
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
                const addBtn = e.target.closest('.add-model-button');
                const delBtn = e.target.closest('.delete-model');
                if (addBtn) this.addModel(addBtn.dataset.company);
                if (delBtn) this.deleteModel(delBtn.dataset.company, delBtn.dataset.modelId);
            });
        },

        handleHeaderScroll() {
            if (window.scrollY > 10) this.elements.siteHeader.classList.add('scrolled');
            else this.elements.siteHeader.classList.remove('scrolled');
        },

        applyFadeInAnimation(container) {
            container.childNodes.forEach((child, index) => {
                if (child.nodeType === 1) { // Check if it's an element
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
            if (!confirm('Are you sure you want to delete this model?')) return;
            await fetch(`/api/models/${companyName}/${modelId}`, { method: 'DELETE', headers: this.getAuthHeaders() });
            this.switchView('admin');
        },

        renderAdminView(data) {
            this.elements.adminContainer.innerHTML = '';
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span class="model-name">${model.name}</span><button class="delete-model" data-company="${companyName}" data-model-id="${model.id}">&times;</button></li>`).join('');
                this.elements.adminContainer.innerHTML += `<div class="company-card"><h3>${companyName}</h3><div class="add-model-form"><input type="text" id="model-name-${companyName}" placeholder="New Model Name" class="ui-input"><textarea id="model-html-${companyName}" placeholder="Paste model HTML payload..."></textarea><button class="ui-button btn-gradient add-model-button" data-company="${companyName}"><span>Add Model</span></button></div><div class="model-list"><ul>${modelListHTML}</ul></div></div>`;
            }
            this.applyFadeInAnimation(this.elements.adminContainer);
        },

        renderPublicView(data) {
            this.elements.publicContainer.innerHTML = '';
            if (Object.keys(data).length === 0) {
                this.elements.publicContainer.innerHTML = '<div class="ui-panel" style="text-align: center; color: var(--text-secondary);">No models have been registered yet. An admin can add them.</div>';
                return;
            }
            for (const [companyName, models] of Object.entries(data)) {
                const modelListHTML = models.map(model => `<li><span class="model-name">${model.name}</span><a href="/models/${model.id}" target="_blank" class="ui-button btn-secondary">View Payload</a></li>`).join('');
                this.elements.publicContainer.innerHTML += `<div class="company-card"><h3>${companyName}</h3><div class="model-list"><ul>${modelListHTML}</ul></div></div>`;
            }
            this.applyFadeInAnimation(this.elements.publicContainer);
        },
    };

    app.init();
});