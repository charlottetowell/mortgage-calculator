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

// Summary display
const totalContribEl = document.getElementById("totalContributions");
const totalRepaymentsEl = document.getElementById("totalRepayments");
const totalInterestEl = document.getElementById("totalInterest");
const savingsEl = document.getElementById("savings");
const yearsSavedEl = document.getElementById("yearsSaved");
const freqLabelEl = document.getElementById("freqLabel");

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
  freqLabelEl.textContent = freq;
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
  // guard against zero interest
  const minRepayment =
    periodicRate === 0
      ? loanAmount / totalPayments
      : (loanAmount * periodicRate) / (1 - Math.pow(1 + periodicRate, -totalPayments));

  repaymentResultEl.textContent = `Minimum ${frequency} repayment: $${minRepayment.toFixed(
    2
  )}`;

  // Simulate both loan scenarios
  const baseline = simulateLoan({
    principal: loanAmount,
    rate: periodicRate,
    repayment: minRepayment,
    paymentsPerYear,
    // no offset or extras for baseline
  });

  const accelerated = simulateLoan({
    principal: loanAmount,
    rate: periodicRate,
    repayment: minRepayment + extraRepayment,
    paymentsPerYear,
    initialOffset,
    offsetContribution,
  });

  // --- Calculate summary metrics ---
  const totalBaseInterest = baseline.totalInterest;
  const totalBasePayments = baseline.totalPaid;
  const yearsBase = baseline.totalPeriods / paymentsPerYear;

  const totalAccInterest = accelerated.totalInterest;
  const totalAccPayments = accelerated.totalPaid;
  const yearsAcc = accelerated.totalPeriods / paymentsPerYear;

  // Per-period contribution (e.g. per week)
  const totalPerPeriodContrib = minRepayment + extraRepayment + offsetContribution;

  const totalSavings = totalBasePayments - totalAccPayments;
  const yearsSaved = Math.max(0, yearsBase - yearsAcc);

  // --- Update UI ---
  freqLabelEl.textContent = frequency;
  totalContribEl.textContent = `$${totalPerPeriodContrib.toFixed(2)} per ${frequency}`;
  totalRepaymentsEl.textContent = `$${totalAccPayments.toFixed(2)}`;
  totalInterestEl.textContent = `$${totalAccInterest.toFixed(2)}`;
  savingsEl.textContent = `$${totalSavings.toFixed(2)}`;
  yearsSavedEl.textContent = `${yearsSaved.toFixed(2)} years`;

  // Also update "Loan paid off in" and "Total interest paid" if you have those elements
  const loanDurationEl = document.getElementById("loanDuration");
  if (loanDurationEl) loanDurationEl.textContent = `${yearsAcc.toFixed(2)} years`;

  // Render charts (offset series included)
  renderCharts(baseline, accelerated);
}

// --- Amortization simulation ---
// Returns balances & offset balances recorded at end of each whole year plus final partial year,
// totalInterest, totalPaid, and totalPeriods (number of periods/payments until payoff)
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
  let totalPaid = 0;
  let totalInterest = 0;
  let balances = [principal]; // year 0
  let offsetBalances = [initialOffset]; // year 0
  let years = [0];
  let period = 0;
  const maxPeriods = paymentsPerYear * 50; // safety cap

  // We'll simulate period-by-period. At the end of each year (period%paymentsPerYear === 0),
  // we'll record the balances. When loan finishes mid-year, record the final fractional year.
  while (balance > 0.000001 && period < maxPeriods) {
    period++;

    // Interest applies to net balance minus offset (but not below 0)
    const effectiveBalance = Math.max(balance - offset, 0);
    const interest = effectiveBalance * rate;

    // Payment for this period (can't pay more than outstanding + interest)
    const payment = Math.min(balance + interest, repayment);

    totalInterest += interest;
    totalPaid += payment;

    // Update balance and offset for next period
    balance = balance + interest - payment;
    if (balance < 1e-8) balance = 0;

    // Offset contributions are added at the same cadence as repayments.
    offset += offsetContribution;

    // At the end of a whole year, capture a data point
    if (period % paymentsPerYear === 0) {
      years.push(period / paymentsPerYear);
      balances.push(balance);
      offsetBalances.push(offset);
    }
  }

  // If loan finished and last recorded year isn't the final payoff year, add final fractional year
  const lastRecordedYear = years[years.length - 1];
  const payoffYear = period / paymentsPerYear;
  if (Math.abs(lastRecordedYear - payoffYear) > 1e-8) {
    years.push(payoffYear);
    balances.push(0);
    offsetBalances.push(offset);
  }

  return {
    years,
    balances,
    offsetBalances,
    totalInterest,
    totalPaid,
    totalPeriods: period,
  };
}

// --- Chart rendering ---
function renderCharts(baseline, accelerated) {
  if (window.loanChartInstance) window.loanChartInstance.destroy();
  if (window.offsetChartInstance) window.offsetChartInstance.destroy();

  const ctx1 = document.getElementById("loanChart").getContext("2d");
  const ctx2 = document.getElementById("offsetChart").getContext("2d");

  // Align X labels: use union of both years arrays (they should be mostly integers, plus possibly a final fractional year)
  const maxYear = Math.max(
    baseline.years[baseline.years.length - 1],
    accelerated.years[accelerated.years.length - 1]
  );
  // Build labels at 0,1,2,...,ceil(maxYear) and then ensure final fractional year is included if needed
  const labels = [];
  for (let y = 0; y <= Math.floor(maxYear); y++) labels.push(y);
  const finalYear = Math.round(maxYear * 100) / 100; // keep 2dp if fractional
  if (finalYear > labels[labels.length - 1]) labels.push(Number(finalYear.toFixed(2)));

  // Helper to sample balances for given integer/fractional years from the recorded arrays
  function sampleAtYear(recordedYears, recordedValues, targetYear) {
    // If exact match exists, return it
    for (let i = 0; i < recordedYears.length; i++) {
      if (Math.abs(recordedYears[i] - targetYear) < 1e-8) return recordedValues[i];
    }
    // Otherwise, find the first recorded year > targetYear and take previous value (step function)
    for (let i = 1; i < recordedYears.length; i++) {
      if (recordedYears[i] > targetYear) return recordedValues[i - 1];
    }
    // If target beyond last recorded year, return last value
    return recordedValues[recordedValues.length - 1];
  }

  const baselineData = labels.map((y) => sampleAtYear(baseline.years, baseline.balances, y));
  const acceleratedData = labels.map((y) =>
    sampleAtYear(accelerated.years, accelerated.balances, y)
  );

  // Chart 1: Loan Balance Comparison
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
            x: { title: { display: false, text: "Years" } },
            y: { title: { display: false, text: "Loan Balance ($)" }, min: 0 },
        },
    }
    });


  // Chart 2: Offset Balance Over Time (use accelerated.offsetBalances; baseline has no offset)
  const offsetData = labels.map((y) =>
    sampleAtYear(accelerated.years, accelerated.offsetBalances, y)
  );

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
            x: { title: { display: false, text: "Years" } },
            y: { title: { display: false, text: "Offset Balance ($)" }, min: 0 },
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
