// --- Mortgage Calculator Logic ---

function formatCurrency(amount) {
    const rounded = Math.round(amount);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(rounded);
}

// Dark/Light mode toggle
const themeToggleBtn = document.getElementById("themeToggle");
themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    themeToggleBtn.textContent = document.body.classList.contains("dark-mode") ? "🌙" : "🌞";
});

// --- DOM Elements ---
const loanAmountEl = document.getElementById("loanAmount");
const interestRateEl = document.getElementById("interestRate");
const loanTermEl = document.getElementById("loanTerm");
const repaymentFrequencyEl = document.getElementById("repaymentFrequency");
const repaymentResultEl = document.getElementById("repaymentResult");

const extraRepaymentEl = document.getElementById("extraRepayment");
const jointOffsetInitialEl = document.getElementById("jointOffsetInitial");
const jointOffsetContributionEl = document.getElementById("jointOffsetContribution");
const holder1OffsetInitialEl = document.getElementById("holder1OffsetInitial");
const holder1OffsetContributionEl = document.getElementById("holder1OffsetContribution");
const holder2OffsetInitialEl = document.getElementById("holder2OffsetInitial");
const holder2OffsetContributionEl = document.getElementById("holder2OffsetContribution");

const extraFrequencyLabel = document.getElementById("extraFrequencyLabel");
const offsetFrequencyLabel = document.getElementById("offsetFrequencyLabel");

const totalContribEl = document.getElementById("totalContributions");
const jointContribEl = document.getElementById("jointContributions");
const perHolderContribEl = document.getElementById("perHolderContributions");
const totalRepaymentsEl = document.getElementById("totalRepayments");
const totalInterestEl = document.getElementById("totalInterest");
const savingsEl = document.getElementById("savings");
const yearsSavedEl = document.getElementById("yearsSaved");
const loanDurationEl = document.getElementById("loanDuration");

// --- Event listeners ---
[
    loanAmountEl, interestRateEl, loanTermEl, repaymentFrequencyEl,
    extraRepaymentEl, jointOffsetInitialEl, jointOffsetContributionEl,
    holder1OffsetInitialEl, holder1OffsetContributionEl,
    holder2OffsetInitialEl, holder2OffsetContributionEl
].forEach(el => el.addEventListener("input", calculateAndRender));

repaymentFrequencyEl.addEventListener("change", () => {
    const freq = repaymentFrequencyEl.value;
    extraFrequencyLabel.textContent = freq;
    offsetFrequencyLabel.textContent = freq;
    calculateAndRender();
});

// --- Core Calculation ---
// --- Core Calculation ---
function calculateAndRender() {
    const loanAmount = parseFloat(loanAmountEl.value);
    const annualRate = parseFloat(interestRateEl.value)/100;
    const years = parseFloat(loanTermEl.value);
    const frequency = repaymentFrequencyEl.value;

    const extraRepayment = parseFloat(extraRepaymentEl.value)||0;

    const jointOffsetInitial = parseFloat(jointOffsetInitialEl.value)||0;
    const jointOffsetContribution = parseFloat(jointOffsetContributionEl.value)||0;

    const holder1Initial = parseFloat(holder1OffsetInitialEl.value)||0;
    const holder1Contribution = parseFloat(holder1OffsetContributionEl.value)||0;

    const holder2Initial = parseFloat(holder2OffsetInitialEl.value)||0;
    const holder2Contribution = parseFloat(holder2OffsetContributionEl.value)||0;

    if (isNaN(loanAmount) || isNaN(annualRate) || isNaN(years)) {
        repaymentResultEl.textContent = "⚠️ Please enter valid loan details.";
        return;
    }

    const paymentsPerYear = frequency==="weekly"?52:frequency==="fortnightly"?26:12;
    const periodicRate = annualRate / paymentsPerYear;
    const totalPayments = years*paymentsPerYear;

    const minRepayment = periodicRate===0 ? loanAmount/totalPayments : (loanAmount*periodicRate)/(1-Math.pow(1+periodicRate, -totalPayments));
    repaymentResultEl.textContent = `Minimum ${frequency} repayment: ${formatCurrency(minRepayment)}`;

    const baseline = simulateLoan({principal:loanAmount, rate:periodicRate, repayment:minRepayment, paymentsPerYear});
    const accelerated = simulateLoan({
        principal: loanAmount,
        rate: periodicRate,
        repayment: minRepayment+extraRepayment,
        paymentsPerYear,
        offsetInitials: [jointOffsetInitial, holder1Initial, holder2Initial],
        offsetContribs: [jointOffsetContribution, holder1Contribution, holder2Contribution]
    });

    // --- Updated Summary Calculations ---
    const totalPerPeriodContrib = minRepayment + extraRepayment + jointOffsetContribution + holder1Contribution + holder2Contribution;

    const jointContrib = minRepayment + jointOffsetContribution;
    const holder1Contrib = (minRepayment + jointOffsetContribution)/2 + holder1Contribution;
    const holder2Contrib = (minRepayment + jointOffsetContribution)/2 + holder2Contribution;

    const totalSavings = baseline.totalPaid - accelerated.totalPaid;
    const yearsSaved = Math.max(0, baseline.totalPeriods/paymentsPerYear - accelerated.totalPeriods/paymentsPerYear);

    totalContribEl.textContent = `${formatCurrency(totalPerPeriodContrib)} per ${frequency}`;
    jointContribEl.textContent = `${formatCurrency(jointContrib)} per ${frequency}`;
    perHolderContribEl.textContent = `${formatCurrency(holder1Contrib)} / ${formatCurrency(holder2Contrib)} per ${frequency}`;

    totalRepaymentsEl.textContent = formatCurrency(accelerated.totalPaid);
    totalInterestEl.textContent = formatCurrency(accelerated.totalInterest);
    savingsEl.textContent = formatCurrency(totalSavings);
    yearsSavedEl.textContent = `${yearsSaved.toFixed(2)} years`;
    loanDurationEl.textContent = `${(accelerated.totalPeriods/paymentsPerYear).toFixed(2)} years`;

    renderCharts(baseline, accelerated);
}


