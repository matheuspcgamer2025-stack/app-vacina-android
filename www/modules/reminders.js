import { CALENDARIO_SUS, appState } from './database.js';

export function renderizarLembretes() {
    const list = document.getElementById('reminders-list');
    list.innerHTML = "";
    
    const nomesJaTomados = appState.carteira.map(v => v.nome.toLowerCase());
    const pendentes = CALENDARIO_SUS.filter(v => !nomesJaTomados.some(j => j.includes(v.nome.toLowerCase())));

    if(pendentes.length === 0) {
        list.innerHTML = "<li>Nenhum lembrete automático necessário!</li>";
    } else {
        pendentes.forEach(p => {
            list.innerHTML += `<li><span>🔔 Alerta: <strong>${p.nome}</strong></span> <small>${p.recomendacao}</small></li>`;
        });
    }
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
