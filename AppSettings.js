class AppSettings extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.settings = [
      {
        title: 'Configure Loan Holders',
        type: 'configure_loan_holders',
      },
    ];
    this.loanHolders = [
      { name: 'Person 1', enabled: true },
      { name: 'Person 2', enabled: false },
    ];
    this.debounceTimer = null;
  }

  connectedCallback() {
    // Load from localStorage if exists
    const stored = localStorage.getItem('loanHolders');
    if (stored) {
      try {
        this.loanHolders = JSON.parse(stored);
      } catch (e) {}
    }
    this.render();
  }

  saveToLocalStorage() {
    localStorage.setItem('loanHolders', JSON.stringify(this.loanHolders));
  }

  saveToSessionStorage() {
    // Only enabled holders
    const enabledHolders = this.loanHolders.filter(h => h.enabled);
    sessionStorage.setItem('loanHolders', JSON.stringify(enabledHolders));
  }

  handleInputChange(index, value) {
    this.loanHolders[index].name = value;
    this.saveToLocalStorage();
    // Debounce sessionStorage update and render
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.saveToSessionStorage();
      this.render();
    }, 5000);
  }

  handleCheckboxChange(index, checked) {
    this.loanHolders[index].enabled = checked;
    this.saveToLocalStorage();
    this.saveToSessionStorage();
    this.render();
  }

  render() {
    const settingsHtml = this.settings.map(setting => {
      if (setting.type === 'configure_loan_holders') {
        return `
          <div class="card">
            <div class="card-title">${setting.title}</div>
            <div class="card-content" style="--card-bg: var(--loanColour);">
              <div class="loan-holders">
                ${this.loanHolders.map((holder, idx) => `
                  <label class="loan-holder-row">
                    <input type="checkbox" ${holder.enabled ? 'checked' : ''} data-idx="${idx}" />
                    <input type="text" value="${holder.name}" data-idx="${idx}" />
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="globals.css">
      <link rel="stylesheet" href="AppSettings.css">
      <div class="settings-list">
        ${settingsHtml}
      </div>
    `;

    // Add event listeners for checkboxes and text inputs
    this.shadowRoot.querySelectorAll('.loan-holder-row input[type="checkbox"]').forEach(el => {
      el.onchange = (e) => {
        const idx = parseInt(el.getAttribute('data-idx'));
        this.handleCheckboxChange(idx, el.checked);
      };
    });
    this.shadowRoot.querySelectorAll('.loan-holder-row input[type="text"]').forEach(el => {
      el.oninput = (e) => {
        const idx = parseInt(el.getAttribute('data-idx'));
        this.handleInputChange(idx, el.value);
      };
    });
  }
}

customElements.define('app-settings', AppSettings);
