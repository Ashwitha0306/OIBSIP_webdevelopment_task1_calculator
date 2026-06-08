/* =============================================
   SMART CALCULATOR PRO — script.js
   All calculator logic, history, tools & theme
   ============================================= */

/* ── DOM References ── */
const displayCurrent = document.getElementById('displayCurrent');
const displayPrev    = document.getElementById('displayPrev');
const historyList    = document.getElementById('historyList');
const themeToggle    = document.getElementById('themeToggle');
const themeIcon      = document.getElementById('themeIcon');
const themeLabel     = document.getElementById('themeLabel');

/* ── Calculator State ── */
let currentInput  = '0';      // What's shown on screen
let prevInput     = '';       // Previous operand
let operator      = null;     // Current operator symbol (÷ × − +)
let shouldReset   = false;    // Reset display on next number press
let lastResult    = null;     // Last computed result (for equals chaining)
let lastOperator  = null;     // For equals chaining
let lastOperand   = null;     // For equals chaining

/* ── History from LocalStorage ── */
let history = JSON.parse(localStorage.getItem('calcHistory') || '[]');

/* ══════════════════════════════════════
   DISPLAY HELPERS
══════════════════════════════════════ */
function updateDisplay() {
  displayCurrent.textContent = formatNumber(currentInput);
  displayCurrent.classList.remove('error');
}

// Add thousands separator for readability but keep raw value intact
function formatNumber(val) {
  if (val === 'Error' || val === 'Infinity') return val;
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  // If it ends with decimal point or trailing zeros, keep raw
  if (String(val).endsWith('.') || /\.\d*0+$/.test(String(val))) return val;
  const formatted = parseFloat(val.toString()).toLocaleString('en-IN', { maximumFractionDigits: 10 });
  return formatted;
}

function showError(msg = 'Error') {
  currentInput = msg;
  displayCurrent.textContent = msg;
  displayCurrent.classList.add('error');
  displayPrev.textContent = '';
  operator = null;
  prevInput = '';
}

/* ══════════════════════════════════════
   CORE CALCULATOR LOGIC
══════════════════════════════════════ */

// Map display operator to math operator
function compute(a, op, b) {
  a = parseFloat(a);
  b = parseFloat(b);
  if (isNaN(a) || isNaN(b)) return null;

  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷':
      if (b === 0) return 'Error';
      return a / b;
    default: return null;
  }
}

// Round floating-point artifacts (e.g. 0.1+0.2 = 0.30000000001)
function cleanResult(num) {
  if (typeof num === 'string') return num;
  // Up to 10 significant digits
  return parseFloat(num.toPrecision(10));
}

// Handle number button press
function inputNumber(value) {
  if (shouldReset) {
    currentInput = value;
    shouldReset = false;
  } else {
    if (currentInput === '0' && value !== '.') {
      currentInput = value;
    } else {
      // Limit digits to 12
      if (currentInput.replace('.', '').replace('-', '').length >= 12) return;
      currentInput += value;
    }
  }
  updateDisplay();
}

// Handle decimal point
function inputDecimal() {
  if (shouldReset) {
    currentInput = '0.';
    shouldReset = false;
    updateDisplay();
    return;
  }
  if (!currentInput.includes('.')) {
    currentInput += '.';
    updateDisplay();
  }
}

// Handle operator button (+, -, ×, ÷)
function inputOperator(op) {
  // Remove active state from all op buttons
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active'));

  if (operator && !shouldReset) {
    // Chain calculations
    const result = compute(prevInput, operator, currentInput);
    if (result === 'Error') { showError('Cannot divide by zero'); return; }
    const cleaned = cleanResult(result);
    prevInput = String(cleaned);
    currentInput = String(cleaned);
    updateDisplay();
  } else {
    prevInput = currentInput;
  }

  operator    = op;
  shouldReset = true;
  lastResult  = null; // cancel chaining on new operator

  displayPrev.textContent = `${formatNumber(prevInput)} ${op}`;

  // Highlight pressed op button
  document.querySelectorAll('.btn-op').forEach(b => {
    if (b.dataset.value === op) b.classList.add('active');
  });
}