// --- Amortization Simulation ---
function simulateLoan({principal, rate, repayment, paymentsPerYear, offsetInitials=[0,0,0], offsetContribs=[0,0,0]}) {
    let balance = principal;
    let offsets = [...offsetInitials];
    let totalPaid = 0;
    let totalInterest = 0;
    let balances=[principal];
    let offsetBalances=[[...offsets]];
    let years=[0];
    let period=0;
    const maxPeriods = paymentsPerYear*50;

    while(balance>1e-6 && period<maxPeriods){
        period++;
        const totalOffset = offsets.reduce((a,b)=>a+b,0);
        const effectiveBalance = Math.max(balance - totalOffset,0);
        const interest = effectiveBalance*rate;
        const payment = Math.min(balance+interest, repayment);

        totalInterest += interest;
        totalPaid += payment;
        balance = balance + interest - payment;
        if(balance<1e-8) balance=0;

        offsets = offsets.map((v,i)=>v + offsetContribs[i]);

        if(period%paymentsPerYear===0){
            years.push(period/paymentsPerYear);
            balances.push(balance);
            offsetBalances.push([...offsets]);
        }
    }

    const lastYear = years[years.length-1];
    const payoffYear = period/paymentsPerYear;
    if(Math.abs(lastYear-payoffYear)>1e-8){
        years.push(payoffYear);
        balances.push(0);
        offsetBalances.push([...offsets]);
    }

    return {years, balances, offsetBalances, totalInterest, totalPaid, totalPeriods: period};
}

// --- Chart Rendering ---
function renderCharts(baseline, accelerated){
    if(window.loanChartInstance) window.loanChartInstance.destroy();
    if(window.offsetChartInstance) window.offsetChartInstance.destroy();

    const ctx1 = document.getElementById("loanChart").getContext("2d");
    const ctx2 = document.getElementById("offsetChart").getContext("2d");

    const maxYear = Math.max(baseline.years[baseline.years.length-1], accelerated.years[accelerated.years.length-1]);
    const labels=[];
    for(let y=0;y<=Math.floor(maxYear);y++) labels.push(y);
    const finalYear = Math.round(maxYear*100)/100;
    if(finalYear>labels[labels.length-1]) labels.push(Number(finalYear.toFixed(2)));

    const sampleAtYear=(yearsArr, valuesArr, targetYear)=>{
        for(let i=0;i<yearsArr.length;i++){
            if(Math.abs(yearsArr[i]-targetYear)<1e-8) return valuesArr[i];
        }
        for(let i=1;i<yearsArr.length;i++){
            if(yearsArr[i]>targetYear) return valuesArr[i-1];
        }
        return valuesArr[valuesArr.length-1];
    };

    const baselineData = labels.map(y=>sampleAtYear(baseline.years, baseline.balances, y));
    const acceleratedData = labels.map(y=>sampleAtYear(accelerated.years, accelerated.balances, y));
    const offsetsData = [0,1,2].map(idx=>labels.map(y=>sampleAtYear(accelerated.years, accelerated.offsetBalances.map(arr=>arr[idx]), y)));

    // Loan Chart
    window.loanChartInstance = new Chart(ctx1,{
        type:"line",
        data:{
            labels,
            datasets:[
                {label:"Original Loan", data:baselineData, borderColor:"#6667ab", borderWidth:3, fill:true, backgroundColor:"rgba(102,103,171,0.15)", tension:0.4, pointRadius:0},
                {label:"With Extra & Offset", data:acceleratedData, borderColor:"#cba6f7", borderWidth:3, fill:true, backgroundColor:"rgba(203,166,247,0.15)", tension:0.4, pointRadius:0}
            ]
        },
        options:{responsive:true, plugins:{legend:{position:"none"}}, scales:{x:{title:{display:false}}, y:{title:{display:false},min:0}}}
    });

    // Offset Chart - Stacked
    window.offsetChartInstance = new Chart(ctx2,{
        type:"line",
        data:{
            labels,
            datasets:[
                {label:"Joint Offset", data:offsetsData[0], borderColor:"#6667ab", borderWidth:2, fill:true, backgroundColor:"rgba(102,103,171,0.15)", tension:0.4, pointRadius:0},
                {label:"Loan Holder 1", data:offsetsData[1], borderColor:"#ab6667", borderWidth:2, fill:true, backgroundColor:"rgba(171,102,103,0.15)", tension:0.4, pointRadius:0},
                {label:"Loan Holder 2", data:offsetsData[2], borderColor:"#66ab67", borderWidth:2, fill:true, backgroundColor:"rgba(102,171,103,0.15)", tension:0.4, pointRadius:0}
            ]
        },
        options:{responsive:true, plugins:{legend:{position:"top"}}, scales:{x:{title:{display:false}}, y:{title:{display:false},min:0}}}
    });
}

// --- Load Chart.js dynamically ---
(function loadChartJS(){
    if(!window.Chart){
        const script = document.createElement("script");
        script.src="https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = calculateAndRender;
        document.head.appendChild(script);
    } else {
        calculateAndRender();
    }
})();
