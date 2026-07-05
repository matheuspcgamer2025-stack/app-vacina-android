import { CALENDARIO_SUS, appState } from './database.js';

const REMINDERS_DISMISSED_KEY = 'vacina_dismissed_reminders';

function carregarLembretesDescartados() {
    return JSON.parse(localStorage.getItem(REMINDERS_DISMISSED_KEY) || '[]');
}

function salvarLembretesDescartados(descartados) {
    localStorage.setItem(REMINDERS_DISMISSED_KEY, JSON.stringify(descartados));
}

function descartarLembrete(nome) {
    const descartados = carregarLembretesDescartados();
    if (!descartados.includes(nome)) {
        descartados.push(nome);
        salvarLembretesDescartados(descartados);
    }
    renderizarLembretes();
}

export function renderizarLembretes() {
    const list = document.getElementById('reminders-list');
    if (!list) return; // Proteção contra erro de elemento não encontrado
    
    list.innerHTML = "";
    
    const nomesJaTomados = appState.carteira.map(v => v.nome.toLowerCase());
    const descartados = carregarLembretesDescartados();
    const pendentes = CALENDARIO_SUS
        .filter(v => !nomesJaTomados.some(j => j.includes(v.nome.toLowerCase())))
        .filter(v => !descartados.includes(v.nome));

    if (pendentes.length === 0) {
        const li = document.createElement('li');
        li.className = 'reminder-card no-results';
        li.innerHTML = `
            <div class="reminder-card-icon">✅</div>
            <div class="reminder-card-content">
                <span class="reminder-card-title">Nenhum lembrete automático necessário</span>
                <small class="reminder-card-text">Todos os seus registros de vacinação estão atualizados por enquanto.</small>
            </div>
        `;
        list.appendChild(li);
        return;
    }

    pendentes.forEach(p => {
        const li = document.createElement('li');
        li.className = 'reminder-card';

        const icon = document.createElement('div');
        icon.className = 'reminder-card-icon';
        icon.textContent = '🔔';
        icon.setAttribute('aria-hidden', 'true');

        const content = document.createElement('div');
        content.className = 'reminder-card-content';
        content.innerHTML = `
            <span class="reminder-card-title">${p.nome}</span>
            <small class="reminder-card-text">${p.recomendacao}</small>
        `;

        const badge = document.createElement('span');
        badge.className = 'reminder-card-badge';
        badge.textContent = 'Lembrete';
        badge.setAttribute('aria-label', 'Vacina agendada para ser lembrada');

        const actions = document.createElement('div');
        actions.className = 'reminder-card-actions';
        
        const remover = document.createElement('button');
        remover.className = 'btn-remover-lembrete';
        remover.type = 'button';
        remover.textContent = 'Remover';
        remover.setAttribute('aria-label', `Remover lembrete de ${p.nome}`);
        
        // Usar bind para garantir que o contexto 'this' está correto
        remover.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            descartarLembrete(p.nome);
        }, { once: false, passive: false });
        
        actions.appendChild(remover);

        li.appendChild(icon);
        li.appendChild(content);
        li.appendChild(badge);
        li.appendChild(actions);
        list.appendChild(li);
    });
}

export function configurarNotificacoes() {
    if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
        window.Capacitor.Plugins.LocalNotifications.requestPermissions().then(permission => {
            if (permission.display === 'granted') {
                alert("Permissão concedida! O Android enviará alertas nativos de vacinação.");
            }
        });
    } else {
        alert("Modo de simulação Web: Lembretes automáticos ativados com base no seu histórico pendente!");
    }
}
