// 1. AS IMPORTAÇÕES DEVEM FICAR SEGUIDAS NO TOPO DO ARQUIVO:
import { inicializarNovasFuncoes } from './modules/features.js';
import { inicializarSidebar } from './modules/sidebar.js';
import { inicializarAutentication } from './modules/auth.js';
import { mudarAba } from './modules/navigation.js';
import { inicializarDashboard } from './modules/dashboard.js';
import { filtrarCalendario } from './modules/calendar.js';
import { configurarFormularioCarteira, renderizarCarteira, carregarDadosDoFirebase } from './modules/wallet.js';
import { renderizarLembretes, configurarNotificacoes } from './modules/reminders.js';
import { buscarEExibirPosto, ativarLocalizacaoEListarPostosProximos } from './modules/gps.js';
import { inicializarCamposDataDigitaveis } from './modules/date-input.js';
import { appState } from './modules/database.js';
import { setupAppDialogs } from './modules/dialogs.js';

let painelSyncHideTimer = null;

function garantirIndicadorSyncPainel() {
    const dashboard = document.getElementById('screen-dashboard');
    if (!dashboard) return null;

    let indicador = document.getElementById('dashboard-sync-indicator');
    if (indicador) return indicador;

    indicador = document.createElement('div');
    indicador.id = 'dashboard-sync-indicator';
    indicador.className = 'dashboard-sync-indicator hidden';
    indicador.innerHTML = '<span class="dashboard-sync-spinner" aria-hidden="true"></span><span id="dashboard-sync-text">Sincronizando Início...</span>';
    dashboard.prepend(indicador);
    return indicador;
}

function mostrarIndicadorSync(mensagem = 'Sincronizando Início...') {
    const indicador = garantirIndicadorSyncPainel();
    if (!indicador) return;

    const texto = document.getElementById('dashboard-sync-text');
    const spinner = indicador.querySelector('.dashboard-sync-spinner');
    if (texto) texto.textContent = mensagem;
    if (spinner) spinner.classList.remove('success');
    indicador.classList.remove('success');

    if (painelSyncHideTimer) {
        clearTimeout(painelSyncHideTimer);
        painelSyncHideTimer = null;
    }

    indicador.classList.remove('hidden');
}

function marcarIndicadorSyncSucesso(mensagem = 'Sincronizado') {
    const indicador = document.getElementById('dashboard-sync-indicator');
    if (!indicador) return;

    const texto = document.getElementById('dashboard-sync-text');
    const spinner = indicador.querySelector('.dashboard-sync-spinner');

    if (texto) texto.textContent = mensagem;
    if (spinner) spinner.classList.add('success');
    indicador.classList.add('success');
}

