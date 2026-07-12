const EMOJI_TO_LUCIDE = {
    '🌓': 'sun-moon',
    '🛡️': 'shield-check',
    '🔒': 'lock',
    '⚠️': 'triangle-alert',
    '❌': 'circle-x',
    '✅': 'circle-check-big',
    '🎉': 'party-popper',
    '📩': 'mail',
    '📌': 'pin',
    '🎯': 'target',
    '🚨': 'siren',
    '⏳': 'hourglass',
    '📅': 'calendar-days',
    '📍': 'map-pin',
    '🕒': 'clock-3',
    '📡': 'radio-tower',
    '👥': 'users',
    '💉': 'syringe',
    '🏠': 'house',
    '💳': 'wallet-cards',
    '🔔': 'bell',
    '👤': 'user',
    '🗺️': 'map',
    '📄': 'file-text',
    '🔍': 'search',
    '📈': 'chart-column',
    '🏃': 'activity',
    '🥗': 'leaf',
    '🚗': 'route',
    '🏢': 'building-2',
    '📞': 'phone',
    '👶': 'baby',
    '✏️': 'pencil',
    '🚀': 'rocket'
};

const EMOJI_REGEX = new RegExp(
    Object.keys(EMOJI_TO_LUCIDE)
        .sort((a, b) => b.length - a.length)
        .map(emoji => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|'),
    'g'
);

let observerLucide = null;
let debounceRenderTimer = null;

function criarPlaceholderIcone(emoji) {
    const nomeIcone = EMOJI_TO_LUCIDE[emoji];
    if (!nomeIcone) return document.createTextNode(emoji);

    const wrapper = document.createElement('span');
    wrapper.className = 'emoji-lucide';
    wrapper.setAttribute('aria-hidden', 'true');

    const i = document.createElement('i');
    i.setAttribute('data-lucide', nomeIcone);
    wrapper.appendChild(i);

    return wrapper;
}

function substituirEmojisNoTexto(textNode) {
    const texto = textNode.nodeValue || '';
    if (!EMOJI_REGEX.test(texto)) return;

    EMOJI_REGEX.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let ultimoIndice = 0;
    let match;

    while ((match = EMOJI_REGEX.exec(texto)) !== null) {
        const emoji = match[0];
        const inicio = match.index;

        if (inicio > ultimoIndice) {
            fragment.appendChild(document.createTextNode(texto.slice(ultimoIndice, inicio)));
        }

        fragment.appendChild(criarPlaceholderIcone(emoji));
        ultimoIndice = inicio + emoji.length;
    }

    if (ultimoIndice < texto.length) {
        fragment.appendChild(document.createTextNode(texto.slice(ultimoIndice)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
}

function varrerNos(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest('script, style, textarea, svg, .emoji-lucide')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const nos = [];
    while (walker.nextNode()) nos.push(walker.currentNode);
    nos.forEach(substituirEmojisNoTexto);
}

export function renderizarIconesLucide() {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;
    window.lucide.createIcons();
}

function iniciarObserverLucide() {
    if (observerLucide) return;

    observerLucide = new MutationObserver((mutations) => {
        let precisaRender = false;

        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (node.closest('.emoji-lucide') || node.tagName?.toLowerCase() === 'svg') return;
                    varrerNos(node);
                    precisaRender = true;
                });
            }

            if (mutation.type === 'characterData' && mutation.target?.parentElement) {
                substituirEmojisNoTexto(mutation.target);
                precisaRender = true;
            }
        });

        if (precisaRender) {
            if (debounceRenderTimer) clearTimeout(debounceRenderTimer);
            debounceRenderTimer = setTimeout(() => {
                renderizarIconesLucide();
            }, 20);
        }
    });

    observerLucide.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function tentarIniciarLucide() {
    if (!window.lucide || typeof window.lucide.createIcons !== 'function') return false;

    varrerNos(document.body);
    renderizarIconesLucide();
    iniciarObserverLucide();
    return true;
}

export function inicializarLucideNoApp() {
    if (tentarIniciarLucide()) return;

    let tentativas = 0;
    const maxTentativas = 40;
    const timer = setInterval(() => {
        tentativas += 1;
        if (tentarIniciarLucide() || tentativas >= maxTentativas) {
            clearInterval(timer);
        }
    }, 100);

    window.addEventListener('load', () => {
        tentarIniciarLucide();
    }, { once: true });
}