// Handle equals
function inputEquals() {
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active'));

  let a, b, op;

  if (operator !== null) {
    // Normal calculation
    a  = prevInput;
    b  = currentInput;
    op = operator;
    // Store for chaining
    lastOperand  = currentInput;
    lastOperator = operator;
  } else if (lastOperator !== null) {
    // Chain: repeat last operation
    a  = currentInput;
    b  = lastOperand;
    op = lastOperator;
  } else {
    return;
  }

  const result = compute(a, op, b);
  if (result === 'Error') { showError('Cannot divide by zero'); return; }
  const cleaned = cleanResult(result);

  // Build history entry
  const expr   = `${formatNumber(a)} ${op} ${formatNumber(b)}`;
  const resStr = String(cleaned);
  addToHistory(expr, resStr);

  displayPrev.textContent = `${expr} =`;
  currentInput = resStr;
  prevInput    = '';
  operator     = null;
  shouldReset  = true;
  updateDisplay();
}

// Percentage
function inputPercent() {
  const val = parseFloat(currentInput);
  if (isNaN(val)) return;
  if (operator && prevInput) {
    // X% of prevInput
    currentInput = String(cleanResult(parseFloat(prevInput) * val / 100));
  } else {
    currentInput = String(cleanResult(val / 100));
  }
  updateDisplay();
}

// Toggle sign
function inputSign() {
  if (currentInput === '0') return;
  currentInput = currentInput.startsWith('-')
    ? currentInput.slice(1)
    : '-' + currentInput;
  updateDisplay();
}

// Backspace
function inputBackspace() {
  if (shouldReset) return;
  if (currentInput.length <= 1 || currentInput === '-0') {
    currentInput = '0';
  } else {
    currentInput = currentInput.slice(0, -1);
    if (currentInput === '-') currentInput = '0';
  }
  updateDisplay();
}

// Clear all
function inputClear() {
  currentInput  = '0';
  prevInput     = '';
  operator      = null;
  shouldReset   = false;
  lastResult    = null;
  lastOperator  = null;
  lastOperand   = null;
  displayPrev.textContent = '';
  displayCurrent.classList.remove('error');
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active'));
  updateDisplay();
}

/* ══════════════════════════════════════
   BUTTON EVENT DELEGATION
══════════════════════════════════════ */
document.getElementById('calculator').addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  // Animate button press
  btn.style.transform = 'scale(0.92)';
  setTimeout(() => btn.style.transform = '', 120);

  switch (action) {
    case 'number':    inputNumber(value);   break;
    case 'decimal':   inputDecimal();       break;
    case 'operator':  inputOperator(value); break;
    case 'equals':    inputEquals();        break;
    case 'percent':   inputPercent();       break;
    case 'sign':      inputSign();          break;
    case 'backspace': inputBackspace();     break;
    case 'clear':     inputClear();         break;
  }
});

/* ══════════════════════════════════════
   KEYBOARD SUPPORT
══════════════════════════════════════ */
document.addEventListener('keydown', e => {
  // Prevent default for calculator keys to avoid page scroll
  if (['Enter', '=', 'Backspace', 'Delete', 'Escape', '%'].includes(e.key) ||
      /^[0-9+\-*/.÷×]$/.test(e.key)) {
    e.preventDefault();
  }

  if (e.key >= '0' && e.key <= '9') {
    inputNumber(e.key);
    highlightBtn(`[data-value="${e.key}"]`);
  } else if (e.key === '.') {
    inputDecimal();
    highlightBtn('[data-action="decimal"]');
  } else if (e.key === '+') {
    inputOperator('+');
  } else if (e.key === '-') {
    inputOperator('-');
  } else if (e.key === '*') {
    inputOperator('×');
  } else if (e.key === '/') {
    inputOperator('÷');
  } else if (e.key === 'Enter' || e.key === '=') {
    inputEquals();
    highlightBtn('.btn-eq');
  } else if (e.key === 'Backspace') {
    inputBackspace();
    highlightBtn('[data-action="backspace"]');
  } else if (e.key === 'Delete' || e.key === 'Escape') {
    inputClear();
    highlightBtn('[data-action="clear"]');
  } else if (e.key === '%') {
    inputPercent();
    highlightBtn('[data-action="percent"]');
  }
});

function highlightBtn(selector) {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.style.transform = 'scale(0.92)';
  btn.style.filter = 'brightness(1.5)';
  setTimeout(() => { btn.style.transform = ''; btn.style.filter = ''; }, 140);
}

