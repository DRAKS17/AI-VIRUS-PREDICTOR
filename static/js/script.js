/* =================================================================
   AI Virus Spread Predictor — script.js
   Uses Chart.js 4 + chartjs-plugin-annotation for interactive graph
   ================================================================= */

'use strict';

// ---- DOM refs ----
const form             = document.getElementById('sim-form');
const btn              = document.getElementById('simulate-btn');
const btnContent       = document.getElementById('btn-content');
const btnSpinner       = document.getElementById('btn-spinner');
const resetBtn         = document.getElementById('reset-btn');
const errorAlert       = document.getElementById('error-alert');
const errorMsg         = document.getElementById('error-msg');
const chartPlaceholder = document.getElementById('chart-placeholder');
const resultsContainer = document.getElementById('results-container');
const chartCanvas      = document.getElementById('sir-chart');
const statPeakInfected = document.getElementById('stat-peak-infected');
const statPeakDay      = document.getElementById('stat-peak-day');
const statRecovered    = document.getElementById('stat-recovered');
const statR0           = document.getElementById('stat-r0');

// ---- Input Pairs for Bidirectional Sync ----
const inputPairs = [
  { num: document.getElementById('population'),       slider: document.getElementById('population_slider') },
  { num: document.getElementById('initial_infected'), slider: document.getElementById('initial_infected_slider') },
  { num: document.getElementById('beta'),             slider: document.getElementById('beta_slider') },
  { num: document.getElementById('gamma'),            slider: document.getElementById('gamma_slider') },
  { num: document.getElementById('days'),             slider: document.getElementById('days_slider') },
];

// ---- Chart instance & State ----
let sirChart = null;
let debounceTimer = null;
let hasSimulatedOnce = false; // Used to prevent auto-simulate on page load

// ================================================================
// Initial defaults for Reset Button
// ================================================================

const defaults = inputPairs.reduce((acc, {num}) => {
  acc[num.id] = num.value;
  return acc;
}, {});

// ================================================================
// Event Listeners (Sync, Reset, Auto-Simulate)
// ================================================================

inputPairs.forEach(({num, slider}) => {
  // Number input changed
  num.addEventListener('input', () => {
    slider.value = num.value;
    triggerAutoSimulate();
  });
  
  // Slider changed
  slider.addEventListener('input', () => {
    num.value = slider.value;
    triggerAutoSimulate();
  });
});

resetBtn.addEventListener('click', () => {
  createRipple({ currentTarget: resetBtn, clientX: 0, clientY: 0 }); // fake ripple for reset if we want, or just visual
  
  inputPairs.forEach(({num, slider}) => {
    num.value = defaults[num.id];
    slider.value = defaults[num.id];
  });
  if (hasSimulatedOnce) {
    runSimulation(); // Instant run on reset
  }
});

function triggerAutoSimulate() {
  if (!hasSimulatedOnce) return; // Don't auto-simulate until user clicks Run Simulation manulaly first time
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runSimulation();
  }, 350);
}

// ================================================================
// Chart.js Configuration
// ================================================================

const PALETTE = {
  blue:   '#38bdf8',
  red:    '#f43f5e',
  green:  '#34d399',
  grid:   '#111d30',
  axis:   '#475569',
  tick:   '#334155',
  legend: '#94a3b8',
  bg:     '#0c1220',
  tooltip:'#0f1a2e',
};

