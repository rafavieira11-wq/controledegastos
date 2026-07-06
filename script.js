// State Management
let state = {
    transactions: [],
    settings: {
        username: "Usuário",
        currency: "BRL",
        initialBalance: 0.0,
        monthlyGoal: 0.0
    },
    theme: "light",
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    sortAsc: false
};

// Chart instances tracker
let charts = {
    category: null,
    monthly: null,
    evolution: null
};

// Currencies definitions configuration mapping
const currencyConfigs = {
    BRL: { locale: 'pt-BR', symbol: 'R$' },
    USD: { locale: 'en-US', symbol: '$' },
    EUR: { locale: 'de-DE', symbol: '€' }
};

// Document initialization lifecycle event
document.addEventListener("DOMContentLoaded", () => {
    loadDataFromLocalStorage();
    initApp();
});

// Load everything safely from browser LocalStorage
function loadDataFromLocalStorage() {
    const savedTransactions = localStorage.getItem("fin_transactions");
    if (savedTransactions) state.transactions = JSON.parse(savedTransactions);

    const savedSettings = localStorage.getItem("fin_settings");
    if (savedSettings) state.settings = JSON.parse(savedSettings);

    const savedTheme = localStorage.getItem("fin_theme");
    if (savedTheme) state.theme = savedTheme;
}

// Persist current app status into local browser database storage
function saveDataToLocalStorage() {
    localStorage.setItem("fin_transactions", JSON.stringify(state.transactions));
    localStorage.setItem("fin_settings", JSON.stringify(state.settings));
    localStorage.setItem("fin_theme", state.theme);
}

// Bootstrap all functionalities execution hooks
function initApp() {
    applyTheme(state.theme);
    updateUIElementsFromSettings();
    setupEventListeners();
    renderAll();
}

// Standard Dynamic Formatting Engine according to configured settings currency
function formatCurrency(value) {
    const cfg = currencyConfigs[state.settings.currency] || currencyConfigs.BRL;
    return new Intl.NumberFormat(cfg.locale, { style: 'currency', currency: state.settings.currency }).format(value);
}

function updateUIElementsFromSettings() {
    document.getElementById("user-display-name").innerText = state.settings.username;
    document.getElementById("set-username").value = state.settings.username;
    document.getElementById("set-currency").value = state.settings.currency;
    document.getElementById("set-initial-balance").value = state.settings.initialBalance;
    document.getElementById("set-monthly-goal").value = state.settings.monthlyGoal;
}

// Configure UI components actions listeners bindings
function setupEventListeners() {
    // Navigation routing setup
    document.querySelectorAll(".menu-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const tabId = btn.getAttribute("data-tab");
            document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
            document.getElementById(tabId).classList.add("active");
            
            // Render specific components if navigating into them
            if (tabId === 'calendar-tab') {
                renderCalendar();
            }
        });
    });

    // Theme Toggle switch click event
    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
        const nextTheme = state.theme === "light" ? "dark" : "light";
        applyTheme(nextTheme);
        saveDataToLocalStorage();
    });

    // Modal view visibility controllers triggers
    document.getElementById("open-modal-btn").addEventListener("click", () => openTransactionModal());
    document.getElementById("close-modal-btn").addEventListener("click", closeTransactionModal);
    document.getElementById("cancel-modal-btn").addEventListener("click", closeTransactionModal);
    
    // Process single entries modifications submits handles
    document.getElementById("transaction-form").addEventListener("submit", handleTransactionSubmit);

    // Filter controls triggers change callbacks cascade hooks
    document.getElementById("filter-search").addEventListener("input", renderTransactionsTable);
    document.getElementById("filter-period").addEventListener("change", renderTransactionsTable);
    document.getElementById("filter-type").addEventListener("change", renderTransactionsTable);
    document.getElementById("filter-category").addEventListener("change", renderTransactionsTable);
    document.getElementById("filter-status").addEventListener("change", renderTransactionsTable);
    
    // Sort columns items action triggers
    document.getElementById("sort-date").addEventListener("click", () => {
        state.sortAsc = !state.sortAsc;
        renderTransactionsTable();
    });

    // Calendar month shifting pagination controls bindings
    document.getElementById("prev-month-btn").addEventListener("click", () => shiftCalendarMonth(-1));
    document.getElementById("next-month-btn").addEventListener("click", () => shiftCalendarMonth(1));

    // Save global technical adjustments form event binding processing logic
    document.getElementById("save-settings-btn").addEventListener("click", handleSaveSettings);
    document.getElementById("clear-data-btn").addEventListener("click", handleResetApplicationData);

    // Notifications toggle pane activation popovers display trigger mechanics handler
    document.getElementById("notif-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const pane = document.getElementById("notif-dropdown");
        pane.style.display = pane.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", () => {
        document.getElementById("notif-dropdown").style.display = "none";
    });

    // Exportation file handlers setups bindings
    document.getElementById("export-csv-btn").addEventListener("click", exportToCSVFile);
    document.getElementById("export-pdf-btn").addEventListener("click", exportToPDFReport);
    document.getElementById("import-csv").addEventListener("change", handleCSVImportFileSelected);
}

