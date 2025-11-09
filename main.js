// --- Mortgage Calculator Logic ---

// Format numbers as currency (e.g., $578,451.99)
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// --- DOM Elements ---
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

const totalContribEl = document.getElementById("totalContributions");
const totalRepaymentsEl = document.getElementById("totalRepayments");
const totalInterestEl = document.getElementById("totalInterest");
const savingsEl = document.getElementById("savings");
const yearsSavedEl = document.getElementById("yearsSaved");
const freqLabelEl = document.getElementById("freqLabel");
const loanDurationEl = document.getElementById("loanDuration");

// --- Event listeners for auto-calculation ---
[
  loanAmountEl,
  interestRateEl,
  loanTermEl,
  repaymentFrequencyEl,
  extraRepaymentEl,
  initialOffsetEl,
  offsetContributionEl,
].forEach(el => el.addEventListener("input", calculateAndRender));

repaymentFrequencyEl.addEventListener("change", () => {
  const freq = repaymentFrequencyEl.value;
  extraFrequencyLabel.textContent = freq;
  offsetFrequencyLabel.textContent = freq;
  freqLabelEl.textContent = freq;
  calculateAndRender();
});

// --- Core Calculation ---
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

  let paymentsPerYear = frequency === "weekly" ? 52 : frequency === "fortnightly" ? 26 : 12;
  const periodicRate = annualRate / paymentsPerYear;
  const totalPayments = years * paymentsPerYear;

  const minRepayment = periodicRate === 0
      ? loanAmount / totalPayments
      : (loanAmount * periodicRate) / (1 - Math.pow(1 + periodicRate, -totalPayments));

  repaymentResultEl.textContent = `Minimum ${frequency} repayment: ${formatCurrency(minRepayment)}`;

  // --- Simulate Loans ---
  const baseline = simulateLoan({ principal: loanAmount, rate: periodicRate, repayment: minRepayment, paymentsPerYear });
  const accelerated = simulateLoan({
      principal: loanAmount,
      rate: periodicRate,
      repayment: minRepayment + extraRepayment,
      paymentsPerYear,
      initialOffset,
      offsetContribution
  });

  // --- Summary Metrics ---
  const totalPerPeriodContrib = minRepayment + extraRepayment + offsetContribution;
  const totalSavings = baseline.totalPaid - accelerated.totalPaid;
  const yearsSaved = Math.max(0, baseline.totalPeriods / paymentsPerYear - accelerated.totalPeriods / paymentsPerYear);

  freqLabelEl.textContent = frequency;
  totalContribEl.textContent = `${formatCurrency(totalPerPeriodContrib)} per ${frequency}`;
  totalRepaymentsEl.textContent = formatCurrency(accelerated.totalPaid);
  totalInterestEl.textContent = formatCurrency(accelerated.totalInterest);
  savingsEl.textContent = formatCurrency(totalSavings);
  yearsSavedEl.textContent = `${yearsSaved.toFixed(2)} years`;
  if (loanDurationEl) loanDurationEl.textContent = `${(accelerated.totalPeriods / paymentsPerYear).toFixed(2)} years`;

  renderCharts(baseline, accelerated);
}

// --- Amortization Simulation ---
function simulateLoan({ principal, rate, repayment, paymentsPerYear, initialOffset = 0, offsetContribution = 0 }) {
  let balance = principal;
  let offset = initialOffset;
  let totalPaid = 0;
  let totalInterest = 0;
  let balances = [principal];
  let offsetBalances = [initialOffset];
  let years = [0];
  let period = 0;
  const maxPeriods = paymentsPerYear * 50;

  while (balance > 1e-6 && period < maxPeriods) {
    period++;
    const effectiveBalance = Math.max(balance - offset, 0);
    const interest = effectiveBalance * rate;
    const payment = Math.min(balance + interest, repayment);

    totalInterest += interest;
    totalPaid += payment;
    balance = balance + interest - payment;
    if (balance < 1e-8) balance = 0;
    offset += offsetContribution;

    if (period % paymentsPerYear === 0) {
      years.push(period / paymentsPerYear);
      balances.push(balance);
      offsetBalances.push(offset);
    }
  }

  const lastYear = years[years.length - 1];
  const payoffYear = period / paymentsPerYear;
  if (Math.abs(lastYear - payoffYear) > 1e-8) {
    years.push(payoffYear);
    balances.push(0);
    offsetBalances.push(offset);
  }

  return { years, balances, offsetBalances, totalInterest, totalPaid, totalPeriods: period };
}

// --- Chart Rendering ---
function renderCharts(baseline, accelerated) {
  if (window.loanChartInstance) window.loanChartInstance.destroy();
  if (window.offsetChartInstance) window.offsetChartInstance.destroy();

  const ctx1 = document.getElementById("loanChart").getContext("2d");
  const ctx2 = document.getElementById("offsetChart").getContext("2d");

  const maxYear = Math.max(baseline.years[baseline.years.length - 1], accelerated.years[accelerated.years.length - 1]);
  const labels = [];
  for (let y = 0; y <= Math.floor(maxYear); y++) labels.push(y);
  const finalYear = Math.round(maxYear * 100) / 100;
  if (finalYear > labels[labels.length - 1]) labels.push(Number(finalYear.toFixed(2)));

  const sampleAtYear = (recordedYears, recordedValues, targetYear) => {
    for (let i = 0; i < recordedYears.length; i++) {
      if (Math.abs(recordedYears[i] - targetYear) < 1e-8) return recordedValues[i];
    }
    for (let i = 1; i < recordedYears.length; i++) {
      if (recordedYears[i] > targetYear) return recordedValues[i - 1];
    }
    return recordedValues[recordedValues.length - 1];
  };

  const baselineData = labels.map(y => sampleAtYear(baseline.years, baseline.balances, y));
  const acceleratedData = labels.map(y => sampleAtYear(accelerated.years, accelerated.balances, y));
  const offsetData = labels.map(y => sampleAtYear(accelerated.years, accelerated.offsetBalances, y));

  // Loan Balance Chart
  window.loanChartInstance = new Chart(ctx1, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Original Loan",
          data: baselineData,
          borderColor: "#6667ab",
          borderWidth: 3,
          fill: true,
          backgroundColor: "rgba(102, 103, 171, 0.15)",
          tension: 0.4,
          pointRadius: 0
        },
        {
          label: "With Extra & Offset",
          data: acceleratedData,
          borderColor: "#cba6f7",
          borderWidth: 3,
          fill: true,
          backgroundColor: "rgba(203, 166, 247, 0.15)",
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "none" } },
      scales: {
        x: { title: { display: false } },
        y: { title: { display: false }, min: 0 },
      },
    }
  });

  // Offset Balance Chart
  window.offsetChartInstance = new Chart(ctx2, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Offset Balance ($)",
          data: offsetData,
          borderColor: "#6667ab",
          borderWidth: 3,
          fill: true,
          backgroundColor: "rgba(102, 103, 171, 0.15)",
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "none" } },
      scales: {
        x: { title: { display: false } },
        y: { title: { display: false }, min: 0 },
      },
    }
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