function renderChart(labels, S, I, R, peakDsIdx, peakDayVal) {
  if (sirChart) {
    sirChart.destroy();
    sirChart = null;
  }

  const peakI = I[peakDsIdx];
  const totalPts = labels.length;

  const hex2rgba = (hex, a) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  };

  sirChart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Susceptible',
          data: S,
          borderColor: PALETTE.blue,
          backgroundColor: hex2rgba(PALETTE.blue, 0.07),
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: PALETTE.blue,
          order: 3,
        },
        {
          label: 'Infected',
          data: I,
          borderColor: PALETTE.red,
          backgroundColor: hex2rgba(PALETTE.red, 0.10),
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: PALETTE.red,
          order: 2,
        },
        {
          label: 'Recovered',
          data: R,
          borderColor: PALETTE.green,
          backgroundColor: hex2rgba(PALETTE.green, 0.07),
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: PALETTE.green,
          order: 4,
        },
        {
          label: 'Peak Infected',
          data: Array(totalPts).fill(null).map((_, i) => i === peakDsIdx ? peakI : null),
          borderColor: PALETTE.red,
          backgroundColor: '#fff',
          borderWidth: 2,
          pointRadius: Array(totalPts).fill(0).map((_, i) => i === peakDsIdx ? 8 : 0),
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: hasSimulatedOnce ? 300 : 900, // Faster animation on updates
        easing: 'easeInOutQuart',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: PALETTE.legend,
            font: { family: 'Inter', size: 11, weight: '500' },
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            useBorderRadius: true,
            padding: 18,
            filter: (item) => item.text !== 'Peak Infected',
          },
        },
        tooltip: {
          backgroundColor: PALETTE.tooltip,
          borderColor: '#1e2f4a',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: PALETTE.legend,
          titleFont: { family: 'Inter', size: 12, weight: '700' },
          bodyFont: { family: 'Inter', size: 11 },
          padding: 12,
          cornerRadius: 8,
          boxPadding: 5,
          callbacks: {
            title: (items) => `Day ${Math.round(items[0].parsed.x)}`,
            label: (item) => {
              if (item.dataset.label === 'Peak Infected') return null;
              const val = Math.round(item.parsed.y).toLocaleString();
              return `  ${item.dataset.label}: ${val}`;
            },
          },
          filter: (item) => item.dataset.label !== 'Peak Infected',
        },
        annotation: {
          annotations: {
            peakLine: {
              type: 'line',
              scaleID: 'x',
              value: peakDayVal,
              endValue: peakDayVal,
              borderColor: hex2rgba(PALETTE.red, 0.5),
              borderWidth: 1.5,
              borderDash: [5, 4],
              label: {
                display: true,
                content: [`Peak — Day ${Math.round(peakDayVal)}`, `${Math.round(peakI).toLocaleString()} infected`],
                position: 'end',
                yAdjust: 10,
                backgroundColor: 'rgba(20,5,10,0.88)',
                borderColor: '#7f1d2e',
                borderRadius: 6,
                borderWidth: 1,
                color: '#fda4af',
                font: { family: 'Inter', size: 10, weight: '600' },
                padding: { x: 9, y: 6 },
              },
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Days',
            color: PALETTE.axis,
            font: { family: 'Inter', size: 11, weight: '500' },
            padding: { top: 8 },
          },
          ticks: {
            color: PALETTE.tick,
            font: { family: 'Inter', size: 10 },
            maxTicksLimit: 10,
            callback: (v) => Math.round(v),
          },
          grid: { color: PALETTE.grid, lineWidth: 0.8, drawBorder: false },
          border: { color: '#1e2f4a' },
        },
        y: {
          title: {
            display: true,
            text: 'Population',
            color: PALETTE.axis,
            font: { family: 'Inter', size: 11, weight: '500' },
            padding: { bottom: 8 },
          },
          ticks: {
            color: PALETTE.tick,
            font: { family: 'Inter', size: 10 },
            maxTicksLimit: 8,
            callback: (v) => {
              if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
              if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
              return Math.round(v).toLocaleString();
            },
          },
          grid: { color: PALETTE.grid, lineWidth: 0.8, drawBorder: false },
          border: { color: '#1e2f4a' },
        },
      },
    },
  });
}

// ================================================================
// Helpers
// ================================================================

function showError(message) {
  errorMsg.textContent = message;
  errorAlert.classList.remove('hidden');
  errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  errorAlert.classList.add('hidden');
}

function setLoading(loading) {
  // Disable inputs while heavily computing? Overkill since backend is fast and we debounce.
  // Just show spinner on btn:
  if (loading) {
    btnContent.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    resultsContainer.style.opacity = '0.5'; // Visual loading state
    resultsContainer.style.pointerEvents = 'none';
  } else {
    btnContent.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
    resultsContainer.style.opacity = '1';
    resultsContainer.style.pointerEvents = 'auto';
  }
}