// Change application skin context
function applyTheme(theme) {
    state.theme = theme;
    document.body.setAttribute("data-theme", theme);
    const themeBtnIcon = document.querySelector("#theme-toggle-btn i");
    const themeBtnText = document.querySelector("#theme-toggle-btn span");
    
    if (theme === "dark") {
        themeBtnIcon.className = "fas fa-sun";
        themeBtnText.innerText = "Modo Claro";
    } else {
        themeBtnIcon.className = "fas fa-moon";
        themeBtnText.innerText = "Modo Escuro";
    }
    // Redraw graphs charts indicators to maintain contrast ratios updates cleanly
    if (charts.category) renderCharts();
}

// Modal Operations Functions actions
function openTransactionModal(editIdx = null) {
    const modal = document.getElementById("transaction-modal");
    const form = document.getElementById("transaction-form");
    form.reset();
    
    if (editIdx !== null) {
        document.getElementById("modal-title").innerText = "Editar Lançamento";
        document.getElementById("edit-index").value = editIdx;
        
        const tx = state.transactions[editIdx];
        if (tx.type === "receita") document.getElementById("radio-income").checked = true;
        else document.getElementById("radio-expense").checked = true;
        
        document.getElementById("tx-description").value = tx.description;
        document.getElementById("tx-value").value = tx.value;
        document.getElementById("tx-date").value = tx.date;
        document.getElementById("tx-category").value = tx.category;
        document.getElementById("tx-status").value = tx.status;
    } else {
        document.getElementById("modal-title").innerText = "Novo Lançamento";
        document.getElementById("edit-index").value = "";
        document.getElementById("tx-date").value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.add("active");
}

function closeTransactionModal() {
    document.getElementById("transaction-modal").classList.remove("active");
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    const editIdx = document.getElementById("edit-index").value;
    
    const txData = {
        type: document.querySelector('input[name="type"]:checked').value,
        description: document.getElementById("tx-description").value.trim(),
        value: parseFloat(document.getElementById("tx-value").value),
        date: document.getElementById("tx-date").value,
        category: document.getElementById("tx-category").value.trim(),
        status: document.getElementById("tx-status").value
    };

    if (editIdx !== "") {
        state.transactions[editIdx] = txData;
    } else {
        state.transactions.push(txData);
    }

    saveDataToLocalStorage();
    closeTransactionModal();
    renderAll();
}

function deleteTransactionItem(idx) {
    if (confirm("Tem certeza que deseja excluir este lançamento?")) {
        state.transactions.splice(idx, 1);
        saveDataToLocalStorage();
        renderAll();
    }
}

// Calculation core metrics helpers engines
function getCalculatedMetrics() {
    const now = new Date();
    const currentMonthStr = String(state.currentMonth + 1).padStart(2, '0');
    const currentYearStr = String(state.currentYear);
    
    let saldoAtual = parseFloat(state.settings.initialBalance);
    let receitasMes = 0;
    let despesasMes = 0;
    
    let totalAReceberFuturo = 0;
    let totalAPagarFuturo = 0;

    const todayIso = now.toISOString().split('T')[0];

    state.transactions.forEach(tx => {
        const txDateObj = new Date(tx.date + 'T00:00:00');
        const txMonthStr = String(txDateObj.getMonth() + 1).padStart(2, '0');
        const txYearStr = String(txDateObj.getFullYear());
        
        // Check if item transaction is within scope of currently evaluated month period context tracker
        const isCurrentMonth = (txMonthStr === currentMonthStr && txYearStr === currentYearStr);
        
        // Item is effective balance structural component if already completed / paid or historical past event date
        if (tx.status === "pago" || tx.date <= todayIso) {
            if (tx.type === "receita") {
                saldoAtual += tx.value;
            } else {
                saldoAtual -= tx.value;
            }
        }

        // Monthly operational aggregates context stats sums metrics calculations
        if (isCurrentMonth) {
            if (tx.type === "receita") receitasMes += tx.value;
            else despesasMes += tx.value;
        }

        // Future pending forecast calculation structures engine metrics rules logic parser pipeline
        if (tx.date > todayIso && tx.status === "pendente") {
            if (tx.type === "receita") totalAReceberFuturo += tx.value;
            else totalAPagarFuturo += tx.value;
        }
    });

    const saldoPrevistoFinalMes = saldoAtual + totalAReceberFuturo - totalAPagarFuturo;

    return {
        saldoAtual,
        receitasMes,
        despesasMes,
        saldoPrevistoFinalMes,
        totalAReceberFuturo,
        totalAPagarFuturo
    };
}

// General Render Layouts orchestrator standard routine interface
function renderAll() {
    populateCategoryFilterDropdown();
    renderDashboardMetricsCards();
    renderGoalProgressBar();
    renderAlertsAndBannersNotifications();
    renderTransactionsTable();
    renderCharts();
    renderCalendar();
}

function renderDashboardMetricsCards() {
    const metrics = getCalculatedMetrics();
    document.getElementById("balance-val").innerText = formatCurrency(metrics.saldoAtual);
    document.getElementById("income-val").innerText = formatCurrency(metrics.receitasMes);
    document.getElementById("expense-val").innerText = formatCurrency(metrics.despesasMes);
    document.getElementById("forecast-val").innerText = formatCurrency(metrics.saldoPrevistoFinalMes);
}

function renderGoalProgressBar() {
    const metrics = getCalculatedMetrics();
    const goal = parseFloat(state.settings.monthlyGoal);
    const progressContainer = document.getElementById("goal-progress-bar");
    
    if (goal > 0) {
        const percentage = Math.min((metrics.despesasMes / goal) * 100, 100).toFixed(1);
        document.getElementById("goal-progress-text").innerText = `Gasto Atual: ${formatCurrency(metrics.despesasMes)} / Limite Meta: ${formatCurrency(goal)}`;
        document.getElementById("goal-percent").innerText = `${percentage}%`;
        progressContainer.style.width = `${percentage}%`;
        
        // Color shifts warning limits definitions rules thresholds indicators triggers class injection
        progressContainer.className = "progress-bar";
        if (percentage >= 90) progressContainer.classList.add("danger");
        else if (percentage >= 70) progressContainer.classList.add("warning");
        
        document.getElementById("goal-status-desc").innerText = percentage >= 100 ? 
            "⚠️ Atenção: Você ultrapassou a meta de teto limite estipulada para gastos do mês!" : "Seu planejamento de despesas está dentro do limite controlado.";
    } else {
        document.getElementById("goal-progress-text").innerText = "Meta não configurada.";
        document.getElementById("goal-percent").innerText = "0%";
        progressContainer.style.width = "0%";
        document.getElementById("goal-status-desc").innerText = "Defina um teto limite mensal na aba de Configurações para acompanhar o progresso.";
    }
}

function renderAlertsAndBannersNotifications() {
    const metrics = getCalculatedMetrics();
    const todayIso = new Date().toISOString().split('T')[0];
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysLaterIso = sevenDaysLater.toISOString().split('T')[0];
    
    let alerts = [];
    let criticalOverdueCount = 0;
    let warningSoonCount = 0;

    state.transactions.forEach(tx => {
        if (tx.status === "pendente") {
            if (tx.date < todayIso) {
                criticalOverdueCount++;
                if (tx.type === "despesa") {
                    alerts.push({ type: 'danger', msg: `<b>Conta Vencida:</b> "${tx.description}" venceu em ${formatDateString(tx.date)} (${formatCurrency(tx.value)})` });
                }
            } else if (tx.date >= todayIso && tx.date <= sevenDaysLaterIso) {
                warningSoonCount++;
                if (tx.type === "despesa") {
                    alerts.push({ type: 'warning', msg: `<b>Vence em breve:</b> "${tx.description}" vence em ${formatDateString(tx.date)} (${formatCurrency(tx.value)})` });
                }
            }
        }
    });

    // Macro structural predictions financial metrics checks warnings definitions
    if (metrics.saldoPrevistoFinalMes < 0) {
        alerts.push({ type: 'danger', msg: `<b>Previsão Negativa:</b> Seu saldo previsto para o final deste mês está negativo (${formatCurrency(metrics.saldoPrevistoFinalMes)}).` });
    }
    if (metrics.despesasMes > metrics.receitasMes) {
        alerts.push({ type: 'warning', msg: `<b>Aviso de Déficit:</b> As despesas totais do mês atual superaram as receitas cadastradas até o momento.` });
    }

    // Render alerts display viewport panels sections placeholders
    const bannerContainer = document.getElementById("alerts-banner-container");
    bannerContainer.innerHTML = "";
    
    const notifList = document.getElementById("notif-list");
    notifList.innerHTML = "";

    if (alerts.length === 0) {
        notifList.innerHTML = '<li class="empty-notif">Nenhum alerta pendente</li>';
        document.getElementById("notif-badge").innerText = "0";
    } else {
        document.getElementById("notif-badge").innerText = alerts.length;
        
        alerts.forEach(al => {
            // Add into immediate notification banner area framework layout row viewport view block template
            const banner = document.createElement("div");
            banner.className = `alert-banner ${al.type}`;
            banner.innerHTML = `<i class="fas ${al.type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i> <div>${al.msg}</div>`;
            bannerContainer.appendChild(banner);

            // Append into top toolbar drop-down element list row list item views blocks
            const li = document.createElement("li");
            li.className = al.type === 'danger' ? 'notif-warning' : '';
            li.innerHTML = al.msg;
            notifList.appendChild(li);
        });
    }
}

function populateCategoryFilterDropdown() {
    const filterDropdown = document.getElementById("filter-category");
    const currentSelected = filterDropdown.value;
    
    // Extract unique existing item parameters lists values entries
    let categories = new Set();
    state.transactions.forEach(tx => { if(tx.category) categories.add(tx.category); });
    
    filterDropdown.innerHTML = '<option value="all">Todas Categorias</option>';
    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.innerText = cat;
        filterDropdown.appendChild(opt);
    });
    
    filterDropdown.value = currentSelected;
}

