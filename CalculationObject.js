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
  }

  handleHolderChange(name, checked) {
    if (checked) {
      if (!this.inputs.holders.includes(name)) {
        this.inputs.holders.push(name);
      }
    } else {
      this.inputs.holders = this.inputs.holders.filter(h => h !== name);
    }
  }

  render() {
    if (this.type === 'loan') {
      this.shadowRoot.innerHTML = `
        <style>
          .card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fff; }
          .card-title { font-weight: bold; margin-bottom: 8px; }
          .input-row { margin-bottom: 8px; }
          .holders-list { margin-top: 8px; }
        </style>
        <div class="card">
          <div class="card-title">${this.title}</div>
          <div class="input-row">
            <label>Amount ($): <input type="number" min="0" value="${this.inputs.amount}" /></label>
          </div>
          <div class="input-row">
            <label>Loan Term (yrs): <input type="number" min="1" value="${this.inputs.term}" /></label>
          </div>
          <div class="input-row">
            <label>Repayment Frequency:
              <select>
                <option value="quarterly">Quarterly</option>
                <option value="monthly" selected>Monthly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
          </div>
          <div class="input-row">
            <label>Interest Rate p.a. (%): <input type="number" min="0" step="0.01" value="${this.inputs.interest}" /></label>
          </div>
          <div class="holders-list">
            <div>Select Loan Holders:</div>
            ${this.loanHolders.map(holder => `
              <label>
                <input type="checkbox" value="${holder.name}" ${this.inputs.holders.includes(holder.name) ? 'checked' : ''} />
                ${holder.name}
              </label>
            `).join('')}
          </div>
        </div>
      `;
      // Add event listeners
      const root = this.shadowRoot;
      root.querySelector('input[type="number"][min="0"]').oninput = e => this.handleInputChange('amount', e.target.value);
      root.querySelector('input[type="number"][min="1"]').oninput = e => this.handleInputChange('term', e.target.value);
      root.querySelector('select').onchange = e => this.handleInputChange('frequency', e.target.value);
      root.querySelector('input[type="number"][step="0.01"]').oninput = e => this.handleInputChange('interest', e.target.value);
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
