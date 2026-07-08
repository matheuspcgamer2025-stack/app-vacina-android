function apenasDigitos(valor) {
    return String(valor || '').replace(/\D/g, '').slice(0, 8);
}

function obterMensagemErroData() {
    return 'Data inválida. Use o formato dd/mm/aaaa.';
}

function validarData(y, m, d) {
    const data = new Date(Date.UTC(y, m - 1, d));
    return data.getUTCFullYear() === y
        && data.getUTCMonth() === m - 1
        && data.getUTCDate() === d;
}

export function parseDateToIso(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const [y, m, d] = texto.split('-').map(Number);
        return validarData(y, m, d) ? texto : null;
    }

    const digits = apenasDigitos(texto);
    if (digits.length !== 8) return null;

    const d = Number(digits.slice(0, 2));
    const m = Number(digits.slice(2, 4));
    const y = Number(digits.slice(4, 8));

    if (!validarData(y, m, d)) return null;

    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
}

export function formatIsoToDisplay(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function aplicarMascaraData(valor) {
    const digits = apenasDigitos(valor);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function obterOuCriarFeedback(input) {
    const grupo = input.closest('.form-group');
    if (!grupo) return null;

    let feedback = grupo.querySelector('.date-input-feedback');
    if (!feedback) {
        feedback = document.createElement('small');
        feedback.className = 'date-input-feedback hidden';
        grupo.appendChild(feedback);
    }

    return feedback;
}

function montarContainerComBotaoLimpar(input) {
    if (input.parentElement?.classList.contains('typed-date-wrapper')) {
        return {
            wrapper: input.parentElement,
            clearBtn: input.parentElement.querySelector('.date-clear-btn')
        };
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'typed-date-wrapper';

    input.parentNode?.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'date-clear-btn';
    clearBtn.textContent = 'Limpar';
    clearBtn.setAttribute('aria-label', 'Limpar data');
    clearBtn.tabIndex = -1;
    wrapper.appendChild(clearBtn);

    return { wrapper, clearBtn };
}

function atualizarFeedback(input, feedback, mensagem) {
    if (!feedback) return;

    if (mensagem) {
        feedback.textContent = mensagem;
        feedback.classList.remove('hidden');
        input.classList.add('date-input-invalid');
        input.setAttribute('aria-invalid', 'true');
        return;
    }

    feedback.textContent = '';
    feedback.classList.add('hidden');
    input.classList.remove('date-input-invalid');
    input.removeAttribute('aria-invalid');
}

function validarCampoData(input, feedback) {
    const texto = String(input.value || '').trim();

    if (!texto) {
        input.setCustomValidity('');
        atualizarFeedback(input, feedback, '');
        return true;
    }

    const iso = parseDateToIso(texto);
    if (!iso) {
        const mensagem = obterMensagemErroData();
        input.setCustomValidity(mensagem);
        atualizarFeedback(input, feedback, mensagem);
        return false;
    }

    input.setCustomValidity('');
    input.value = formatIsoToDisplay(iso);
    atualizarFeedback(input, feedback, '');
    return true;
}

function alternarBotaoLimpar(clearBtn, input) {
    if (!clearBtn) return;
    const mostrar = String(input.value || '').trim().length > 0;
    clearBtn.classList.toggle('visible', mostrar);
}

function configurarCampoData(input) {
    if (!input || input.dataset.dateInputConfigured === '1') return;

    input.dataset.dateInputConfigured = '1';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('placeholder', 'dd/mm/aaaa');

    const { clearBtn } = montarContainerComBotaoLimpar(input);
    const feedback = obterOuCriarFeedback(input);

    const isoInicial = parseDateToIso(input.value);
    if (isoInicial) {
        input.value = formatIsoToDisplay(isoInicial);
    }

    alternarBotaoLimpar(clearBtn, input);

    input.addEventListener('input', () => {
        input.value = aplicarMascaraData(input.value);
        input.setCustomValidity('');
        atualizarFeedback(input, feedback, '');
        alternarBotaoLimpar(clearBtn, input);
    });

    input.addEventListener('blur', () => {
        validarCampoData(input, feedback);
    });

    input.addEventListener('focus', () => {
        input.select();
    });

    clearBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        input.value = '';
        input.setCustomValidity('');
        atualizarFeedback(input, feedback, '');
        alternarBotaoLimpar(clearBtn, input);
        input.focus();
    });

    const grupo = input.closest('.form-group');
    if (grupo) {
        grupo.addEventListener('click', (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target === input) return;
            if (target instanceof HTMLButtonElement) return;
            input.focus();
        });
    }
}

export function inicializarCamposDataDigitaveis() {
    document.querySelectorAll('.typed-date-input').forEach((input) => {
        if (input instanceof HTMLInputElement) {
            configurarCampoData(input);
        }
    });
}
