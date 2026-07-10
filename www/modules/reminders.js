import { CALENDARIO_SUS, appState } from './database.js';
import { obterDependentesLocais, obterPerfilAtivo, obterPerfilTitular } from './profile.js';
import { montarPendenciasPersonalizadas } from './schedule.js';

const REMINDERS_DISMISSED_KEY = 'vacina_dismissed_reminders';
const SCHEDULED_IDS_KEY = 'vacina_scheduled_notification_ids';

function carregarLembretesDescartados() {
    return JSON.parse(localStorage.getItem(REMINDERS_DISMISSED_KEY) || '[]');
}

function salvarLembretesDescartados(descartados) {
    localStorage.setItem(REMINDERS_DISMISSED_KEY, JSON.stringify(descartados));
}

function descartarLembrete(chave) {
    const descartados = carregarLembretesDescartados();
    if (!descartados.includes(chave)) {
        descartados.push(chave);
        salvarLembretesDescartados(descartados);
    }
    renderizarLembretes();
}

function chaveLembrete(vacina, perfilId) {
    return `${perfilId}::${vacina.nome}::${vacina.dataAlvoIso || vacina.recomendacao || 'sem-data'}`;
}

function obterPendenciasPerfilAtual() {
    const perfilAtivo = appState.perfilAtual || 'principal';
    const perfilInfo = obterPerfilAtivo(perfilAtivo);
    const carteiraPerfil = appState.carteira.filter(v => (v.perfilId || 'principal') === perfilAtivo);
    return montarPendenciasPersonalizadas(CALENDARIO_SUS, carteiraPerfil, perfilInfo.dataNascimento)
        .map(item => ({ ...item, perfilId: perfilAtivo, perfilNome: perfilInfo.nome }));
}

export function renderizarLembretes() {
    const list = document.getElementById('reminders-list');
    const bannerHoje = document.getElementById('reminders-today-banner');
    if (!list) return; // Proteção contra erro de elemento não encontrado
    
    list.innerHTML = "";

    const descartados = carregarLembretesDescartados();
    const pendentes = obterPendenciasPerfilAtual().filter(p => !descartados.includes(chaveLembrete(p, p.perfilId)));
    const vacinasHoje = pendentes.filter(p => p.status === 'hoje');

    if (bannerHoje) {
        if (vacinasHoje.length > 0) {
            bannerHoje.classList.remove('hidden');
            bannerHoje.innerHTML = `🚨 Vacinas de Hoje: ${vacinasHoje.map(v => v.nome).join(', ')}. Priorize a aplicação ainda hoje.`;
        } else {
            bannerHoje.classList.add('hidden');
            bannerHoje.innerHTML = '';
        }
    }

    if (pendentes.length === 0) {
        const li = document.createElement('li');
        li.className = 'reminder-card no-results';
        li.innerHTML = `
            <div class="reminder-card-icon">✅</div>
            <div class="reminder-card-content">
                <span class="reminder-card-title">Nenhum lembrete automático necessário</span>
                <small class="reminder-card-text">Todos os seus registros de vacinação estão atualizados por enquanto.</small>
            </div>
        `;
        list.appendChild(li);
        return;
    }

    pendentes.forEach(p => {
        const li = document.createElement('li');
        li.className = `reminder-card ${p.status === 'atrasada' ? 'overdue' : ''}`;

        const icon = document.createElement('div');
        icon.className = 'reminder-card-icon';
        icon.textContent = p.status === 'atrasada' ? '⚠️' : p.status === 'hoje' ? '🚨' : '🔔';
        icon.setAttribute('aria-hidden', 'true');

        const content = document.createElement('div');
        content.className = 'reminder-card-content';
        const subtitulo = p.status === 'agendada'
            ? `Faltam ${p.diasParaDataAlvoTexto || `${p.diasParaDataAlvo} dias`} · Data alvo ${p.dataAlvoBr}`
            : p.status === 'hoje'
                ? `Agendada para hoje (${p.dataAlvoBr})`
                : p.status === 'atrasada'
                    ? `⚠️ Alerta: Vacina com atraso de ${p.diasAtrasoTexto || p.diasAtraso}. Recomenda-se atualizar a carteira de imunização.`
                    : p.dataAlvoBr
                        ? `Agendada para ${p.dataAlvoBr}`
                        : p.recomendacao;

        content.innerHTML = `
            <span class="reminder-card-title">${p.nome}</span>
            <small class="reminder-card-text">${subtitulo}</small>
        `;

        const badge = document.createElement('span');
        badge.className = 'reminder-card-badge';
        badge.textContent = p.status === 'atrasada'
            ? 'Dose Atrasada ⚠️'
            : p.status === 'hoje'
                ? 'Hoje'
                : p.status === 'agendada'
                    ? `Faltam ${p.diasParaDataAlvoTexto || `${p.diasParaDataAlvo} dias`}`
                    : (p.dataAlvoBr ? `Agendada para ${p.dataAlvoBr}` : 'Lembrete');
        badge.setAttribute('aria-label', 'Vacina agendada para ser lembrada');

        const actions = document.createElement('div');
        actions.className = 'reminder-card-actions';
        
        const remover = document.createElement('button');
        remover.className = 'btn-remover-lembrete';
        remover.type = 'button';
        remover.textContent = 'Remover';
        remover.setAttribute('aria-label', `Remover lembrete de ${p.nome}`);
        
        // Usar bind para garantir que o contexto 'this' está correto
        remover.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            descartarLembrete(chaveLembrete(p, p.perfilId));
        }, { once: false, passive: false });
        
        actions.appendChild(remover);

        li.appendChild(icon);
        li.appendChild(content);
        li.appendChild(badge);
        li.appendChild(actions);
        list.appendChild(li);
    });
}