function renderTransactionsTable() {
    const listBody = document.getElementById("transactions-list-body");
    listBody.innerHTML = "";

    // Read filters configuration criteria values parameters elements viewport states
    const searchVal = document.getElementById("filter-search").value.toLowerCase();
    const periodVal = document.getElementById("filter-period").value;
    const typeVal = document.getElementById("filter-type").value;
    const catVal = document.getElementById("filter-category").value;
    const statusVal = document.getElementById("filter-status").value;

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const currentMonthStr = String(state.currentMonth + 1).padStart(2, '0');
    const currentYearStr = String(state.currentYear);

    // Filter collection array dataset execution array transformations mapping logic pipelines
    let filteredList = state.transactions.map((tx, originalIndex) => ({ ...tx, originalIndex }));

    filteredList = filteredList.filter(item => {
        // Text string match description
        if (searchVal && !item.description.toLowerCase().includes(searchVal)) return false;
        
        // Type matching verification switch logic rule
        if (typeVal !== "all" && item.type !== typeVal) return false;
        
        // Category string validation rule
        if (catVal !== "all" && item.category !== catVal) return false;
        
        // Status checklist validation rule
        if (statusVal !== "all" && item.status !== statusVal) return false;

        // Period filter structural timelines check logic pipelines
        if (periodVal === "current-month") {
            const dateObj = new Date(item.date + 'T00:00:00');
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const y = String(dateObj.getFullYear());
            if (m !== currentMonthStr || y !== currentYearStr) return false;
        } else if (periodVal === "last-30") {
            if (item.date < thirtyDaysAgoStr || item.date > todayStr) return false;
        } else if (periodVal === "future") {
            if (item.date <= todayStr) return false;
        }

        return true;
    });

    // Sort dataset logic execution
    filteredList.sort((a, b) => {
        return state.sortAsc ? 
            new Date(a.date).getTime() - new Date(b.date).getTime() : 
            new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Populate data display container rows viewport list elements layout
    if (filteredList.length === 0) {
        listBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Nenhum lançamento localizado com os filtros selecionados.</td></tr>`;
        return;
    }

    filteredList.forEach(item => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td>${formatDateString(item.date)}</td>
            <td><i class="${item.type === 'receita' ? 'fas fa-circle-arrow-up text-income' : 'fas fa-circle-arrow-down text-expense'}"></i> ${item.type === 'receita' ? 'Receita' : 'Despesa'}</td>
            <td><b>${item.description}</b></td>
            <td><span style="opacity:0.85">${item.category}</span></td>
            <td class="${item.type === 'receita' ? 'text-income' : 'text-expense'}">${item.type === 'receita' ? '+' : '-'} ${formatCurrency(item.value)}</td>
            <td><span class="badge-status ${item.status}">${item.status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
            <td class="action-buttons no-print">
                <button class="btn-action btn-edit" onclick="openTransactionModal(${item.originalIndex})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-delete" onclick="deleteTransactionItem(${item.originalIndex})" title="Excluir"><i class="fas fa-trash-can"></i></button>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

// Convert data standard elements display text string metrics formatting configurations methods helpers
function formatDateString(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Charts Generation Engines Chart.js execution pipelines routines
function renderCharts() {
    const isDark = state.theme === 'dark';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#2c3e50';

    // Data Extraction Dataset preparation pipelines rules logic parsing components structures
    // 1. Expenditures categories values aggregations calculations breakdown dataset pipeline components 
    let categoriesMap = {};
    state.transactions.forEach(tx => {
        if (tx.type === "despesa") {
            categoriesMap[tx.category] = (categoriesMap[tx.category] || 0) + tx.value;
        }
    });
    const pieLabels = Object.keys(categoriesMap);
    const pieData = Object.values(categoriesMap);

    // 2. Bar Chart Historical timelines data collections sets mapping pipelines configuration
    let monthlyAggregation = {};
    state.transactions.forEach(tx => {
        const d = new Date(tx.date + 'T00:00:00');
        const labelKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyAggregation[labelKey]) monthlyAggregation[labelKey] = { income: 0, expense: 0 };
        
        if (tx.type === "receita") monthlyAggregation[labelKey].income += tx.value;
        else monthlyAggregation[labelKey].expense += tx.value;
    });
    // Sort chronological key entries string elements parameters arrays
    const sortedMonthsKeys = Object.keys(monthlyAggregation).sort().slice(-6); // Last 6 recorded active sequence datasets tracking months metrics 
    const barLabels = sortedMonthsKeys.map(k => {
        const pts = k.split('-');
        const mNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return `${mNames[parseInt(pts[1]) - 1]}/${pts[0].slice(2)}`;
    });
    const barIncomeData = sortedMonthsKeys.map(k => monthlyAggregation[k].income);
    const barExpenseData = sortedMonthsKeys.map(k => monthlyAggregation[k].expense);

    // 3. Balance evolution tracking timelines compilation metrics setup values
    // Sort transactions chronological sequences data maps elements records structures list references
    let chronologicalTx = [...state.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = parseFloat(state.settings.initialBalance);
    let lineLabels = ["Início"];
    let lineData = [runningBalance];
    
    // Max last 10 historical structural entries evolution lines limits
    chronologicalTx.slice(-12).forEach(tx => {
        if (tx.type === "receita") runningBalance += tx.value;
        else runningBalance -= tx.value;
        lineLabels.push(formatDateString(tx.date));
        lineData.push(runningBalance);
    });

    // Chart.js Canvas drawing tasks mechanics implementations instructions
    // Reset/Destroy previous graphs wrappers tracking references to circumvent internal framework drawing conflicts states bugs
    if (charts.category) charts.category.destroy();
    if (charts.monthly) charts.monthly.destroy();
    if (charts.evolution) charts.evolution.destroy();

    // PIE CHART DRAWING CORE MODULE
    const ctxPie = document.getElementById('categoryChart').getContext('2d');
    if (pieLabels.length === 0) {
        // Clear viewport if target structure data remains blank configuration mapping
        ctxPie.clearRect(0, 0, 100, 100);
    } else {
        charts.category = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: labelColor } }
                }
            }
        });
    }

    // BAR CHART DRAWING CORE MODULE
    const ctxBar = document.getElementById('monthlyChart').getContext('2d');
    charts.monthly = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: barLabels.length > 0 ? barLabels : ["Sem Dados"],
            datasets: [
                { label: 'Receitas', data: barIncomeData, backgroundColor: '#10b981' },
                { label: 'Despesas', data: barExpenseData, backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: labelColor } },
                y: { grid: { color: gridColor }, ticks: { color: labelColor } }
            },
            plugins: { legend: { labels: { color: labelColor } } }
        }
    });

    // LINE CHART DRAWING CORE MODULE
    const ctxLine = document.getElementById('evolutionChart').getContext('2d');
    charts.evolution = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: lineLabels,
            datasets: [{
                label: 'Saldo Evolutivo',
                data: lineData,
                borderColor: '#6c5ce7',
                backgroundColor: 'rgba(108, 92, 231, 0.1)',
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: labelColor } },
                y: { grid: { color: gridColor }, ticks: { color: labelColor } }
            },
            plugins: { legend: { labels: { color: labelColor } } }
        }
    });
}

// Financial Calendar Component Component System Framework Implementation
function renderCalendar() {
    const calMonthYearTitle = document.getElementById("calendar-month-year");
    const calDaysGrid = document.getElementById("calendar-days");
    calDaysGrid.innerHTML = "";

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    calMonthYearTitle.innerText = `${monthNames[state.currentMonth]} de ${state.currentYear}`;

    // Compute calendar dates offsets sequences mappings grids rules logic
    const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    
    // Inject empty placeholders spaces cells before starting day column position
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-day empty";
        calDaysGrid.appendChild(emptyCell);
    }

    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth()+1).padStart(2,'0')}-${String(todayObj.getDate()).padStart(2,'0')}`;

    // Loop through days items blocks structures templates definitions
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayCell = document.createElement("div");
        dayCell.className = "calendar-day";
        
        const currentLoopDateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (currentLoopDateStr === todayStr) {
            dayCell.classList.add("today");
        }

        // Aggregate daily items data models arrays records lists
        let dailyIncomeSum = 0;
        let dailyExpenseSum = 0;
        let dayTransactions = [];

        state.transactions.forEach(tx => {
            if (tx.date === currentLoopDateStr) {
                dayTransactions.push(tx);
                if (tx.type === "receita") dailyIncomeSum += tx.value;
                else dailyExpenseSum += tx.value;
            }
        });

        dayCell.innerHTML = `
            <div class="calendar-day-num">${day}</div>
            <div class="calendar-day-indicators">
                ${dailyIncomeSum > 0 ? `<div class="ind income">🟢 +${formatCurrency(dailyIncomeSum)}</div>` : ''}
                ${dailyExpenseSum > 0 ? `<div class="ind expense">🔴 -${formatCurrency(dailyExpenseSum)}</div>` : ''}
            </div>
        `;

        // Configure grid click event handling routines triggers parameters
        dayCell.addEventListener("click", () => {
            showCalendarDayDetails(currentLoopDateStr, dayTransactions);
        });

        calDaysGrid.appendChild(dayCell);
    }
}

function shiftCalendarMonth(direction) {
    state.currentMonth += direction;
    if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear++;
    } else if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear--;
    }
    renderCalendar();
}