/* ══════════════════════════════════════
   HISTORY MANAGEMENT
══════════════════════════════════════ */
function addToHistory(expr, result) {
  const entry = { expr, result, ts: Date.now() };
  history.unshift(entry);
  if (history.length > 10) history.pop();
  localStorage.setItem('calcHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No calculations yet</li>';
    return;
  }
  historyList.innerHTML = history.map((h, i) => `
    <li class="history-item" data-result="${h.result}" style="animation-delay:${i*0.04}s">
      <span class="expr">${h.expr}</span>
      <span class="result">= ${formatNumber(h.result)}</span>
    </li>
  `).join('');

  // Click a history item to load result
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      currentInput = item.dataset.result;
      operator = null;
      prevInput = '';
      shouldReset = false;
      displayPrev.textContent = '';
      updateDisplay();
    });
  });
}

document.getElementById('clearHistory').addEventListener('click', () => {
  history = [];
  localStorage.removeItem('calcHistory');
  renderHistory();
});

// Render on load
renderHistory();

/* ══════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    themeIcon.textContent  = '☀';
    themeLabel.textContent = 'Light Mode';
  } else {
    themeIcon.textContent  = '🌙';
    themeLabel.textContent = 'Dark Mode';
  }
  localStorage.setItem('calcTheme', theme);
}

// Load saved theme
const savedTheme = localStorage.getItem('calcTheme') || 'dark';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ══════════════════════════════════════
   QUICK TOOLS
══════════════════════════════════════ */

/* — Percentage Calculator — */
document.getElementById('calcPct').addEventListener('click', () => {
  const value = parseFloat(document.getElementById('pctValue').value);
  const pct   = parseFloat(document.getElementById('pctPct').value);
  const result = document.getElementById('pctResult');

  if (isNaN(value) || isNaN(pct)) {
    result.textContent = '⚠ Please enter both values';
    result.style.color = '#FF6B6B';
    return;
  }

  const ans = cleanResult((pct / 100) * value);
  result.style.color = '';
  result.textContent = `${pct}% of ${value.toLocaleString('en-IN')} = ${ans.toLocaleString('en-IN')}`;
});

/* — Discount Calculator — */
document.getElementById('calcDisc').addEventListener('click', () => {
  const price    = parseFloat(document.getElementById('discPrice').value);
  const discount = parseFloat(document.getElementById('discPct').value);
  const result   = document.getElementById('discResult');

  if (isNaN(price) || isNaN(discount)) {
    result.textContent = '⚠ Please enter both values';
    result.style.color = '#FF6B6B';
    return;
  }
  if (discount < 0 || discount > 100) {
    result.textContent = '⚠ Discount must be 0–100%';
    result.style.color = '#FF6B6B';
    return;
  }

  const saved    = cleanResult((discount / 100) * price);
  const final    = cleanResult(price - saved);
  result.style.color = '';
  result.textContent = `₹${price.toLocaleString('en-IN')} − ${discount}% = ₹${final.toLocaleString('en-IN')} (save ₹${saved.toLocaleString('en-IN')})`;
});

/* — GST Calculator — */
document.getElementById('addGst').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('gstAmount').value);
  const rate   = parseFloat(document.getElementById('gstRate').value);
  const result = document.getElementById('gstResult');

  if (isNaN(amount) || isNaN(rate)) {
    result.textContent = '⚠ Please enter both values';
    result.style.color = '#FF6B6B';
    return;
  }

  const gst   = cleanResult((rate / 100) * amount);
  const total = cleanResult(amount + gst);
  result.style.color = '';
  result.textContent = `₹${amount.toLocaleString('en-IN')} + ${rate}% GST = ₹${total.toLocaleString('en-IN')} (GST: ₹${gst.toLocaleString('en-IN')})`;
});

document.getElementById('removeGst').addEventListener('click', () => {
  const inclusive = parseFloat(document.getElementById('gstAmount').value);
  const rate      = parseFloat(document.getElementById('gstRate').value);
  const result    = document.getElementById('gstResult');

  if (isNaN(inclusive) || isNaN(rate)) {
    result.textContent = '⚠ Please enter both values';
    result.style.color = '#FF6B6B';
    return;
  }

  const base = cleanResult(inclusive / (1 + rate / 100));
  const gst  = cleanResult(inclusive - base);
  result.style.color = '';
  result.textContent = `Base: ₹${base.toLocaleString('en-IN')} | GST (${rate}%): ₹${gst.toLocaleString('en-IN')}`;
});

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
updateDisplay();
