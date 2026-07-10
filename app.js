// --- DOM ELEMENTS ---
const balanceEl = document.getElementById('net-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const formEl = document.getElementById('transaction-form');
const descInput = document.getElementById('desc-input');
const amountInput = document.getElementById('amount-input');
const categoryInput = document.getElementById('category-input');
const ledgerList = document.getElementById('transaction-list');
const expenseBars = document.getElementById('expense-bars');
const expenseLegend = document.getElementById('expense-legend');

// --- STATE MANAGEMENT ---
// Hydrate from localStorage or start empty
let transactions = JSON.parse(localStorage.getItem('apex_ledger_data')) || [];

// Category color mapping for the breakdown UI
const categoryColors = {
    'Housing': '#3B82F6',       // Blue
    'Food & Dining': '#F59E0B', // Amber
    'Transportation': '#8B5CF6',// Purple
    'Utilities': '#06B6D4',     // Cyan
    'Entertainment': '#EC4899', // Pink
    'Other': '#64748B'          // Slate
};

// --- CORE FUNCTIONS ---

// 1. Boot up app
function init() {
    updateSummary();
    renderLedger();
    renderBreakdown();
}

// 2. Compute Math & Update Header
function updateSummary() {
    // Optimized reduce for total exact math without float rounding errors
    const totals = transactions.reduce((acc, curr) => {
        // Convert to cents to avoid floating point math errors
        const val = Math.round(curr.amount * 100);
        if (curr.type === 'income') acc.income += val;
        else acc.expense += val;
        return acc;
    }, { income: 0, expense: 0 });

    const net = totals.income - totals.expense;

    // Convert back to dollars and inject
    balanceEl.innerText = formatCurrency(net / 100);
    incomeEl.innerText = `+${formatCurrency(totals.income / 100)}`;
    expenseEl.innerText = `-${formatCurrency(totals.expense / 100)}`;
}

// 3. Render Transaction List (CRUD: Read)
function renderLedger() {
    ledgerList.innerHTML = '';

    if (transactions.length === 0) {
        ledgerList.innerHTML = '<li class="empty-state">No transactions yet.</li>';
        return;
    }

    // Sort descending by date
    const sorted = [...transactions].sort((a, b) => b.date - a.date);

    sorted.forEach(trx => {
        const li = document.createElement('li');
        li.classList.add('transaction-item', `${trx.type}-row`);
        
        const sign = trx.type === 'income' ? '+' : '-';
        const colorClass = trx.type === 'income' ? 'text-income' : 'text-expense';

        li.innerHTML = `
            <div class="transaction-info">
                <span class="transaction-title">${trx.description}</span>
                <span class="transaction-meta">${trx.category} &bull; ${new Date(trx.date).toLocaleDateString()}</span>
            </div>
            <div class="transaction-amount-group">
                <span class="${colorClass}">${sign}${formatCurrency(trx.amount)}</span>
                <button class="btn-delete" onclick="deleteTransaction(${trx.id})">&times;</button>
            </div>
        `;
        ledgerList.appendChild(li);
    });
}

// 4. Render CSS Expense Breakdown
function renderBreakdown() {
    expenseBars.innerHTML = '';
    expenseLegend.innerHTML = '';

    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) {
        expenseBars.innerHTML = `<div class="progress-segment" style="width: 100%; background-color: var(--border);"></div>`;
        return;
    }

    // Group expenses by category safely converting amounts
    const categoryTotals = expenses.reduce((acc, curr) => {
        const val = Math.round(curr.amount * 100);
        acc[curr.category] = (acc[curr.category] || 0) + val;
        return acc;
    }, {});

    const totalExpenseCents = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

    // Build the dynamic DOM elements for the bar and legend
    for (const [category, amountCents] of Object.entries(categoryTotals)) {
        const percentage = (amountCents / totalExpenseCents) * 100;
        const color = categoryColors[category] || categoryColors['Other'];

        // Inject Native CSS Bar
        const bar = document.createElement('div');
        bar.classList.add('progress-segment');
        bar.style.width = `${percentage}%`;
        bar.style.backgroundColor = color;
        bar.title = `${category}: ${percentage.toFixed(1)}%`;
        expenseBars.appendChild(bar);

        // Inject Legend
        const legendItem = document.createElement('div');
        legendItem.classList.add('legend-item');
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${color}"></div>
            <span>${category} (${percentage.toFixed(1)}%)</span>
        `;
        expenseLegend.appendChild(legendItem);
    }
}

// 5. Add Transaction (CRUD: Create)
function addTransaction(e) {
    e.preventDefault();
    
    const desc = descInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = document.querySelector('input[name="type"]:checked').value;
    const category = categoryInput.value;

    if (!desc || isNaN(amount) || !category) return;

    const newTransaction = {
        id: Date.now(), // Unique ID based on timestamp
        description: desc,
        amount: amount,
        type: type,
        category: category,
        date: Date.now()
    };

    transactions.push(newTransaction);
    syncStorage();
    
    // Reset form UI
    descInput.value = '';
    amountInput.value = '';
    categoryInput.selectedIndex = 0;

    init();
}

// 6. Delete Transaction (CRUD: Delete)
// Attached to the window object to be callable from inline HTML onclick
window.deleteTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    syncStorage();
    init();
}

// --- UTILITIES ---
function syncStorage() {
    localStorage.setItem('apex_ledger_data', JSON.stringify(transactions));
}

function formatCurrency(num) {
    // Ensure negative net balances render gracefully as -$0.00 instead of $-0.00
    const absolute = Math.abs(num);
    return (num < 0 ? '-' : '') + '$' + absolute.toFixed(2);
}

// --- EVENT LISTENERS ---
formEl.addEventListener('submit', addTransaction);

// Initialize application on load
init();