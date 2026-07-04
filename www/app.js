// 1. AS IMPORTAÇÕES DEVEM FICAR SEGUIDAS NO TOPO DO ARQUIVO:
import { inicializarNovasFuncoes } from './modules/features.js';
import { inicializarSidebar } from './modules/sidebar.js';
import { inicializarAutentication } from './modules/auth.js';
import { mudarAba } from './modules/navigation.js';
import { inicializarDashboard } from './modules/dashboard.js';
import { filtrarCalendario } from './modules/calendar.js';
import { configurarFormularioCarteira, renderizarCarteira } from './modules/wallet.js';
import { renderizarLembretes, configurarNotificacoes } from './modules/reminders.js';
import { buscarEExibirPosto } from './modules/gps.js';

// 2. LOGICAS DE INICIALIZAÇÃO DO APP:
// No bloco de inicialização geral, configure as funções passando o comando de renderizar as abas
inicializarNovasFuncoes(() => {
    // Essa linha força a carteira a se redesenhar quando trocamos o dependente
    window.mudarAba('wallet', document.querySelector('.nav-item')); 
});

inicializarSidebar();

inicializarAutentication(() => {
    inicializarDashboard();
});

configurarFormularioCarteira(() => {
    renderizarCarteira(atualizarAbaCarteira);
});

function atualizarAbaCarteira() {
    renderizarCarteira(atualizarAbaCarteira);
}

// 3. GERENCIADOR DE ABAS:
window.mudarAba = function(targetId, elementoBotao) {
    mudarAba(targetId, elementoBotao);
    if(targetId === 'dashboard') inicializarDashboard();
    if(targetId === 'calendar') filtrarCalendario('criança');
    if(targetId === 'wallet') renderizarCarteira(atualizarAbaCarteira);
    if(targetId === 'reminders') renderizarLembretes();
};

window.filtrarCalendario = filtrarCalendario;
window.configurarNotificacoes = configurarNotificacoes;
window.localizarPostoMaisProximo = buscarEExibirPosto;

// 4. ESCUTADOR DO BOTÃO DE BUSCA (COLOQUE EXATAMENTE AQUI NO FINAL):
document.addEventListener('DOMContentLoaded', () => {
    const botaoBuscar = document.getElementById('btn-buscar-posto');
    if (botaoBuscar) {
        botaoBuscar.addEventListener('click', () => {
            buscarEExibirPosto();
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const temaSalvo = localStorage.getItem('app_theme');
    if (temaSalvo === 'dark') document.body.classList.add('dark-theme');

    // Escuta cliques em qualquer botão de trocar tema no app
    document.querySelectorAll('.btn-theme-toggle').forEach(botao => {
        botao.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('app_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });
    });
});

