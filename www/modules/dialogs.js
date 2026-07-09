let dialogElements = null;
let alertQueue = [];
let isAlertOpen = false;

const PREFIXOS_CATEGORIA = ['❌', '⚠️', '✅', '🎉', '📩', '📌'];

function limparPrefixoCategoria(mensagem) {
    let texto = String(mensagem || '').trim();
    PREFIXOS_CATEGORIA.forEach((prefixo) => {
        if (texto.startsWith(prefixo)) {
            texto = texto.slice(prefixo.length).trim();
        }
    });
    return texto;
}

function obterTipo(mensagem) {
    const texto = String(mensagem || '').trim();
    if (texto.startsWith('❌')) return 'error';
    if (texto.startsWith('⚠️')) return 'warning';
    if (texto.startsWith('✅') || texto.startsWith('🎉') || texto.startsWith('📩')) return 'success';
    return 'info';
}

function normalizarEspacos(texto) {
    return String(texto || '').replace(/\s+/g, ' ').trim();
}

function capitalizarPrimeira(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function garantirPontuacaoFinal(texto) {
    if (!texto) return '';
    if (/[.!?]$/.test(texto)) return texto;
    return `${texto}.`;
}

function normalizarMensagemPorTipo(tipo, mensagem) {
    let texto = normalizarEspacos(limparPrefixoCategoria(mensagem));

    if (!texto) {
        const fallback = {
            info: 'Operação finalizada',
            success: 'Operação concluída com sucesso',
            warning: 'Verifique as informações e tente novamente',
            error: 'Não foi possível concluir a operação'
        };
        return fallback[tipo] || fallback.info;
    }

    // Uniformiza frases comuns sem precisar alterar todos os módulos.
    texto = texto
        .replace(/^falha ao\s+/i, 'Não foi possível ')
        .replace(/^erro ao\s+/i, 'Não foi possível ')
        .replace(/^não foi possível\s+/i, 'Não foi possível ')
        .replace(/^nao foi possível\s+/i, 'Não foi possível ')
        .replace(/^nao foi possivel\s+/i, 'Não foi possível ');

    texto = capitalizarPrimeira(texto);
    return garantirPontuacaoFinal(texto);
}

function garantirElementos() {
    if (dialogElements) return dialogElements;

    const modal = document.getElementById('app-dialog-modal');
    const title = document.getElementById('app-dialog-title');
    const message = document.getElementById('app-dialog-message');
    const btnCancel = document.getElementById('app-dialog-cancel');
    const btnConfirm = document.getElementById('app-dialog-confirm');
    const closeBtn = document.getElementById('app-dialog-close');

    if (!modal || !title || !message || !btnCancel || !btnConfirm || !closeBtn) {
        return null;
    }

    dialogElements = { modal, title, message, btnCancel, btnConfirm, closeBtn };
    return dialogElements;
}

function aplicarTipoVisual(tipo) {
    const el = garantirElementos();
    if (!el) return;

    el.modal.classList.remove('dialog-type-info', 'dialog-type-success', 'dialog-type-warning', 'dialog-type-error');
    el.modal.classList.add(`dialog-type-${tipo}`);
}

function abrirDialogo({ tipo = 'info', titulo = 'Aviso', mensagem = '', mostrarCancelar = false, textoConfirmar = 'OK', textoCancelar = 'Cancelar' }) {
    return new Promise((resolve) => {
        const el = garantirElementos();
        if (!el) {
            resolve(mostrarCancelar ? false : undefined);
            return;
        }

        aplicarTipoVisual(tipo);
        el.title.textContent = titulo;
        el.message.textContent = String(mensagem || '');
        el.btnConfirm.textContent = textoConfirmar;
        el.btnCancel.textContent = textoCancelar;
        el.btnCancel.classList.toggle('hidden', !mostrarCancelar);
        el.modal.classList.remove('hidden');

        const encerrar = (resultado) => {
            el.modal.classList.add('hidden');
            el.btnConfirm.removeEventListener('click', aoConfirmar);
            el.btnCancel.removeEventListener('click', aoCancelar);
            el.closeBtn.removeEventListener('click', aoCancelar);
            el.modal.removeEventListener('click', aoCliqueFora);
            document.removeEventListener('keydown', aoTecla);
            resolve(resultado);
        };

        const aoConfirmar = () => encerrar(mostrarCancelar ? true : undefined);
        const aoCancelar = () => encerrar(mostrarCancelar ? false : undefined);
        const aoCliqueFora = (event) => {
            if (event.target === el.modal) aoCancelar();
        };
        const aoTecla = (event) => {
            if (event.key === 'Escape') aoCancelar();
            if (event.key === 'Enter') aoConfirmar();
        };

        el.btnConfirm.addEventListener('click', aoConfirmar);
        el.btnCancel.addEventListener('click', aoCancelar);
        el.closeBtn.addEventListener('click', aoCancelar);
        el.modal.addEventListener('click', aoCliqueFora);
        document.addEventListener('keydown', aoTecla);
    });
}

async function processarFilaAlertas() {
    if (isAlertOpen) return;
    isAlertOpen = true;

    while (alertQueue.length > 0) {
        const msg = alertQueue.shift();
        const tipo = obterTipo(msg);
        const tituloPorTipo = {
            info: 'Informação',
            success: 'Operação concluída',
            warning: 'Atenção',
            error: 'Não foi possível concluir'
        };
        const botaoPorTipo = {
            info: 'OK',
            success: 'Fechar',
            warning: 'Entendi',
            error: 'Tentar novamente'
        };

        await abrirDialogo({
            tipo,
            titulo: tituloPorTipo[tipo] || 'Aviso',
            mensagem: normalizarMensagemPorTipo(tipo, msg),
            mostrarCancelar: false,
            textoConfirmar: botaoPorTipo[tipo] || 'OK'
        });
    }

    isAlertOpen = false;
}

export function appConfirm(mensagem, opcoes = {}) {
    const tipo = opcoes.tipo || 'warning';
    const msgPadronizada = normalizarMensagemPorTipo(tipo, mensagem).replace(/\.$/, '?');
    return abrirDialogo({
        tipo,
        titulo: opcoes.titulo || 'Confirmacao',
        mensagem: msgPadronizada,
        mostrarCancelar: true,
        textoConfirmar: opcoes.textoConfirmar || 'Confirmar',
        textoCancelar: opcoes.textoCancelar || 'Cancelar'
    });
}

export function setupAppDialogs() {
    const alertaNativo = window.alert.bind(window);
    const confirmNativo = window.confirm.bind(window);

    window.alert = function(mensagem) {
        if (!garantirElementos()) {
            alertaNativo(mensagem);
            return;
        }

        alertQueue.push(String(mensagem || ''));
        processarFilaAlertas();
    };

    window.confirm = function(mensagem) {
        // Evita quebrar legados ainda nao migrados para appConfirm
        return confirmNativo(mensagem);
    };
}
