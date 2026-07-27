// Firebase SDKs imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

// Firebase Configurations
const firebaseConfig = {
    apiKey: "AIzaSyBUPQZjQnJRS92_8BHR4Z0bsowh1594er4",
    authDomain: "controledegastos-868d1.firebaseapp.com",
    databaseURL: "https://controledegastos-868d1-default-rtdb.firebaseio.com",
    projectId: "controledegastos-868d1",
    storageBucket: "controledegastos-868d1.firebasestorage.app",
    messagingSenderId: "607224476147",
    appId: "1:607224476147:web:816fe74757adce82542286",
    measurementId: "G-D1D035C0GS"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
let currentUser = null;

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

let charts = { category: null, monthly: null, evolution: null };
const currencyConfigs = {
    BRL: { locale: 'pt-BR', symbol: 'R$' },
    USD: { locale: 'en-US', symbol: '$' },
    EUR: { locale: 'de-DE', symbol: '€' }
};

let eventsSetup = false;

// Initialization Observer Event
document.addEventListener("DOMContentLoaded", () => {
    setupAuthUI();
});

function setupAuthUI() {
    const errorEl = document.getElementById("auth-error");

    document.getElementById("btn-login").addEventListener("click", () => {
        const email = document.getElementById("auth-email").value;
        const pass = document.getElementById("auth-password").value;
        signInWithEmailAndPassword(auth, email, pass).catch(err => errorEl.innerText = "Erro: " + err.message);
    });

    document.getElementById("btn-register").addEventListener("click", () => {
        const email = document.getElementById("auth-email").value;
        const pass = document.getElementById("auth-password").value;
        createUserWithEmailAndPassword(auth, email, pass).catch(err => errorEl.innerText = "Erro: " + err.message);
    });

    document.getElementById("btn-google").addEventListener("click", () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch(err => errorEl.innerText = "Erro: " + err.message);
    });

    // Monitor Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            document.getElementById("auth-screen").classList.remove("active");
            document.getElementById("app-container").style.display = "table";
            
            // Sync Username with Google Auth if default
            if (user.displayName && state.settings.username === "Usuário") {
                state.settings.username = user.displayName;
            }
            
            await loadDataFromFirebase();
            if(!eventsSetup) setupEventListeners();
            initApp();
        } else {
            currentUser = null;
            document.getElementById("auth-screen").classList.add("active");
            document.getElementById("app-container").style.display = "none";
        }
    });
}

