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
        <link rel="stylesheet" href="globals.css">
        <link rel="stylesheet" href="CalculationObject.css">
        <div class="card">
          <div class="card-title">${this.title}</div>
          <div class="card-content" style="--card-bg: var(--loanColour);">
            <div class="inputs-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
              <div class="input-group">
                <label for="amount">Amount ($):</label>
                <input id="amount" type="number" min="0" value="${this.inputs.amount}" />
              </div>
              <div class="input-group">
                <label for="term">Loan Term (yrs):</label>
                <input id="term" type="number" min="1" value="${this.inputs.term}" />
              </div>
              <div class="input-group">
                <label for="frequency">Repayment Frequency:</label>
                <select id="frequency">
                  <option value="quarterly" ${this.inputs.frequency === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                  <option value="monthly" ${this.inputs.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                  <option value="fortnightly" ${this.inputs.frequency === 'fortnightly' ? 'selected' : ''}>Fortnightly</option>
                  <option value="weekly" ${this.inputs.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                </select>
              </div>
              <div class="input-group">
                <label for="interest">Interest Rate p.a. (%):</label>
                <input id="interest" type="number" min="0" step="0.01" value="${this.inputs.interest}" />
              </div>
            </div>
            <div class="holders-list" style="margin-top:2rem;">
              <div style="font-weight:600; margin-bottom:0.7rem;">Select Loan Holders:</div>
              <div style="display:flex; flex-wrap:wrap; gap:1.5rem;">
                ${this.loanHolders.map(holder => `
                  <label style="display:flex; align-items:center; font-size:2rem;">
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
