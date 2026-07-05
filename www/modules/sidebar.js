import { appState } from './database.js';
import { WHATSAPP_CONFIG } from './config.js';

export function inicializarSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const modalFeedback = document.getElementById('modal-feedback');
    const formFeedback = document.getElementById('form-feedback');
    
    // Elementos dos novos modais de interação
    const modalAjuda = document.getElementById('modal-ajuda');
    const modalSobre = document.getElementById('modal-sobre');

    // 1. CONTROLE DE ABERTURA E FECHAMENTO DA SIDEBAR
    document.getElementById('btn-menu-hamburger')?.addEventListener('click', () => {
        // Atualiza dinamicamente o nome do usuário na barra lateral baseado no login
        const usernameDisplay = document.getElementById('sidebar-username');
        if (usernameDisplay) {
            usernameDisplay.innerText = appState.usuarioLogado ? appState.usuarioLogado.split('@')[0] : "matheuspcgamer2025";
        }
        sidebar.classList.remove('hidden');
    });

    document.getElementById('btn-close-sidebar')?.addEventListener('click', () => {
        sidebar.classList.add('hidden');
    });

    // 2. FUNCIONALIDADE: BOTÃO INFORMAÇÕES ÚTEIS (DIRECIONAR PARA NOVA ABA)
    document.getElementById('menu-informacoes-uteis')?.addEventListener('click', () => {
        sidebar.classList.add('hidden'); // Fecha a barra lateral
        
        // Simula o clique na primeira aba da barra de navegação inferior (Painel)
        // na verdade, vamos direcionar para a nova aba de informações úteis
        if (window.mudarAba) {
            window.mudarAba('useful-info', document.getElementById('menu-informacoes-uteis'));
        }
    });

    // 3. FUNCIONALIDADE: CENTRAL DE AJUDA (MODAL)
    document.getElementById('menu-obter-ajuda')?.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        modalAjuda?.classList.remove('hidden');
    });

    document.getElementById('btn-fechar-ajuda')?.addEventListener('click', () => {
        modalAjuda?.classList.add('hidden');
    });

    // 4. FUNCIONALIDADE: SOBRE O APLICATIVO (MODAL)
    document.getElementById('menu-sobre')?.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        modalSobre?.classList.remove('hidden');
    });

    document.getElementById('btn-fechar-sobre')?.addEventListener('click', () => {
        modalSobre?.classList.add('hidden');
    });

    // 5. FUNCIONALIDADE: ENVIAR FEEDBACK / DÚVIDA (MODAL)
    document.getElementById('menu-enviar-feedback')?.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        modalFeedback?.classList.remove('hidden');
    });

    document.getElementById('btn-cancelar-feedback')?.addEventListener('click', () => {
        modalFeedback?.classList.add('hidden');
        formFeedback?.reset();
    });

    // 5.1. BOTÃO DE WHATSAPP NO MODAL DE FEEDBACK
    document.getElementById('btn-whatsapp-feedback')?.addEventListener('click', () => {
        const texto = document.getElementById('txt-feedback').value.trim();
        if (texto) {
            abrirWhatsApp(texto);
            modalFeedback?.classList.add('hidden');
            formFeedback?.reset();
        } else {
            alert('⚠️ Digite sua mensagem antes de enviar pelo WhatsApp!');
        }
    });

    // 5.2. FUNCIONALIDADE: SUPORTE VIA WHATSAPP (BOTÃO DO SIDEBAR)
    document.getElementById('menu-suporte-whatsapp')?.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        abrirWhatsApp('Olá, preciso de suporte com o VacinaApp!');
    });

    // 6. FUNCIONALIDADE: SAIR DA CONTA (LOGOUT)
    document.getElementById('menu-sair')?.addEventListener('click', () => {
        if (confirm("Deseja realmente sair da sua conta?")) {
            location.reload(); // Recarrega o aplicativo limpando o estado de login
        }
    });
}

/**
 * Função para abrir o WhatsApp com mensagem pré-preenchida
 * @param {string} mensagem - Mensagem a ser enviada
 */
function abrirWhatsApp(mensagem) {
    // Codifica a mensagem para URL
    const mensagemCodificada = encodeURIComponent(mensagem);
    
    // URL da API do WhatsApp
    const urlWhatsApp = `https://wa.me/${WHATSAPP_CONFIG.SUPPORT_NUMBER}?text=${mensagemCodificada}`;
    
    // Abre em uma nova aba/janela
    window.open(urlWhatsApp, '_blank');
}
