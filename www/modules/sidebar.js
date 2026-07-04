import { appState } from './database.js';

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

    // 2. FUNCIONALIDADE: BOTÃO PAINEL PRINCIPAL (DIRECIONAMENTO)
    document.getElementById('menu-painel-principal')?.addEventListener('click', () => {
        sidebar.classList.add('hidden'); // Fecha a barra lateral
        
        // Simula o clique na primeira aba da barra de navegação inferior (Painel)
        const botaoAbaPainel = document.querySelector(".bottom-nav .nav-item");
        if (window.mudarAba && botaoAbaPainel) {
            window.mudarAba('dashboard', botaoAbaPainel);
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

    formFeedback?.addEventListener('submit', (e) => {
        e.preventDefault();
        const texto = document.getElementById('txt-feedback').value.trim();
        
        alert(`🎉 Feedback enviado com sucesso de forma local!\n\nMensagem: "${texto}"`);
        modalFeedback?.classList.add('hidden');
        formFeedback?.reset();
    });

    // 6. FUNCIONALIDADE: SAIR DA CONTA (LOGOUT)
    document.getElementById('menu-sair')?.addEventListener('click', () => {
        if (confirm("Deseja realmente sair da sua conta?")) {
            location.reload(); // Recarrega o aplicativo limpando o estado de login
        }
    });
}
