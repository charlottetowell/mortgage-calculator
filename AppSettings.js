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
    // Debounce sessionStorage update
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.saveToSessionStorage();
    }, 400);
    this.render();
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
          <div class="setting-group">
            <div class="setting-title">${setting.title}</div>
            <div class="loan-holders">
              ${this.loanHolders.map((holder, idx) => `
                <label class="loan-holder-row">
                  <input type="checkbox" ${holder.enabled ? 'checked' : ''} data-idx="${idx}" />
                  <input type="text" value="${holder.name}" data-idx="${idx}" />
                </label>
              `).join('')}
            </div>
          </div>
        `;
      }
      return '';
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>
        .setting-group { margin-bottom: 1.5em; }
        .setting-title { font-weight: bold; margin-bottom: 0.5em; }
        .loan-holders { display: flex; flex-direction: column; gap: 0.5em; }
        .loan-holder-row { display: flex; align-items: center; gap: 0.5em; }
        input[type="text"] { padding: 0.3em 0.6em; border-radius: 4px; border: 1px solid #ccc; }
      </style>
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
