// --- Mortgage Calculator Logic ---

// DOM elements
const loanAmountEl = document.getElementById("loanAmount");
const interestRateEl = document.getElementById("interestRate");
const loanTermEl = document.getElementById("loanTerm");
const repaymentFrequencyEl = document.getElementById("repaymentFrequency");
const calculateBtn = document.getElementById("calculateBtn");
const repaymentResultEl = document.getElementById("repaymentResult");

// Frequency labels and display
const extraFrequencyLabel = document.getElementById("extraFrequencyLabel");
const offsetFrequencyLabel = document.getElementById("offsetFrequencyLabel");

repaymentFrequencyEl.addEventListener("change", () => {
  const freq = repaymentFrequencyEl.value;
  extraFrequencyLabel.textContent = freq;
  offsetFrequencyLabel.textContent = freq;
});

// Calculate minimum repayments
calculateBtn.addEventListener("click", () => {
  const loanAmount = parseFloat(loanAmountEl.value);
  const annualRate = parseFloat(interestRateEl.value) / 100;
  const years = parseFloat(loanTermEl.value);
  const frequency = repaymentFrequencyEl.value;

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

  // Calculate periodic interest rate and number of payments
  const periodicRate = annualRate / paymentsPerYear;
  const totalPayments = years * paymentsPerYear;

  // Standard amortization formula
  const repayment =
    (loanAmount * periodicRate) / (1 - Math.pow(1 + periodicRate, -totalPayments));

  repaymentResultEl.textContent = `Minimum ${frequency} repayment: $${repayment.toFixed(
    2
  )}`;

  // Generate sample data for charts
  renderCharts(years);
});

// --- Chart.js Charts ---
function renderCharts(years) {
  const yearsArray = Array.from({ length: years + 1 }, (_, i) => i);
  const principalData = yearsArray.map((y) => Math.max(0, 100 - y * (100 / years)));
  const interestData = yearsArray.map((y) => Math.max(0, 100 - y * (70 / years)));
  const offsetData = yearsArray.map((y) => y * 2); // placeholder

  // Destroy existing charts if they exist
  if (window.loanChartInstance) window.loanChartInstance.destroy();
  if (window.offsetChartInstance) window.offsetChartInstance.destroy();

  const ctx1 = document.getElementById("loanChart").getContext("2d");
  const ctx2 = document.getElementById("offsetChart").getContext("2d");

  window.loanChartInstance = new Chart(ctx1, {
    type: "line",
    data: {
      labels: yearsArray,
      datasets: [
        {
          label: "Principal Balance (%)",
          data: principalData,
          borderWidth: 2,
          borderColor: "blue",
          fill: false,
        },
        {
          label: "Interest Balance (%)",
          data: interestData,
          borderWidth: 2,
          borderColor: "red",
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Principal and Interest Balance Over Time" },
      },
      scales: {
        x: { title: { display: true, text: "Years" } },
        y: { title: { display: true, text: "Balance (%)" } },
      },
    },
  });

  window.offsetChartInstance = new Chart(ctx2, {
    type: "line",
    data: {
      labels: yearsArray,
      datasets: [
        {
          label: "Offset Balance ($)",
          data: offsetData,
          borderWidth: 2,
          borderColor: "green",
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

// --- Load Chart.js dynamically if not included in HTML ---
(function loadChartJS() {
  if (!window.Chart) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    document.head.appendChild(script);
  }
})();
