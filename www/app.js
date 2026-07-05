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

// 2. MECANISMO DE SAÍDA GARANTIDA DA TELA DE ABERTURA (ZÉ GOTINHA)
window.addEventListener('load', () => {
    const sumirSplash = () => {
        const splash = document.getElementById('app-splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.remove(); // Destrói o elemento para liberar memória do Android
            }, 500);
        }
    };

    // Força a tela a sumir após 2.5 segundos de qualquer forma para liberar o Login
    setTimeout(sumirSplash, 2500);
});

// 3. LOGICAS DE INICIALIZAÇÃO E CICLO DE VIDA DO APP:
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa os seletores de dependentes e recarrega a aba ao mudar de perfil
    inicializarNovasFuncoes(() => {
        const botaoAbaCarteira = document.querySelector('.nav-item');
        if (botaoAbaCarteira) {
            window.mudarAba('wallet', botaoAbaCarteira); 
        }
    });

    inicializarSidebar();

    // Quando o login ou cadastro der certo, puxa os dados e inicia o painel
    inicializarAutentication(() => {
        inicializarDashboard();
    });

    // Configura o formulário para apenas redesenhar a lista na tela ao salvar
    configurarFormularioCarteira(() => {
        renderizarCarteira();
    });

    // Gerencia o botão de buscar posto de saúde por CEP/Bairro
    const botaoBuscar = document.getElementById('btn-buscar-posto');
    if (botaoBuscar) {
        botaoBuscar.addEventListener('click', () => {
            buscarEExibirPosto();
        });
    }

    // Carrega o tema escuro salvo se o usuário preferir
    const temaSalvo = localStorage.getItem('app_theme');
    if (temaSalvo === 'dark') document.body.classList.add('dark-theme');

    // Escuta cliques em qualquer botão de alternar tema no app (Sol/Lua)
    document.querySelectorAll('.btn-theme-toggle').forEach(botao => {
        botao.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('app_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
        });
    });
});

// 3. GERENCIADOR GLOBAL DE ABAS (INTERACTION MANAGER):
window.mudarAba = function(targetId, elementoBotao) {
    mudarAba(targetId, elementoBotao);
    if (targetId === 'dashboard') inicializarDashboard();
    if (targetId === 'calendar') filtrarCalendario('criança');
    if (targetId === 'wallet') renderizarCarteira();
    if (targetId === 'reminders') renderizarLembretes();
};

// Vincula as funções necessárias aos escopos de botões do HTML
window.filtrarCalendario = filtrarCalendario;
window.configurarNotificacoes = configurarNotificacoes;
window.localizarPostoMaisProximo = buscarEExibirPosto;

// 4. MECANISMO DE SAÍDA SUAVE DA TELA DE ABERTURA (ZE GOTINHA)
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('app-splash');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.remove(); // Destrói o elemento para liberar memória do Android
            }, 500);
        }
    }, 2000); // Mantém o Zé Gotinha exibido por 2 segundos exatos
});
