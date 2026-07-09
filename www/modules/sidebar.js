import { appState } from './database.js';
import { WHATSAPP_CONFIG, SUPPORT_CONFIG, APP_INFO } from './config.js';
import { obterPerfilTitular, salvarPerfilTitular } from './profile.js';
import { parseDateToIso } from './date-input.js';
import { alterarSenhaUsuarioAtual } from './auth.js';
import { appConfirm } from './dialogs.js';

const REGEX_SENHA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\S]{8,}$/;

function formatarDataBr(dataIso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataIso || ''))) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

function obterNomePrincipal() {
    const perfil = obterPerfilTitular();
    if (perfil?.nomeCompleto) return perfil.nomeCompleto;

    const identificador = String(appState.usuarioLogado || '').trim();
    if (!identificador) return 'Usuário';

    const base = identificador.includes('@') ? identificador.split('@')[0] : identificador;
    return base || 'Usuário';
}

function obterPrimeiroNome() {
    return obterNomePrincipal().split(' ').filter(Boolean)[0] || 'Usuário';
}

function atualizarTextosUsuario() {
    const usernameDisplay = document.getElementById('sidebar-username');
    const greeting = document.getElementById('dashboard-greeting');
    const primeiroNome = obterPrimeiroNome();
    const nomeCompleto = obterNomePrincipal();

    if (usernameDisplay) usernameDisplay.innerText = nomeCompleto;
    if (greeting) greeting.textContent = `Olá, ${primeiroNome}`;
}

function abrirPainelSidebar(targetId) {
    const backdrop = document.getElementById('sidebar-panel-backdrop');
    document.querySelectorAll('.sidebar-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active-modal');
    });

    if (!targetId) {
        backdrop?.classList.add('hidden');
        return;
    }

    const alvo = document.getElementById(targetId);
    if (!alvo) return;
    alvo.classList.remove('hidden');
    alvo.classList.add('active-modal');
    backdrop?.classList.remove('hidden');
}

function fecharPaineisSidebar() {
    abrirPainelSidebar(null);
}

function carregarPainelEditarPerfil() {
    const perfil = obterPerfilTitular();
    const nomeInput = document.getElementById('sidebar-profile-nome-completo');
    const dataInput = document.getElementById('sidebar-profile-data-nascimento');
    const sexoInput = document.getElementById('sidebar-profile-sexo');

    if (nomeInput) nomeInput.value = perfil.nomeCompleto || '';
    if (dataInput) dataInput.value = formatarDataBr(perfil.dataNascimento || '');
    if (sexoInput) sexoInput.value = perfil.sexo === 'Masculino' ? 'Masculino' : 'Feminino';
}

function atualizarSobreApp() {
    const sobre = document.getElementById('sidebar-panel-sobre');
    if (!sobre) return;

    const p = sobre.querySelectorAll('p');
    if (p.length >= 3) {
        p[0].textContent = `Versão ${APP_INFO.VERSION}`;
        p[1].textContent = APP_INFO.DESCRIPTION;
        p[2].textContent = 'Tecnologias: HTML, CSS, JavaScript, Firebase e Capacitor para Android.';
    }
}

