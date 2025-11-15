class AppMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.menuOpen = false;
    this.menuItems = [];
    this.title = 'Finance Calculator';
    this.logo = '';
    this.credit = {
      github: 'https://github.com/charlottetowell',
      text: 'by @charlottetowell',
    };
  }

  static get observedAttributes() {
    return ['title', 'logo'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'title') this.title = newValue;
    if (name === 'logo') this.logo = newValue;
    this.render();
  }

  set items(val) {
    this.menuItems = val;
    this.render();
  }

  connectedCallback() {
    // Parse menu items from data-items attribute if present
    const itemsAttr = this.getAttribute('data-items');
    if (itemsAttr) {
      try {
        this.menuItems = JSON.parse(itemsAttr);
      } catch (e) {
        this.menuItems = [];
      }
    }
    this.render();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.render();
  }

  goToMenu(item) {
    // Update search param 'menu' in URL
    const url = new URL(window.location);
    url.searchParams.set('menu', item.destination);
    window.history.replaceState({}, '', url);
    this.render();
    console.log('Go to menu:', item.title);
  }

  render() {

    // Get current menu from search param
    const url = new URL(window.location);
    let currentMenu = url.searchParams.get('menu');
    if (!currentMenu && this.menuItems.length > 0) {
      currentMenu = this.menuItems[0].destination;
      url.searchParams.set('menu', currentMenu);
      window.history.replaceState({}, '', url);
    }

    const menuList = this.menuOpen ? `
      <div class="menu-list">
        ${this.menuItems.map(item => `
          <div class="menu-item${item.destination === currentMenu ? ' current' : ''}" data-title="${item.title}"> > ${item.title}</div>
        `).join('')}
        <div class="credit">
          <svg class="github-logo" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="48" width="48"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.65 7.65 0 012-.27c.68.003 1.36.092 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          <a href="${this.credit.github}" target="_blank" rel="noopener">
            ${this.credit.text}
          </a>
        </div>
      </div>
      <div class="menu-overlay"></div>
    ` : '';

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="AppMenu.css">
      <div class="menu-bar">
        <div class="hamburger" id="hamburger" title="Menu">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="title">
          ${this.title}
        </div>
      </div>
      ${menuList}
    `;

    // Hamburger click
    this.shadowRoot.getElementById('hamburger').onclick = () => this.toggleMenu();
    // Menu item click
    if (this.menuOpen) {
      this.shadowRoot.querySelectorAll('.menu-item').forEach(el => {
        el.onclick = () => {
          const title = el.getAttribute('data-title');
          const item = this.menuItems.find(i => i.title === title);
          this.goToMenu(item);
          this.toggleMenu();
        };
      });
    }
  }
}

customElements.define('app-menu', AppMenu);