async function loadDataFromFirebase() {
    if (!currentUser) return;
    const dbRef = ref(database);
    try {
        const snapshot = await get(child(dbRef, `users/${currentUser.uid}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            state.transactions = data.transactions || [];
            state.settings = data.settings || state.settings;
            state.theme = data.theme || state.theme;
        } else {
            saveDataToFirebase();
        }
    } catch (e) {
        console.error("Erro ao carregar dados do Firebase", e);
    }
}

function saveDataToFirebase() {
    if (!currentUser) return;
    set(ref(database, `users/${currentUser.uid}`), {
        transactions: state.transactions,
        settings: state.settings,
        theme: state.theme
    });
}

function initApp() {
    applyTheme(state.theme);
    updateUIElementsFromSettings();
    renderAll();
}

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

function setupEventListeners() {
    eventsSetup = true;

    document.getElementById("logout-btn").addEventListener("click", () => {
        signOut(auth);
    });

    document.querySelectorAll(".menu-btn").forEach(btn => {
        if (btn.id === "logout-btn") return; 
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const tabId = btn.getAttribute("data-tab");
            document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
            document.getElementById(tabId).classList.add("active");
            
            if (tabId === 'calendar-tab') renderCalendar();
        });
    });

    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
        const nextTheme = state.theme === "light" ? "dark" : "light";
        applyTheme(nextTheme);
        saveDataToFirebase();
    });

    document.getElementById("open-modal-btn").addEventListener("click", () => openTransactionModal());
    document.getElementById("close-modal-btn").addEventListener("click", closeTransactionModal);
    document.getElementById("cancel-modal-btn").addEventListener("click", closeTransactionModal);
    document.getElementById("transaction-form").addEventListener("submit", handleTransactionSubmit);

    document.getElementById("filter-specific-month").addEventListener("change", renderTransactionsTable);
    document.getElementById("filter-search").addEventListener("input", renderTransactionsTable);
    document.getElementById("filter-period").addEventListener("change", renderTransactionsTable);
    document.getElementById("filter-type").addEventListener("change", renderTransactionsTable);
    document.getElementById("filter-category").addEventListener("change", renderTransactionsTable);
    document.getElementById("filter-status").addEventListener("change", renderTransactionsTable);
    
    document.getElementById("sort-date").addEventListener("click", () => {
        state.sortAsc = !state.sortAsc;
        renderTransactionsTable();
    });

    document.getElementById("prev-month-btn").addEventListener("click", () => shiftCalendarMonth(-1));
    document.getElementById("next-month-btn").addEventListener("click", () => shiftCalendarMonth(1));

    document.getElementById("save-settings-btn").addEventListener("click", handleSaveSettings);
    document.getElementById("clear-data-btn").addEventListener("click", handleResetApplicationData);

    document.getElementById("notif-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const pane = document.getElementById("notif-dropdown");
        pane.style.display = pane.style.display === "block" ? "none" : "block";
    });
    document.addEventListener("click", () => document.getElementById("notif-dropdown").style.display = "none");

    document.getElementById("export-csv-btn").addEventListener("click", exportToCSVFile);
    document.getElementById("export-pdf-btn").addEventListener("click", exportToPDFReport);
    document.getElementById("import-csv").addEventListener("change", handleCSVImportFileSelected);
}

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
    if (charts.category) renderCharts();
}

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
        
        // Carrega infos novas
        document.getElementById("tx-fixed").checked = tx.isFixed || false;
        document.getElementById("tx-installment-current").value = tx.installmentCurrent || "";
        document.getElementById("tx-installment-total").value = tx.installmentTotal || "";
    } else {
        document.getElementById("modal-title").innerText = "Novo Lançamento";
        document.getElementById("edit-index").value = "";
        document.getElementById("tx-date").value = new Date().toISOString().split('T')[0];
        document.getElementById("tx-fixed").checked = false;
        document.getElementById("tx-installment-current").value = "";
        document.getElementById("tx-installment-total").value = "";
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
        status: document.getElementById("tx-status").value,
        isFixed: document.getElementById("tx-fixed").checked,
        installmentCurrent: parseInt(document.getElementById("tx-installment-current").value) || null,
        installmentTotal: parseInt(document.getElementById("tx-installment-total").value) || null
    };

    if (editIdx !== "") state.transactions[editIdx] = txData;
    else state.transactions.push(txData);

    saveDataToFirebase();
    closeTransactionModal();
    renderAll();
}

function deleteTransactionItem(idx) {
    if (confirm("Tem certeza que deseja excluir este lançamento?")) {
        state.transactions.splice(idx, 1);
        saveDataToFirebase();
        renderAll();
    }
}

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
        
        const isCurrentMonth = (txMonthStr === currentMonthStr && txYearStr === currentYearStr);
        
        if (tx.status === "pago" || tx.date <= todayIso) {
            if (tx.type === "receita") saldoAtual += tx.value;
            else saldoAtual -= tx.value;
        }

        if (isCurrentMonth) {
            if (tx.type === "receita") receitasMes += tx.value;
            else despesasMes += tx.value;
        }

        if (tx.date > todayIso && tx.status === "pendente") {
            if (tx.type === "receita") totalAReceberFuturo += tx.value;
            else totalAPagarFuturo += tx.value;
        }
    });

    return {
        saldoAtual, receitasMes, despesasMes,
        saldoPrevistoFinalMes: saldoAtual + totalAReceberFuturo - totalAPagarFuturo,
        totalAReceberFuturo, totalAPagarFuturo
    };
}

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

    state.transactions.forEach(tx => {
        if (tx.status === "pendente") {
            if (tx.date < todayIso) {
                if (tx.type === "despesa") alerts.push({ type: 'danger', msg: `<b>Conta Vencida:</b> "${tx.description}" venceu em ${formatDateString(tx.date)} (${formatCurrency(tx.value)})` });
            } else if (tx.date >= todayIso && tx.date <= sevenDaysLaterIso) {
                if (tx.type === "despesa") alerts.push({ type: 'warning', msg: `<b>Vence em breve:</b> "${tx.description}" vence em ${formatDateString(tx.date)} (${formatCurrency(tx.value)})` });
            }
        }
    });

    if (metrics.saldoPrevistoFinalMes < 0) {
        alerts.push({ type: 'danger', msg: `<b>Previsão Negativa:</b> Seu saldo previsto para o final deste mês está negativo (${formatCurrency(metrics.saldoPrevistoFinalMes)}).` });
    }
    if (metrics.despesasMes > metrics.receitasMes) {
        alerts.push({ type: 'warning', msg: `<b>Aviso de Déficit:</b> As despesas totais do mês atual superaram as receitas.` });
    }

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
            const banner = document.createElement("div");
            banner.className = `alert-banner ${al.type}`;
            banner.innerHTML = `<i class="fas ${al.type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i> <div>${al.msg}</div>`;
            bannerContainer.appendChild(banner);

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

    const specificMonthVal = document.getElementById("filter-specific-month").value;
    const searchVal = document.getElementById("filter-search").value.toLowerCase();
    const periodVal = document.getElementById("filter-period").value;
    const typeVal = document.getElementById("filter-type").value;
    const catVal = document.getElementById("filter-category").value;
    const statusVal = document.getElementById("filter-status").value;

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const currentMonthStr = String(state.currentMonth + 1).padStart(2, '0');
    const currentYearStr = String(state.currentYear);

    let filteredList = state.transactions.map((tx, originalIndex) => ({ ...tx, originalIndex }));

    filteredList = filteredList.filter(item => {
        if (searchVal && !item.description.toLowerCase().includes(searchVal)) return false;
        if (typeVal !== "all" && item.type !== typeVal) return false;
        if (catVal !== "all" && item.category !== catVal) return false;
        if (statusVal !== "all" && item.status !== statusVal) return false;

        // Se o usuário selecionou um mês específico no novo input de data
        if (specificMonthVal) {
            if (!item.date.startsWith(specificMonthVal)) return false;
        } 
        else if (periodVal === "current-month") {
            const dateObj = new Date(item.date + 'T00:00:00');
            if (String(dateObj.getMonth() + 1).padStart(2, '0') !== currentMonthStr || String(dateObj.getFullYear()) !== currentYearStr) return false;
        } else if (periodVal === "last-30") {
            if (item.date < thirtyDaysAgoStr || item.date > todayStr) return false;
        } else if (periodVal === "future") {
            if (item.date <= todayStr) return false;
        }
        return true;
    });

    filteredList.sort((a, b) => {
        return state.sortAsc ? 
            new Date(a.date).getTime() - new Date(b.date).getTime() : 
            new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    if (filteredList.length === 0) {
        listBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">Nenhum lançamento localizado com os filtros selecionados.</td></tr>`;
        return;
    }

    filteredList.forEach(item => {
        const tr = document.createElement("tr");
        
        let badgesInfos = '';
        if (item.isFixed) {
            badgesInfos += `<span class="badge-extra badge-fixed">Fixa</span>`;
        }
        if (item.installmentTotal && item.installmentTotal > 1) {
            const atual = item.installmentCurrent || 1;
            const faltam = item.installmentTotal - atual;
            badgesInfos += `<span class="badge-extra badge-installment">Parcela ${atual}/${item.installmentTotal} (Faltam ${faltam})</span>`;
        }

        tr.innerHTML = `
            <td>${formatDateString(item.date)}</td>
            <td><i class="${item.type === 'receita' ? 'fas fa-circle-arrow-up text-income' : 'fas fa-circle-arrow-down text-expense'}"></i> ${item.type === 'receita' ? 'Receita' : 'Despesa'}</td>
            <td><b>${item.description}</b> ${badgesInfos}</td>
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

function formatDateString(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function renderCharts() {
    const isDark = state.theme === 'dark';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#2c3e50';

    let categoriesMap = {};
    state.transactions.forEach(tx => {
        if (tx.type === "despesa") categoriesMap[tx.category] = (categoriesMap[tx.category] || 0) + tx.value;
    });
    const pieLabels = Object.keys(categoriesMap);
    const pieData = Object.values(categoriesMap);

    let monthlyAggregation = {};
    state.transactions.forEach(tx => {
        const d = new Date(tx.date + 'T00:00:00');
        const labelKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyAggregation[labelKey]) monthlyAggregation[labelKey] = { income: 0, expense: 0 };
        if (tx.type === "receita") monthlyAggregation[labelKey].income += tx.value;
        else monthlyAggregation[labelKey].expense += tx.value;
    });
    const sortedMonthsKeys = Object.keys(monthlyAggregation).sort().slice(-6); 
    const barLabels = sortedMonthsKeys.map(k => {
        const pts = k.split('-');
        const mNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return `${mNames[parseInt(pts[1]) - 1]}/${pts[0].slice(2)}`;
    });
    const barIncomeData = sortedMonthsKeys.map(k => monthlyAggregation[k].income);
    const barExpenseData = sortedMonthsKeys.map(k => monthlyAggregation[k].expense);

    let chronologicalTx = [...state.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningBalance = parseFloat(state.settings.initialBalance);
    let lineLabels = ["Início"];
    let lineData = [runningBalance];
    
    chronologicalTx.slice(-12).forEach(tx => {
        if (tx.type === "receita") runningBalance += tx.value;
        else runningBalance -= tx.value;
        lineLabels.push(formatDateString(tx.date));
        lineData.push(runningBalance);
    });

    if (charts.category) charts.category.destroy();
    if (charts.monthly) charts.monthly.destroy();
    if (charts.evolution) charts.evolution.destroy();

    const ctxPie = document.getElementById('categoryChart').getContext('2d');
    if (pieLabels.length === 0) {
        ctxPie.clearRect(0, 0, 100, 100);
    } else {
        charts.category = new Chart(ctxPie, {
            type: 'pie', data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: labelColor } } } }
        });
    }

    const ctxBar = document.getElementById('monthlyChart').getContext('2d');
    charts.monthly = new Chart(ctxBar, {
        type: 'bar', data: { labels: barLabels.length > 0 ? barLabels : ["Sem Dados"], datasets: [{ label: 'Receitas', data: barIncomeData, backgroundColor: '#10b981' }, { label: 'Despesas', data: barExpenseData, backgroundColor: '#ef4444' }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: gridColor }, ticks: { color: labelColor } }, y: { grid: { color: gridColor }, ticks: { color: labelColor } } }, plugins: { legend: { labels: { color: labelColor } } } }
    });

    const ctxLine = document.getElementById('evolutionChart').getContext('2d');
    charts.evolution = new Chart(ctxLine, {
        type: 'line', data: { labels: lineLabels, datasets: [{ label: 'Saldo Evolutivo', data: lineData, borderColor: '#6c5ce7', backgroundColor: 'rgba(108, 92, 231, 0.1)', fill: true, tension: 0.2 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: gridColor }, ticks: { color: labelColor } }, y: { grid: { color: gridColor }, ticks: { color: labelColor } } }, plugins: { legend: { labels: { color: labelColor } } } }
    });
}

function renderCalendar() {
    const calMonthYearTitle = document.getElementById("calendar-month-year");
    const calDaysGrid = document.getElementById("calendar-days");
    calDaysGrid.innerHTML = "";

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    calMonthYearTitle.innerText = `${monthNames[state.currentMonth]} de ${state.currentYear}`;

    const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "calendar-day empty";
        calDaysGrid.appendChild(emptyCell);
    }

    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth()+1).padStart(2,'0')}-${String(todayObj.getDate()).padStart(2,'0')}`;

    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayCell = document.createElement("div");
        dayCell.className = "calendar-day";
        const currentLoopDateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (currentLoopDateStr === todayStr) dayCell.classList.add("today");

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

        dayCell.addEventListener("click", () => showCalendarDayDetails(currentLoopDateStr, dayTransactions));
        calDaysGrid.appendChild(dayCell);
    }
}

function shiftCalendarMonth(direction) {
    state.currentMonth += direction;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; } 
    else if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    renderCalendar();
}

function showCalendarDayDetails(dateStr, dayTransactions) {
    const panel = document.getElementById("day-details-panel");
    const body = document.getElementById("day-transactions-body");
    document.getElementById("selected-date-display").innerText = formatDateString(dateStr);
    body.innerHTML = "";

    if (dayTransactions.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Nenhum lançamento registrado nesta data.</td></tr>`;
    } else {
        dayTransactions.forEach(tx => {
            const tr = document.createElement("tr");
            
            let badgesInfos = '';
            if (tx.isFixed) badgesInfos += `<span class="badge-extra badge-fixed">Fixa</span>`;
            if (tx.installmentTotal && tx.installmentTotal > 1) {
                const atual = tx.installmentCurrent || 1;
                badgesInfos += `<span class="badge-extra badge-installment">${atual}/${tx.installmentTotal}</span>`;
            }

            tr.innerHTML = `
                <td><i class="${tx.type === 'receita' ? 'fas fa-circle-arrow-up text-income' : 'fas fa-circle-arrow-down text-expense'}"></i> ${tx.type === 'receita' ? 'Receita' : 'Despesa'}</td>
                <td><b>${tx.description}</b> ${badgesInfos}</td>
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

function handleSaveSettings() {
    state.settings.username = document.getElementById("set-username").value.trim() || "Usuário";
    state.settings.currency = document.getElementById("set-currency").value;
    state.settings.initialBalance = parseFloat(document.getElementById("set-initial-balance").value) || 0.0;
    state.settings.monthlyGoal = parseFloat(document.getElementById("set-monthly-goal").value) || 0.0;

    saveDataToFirebase();
    alert("Configurações atualizadas com sucesso!");
    renderAll();
}

function handleResetApplicationData() {
    if (confirm("🚨 ATENÇÃO: Deseja apagar permanentemente todas as movimentações e restaurar os padrões de fábrica do seu perfil? Esta ação não pode ser desfeita!")) {
        state.transactions = [];
        state.settings = { username: currentUser.displayName || "Usuário", currency: "BRL", initialBalance: 0.0, monthlyGoal: 0.0 };
        state.theme = "light";
        saveDataToFirebase();
        updateUIElementsFromSettings();
        initApp();
        alert("Todos os dados foram resetados com sucesso.");
    }
}

function exportToCSVFile() {
    if (state.transactions.length === 0) return alert("Nenhum dado cadastrado para exportação.");
    let csvLines = ["Data;Tipo;Descricao;Categoria;Valor;Status"];
    state.transactions.forEach(tx => csvLines.push(`${tx.date};${tx.type};${tx.description};${tx.category};${tx.value};${tx.status}`));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csvLines.join("\n")));
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
            const textLines = evt.target.result.split(/\r?\n/);
            let importedCount = 0;
            for (let i = 1; i < textLines.length; i++) {
                const line = textLines[i].trim();
                if (!line) continue;
                const cols = line.split(';');
                if (cols.length < 6) continue;
                const [date, type, description, category, value, status] = cols;
                if (date && (type === "receita" || type === "despesa") && description && !isNaN(parseFloat(value))) {
                    state.transactions.push({ date, type, description, category: category || "Outros", value: parseFloat(value), status: status === "pago" || status === "pendente" ? status : "pago" });
                    importedCount++;
                }
            }
            if (importedCount > 0) {
                saveDataToFirebase();
                renderAll();
                alert(`Sucesso! Foram importados ${importedCount} lançamentos válidos.`);
            } else alert("Nenhum lançamento válido foi localizado.");
        } catch (err) { alert("Erro ao processar o arquivo CSV."); }
    };
    fileReader.readAsText(file);
    e.target.value = "";
}

function exportToPDFReport() {
    html2pdf().set({
        margin: 10, filename: `Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).from(document.getElementById('pdf-table-area')).save();
}

// Attach globally for inline HTML references
window.openTransactionModal = openTransactionModal;
window.deleteTransactionItem = deleteTransactionItem;