export function inicializarSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-panel-backdrop');
    const formEditarPerfil = document.getElementById('sidebar-edit-profile-form');
    const formTrocaSenha = document.getElementById('sidebar-change-password-form');
    const formSugestao = document.getElementById('sidebar-suggestion-form');
    const botaoWhatsapp = document.getElementById('sidebar-whatsapp-support');
    if (!sidebar) return;

    // Move os painéis para o body para exibir como modal central padronizado
    document.querySelectorAll('.sidebar-panel').forEach(panel => {
        if (panel.parentElement !== document.body) document.body.appendChild(panel);
    });

    atualizarTextosUsuario();
    atualizarSobreApp();

    // 1. CONTROLE DE ABERTURA E FECHAMENTO DA SIDEBAR
    document.getElementById('btn-menu-hamburger')?.addEventListener('click', () => {
        atualizarTextosUsuario();
        carregarPainelEditarPerfil();
        sidebar.classList.remove('hidden');
    });

    document.getElementById('btn-close-sidebar')?.addEventListener('click', () => {
        fecharPaineisSidebar();
        sidebar.classList.add('hidden');
    });

    backdrop?.addEventListener('click', () => {
        fecharPaineisSidebar();
    });

    document.querySelectorAll('.sidebar-panel-close').forEach(btn => {
        btn.addEventListener('click', () => fecharPaineisSidebar());
    });

    // 2. NAVEGAÇÃO INTERNA DOS BLOCOS DA SIDEBAR
    document.querySelectorAll('.sidebar-item[data-target]').forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (targetId === 'sidebar-panel-editar-perfil') carregarPainelEditarPerfil();
            abrirPainelSidebar(targetId);
        });
    });

    // 3. EDIÇÃO DO PERFIL PRINCIPAL
    formEditarPerfil?.addEventListener('submit', (e) => {
        e.preventDefault();

        const nomeCompleto = document.getElementById('sidebar-profile-nome-completo')?.value?.trim() || '';
        const dataDigitada = document.getElementById('sidebar-profile-data-nascimento')?.value?.trim() || '';
        const dataNascimento = parseDateToIso(dataDigitada);
        const sexo = document.getElementById('sidebar-profile-sexo')?.value;

        if (!nomeCompleto || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento || '')) {
            alert('❌ Preencha nome completo e data de nascimento válida (dd/mm/aaaa).');
            return;
        }

        salvarPerfilTitular({
            nomeCompleto,
            dataNascimento,
            sexo: sexo === 'Masculino' ? 'Masculino' : 'Feminino'
        });

        atualizarTextosUsuario();
        document.dispatchEvent(new Event('app:perfil-trocado'));
        fecharPaineisSidebar();
        alert('✅ Perfil atualizado com sucesso.');
    });

    // 4. ALTERAÇÃO DE SENHA
    formTrocaSenha?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const senhaAtual = document.getElementById('sidebar-senha-atual')?.value || '';
        const novaSenha = document.getElementById('sidebar-senha-nova')?.value || '';
        const confirmar = document.getElementById('sidebar-senha-confirmar')?.value || '';

        if (!senhaAtual || !novaSenha || !confirmar) {
            alert('❌ Preencha todos os campos para alterar a senha.');
            return;
        }

        if (novaSenha !== confirmar) {
            alert('❌ A confirmação da nova senha não confere.');
            return;
        }

        if (!REGEX_SENHA.test(novaSenha)) {
            alert('❌ A nova senha deve ter no mínimo 8 caracteres, com letra maiúscula, minúscula e número.');
            return;
        }

        try {
            await alterarSenhaUsuarioAtual(senhaAtual, novaSenha);
            formTrocaSenha.reset();
            fecharPaineisSidebar();
            alert('✅ Senha alterada com sucesso.');
        } catch (error) {
            const codigo = error?.code || '';

            if (codigo === 'auth/wrong-password' || codigo === 'auth/invalid-credential') {
                alert('❌ Senha atual incorreta.');
                return;
            }

            if (codigo === 'auth/no-password-provider') {
                alert('⚠️ Esta conta usa login Google e não possui senha local para alterar.');
                return;
            }

            if (codigo === 'auth/requires-recent-login') {
                alert('⚠️ Por segurança, faça login novamente e tente alterar a senha.');
                return;
            }

            if (codigo === 'auth/network-request-failed') {
                alert('❌ Falha de rede ao alterar senha. Verifique sua conexão.');
                return;
            }

            alert('❌ Não foi possível alterar a senha agora.');
        }
    });

    // 5. FAQ COM RESPOSTA AO CLICAR
    document.querySelectorAll('.sidebar-faq-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const resposta = document.getElementById(targetId);
            if (!resposta) return;

            const jaAberta = !resposta.classList.contains('hidden');
            document.querySelectorAll('.sidebar-faq-answer').forEach(item => item.classList.add('hidden'));
            if (!jaAberta) resposta.classList.remove('hidden');
        });
    });

    // 6. SUPORTE VIA WHATSAPP
    botaoWhatsapp?.addEventListener('click', () => {
        abrirWhatsApp(WHATSAPP_CONFIG.DEFAULT_MESSAGE);
    });

    // 7. ENVIO DE SUGESTÃO POR E-MAIL (MAILTO)
    formSugestao?.addEventListener('submit', (e) => {
        e.preventDefault();

        const nome = document.getElementById('sidebar-suggestion-name')?.value?.trim() || '';
        const email = document.getElementById('sidebar-suggestion-email')?.value?.trim() || '';
        const mensagem = document.getElementById('sidebar-suggestion-message')?.value?.trim() || '';

        if (!nome || !email || !mensagem) {
            alert('❌ Preencha nome, e-mail e sugestão.');
            return;
        }

        const assunto = encodeURIComponent(`Sugestão VacinaApp - ${nome}`);
        const corpo = encodeURIComponent(`Nome: ${nome}\nE-mail: ${email}\n\nSugestão:\n${mensagem}`);
        window.location.href = `mailto:${SUPPORT_CONFIG.SUPPORT_EMAIL}?subject=${assunto}&body=${corpo}`;
        formSugestao.reset();
        fecharPaineisSidebar();
    });

    // 8. SAIR DA CONTA (LOGOUT)
    document.getElementById('menu-sair')?.addEventListener('click', async () => {
        const confirmar = await appConfirm('Deseja realmente sair da sua conta?', {
            titulo: 'Sair da conta',
            textoConfirmar: 'Sair',
            textoCancelar: 'Cancelar',
            tipo: 'warning'
        });

        if (confirmar) {
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
