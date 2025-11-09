// --- Mortgage Calculator Logic ---

// DOM elements
const loanAmountEl = document.getElementById("loanAmount");
const interestRateEl = document.getElementById("interestRate");
const loanTermEl = document.getElementById("loanTerm");
const repaymentFrequencyEl = document.getElementById("repaymentFrequency");
const repaymentResultEl = document.getElementById("repaymentResult");

const extraRepaymentEl = document.getElementById("extraRepayment");
const initialOffsetEl = document.getElementById("initialOffset");
const offsetContributionEl = document.getElementById("offsetContribution");

const extraFrequencyLabel = document.getElementById("extraFrequencyLabel");
const offsetFrequencyLabel = document.getElementById("offsetFrequencyLabel");

// --- Event listeners for auto-calculation ---
[
  loanAmountEl,
  interestRateEl,
  loanTermEl,
  repaymentFrequencyEl,
  extraRepaymentEl,
  initialOffsetEl,
  offsetContributionEl,
].forEach((el) => el.addEventListener("input", calculateAndRender));

repaymentFrequencyEl.addEventListener("change", () => {
  const freq = repaymentFrequencyEl.value;
  extraFrequencyLabel.textContent = freq;
  offsetFrequencyLabel.textContent = freq;
  calculateAndRender();
});

// --- Core calculation ---
function calculateAndRender() {
  const loanAmount = parseFloat(loanAmountEl.value);
  const annualRate = parseFloat(interestRateEl.value) / 100;
  const years = parseFloat(loanTermEl.value);
  const frequency = repaymentFrequencyEl.value;

  const extraRepayment = parseFloat(extraRepaymentEl.value) || 0;
  const initialOffset = parseFloat(initialOffsetEl.value) || 0;
  const offsetContribution = parseFloat(offsetContributionEl.value) || 0;

  if (isNaN(loanAmount) || isNaN(annualRate) || isNaN(years)) {
    repaymentResultEl.textContent = "⚠️ Please enter valid loan details.";
    return;
  }

  // Determine payments per year
  let paymentsPerYear;
  switch (frequency) {
    case "weekly":
      paymentsPerYear = 52;
      break;
    case "fortnightly":
      paymentsPerYear = 26;
      break;
    default:
      paymentsPerYear = 12;
  }

  const periodicRate = annualRate / paymentsPerYear;
  const totalPayments = years * paymentsPerYear;

  // Minimum repayment (standard amortization formula)
  const minRepayment =
    (loanAmount * periodicRate) / (1 - Math.pow(1 + periodicRate, -totalPayments));

  repaymentResultEl.textContent = `Minimum ${frequency} repayment: $${minRepayment.toFixed(
    2
  )}`;

  // Simulate both loan scenarios
  const baseline = simulateLoan({
    principal: loanAmount,
    rate: periodicRate,
    repayment: minRepayment,
    paymentsPerYear,
  });

  const accelerated = simulateLoan({
    principal: loanAmount,
    rate: periodicRate,
    repayment: minRepayment + extraRepayment,
    paymentsPerYear,
    initialOffset,
    offsetContribution,
  });

  renderCharts(baseline, accelerated, paymentsPerYear);
}

// --- Amortization simulation ---
function simulateLoan({
  principal,
  rate,
  repayment,
  paymentsPerYear,
  initialOffset = 0,
  offsetContribution = 0,
}) {
  let balance = principal;
  let offset = initialOffset;
  let balances = [balance];
  let years = [0];
  let period = 0;

  // Simulate until balance is cleared or 40 years max to prevent infinite loop
  while (balance > 0 && period < paymentsPerYear * 40) {
    // Interest applies to net balance minus offset
    const effectiveBalance = Math.max(balance - offset, 0);
    const interest = effectiveBalance * rate;

    // Apply payment
    balance = balance + interest - repayment;
    if (balance < 0) balance = 0;

    // Offset grows
    offset += offsetContribution;

    // Record annually
    if (period % paymentsPerYear === 0) {
      years.push(period / paymentsPerYear);
      balances.push(balance);
    }

    period++;
  }

  // Final record if needed
  if (balances[balances.length - 1] !== 0) {
    years.push(period / paymentsPerYear);
    balances.push(0);
  }

  return { years, balances };
}

// --- Chart rendering ---
function renderCharts(baseline, accelerated, paymentsPerYear) {
  if (window.loanChartInstance) window.loanChartInstance.destroy();
  if (window.offsetChartInstance) window.offsetChartInstance.destroy();

  const ctx1 = document.getElementById("loanChart").getContext("2d");
  const ctx2 = document.getElementById("offsetChart").getContext("2d");

  // --- Chart 1: Loan Balance Comparison ---
  window.loanChartInstance = new Chart(ctx1, {
    type: "line",
    data: {
      labels: baseline.years,
      datasets: [
        {
          label: "Original Loan (Min Repayments)",
          data: baseline.balances,
          borderColor: "blue",
          borderWidth: 2,
          fill: false,
        },
        {
          label: "With Extra & Offset",
          data: accelerated.balances,
          borderColor: "green",
          borderWidth: 2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Loan Balance Over Time" },
      },
      scales: {
        x: { title: { display: true, text: "Years" } },
        y: { title: { display: true, text: "Loan Balance ($)" } },
      },
    },
  });

  // --- Chart 2: Offset Balance Growth ---
  const years = accelerated.years;
  const offsetData = years.map(
    (y, i) => accelerated.balances[0] - accelerated.balances[i]
  ); // placeholder for visualization

  window.offsetChartInstance = new Chart(ctx2, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Offset Balance ($)",
          data: offsetData,
          borderWidth: 2,
          borderColor: "orange",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Offset Balance Over Time" },
      },
      scales: {
        x: { title: { display: true, text: "Years" } },
        y: { title: { display: true, text: "Offset Balance" } },
      },
    },
  });
}

// --- Load Chart.js dynamically ---
(function loadChartJS() {
  if (!window.Chart) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = calculateAndRender;
    document.head.appendChild(script);
  } else {
    calculateAndRender();
  }
})();