function showCalendarDayDetails(dateStr, dayTransactions) {
    const panel = document.getElementById("day-details-panel");
    const title = document.getElementById("selected-date-display");
    const body = document.getElementById("day-transactions-body");
    
    title.innerText = formatDateString(dateStr);
    body.innerHTML = "";

    if (dayTransactions.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum lançamento registrado nesta data.</td></tr>`;
    } else {
        dayTransactions.forEach(tx => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><i class="${tx.type === 'receita' ? 'fas fa-circle-arrow-up text-income' : 'fas fa-circle-arrow-down text-expense'}"></i> ${tx.type === 'receita' ? 'Receita' : 'Despesa'}</td>
                <td><b>${tx.description}</b></td>
                <td>${tx.category}</td>
                <td class="${tx.type === 'receita' ? 'text-income' : 'text-expense'}">${tx.type === 'receita' ? '+' : '-'} ${formatCurrency(tx.value)}</td>
                <td><span class="badge-status ${tx.status}">${tx.status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
            `;
            body.appendChild(tr);
        });
    }
    
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: 'smooth' });
}

// Technical Settings Systems Forms management parameters logic execution pipelines rules handling
function handleSaveSettings() {
    const usernameInput = document.getElementById("set-username").value.trim();
    const currencyInput = document.getElementById("set-currency").value;
    const initialBalanceInput = parseFloat(document.getElementById("set-initial-balance").value) || 0.0;
    const monthlyGoalInput = parseFloat(document.getElementById("set-monthly-goal").value) || 0.0;

    state.settings.username = usernameInput || "Usuário";
    state.settings.currency = currencyInput;
    state.settings.initialBalance = initialBalanceInput;
    state.settings.monthlyGoal = monthlyGoalInput;

    saveDataToLocalStorage();
    alert("Configurações atualizadas com sucesso!");
    renderAll();
}

