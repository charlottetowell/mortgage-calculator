class CalculationObject extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.title = this.getAttribute('title') || '';
    this.type = this.getAttribute('type') || 'loan';
    this.loanHolders = [];
    this.inputs = {
      amount: '',
      term: '',
      frequency: 'monthly',
      interest: '',
      holders: []
    };
    this.editingTitle = false;
  }

  // Get unique id for this calculation object
  getObjectId() {
    if (!this.parentElement) return `${this.type}-0`;
    const siblings = Array.from(this.parentElement.querySelectorAll('calculation-object[type="' + this.type + '"]'));
    const idx = siblings.indexOf(this);
    return `${this.type}-${idx >= 0 ? idx : 0}`;
  }

  // Save calculation object data to localStorage
  saveToLocalStorage() {
    const id = this.getObjectId();
    const obj = {
      type: this.type,
      id,
      data: { title: this.title, ...this.inputs }
    };
    let stored = localStorage.getItem('calculationObjects');
    let arr = [];
    if (stored) {
      try {
        arr = JSON.parse(stored);
      } catch (e) {}
    }
    const idx = arr.findIndex(o => o.id === id);
    if (idx >= 0) {
      arr[idx] = obj;
    } else {
      arr.push(obj);
    }
    localStorage.setItem('calculationObjects', JSON.stringify(arr));
  }

  connectedCallback() {
    // Load enabled loan holders from localStorage
    const stored = localStorage.getItem('loanHolders');
    if (stored) {
      try {
        this.loanHolders = JSON.parse(stored).filter(h => h.enabled);
      } catch (e) {
        this.loanHolders = [];
      }
    }
    this.render();
  }

  handleInputChange(field, value) {
    this.inputs[field] = value;
    this.saveToLocalStorage();
  }

  handleHolderChange(name, checked) {
    if (checked) {
      if (!this.inputs.holders.includes(name)) {
        this.inputs.holders.push(name);
      }
    } else {
      this.inputs.holders = this.inputs.holders.filter(h => h !== name);
    }
    this.saveToLocalStorage();
  }

  handleTitleEdit() {
    this.editingTitle = true;
    this.render();
    const input = this.shadowRoot.getElementById('edit-title-input');
    if (input) {
      input.focus();
      input.select();
      input.onblur = () => {
        this.title = input.value.trim() || this.title;
        this.editingTitle = false;
        this.saveToLocalStorage();
        this.render();
      };
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
      };
    }
  }

  render() {
    if (this.type === 'loan') {
      this.shadowRoot.innerHTML = `
        <link rel="stylesheet" href="globals.css">
        <link rel="stylesheet" href="CalculationObject.css">
        <div class="card">
          <div class="card-title" style="cursor:pointer;">
            ${this.editingTitle
              ? `<input id="edit-title-input" type="text" value="${this.title}" style="width:100%;background:var(--whiteColour);color:var(--blackColour);font-family:var(--headingFont);font-size:3rem;font-weight:800;border:none;padding:0.5rem 2rem;box-sizing:border-box;border-radius:1rem;" />`
              : `<span id="title-text">${this.title}</span>`}
          </div>
          <div class="card-content" style="--card-bg: var(--loanColour);">
            <div class="inputs-grid">
              <div class="input-group">
                <label for="amount" class="card-input-label">Amount ($):</label>
                <input id="amount" type="number" min="0" value="${this.inputs.amount}" />
              </div>
              <div class="input-group">
                <label for="term" class="card-input-label">Loan Term (yrs):</label>
                <input id="term" type="number" min="1" value="${this.inputs.term}" />
              </div>
              <div class="input-group">
                <label for="frequency" class="card-input-label">Repayment Frequency:</label>
                <select id="frequency">
                  <option value="quarterly" ${this.inputs.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                  <option value="monthly" ${this.inputs.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                  <option value="fortnightly" ${this.inputs.frequency === 'fortnightly' ? 'selected' : ''}>Fortnightly</option>
                  <option value="weekly" ${this.inputs.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                </select>
              </div>
              <div class="input-group">
                <label for="interest" class="card-input-label">Interest Rate p.a. (%):</label>
                <input id="interest" type="number" min="0" step="0.01" value="${this.inputs.interest}" />
              </div>
            </div>
            <div class="holders-list">
              <div class="holders-list-label">Select Loan Holders:</div>
              <div class="holders-list-items">
                ${this.loanHolders.map(holder => `
                  <label>
                    <input type="checkbox" value="${holder.name}" ${this.inputs.holders.includes(holder.name) ? 'checked' : ''} />
                    ${holder.name}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
      // Add event listeners
      const root = this.shadowRoot;
      if (!this.editingTitle) {
        const titleText = root.getElementById('title-text');
        if (titleText) {
          titleText.onclick = () => this.handleTitleEdit();
        }
        // Also allow clicking anywhere on card-title
        const cardTitle = root.querySelector('.card-title');
        if (cardTitle) {
          cardTitle.onclick = () => this.handleTitleEdit();
        }
      }
      root.getElementById('amount').oninput = e => this.handleInputChange('amount', e.target.value);
      root.getElementById('term').oninput = e => this.handleInputChange('term', e.target.value);
      root.getElementById('frequency').onchange = e => this.handleInputChange('frequency', e.target.value);
      root.getElementById('interest').oninput = e => this.handleInputChange('interest', e.target.value);
      root.querySelectorAll('.holders-list input[type="checkbox"]').forEach(el => {
        el.onchange = e => this.handleHolderChange(el.value, el.checked);
      });
    }
    // Savings type will be implemented later
  }
}

customElements.define('calculation-object', CalculationObject);

class Financials extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.calculations = [];
  }

  connectedCallback() {
    this.calculations = [   ];
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="globals.css">
      <link rel="stylesheet" href="CalculationObject.css">
      <div class="financials-header">
        <button id="addLoan">Add Loan</button>
        <button id="addSavings">Add Savings</button>
      </div>
      <div class="financials-list">
        ${this.calculations.map((calc, idx) => `
          <calculation-object title="${calc.title}" type="${calc.type}"></calculation-object>
        `).join('')}
      </div>
    `;
    // Add button event listeners
    this.shadowRoot.getElementById('addLoan').onclick = () => {
      const numLoans = this.calculations.filter(c => c.type === 'loan').length;
      this.calculations.push({ title: `Loan ${numLoans + 1}`, type: 'loan' });
      this.render();
    };
    this.shadowRoot.getElementById('addSavings').onclick = () => {
      const numSavings = this.calculations.filter(c => c.type === 'savings').length;
      this.calculations.push({ title: `Savings ${numSavings + 1}`, type: 'savings' });
      this.render();
    };
  }
}

customElements.define('financials-list', Financials);