function ocultarIndicadorSync(delayMs = 450) {
    const indicador = document.getElementById('dashboard-sync-indicator');
    if (!indicador) return;

    if (painelSyncHideTimer) clearTimeout(painelSyncHideTimer);
    painelSyncHideTimer = setTimeout(() => {
        indicador.classList.add('hidden');
    }, delayMs);
}

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
    setupAppDialogs();

    // Inicializa os seletores de dependentes e recarrega a aba ao mudar de perfil
    inicializarNovasFuncoes(() => {
        const botaoAbaCarteira = document.querySelectorAll('.nav-item')[2];
        if (botaoAbaCarteira) {
            window.mudarAba('wallet', botaoAbaCarteira); 
        }
    });

    inicializarSidebar();

    // Quando o login ou cadastro der certo, sincroniza com a nuvem e atualiza a UI
    inicializarAutentication(async () => {
        await carregarDadosDoFirebase(() => {
            renderizarCarteira();
            inicializarDashboard();
        });

        // Fallback caso o callback acima nao rode por qualquer motivo
        renderizarCarteira();
        inicializarDashboard();
    });

    // Configura o formulário para apenas redesenhar a lista na tela ao salvar
    configurarFormularioCarteira(() => {
        renderizarCarteira();
    });

    // Permite digitar datas por números (dd/mm/aaaa) com foco por toque no bloco
    inicializarCamposDataDigitaveis();

    // Gerencia o botão de buscar posto de saúde por CEP/Bairro
    const botaoBuscar = document.getElementById('btn-buscar-posto');
    if (botaoBuscar) {
        botaoBuscar.addEventListener('click', () => {
            buscarEExibirPosto();
        });
    }

    // Solicita permissão e lista automaticamente os postos mais próximos
    const botaoLocalizacao = document.getElementById('btn-ativar-localizacao');
    if (botaoLocalizacao) {
        botaoLocalizacao.addEventListener('click', () => {
            ativarLocalizacaoEListarPostosProximos();
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

    // Inicializa accordions genericamente para qualquer seção
    inicializarAccordions();

    // Inicializa os toggles de visualizar senha
    document.querySelectorAll('.btn-password-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
            
            // Troca o SVG: olho aberto (senha visível) ou olho com linha (senha oculta)
            const svg = btn.querySelector('.icon-eye');
            if (svg) {
                if (isPassword) {
                    // Troca para olho com linha (EyeOff - senha está visível agora)
                    svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-5.07 5.93"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
                } else {
                    // Volta para olho normal (Eye - senha está oculta)
                    svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
                }
            }
        });
    });

    // Atualiza o painel automaticamente ao trocar Pai/Filho, mesmo fora da aba Painel.
    document.addEventListener('app:perfil-trocado', () => {
        mostrarIndicadorSync('Atualizando perfil selecionado...');
        inicializarDashboard();
        marcarIndicadorSyncSucesso('Perfil sincronizado');
        ocultarIndicadorSync(550);
    });
});

async function atualizarPainelComLeituraLimpa() {
    // 1 leitura limpa por entrada na aba Início.
    mostrarIndicadorSync('Sincronizando dados mais recentes...');
    try {
        if (appState.usuarioLogado) {
            await carregarDadosDoFirebase();
        }
        inicializarDashboard();
        marcarIndicadorSyncSucesso('Início sincronizado');
    } finally {
        ocultarIndicadorSync(650);
    }
}

// 3. GERENCIADOR GLOBAL DE ABAS (INTERACTION MANAGER):
window.mudarAba = function(targetId, elementoBotao) {
    mudarAba(targetId, elementoBotao);
    if (targetId === 'dashboard') {
        atualizarPainelComLeituraLimpa();
    }
    if (targetId === 'calendar') filtrarCalendario('criança');
    if (targetId === 'wallet') renderizarCarteira();
    if (targetId === 'reminders') renderizarLembretes();
    if (targetId === 'useful-info') inicializarAccordions();
};

// Inicializa accordions genericamente para qualquer seção que tenha a classe accordion-card
function inicializarAccordions() {
    document.querySelectorAll('.accordion-card').forEach(card => {
        // Remove o listener anterior para evitar duplicatas
        const novoCard = card.cloneNode(true);
        card.parentNode?.replaceChild(novoCard, card);
        const cabecalho = novoCard.querySelector('.accordion-header');

        if (!cabecalho) return;

        cabecalho.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const targetId = novoCard.getAttribute('data-target');
            const conteudo = document.getElementById(targetId);

            if (conteudo) {
                const estaEscondido = conteudo.classList.contains('hidden');
                
                // Fecha todos os outros blocos primeiro (apenas dentro da mesma seção pai)
                const seccaoPai = novoCard.closest('.sub-screen');
                if (seccaoPai) {
                    seccaoPai.querySelectorAll('.accordion-content').forEach(c => {
                        c.classList.add('hidden');
                    });
                    
                    seccaoPai.querySelectorAll('.accordion-card').forEach(box => {
                        box.classList.remove('open');
                    });
                }

                // Se estava fechado, abre apenas o clicado
                if (estaEscondido) {
                    conteudo.classList.remove('hidden');
                    novoCard.classList.add('open');
                }
            }
        });
    });
}

// Vincula as funções necessárias aos escopos de botões do HTML
window.filtrarCalendario = filtrarCalendario;
window.configurarNotificacoes = configurarNotificacoes;
window.localizarPostoMaisProximo = buscarEExibirPosto;
window.ativarLocalizacaoEListarPostosProximos = ativarLocalizacaoEListarPostosProximos;