function handleResetApplicationData() {
    if (confirm("🚨 ATENÇÃO: Deseja apagar permanentemente todas as movimentações e restaurar os padrões de fábrica? Esta ação não pode ser desfeita!")) {
        localStorage.clear();
        state.transactions = [];
        state.settings = { username: "Usuário", currency: "BRL", initialBalance: 0.0, monthlyGoal: 0.0 };
        state.theme = "light";
        state.currentMonth = new Date().getMonth();
        state.currentYear = new Date().getFullYear();
        
        updateUIElementsFromSettings();
        initApp();
        alert("Todos os dados foram resetados com sucesso.");
    }
}

// Data Serialization Export File system mechanics logic handling operations
function exportToCSVFile() {
    if (state.transactions.length === 0) {
        alert("Nenhum dado cadastrado para exportação.");
        return;
    }

    let csvLines = ["Data;Tipo;Descricao;Categoria;Valor;Status"];
    
    state.transactions.forEach(tx => {
        csvLines.push(`${tx.date};${tx.type};${tx.description};${tx.category};${tx.value};${tx.status}`);
    });

    const csvContentString = "data:text/csv;charset=utf-8,\uFEFF" + csvLines.join("\n");
    const encodedUri = encodeURI(csvContentString);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `Financas_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

function handleCSVImportFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = function(evt) {
        try {
            const rawText = evt.target.result;
            const textLines = rawText.split(/\r?\n/);
            let importedCount = 0;

            // Start iteration line block skipping standard row header columns index zero layout
            for (let i = 1; i < textLines.length; i++) {
                const line = textLines[i].trim();
                if (!line) continue;

                const columnSegments = line.split(';');
                if (columnSegments.length < 6) continue;

                const [date, type, description, category, value, status] = columnSegments;

                // Basic validation checks before pushing entity mapping structural object data
                if (date && (type === "receita" || type === "despesa") && description && !isNaN(parseFloat(value))) {
                    state.transactions.push({
                        date: date,
                        type: type,
                        description: description,
                        category: category || "Outros",
                        value: parseFloat(value),
                        status: status === "pago" || status === "pendente" ? status : "pago"
                    });
                    importedCount++;
                }
            }

            if (importedCount > 0) {
                saveDataToLocalStorage();
                renderAll();
                alert(`Sucesso! Foram importados ${importedCount} lançamentos válidos com êxito.`);
            } else {
                alert("Nenhum lançamento válido foi localizado dentro do arquivo carregado. Certifique-se de usar o delimitador ponto e vírgula (;).");
            }
        } catch (err) {
            alert("Erro crítico no processamento de leitura estrutural sintática do arquivo CSV selecionado.");
            console.error(err);
        }
    };
    fileReader.readAsText(file);
    // Reset file value handler input
    e.target.value = "";
}

function exportToPDFReport() {
    const element = document.getElementById('pdf-table-area');
    const opt = {
        margin:       10,
        filename:     `Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    // Execute rendering automation stream layout mapping framework trigger
    html2pdf().set(opt).from(element).save();
}