function animateValue(el, rawValue) {
  const numeric = typeof rawValue === 'string' ? parseFloat(rawValue.replace(/,/g, '')) : rawValue;
  if (isNaN(numeric) || hasSimulatedOnce) { 
    // If we've already simulated, skip long animations for real-time slider feel
    const isDecimal = !Number.isInteger(numeric);
    el.textContent = isDecimal ? numeric.toFixed(2) : Math.round(numeric).toLocaleString();
    return;
  }

  const isDecimal = !Number.isInteger(numeric);
  const duration  = 700;
  const start     = Date.now();

  const step = () => {
    const elapsed  = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = eased * numeric;
    el.textContent = isDecimal ? current.toFixed(2) : Math.round(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = isDecimal ? numeric.toFixed(2) : rawValue;
  };
  requestAnimationFrame(step);
}

function createRipple(event) {
  const button = event.currentTarget || btn;
  if(!button.getBoundingClientRect) return;
  
  document.querySelectorAll('.ripple').forEach(r => r.remove());
  const circle = document.createElement('span');
  const rect   = button.getBoundingClientRect();
  circle.classList.add('ripple');
  
  // Center if triggered programmatically
  const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event.clientY ? event.clientY - rect.top  : rect.height / 2;
  
  circle.style.left = `${x}px`;
  circle.style.top  = `${y}px`;
  button.appendChild(circle);
  setTimeout(() => circle.remove(), 700);
}

btn.addEventListener('click', createRipple);

// ================================================================
// AI Insights
// ================================================================

function populateInsights(data) {
  document.getElementById('ins-peak-text').innerHTML =
    `Infection will peak around <strong>Day ${data.peak_day}</strong> — prepare surge capacity before this date.`;

  document.getElementById('ins-max-text').innerHTML =
    `At peak, approximately <strong>${data.peak_infected}</strong> people will be simultaneously infected (<strong>${data.peak_pct}%</strong> of the population).`;

  document.getElementById('ins-decrease-text').innerHTML =
    `New infections start declining after <strong>Day ${data.decrease_start_day}</strong> as the susceptible pool shrinks.`;

  document.getElementById('ins-recovery-text').innerHTML =
    `Recovery overtakes active infections around <strong>Day ${data.recovery_dominant_day}</strong> — the turning point of the epidemic.`;

  const r0 = data.r0;
  let r0Msg;
  if (r0 <= 1) {
    r0Msg = `With <strong>R₀ = ${r0}</strong>, each person infects fewer than 1 other — the epidemic will die out naturally.`;
  } else if (r0 < 2) {
    r0Msg = `With <strong>R₀ = ${r0}</strong>, each infected person spreads to ~${r0} others — the epidemic grows slowly but requires monitoring.`;
  } else if (r0 < 5) {
    r0Msg = `With <strong>R₀ = ${r0}</strong>, each infected person spreads to ~${r0} others — sustained intervention is needed.`;
  } else {
    r0Msg = `With <strong>R₀ = ${r0}</strong>, the virus is highly contagious — aggressive containment measures are critical.`;
  }
  document.getElementById('ins-r0-text').innerHTML = r0Msg;

  if (data.r0 > 1) {
    document.getElementById('ins-herd-text').innerHTML =
      `Herd immunity requires approximately <strong>${data.herd_immunity_pct}%</strong> of the population to be immune (vaccinated or recovered).`;
  } else {
    document.getElementById('ins-herd-text').innerHTML =
      `With <strong>R₀ ≤ 1</strong>, herd immunity threshold is not applicable — the epidemic subsides on its own.`;
  }

  const badge = document.getElementById('severity-badge');
  const sevMap = { Low: 'sev-low', Moderate: 'sev-moderate', High: 'sev-high', Severe: 'sev-severe' };
  badge.className = `severity-badge ${sevMap[data.severity_label] || 'sev-moderate'}`;
  badge.textContent = `${data.severity_label} Severity`;
}

// ================================================================
// Run Simulation Logic
// ================================================================

async function runSimulation() {
  hideError();

  const payload = {
    population:       parseInt(document.getElementById('population').value, 10),
    initial_infected: parseInt(document.getElementById('initial_infected').value, 10),
    beta:             parseFloat(document.getElementById('beta').value),
    gamma:            parseFloat(document.getElementById('gamma').value),
    days:             parseInt(document.getElementById('days').value, 10),
  };

  if (Object.values(payload).some(v => isNaN(v))) {
    showError('Please complete all fields with valid numbers.');
    return;
  }
  
  if (payload.population <= 0 || payload.initial_infected < 0 || payload.beta <= 0 || payload.gamma <= 0 || payload.days <= 0) {
    showError('Values must be positive numbers greater than 0.');
    return;
  }
  if (payload.initial_infected >= payload.population) {
    showError('Initial infections must be less than total population.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/simulate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'An unexpected server error occurred.');
      return;
    }

    if (!hasSimulatedOnce) {
      chartPlaceholder.classList.add('hidden');
      resultsContainer.classList.remove('hidden');
    }

    renderChart(data.labels, data.S, data.I, data.R, data.peak_ds_idx, data.peak_day_val);
    
    animateValue(statPeakInfected, data.peak_infected);
    statPeakDay.textContent = `Day ${data.peak_day}`;
    animateValue(statRecovered, data.total_recovered);
    animateValue(statR0, data.r0);
    populateInsights(data);

    hasSimulatedOnce = true;

  } catch (err) {
    showError('Could not reach the server. Ensure flask is running on port 5000.');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runSimulation();
});

// ================================================================
// Sidebar UI Logic & Scrollspy
// ================================================================

const sidebar = document.getElementById('sidebar');
const sidebarOpen = document.getElementById('sidebar-open');
const sidebarClose = document.getElementById('sidebar-close');
const navLinks = document.querySelectorAll('.nav-link');

if (sidebarOpen && sidebarClose) {
  sidebarOpen.addEventListener('click', () => {
    if (window.innerWidth <= 860) {
      sidebar.classList.add('open');
    } else {
      sidebar.classList.remove('collapsed');
    }
  });

  sidebarClose.addEventListener('click', () => {
    if (window.innerWidth <= 860) {
      sidebar.classList.remove('open');
    } else {
      sidebar.classList.add('collapsed');
    }
  });

  // Close sidebar on mobile when a link is clicked
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        sidebar.classList.remove('open');
      }
    });
  });
}

// Scrollspy
const sections = document.querySelectorAll('main [id]');
const mainContent = document.querySelector('.main-content');

if (mainContent && sections.length > 0) {
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, {
    root: mainContent,
    rootMargin: '-20% 0px -60% 0px', // Trigger when section is near middle/top
    threshold: 0.1
  });

  sections.forEach(sec => scrollObserver.observe(sec));
}