function obterPendenciasTodosPerfis() {
    const pendencias = [];
    const titular = obterPerfilTitular();
    const dependentes = obterDependentesLocais();
    const perfis = [
        { id: 'principal', nome: titular.nomeCompleto || 'Titular', dataNascimento: titular.dataNascimento },
        ...dependentes.map(dep => ({ id: dep.id, nome: dep.nome, dataNascimento: dep.dataNascimento }))
    ];

    perfis.forEach((perfil) => {
        const carteiraPerfil = appState.carteira.filter(v => (v.perfilId || 'principal') === perfil.id);
        const calculadas = montarPendenciasPersonalizadas(CALENDARIO_SUS, carteiraPerfil, perfil.dataNascimento)
            .filter(v => v.dataAlvoIso)
            .map(v => ({ ...v, perfilId: perfil.id, perfilNome: perfil.nome }));
        pendencias.push(...calculadas);
    });

    return pendencias;
}

function hashTexto(texto) {
    let hash = 0;
    const str = String(texto || '');
    for (let i = 0; i < str.length; i += 1) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function idNotificacao(item) {
    return 50000 + (hashTexto(`${item.perfilId}|${item.nome}|${item.dataAlvoIso}`) % 40000);
}

function permissaoNotificacaoConcedida(permissao) {
    const statusDisplay = permissao?.display;
    const statusReceive = permissao?.receive;
    return statusDisplay === 'granted' || statusDisplay === 'authorized' || statusReceive === 'granted' || statusReceive === 'authorized';
}

async function agendarNotificacoesNativas(LocalNotifications) {
    const pendencias = obterPendenciasTodosPerfis();
    const agora = new Date();
    const agendamentos = [];

    pendencias.forEach((item) => {
        if (!item.dataAlvoIso) return;

        const dataAlvo = new Date(`${item.dataAlvoIso}T09:00:00`);
        if (Number.isNaN(dataAlvo.getTime())) return;

        const atraso = item.status === 'atrasada';
        const dataDisparo = atraso ? new Date(agora.getTime() + (2 * 60 * 1000)) : dataAlvo;
        if (dataDisparo.getTime() <= agora.getTime()) return;

        const body = atraso
            ? `Dose atrasada há ${item.diasAtraso} dias: ${item.nome} (${item.perfilNome}).`
            : `Hoje vence ${item.nome} para ${item.perfilNome}.`; 

        agendamentos.push({
            id: idNotificacao(item),
            title: atraso ? 'Dose Atrasada ⚠️' : 'Lembrete de Vacina',
            body,
            schedule: { at: dataDisparo, allowWhileIdle: true },
            extra: {
                perfilId: item.perfilId,
                vacina: item.nome,
                dataAlvoIso: item.dataAlvoIso
            }
        });
    });

    const idsAnteriores = JSON.parse(localStorage.getItem(SCHEDULED_IDS_KEY) || '[]');
    if (idsAnteriores.length > 0) {
        await LocalNotifications.cancel({ notifications: idsAnteriores.map(id => ({ id })) });
    }

    if (agendamentos.length > 0) {
        await LocalNotifications.schedule({ notifications: agendamentos });
    }

    localStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(agendamentos.map(n => n.id)));

    return agendamentos.length;
}

export async function configurarNotificacoes() {
    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    const botao = document.getElementById('btn-toggle-notifications');

    if (!LocalNotifications) {
        alert('⚠️ Plugin nativo de notificações não encontrado. Instale @capacitor/local-notifications e rode npx cap sync.');
        return;
    }

    const textoOriginal = botao?.innerHTML || '';

    try {
        if (botao) {
            botao.disabled = true;
            botao.innerHTML = '⏳ Solicitando permissão...';
        }

        const permissaoAtual = await (LocalNotifications.checkPermissions?.() || Promise.resolve({}));
        let permissaoFinal = permissaoAtual;

        if (!permissaoNotificacaoConcedida(permissaoAtual)) {
            permissaoFinal = await LocalNotifications.requestPermissions();
        }

        if (!permissaoNotificacaoConcedida(permissaoFinal)) {
            alert('❌ Permissão de notificações não concedida no Android.');
            return;
        }

        if (botao) {
            botao.innerHTML = '📅 Programando alertas...';
        }

        const total = await agendarNotificacoesNativas(LocalNotifications);
        alert(`✅ Permissão concedida. ${total} alertas automáticos foram programados no celular.`);
    } catch (error) {
        console.error('Erro ao configurar notificações nativas:', error);
        alert('❌ Não foi possível configurar alertas nativos agora. Tente novamente.');
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.innerHTML = textoOriginal || '🔔 Ativar Alertas no Android';
        }
    }
}
