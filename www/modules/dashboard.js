import { CALENDARIO_SUS, appState } from './database.js';
import { obterPerfilAtivo, calcularIdadeDetalhada, obterPerfilTitular } from './profile.js';
import { compartilharHistoricoVacinas, registrarVacinaPeloCalendario, carregarDadosDoFirebase } from './wallet.js';
import { appConfirm } from './dialogs.js';
import { formatarDataBr as formatarDataBrDayjs, diferencaDias as diferencaDiasDayjs, adicionarAoIso as adicionarAoIsoDayjs, hojeIso } from './dayjs.js';

const DASH_NOTIFICATIONS_LAST_SEEN_KEY = 'app_dashboard_notifications_last_seen';
const REGION_CONTEXT_KEY = 'app_alert_region';
const EPIDEMIOLOGY_CACHE_KEY = 'app_epi_alert_cache';
const FORTALEZA_GEOCODE = '2304400';
let dashboardReadVersion = 0;

function normalizarTexto(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function formatarDataBr(dataIso) {
    return formatarDataBrDayjs(dataIso);
}

function diferencaDias(dataIso) {
    return diferencaDiasDayjs(dataIso);
}

function somarDias(dataBase, dias) {
    const isoBase = typeof dataBase === 'string'
        ? dataBase
        : String(dataBase?.toISOString?.().split('T')[0] || '');
    return adicionarAoIsoDayjs(isoBase, { dias });
}

function anoAtual() {
    return Number(String(hojeIso()).slice(0, 4));
}

function ordenarDataIso(a, b) {
    return String(a || '').localeCompare(String(b || ''));
}

function obterFaixaEtaria(idadeDetalhada) {
    if (!idadeDetalhada) return 'adulto';
    if (idadeDetalhada.totalMeses < 120) return 'criança';
    if (idadeDetalhada.anos < 20) return 'adolescente';
    if (idadeDetalhada.anos >= 60) return 'idoso';
    return 'adulto';
}

function formatarNomeVacina(nome) {
    const nomeNormalizado = normalizarTexto(nome);
    if (nomeNormalizado === 'hpv quadrivalente') return 'HPV Quadrivalente';
    return String(nome || '').trim();
}

function escaparHtml(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function obterVacinasPerfil(perfilId) {
    const id = perfilId || 'principal';
    return appState.carteira.filter(v => (v?.perfilId || 'principal') === id);
}

function nomesTomadosNormalizados(vacinas) {
    const set = new Set();
    vacinas.forEach(v => {
        set.add(normalizarTexto(v?.nome));
    });
    return set;
}

function vacinaJaTomada(nomeVacina, nomesTomados) {
    const alvo = normalizarTexto(nomeVacina);
    if (!alvo) return false;

    for (const tomada of nomesTomados) {
        if (!tomada) continue;
        if (tomada.includes(alvo) || alvo.includes(tomada)) return true;
    }

    return false;
}

function obterVacinasRecomendadasDaFaixa(faixa) {
    return CALENDARIO_SUS.filter(v => v.faixa === faixa);
}

function obterPendentesPorFaixa(vacinasPerfil, faixa) {
    const tomadas = nomesTomadosNormalizados(vacinasPerfil);
    return obterVacinasRecomendadasDaFaixa(faixa).filter(v => !vacinaJaTomada(v.nome, tomadas));
}

function obterProgresso(vacinasPerfil, faixa) {
    const recomendadas = obterVacinasRecomendadasDaFaixa(faixa);
    const nomesRecomendados = Array.from(new Set(recomendadas.map(v => normalizarTexto(v.nome)).filter(Boolean)));

    const tomadas = nomesTomadosNormalizados(vacinasPerfil);
    let tomadasRecomendadas = 0;

    nomesRecomendados.forEach(nomeRec => {
        for (const tomada of tomadas) {
            if (tomada.includes(nomeRec) || nomeRec.includes(tomada)) {
                tomadasRecomendadas += 1;
                break;
            }
        }
    });

    const totalRecomendado = Math.max(nomesRecomendados.length, 1);
    const percentual = Math.min(100, Math.round((tomadasRecomendadas / totalRecomendado) * 100));

    return {
        tomadasRecomendadas,
        totalRecomendado,
        percentual
    };
}

function extrairPrimeiroPrazoEmMeses(recomendacao) {
    const texto = normalizarTexto(recomendacao);
    if (!texto) return null;

    if (texto.includes('ao nascer') || texto.includes('primeiras 12 horas')) return 0;

    const faixaAnos = texto.match(/(\d+)\s*a\s*(\d+)\s*anos?/);
    if (faixaAnos) return Number(faixaAnos[1]) * 12;

    const ano = texto.match(/(\d+)\s*anos?/);
    if (ano) return Number(ano[1]) * 12;

    const mes = texto.match(/(\d+)\s*mes(?:es)?/);
    if (mes) return Number(mes[1]);

    return null;
}

function obterStatusVacinaPendente(vacina, idadeDetalhada) {
    const recomendacao = normalizarTexto(vacina?.recomendacao);
    const totalMeses = idadeDetalhada?.totalMeses ?? null;
    const dataNascimento = idadeDetalhada?.dataNascimento || null;

    if (recomendacao.includes('campanha') || recomendacao.includes('grupos prioritarios') || recomendacao.includes('todo ano') || recomendacao.includes('anual')) {
        return { label: 'Campanha', classe: 'dashboard-badge-campaign', prazoCurto: '', prazoCompleto: '' };
    }

    const prazoMeses = extrairPrimeiroPrazoEmMeses(vacina?.recomendacao);
    const dataPrevista = prazoMeses !== null && dataNascimento ? adicionarAoIsoDayjs(dataNascimento, { meses: prazoMeses }) : null;
    const prazoCurto = dataPrevista ? formatarDataBr(dataPrevista) : prazoMeses !== null ? `${prazoMeses}m` : '';
    const prazoCompleto = dataPrevista
        ? `Prevista para ${formatarDataBr(dataPrevista)}`
        : prazoMeses !== null
            ? `Janela estimada aos ${prazoMeses} meses`
            : '';

    if (prazoMeses !== null && totalMeses !== null) {
        if (totalMeses > prazoMeses) {
            return { label: 'Vencida', classe: 'dashboard-badge-overdue', prazoCurto, prazoCompleto };
        }

        return { label: 'Agendada', classe: 'dashboard-badge-scheduled', prazoCurto, prazoCompleto };
    }

    return { label: 'Agendada', classe: 'dashboard-badge-scheduled', prazoCurto, prazoCompleto };
}

function montarResumoVacina(vacina) {
    const protege = vacina?.protege || 'Proteção conforme calendário oficial do SUS.';
    const reacoes = vacina?.reacoes || 'Reações leves locais podem ocorrer nas primeiras horas.';
    return {
        protege,
        reacoes
    };
}

function marcarCardComoConcluido(card, botao) {
    if (!card || !botao) return;

    const badge = card.querySelector('.dashboard-alert-badge');
    const meta = card.querySelector('.dashboard-alert-meta');
    const toggleTexto = card.querySelector('.dashboard-alert-toggle-text');

    card.classList.add('is-complete');
    botao.disabled = true;
    botao.classList.add('is-complete');
    botao.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="dashboard-alert-action-icon"><path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="dashboard-alert-action-label">Tomada agora</span>';

    if (badge) {
        badge.className = 'dashboard-alert-badge dashboard-badge-complete';
        badge.textContent = 'Tomada agora';
    }

    if (meta) {
        meta.textContent = 'Registro rapido salvo neste perfil. Atualizando sua carteira...';
    }

    if (toggleTexto) {
        toggleTexto.textContent = 'Resumo confirmado';
    }
}

async function registrarVacinaPendenteRapida(nomeVacina, botao, card) {
    const confirmarRegistro = await appConfirm(`Registrar "${nomeVacina}" como aplicada no perfil atual?`, {
        titulo: 'Registrar vacina',
        textoConfirmar: 'Registrar',
        textoCancelar: 'Cancelar',
        tipo: 'warning'
    });

    if (!confirmarRegistro) return;

    botao.disabled = true;
    botao.innerHTML = '<span class="dashboard-alert-action-label">Salvando...</span>';

    try {
        const registroCriado = await registrarVacinaPeloCalendario({ nome: nomeVacina });

        if (registroCriado && !appState.carteira.some(v => v.id === registroCriado.id)) {
            appState.carteira.push(registroCriado);
        }

        marcarCardComoConcluido(card, botao);

        window.setTimeout(async () => {
            try {
                await carregarDadosDoFirebase();
            } catch (erroAtualizacao) {
                console.error('Erro ao atualizar dashboard apos registro rapido:', erroAtualizacao);
            } finally {
                inicializarDashboard();
            }
        }, 900);
    } catch (error) {
        console.error('Erro no registro rápido pelo dashboard:', error);
        alert(`Nao foi possivel registrar a vacina. ${error?.message || 'Tente novamente.'}`);
        botao.disabled = false;
        botao.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" class="dashboard-alert-action-icon"><path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="dashboard-alert-action-label">Marcar</span>';
    }
}

function configurarInteracoesProximasVacinas() {
    document.querySelectorAll('[data-dashboard-alert-card]').forEach(card => {
        const botaoDetalhe = card.querySelector('[data-dashboard-alert-toggle]');
        const botaoAcao = card.querySelector('[data-dashboard-alert-action]');
        const detalhe = card.querySelector('[data-dashboard-alert-detail]');

        const alternarDetalhe = () => {
            if (!botaoDetalhe || !detalhe) return;
            const expandido = card.classList.toggle('is-open');
            botaoDetalhe.setAttribute('aria-expanded', String(expandido));
            detalhe.setAttribute('aria-hidden', String(!expandido));
        };

        if (botaoDetalhe && detalhe) {
            botaoDetalhe.addEventListener('click', alternarDetalhe);
            card.addEventListener('click', (event) => {
                if (event.target.closest('[data-dashboard-alert-action]') || event.target.closest('[data-dashboard-alert-toggle]')) return;
                alternarDetalhe();
            });
        }

        if (botaoAcao) {
            botaoAcao.addEventListener('click', async (event) => {
                event.stopPropagation();
                const nomeVacina = botaoAcao.getAttribute('data-vacina-nome');
                if (!nomeVacina) return;
                await registrarVacinaPendenteRapida(nomeVacina, botaoAcao, card);
            });
        }
    });
}

function renderizarProximasVacinas(pendentes, idadeDetalhada) {
    const container = document.getElementById('dashboard-alerts-list');
    if (!container) return;

    container.innerHTML = '';

    if (pendentes.length === 0) {
        container.innerHTML = '<div class="dashboard-alert-empty">Nenhuma vacina pendente para sua faixa etaria no momento.</div>';
        return;
    }

    pendentes.slice(0, 4).forEach((vacina, index) => {
        const status = obterStatusVacinaPendente(vacina, idadeDetalhada);
        const resumo = montarResumoVacina(vacina);
        const nomeFormatado = formatarNomeVacina(vacina.nome);
        const detalheId = `dashboard-alert-detail-${index}`;

        container.innerHTML += `
            <article class="dashboard-alert-card dashboard-alert-microcard" data-dashboard-alert-card>
                <div class="dashboard-alert-card-top">
                    <div class="dashboard-alert-copy">
                        <div class="dashboard-alert-title-row">
                            <strong>${escaparHtml(nomeFormatado)}</strong>
                            <span class="dashboard-alert-badge ${status.classe}" title="${escaparHtml(status.prazoCompleto || status.label)}">${status.label}${status.prazoCurto ? ` • ${escaparHtml(status.prazoCurto)}` : ''}</span>
                        </div>
                        <div class="dashboard-alert-meta">
                            <p class="dashboard-alert-dose">${escaparHtml(vacina.dose || 'Dose recomendada')}</p>
                            <p class="dashboard-alert-guidance">Indicacao SUS: ${escaparHtml(vacina.recomendacao || 'Verificar calendário oficial')}</p>
                        </div>
                        <div class="dashboard-alert-inline-info">
                            <p><strong>Protege:</strong> ${escaparHtml(resumo.protege)}</p>
                        </div>
                    </div>
                </div>
                <div class="dashboard-alert-actions-row">
                    <button
                        type="button"
                        class="dashboard-alert-action"
                        data-dashboard-alert-action
                        data-vacina-nome="${escaparHtml(vacina.nome)}"
                        aria-label="Marcar ${escaparHtml(nomeFormatado)} como tomada"
                        title="Marcar como tomada"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="dashboard-alert-action-icon"><path d="M20 7L9 18l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        <span class="dashboard-alert-action-label">Marcar como tomada</span>
                    </button>
                    <button
                        type="button"
                        class="dashboard-alert-toggle"
                        data-dashboard-alert-toggle
                        aria-expanded="false"
                        aria-controls="${detalheId}"
                    >
                        <span class="dashboard-alert-toggle-text">Mais detalhes</span>
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="dashboard-alert-toggle-icon"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div id="${detalheId}" class="dashboard-alert-detail" data-dashboard-alert-detail aria-hidden="true">
                    <p><strong>Reacoes comuns:</strong> ${escaparHtml(resumo.reacoes)}</p>
                    ${status.prazoCompleto ? `<p><strong>Prazo estimado:</strong> ${escaparHtml(status.prazoCompleto)}</p>` : ''}
                </div>
            </article>
        `;
    });

    configurarInteracoesProximasVacinas();
}

function obterCampanhaPorFaixa(faixa, ano) {
    if (faixa === 'idoso') {
        return {
            titulo: `🎯 Campanha da Gripe ${ano} liberada para a sua idade. Encontre o posto mais próximo.`,
            periodo: `Vigência: Março a Julho de ${ano}.`,
            apoio: 'Dose anual para reduzir internações por síndrome respiratória em idosos.'
        };
    }

    if (faixa === 'adolescente') {
        return {
            titulo: `🎯 Campanha HPV e Meningo ACWY ${ano} aberta para adolescentes.`,
            periodo: `Vigência: Campanha escolar e UBS durante todo o ${ano}.`,
            apoio: 'Proteção contra cânceres relacionados ao HPV e meningites bacterianas.'
        };
    }

    if (faixa === 'criança') {
        return {
            titulo: `🎯 Multivacinação infantil ${ano} ativa para atualização da caderneta.`,
            periodo: `Vigência: Etapas sazonais ao longo de ${ano}.`,
            apoio: 'Foco em pólio, tríplice viral, penta e reforços dos primeiros anos de vida.'
        };
    }

    return {
        titulo: `🎯 Reforço de Covid-19 e Influenza ${ano} disponível para adultos elegíveis.`,
        periodo: `Vigência: Campanha contínua de ${ano}.`,
        apoio: 'Prioridade para pessoas com comorbidades, profissionais da saúde e cuidadores.'
    };
}

function obterContextoRegional() {
    try {
        const bruto = JSON.parse(localStorage.getItem(REGION_CONTEXT_KEY) || '{}');
        const bairro = String(bruto?.bairro || '').trim();
        const cep = String(bruto?.cep || '').trim();
        if (bairro || cep) return { bairro, cep };
    } catch (_) {
        // Sem contexto salvo
    }

    const inputBusca = document.getElementById('input-busca-local');
    const termo = String(inputBusca?.value || '').trim();
    if (termo) {
        if (/^\d{5,8}$/.test(termo.replace(/\D/g, ''))) return { bairro: '', cep: termo };
        return { bairro: termo, cep: '' };
    }

    return { bairro: 'Messejana', cep: '' };
}

function obterAlertaRegional(contexto) {
    const bairroNormalizado = normalizarTexto(contexto.bairro);

    if (bairroNormalizado.includes('messejana')) {
        return '⚠️ Alerta no seu bairro (Messejana): Casos de Dengue/Influenza acima da média nesta semana. Mantenha seus reforços em dia.';
    }

    if (bairroNormalizado.includes('aldeota') || bairroNormalizado.includes('centro')) {
        return `⚠️ Alerta no seu bairro (${contexto.bairro}): Aumento de síndromes respiratórias nesta semana. Procure a UBS para reforços de gripe e Covid-19.`;
    }

    if (contexto.cep) {
        return `⚠️ Alerta regional para o CEP ${contexto.cep}: Boletim local indica maior circulação de arboviroses nesta semana. Atualize sua proteção.`;
    }

    return `⚠️ Alerta no seu bairro (${contexto.bairro || 'Fortaleza'}): Monitoramento ativo para Dengue e Influenza nesta semana.`;
}

function obterMetaRisco(nivel) {
    if (nivel === 'alto') return { label: 'Risco Alto', className: 'epi-risk-high' };
    if (nivel === 'medio') return { label: 'Risco Médio', className: 'epi-risk-medium' };
    return { label: 'Risco Baixo', className: 'epi-risk-low' };
}

function obterMetaTendencia(tendencia) {
    if (tendencia === 'alta') return { label: '↗ Alta', className: 'epi-trend-up' };
    if (tendencia === 'queda') return { label: '↘ Queda', className: 'epi-trend-down' };
    return { label: '→ Estável', className: 'epi-trend-stable' };
}

function formatarDataCurta(dataIso) {
    if (!dataIso) return '';
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleDateString('pt-BR');
}

function formatarTempoRelativo(dataIso) {
    if (!dataIso) return 'agora';

    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return 'agora';

    const diffMs = Date.now() - data.getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / (1000 * 60)));

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin} min`;

    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `${diffHoras} h`;

    const diffDias = Math.floor(diffHoras / 24);
    return `${diffDias} d`;
}

function obterAlertaCacheValido(contexto) {
    try {
        const cache = JSON.parse(localStorage.getItem(EPIDEMIOLOGY_CACHE_KEY) || '{}');
        const ttlMs = 1000 * 60 * 30;
        const atualizadoEm = new Date(cache?.atualizadoEm || '').getTime();
        const agora = Date.now();

        if (!cache?.mensagem || !atualizadoEm || (agora - atualizadoEm) > ttlMs) {
            return null;
        }

        if (cache?.bairro !== String(contexto?.bairro || '') || cache?.cep !== String(contexto?.cep || '')) {
            return null;
        }

        return cache;
    } catch (_) {
        return null;
    }
}

function salvarAlertaCache(contexto, payload) {
    const cache = {
        bairro: String(contexto?.bairro || ''),
        cep: String(contexto?.cep || ''),
        mensagem: payload?.mensagem || '',
        fonte: payload?.fonte || '',
        risco: payload?.risco || 'baixo',
        tendencia: payload?.tendencia || 'estavel',
        atualizadoEm: payload?.atualizadoEm || new Date().toISOString()
    };

    localStorage.setItem(EPIDEMIOLOGY_CACHE_KEY, JSON.stringify(cache));
}

async function buscarAlertaRegionalRemoto(contexto) {
    const cacheValido = obterAlertaCacheValido(contexto);
    if (cacheValido) {
        return {
            mensagem: cacheValido.mensagem,
            fonte: cacheValido.fonte || 'Cache epidemiológico local',
            remoto: true,
            risco: cacheValido.risco || 'baixo',
            tendencia: cacheValido.tendencia || 'estavel',
            atualizadoEm: cacheValido.atualizadoEm || new Date().toISOString()
        };
    }

    const bairroExibicao = contexto?.bairro || 'Fortaleza';

    try {
        const resposta = await fetch(`https://info.dengue.mat.br/api/alertcity?geocode=${FORTALEZA_GEOCODE}&disease=dengue&format=json`);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const dados = await resposta.json();
        if (!Array.isArray(dados) || dados.length === 0) throw new Error('Sem dados do InfoDengue');

        const boletim = dados[0];
        const nivel = Number(boletim?.nivel || 0);
        const casosEstimados = Math.round(Number(boletim?.casos_est || 0));
        const rt = Number(boletim?.Rt || 0);
        const dataModelo = String(boletim?.versao_modelo || '').trim();

        let textoRisco = 'em vigilância';
        let risco = 'baixo';
        let tendencia = 'estavel';
        if (nivel >= 3 || casosEstimados >= 600) {
            textoRisco = 'acima da média';
            risco = 'alto';
        } else if (nivel >= 2 || casosEstimados >= 250) {
            textoRisco = 'com tendência de alta';
            risco = 'medio';
        }

        if (rt > 1.1) tendencia = 'alta';
        else if (rt < 0.95) tendencia = 'queda';

        const mensagem = `⚠️ Alerta no seu bairro (${bairroExibicao}): dengue ${textoRisco} nesta semana. Estimativa municipal: ${casosEstimados} casos, Rt ${rt.toFixed(2)}.`;
        const fonte = dataModelo
            ? `InfoDengue/Fiocruz • atualização ${formatarDataCurta(dataModelo) || dataModelo}`
            : 'InfoDengue/Fiocruz';

        const payload = {
            mensagem,
            fonte,
            remoto: true,
            risco,
            tendencia,
            atualizadoEm: new Date().toISOString()
        };
        salvarAlertaCache(contexto, payload);
        return payload;
    } catch (erroDengue) {
        try {
            const respostaCovid = await fetch('https://disease.sh/v3/covid-19/countries/brazil?strict=true');
            if (!respostaCovid.ok) throw new Error(`HTTP ${respostaCovid.status}`);
            const covid = await respostaCovid.json();

            const ativos = Number(covid?.active || 0);
            const recuperadosHoje = Number(covid?.todayRecovered || 0);
            const casosHoje = Number(covid?.todayCases || 0);

            const mensagem = `⚠️ Alerta no seu bairro (${bairroExibicao}): vigilância respiratória ativa no Brasil. Casos ativos de Covid-19: ${ativos.toLocaleString('pt-BR')}.`;
            const fonte = `disease.sh • recuperados hoje: ${recuperadosHoje.toLocaleString('pt-BR')}`;

            const risco = ativos > 2000000 ? 'alto' : ativos > 800000 ? 'medio' : 'baixo';
            const tendencia = casosHoje > recuperadosHoje ? 'alta' : casosHoje < (recuperadosHoje * 0.5) ? 'queda' : 'estavel';
            const payload = {
                mensagem,
                fonte,
                remoto: true,
                risco,
                tendencia,
                atualizadoEm: new Date().toISOString()
            };
            salvarAlertaCache(contexto, payload);
            return payload;
        } catch (_) {
            return {
                mensagem: obterAlertaRegional(contexto),
                fonte: 'Boletim local (fallback)',
                remoto: false,
                risco: 'medio',
                tendencia: 'estavel',
                atualizadoEm: new Date().toISOString(),
                erro: erroDengue?.message || 'Sem conexão com fontes externas'
            };
        }
    }
}

function calcularReforcoUrgente(vacinasPerfil) {
    const candidatos = [];

    vacinasPerfil.forEach(v => {
        const dataProxima = String(v?.proximaDose || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataProxima)) {
            candidatos.push({ nome: v.nome, data: dataProxima, origem: 'proximaDose' });
        }
    });

    const dtVacina = vacinasPerfil.find(v => {
        const nome = normalizarTexto(v?.nome);
        return nome.includes('dupla') || nome.includes('tetano') || nome.includes('dt');
    });

    if (dtVacina?.data && /^\d{4}-\d{2}-\d{2}$/.test(dtVacina.data)) {
        const dataAplicacao = new Date(`${dtVacina.data}T00:00:00`);
        if (!Number.isNaN(dataAplicacao.getTime())) {
            dataAplicacao.setFullYear(dataAplicacao.getFullYear() + 10);
            const dataReforco = dataAplicacao.toISOString().split('T')[0];
            candidatos.push({ nome: 'Dupla Adulto (dT)', data: dataReforco, origem: 'dT' });
        }
    }

    if (candidatos.length === 0) {
        return {
            nivel: 'yellow',
            titulo: '⚠️ Dupla Adulto (dT) sem registro recente',
            descricao: 'Não encontramos uma data de reforço. Essa vacina deve ser atualizada a cada 10 anos.'
        };
    }

    candidatos.sort((a, b) => ordenarDataIso(a.data, b.data));
    const proximo = candidatos[0];
    const dias = diferencaDias(proximo.data);

    if (dias < 0) {
        return {
            nivel: 'red',
            titulo: `🚨 Reforço vencido: ${formatarNomeVacina(proximo.nome)}`,
            descricao: `Essa dose venceu há ${Math.abs(dias)} dias. Atualize o quanto antes para manter a cobertura.`
        };
    }

    if (dias <= 30) {
        return {
            nivel: 'yellow',
            titulo: `⏳ Próximo Reforço: ${formatarNomeVacina(proximo.nome)} vence em ${dias} dias.`,
            descricao: `Data prevista: ${formatarDataBr(proximo.data)}. Agende seu alerta para não perder o prazo.`
        };
    }

    return {
        nivel: 'green',
        titulo: `✅ Reforço em dia: ${formatarNomeVacina(proximo.nome)}`,
        descricao: `Seu próximo reforço está programado para ${formatarDataBr(proximo.data)}.`
    };
}

function obterProximoAgendamento(vacinasPerfil, pendentes, nomePerfil) {
    const candidatos = vacinasPerfil
        .filter(v => /^\d{4}-\d{2}-\d{2}$/.test(String(v?.proximaDose || '')))
        .map(v => ({ nome: formatarNomeVacina(v.nome), data: v.proximaDose }));

    if (candidatos.length > 0) {
        candidatos.sort((a, b) => ordenarDataIso(a.data, b.data));
        const melhor = candidatos[0];
        return {
            nome: melhor.nome,
            data: melhor.data,
            dias: diferencaDias(melhor.data),
            perfil: nomePerfil
        };
    }

    const pendente = pendentes[0];
    if (!pendente) return null;

    const hojeAtual = hojeIso();
    const dataSugerida = adicionarAoIsoDayjs(hojeAtual, { dias: 38 });
    return {
        nome: formatarNomeVacina(pendente.nome),
        data: dataSugerida,
        dias: diferencaDias(dataSugerida),
        perfil: nomePerfil
    };
}

function montarNotificacoes({ faixa, campanha, contexto, reforco }) {
    const faixaRotulo = faixa.charAt(0).toUpperCase() + faixa.slice(1);
    const local = contexto?.bairro || contexto?.cep || 'sua região';

    return [
        `Seu perfil foi atualizado para a faixa etária: ${faixaRotulo}.`,
        `O Ministério da Saúde incluiu uma nova etapa de reforço contra a Covid-19 em ${anoAtual()}.`,
        `Aviso: O posto de saúde mais próximo de ${local} pode operar com agenda reduzida no sábado.`,
        `Campanha ativa: ${campanha.titulo.replace(/^🎯\s*/, '')}`,
        `${reforco.titulo.replace(/^([⚠️🚨✅⏳])\s*/, '')}`
    ];
}

function configurarPainelNotificacoes(notificacoes) {
    const btnSino = document.getElementById('btn-dashboard-notifications');
    const btnFechar = document.getElementById('btn-close-notifications');
    const painel = document.getElementById('dashboard-notification-panel');
    const lista = document.getElementById('dashboard-notification-list');
    const dot = document.getElementById('notification-dot');

    if (!btnSino || !painel || !lista || !dot) return;

    lista.innerHTML = '';
    notificacoes.forEach(msg => {
        const item = document.createElement('li');
        item.className = 'notification-item';
        item.textContent = msg;
        lista.appendChild(item);
    });

    const assinaturaAtual = notificacoes.join('|');
    painel.dataset.signature = assinaturaAtual;
    const ultimaAssinaturaLida = localStorage.getItem(DASH_NOTIFICATIONS_LAST_SEEN_KEY) || '';
    dot.classList.toggle('hidden', ultimaAssinaturaLida === assinaturaAtual);

    if (!btnSino.dataset.bound) {
        btnSino.dataset.bound = '1';
        btnSino.addEventListener('click', (event) => {
            event.stopPropagation();
            painel.classList.toggle('hidden');

            if (!painel.classList.contains('hidden')) {
                localStorage.setItem(DASH_NOTIFICATIONS_LAST_SEEN_KEY, painel.dataset.signature || '');
                dot.classList.add('hidden');
            }
        });
    }

    if (btnFechar && !btnFechar.dataset.bound) {
        btnFechar.dataset.bound = '1';
        btnFechar.addEventListener('click', () => {
            painel.classList.add('hidden');
        });
    }

    if (!document.body.dataset.notificationsOutsideBound) {
        document.body.dataset.notificationsOutsideBound = '1';
        document.addEventListener('click', (event) => {
            if (!(event.target instanceof Node)) return;
            if (!painel.contains(event.target) && !btnSino.contains(event.target)) {
                painel.classList.add('hidden');
            }
        });
    }
}

function navegarParaAba(abaId) {
    const botaoAba = Array.from(document.querySelectorAll('.nav-item')).find(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        return onclick.includes(`'${abaId}'`);
    });

    if (botaoAba && typeof window.mudarAba === 'function') {
        window.mudarAba(abaId, botaoAba);
    }
}

function configurarAcoesRapidas() {
    const btnDependente = document.getElementById('quick-action-dependente');
    const btnPosto = document.getElementById('quick-action-posto');
    const btnPdf = document.getElementById('quick-action-pdf');
    const btnBula = document.getElementById('quick-action-bula');

    if (btnDependente && !btnDependente.dataset.bound) {
        btnDependente.dataset.bound = '1';
        btnDependente.addEventListener('click', () => {
            navegarParaAba('wallet');
            setTimeout(() => {
                document.getElementById('btn-add-dependente')?.click();
            }, 80);
        });
    }

    if (btnPosto && !btnPosto.dataset.bound) {
        btnPosto.dataset.bound = '1';
        btnPosto.addEventListener('click', () => {
            navegarParaAba('reminders');
            setTimeout(() => {
                const inputBusca = document.getElementById('input-busca-local');
                inputBusca?.focus();
                inputBusca?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 80);
        });
    }

    if (btnPdf && !btnPdf.dataset.bound) {
        btnPdf.dataset.bound = '1';
        btnPdf.addEventListener('click', async () => {
            navegarParaAba('wallet');
            try {
                await compartilharHistoricoVacinas();
            } catch (error) {
                console.error('Erro ao exportar PDF rápido:', error);
                alert('Não foi possível exportar o PDF agora. Tente novamente em alguns instantes.');
            }
        });
    }

    if (btnBula && !btnBula.dataset.bound) {
        btnBula.dataset.bound = '1';
        btnBula.addEventListener('click', () => {
            navegarParaAba('calendar');
            setTimeout(() => {
                const buscaCalendario = document.getElementById('input-busca-calendario');
                if (buscaCalendario) {
                    buscaCalendario.focus();
                    buscaCalendario.value = '';
                    buscaCalendario.placeholder = 'Digite o nome da vacina para ver reações e cuidados';
                }
            }, 80);
        });
    }
}

function configurarContadoresNavegaveis() {
    const cardDependentes = document.getElementById('dashboard-counter-dependentes-card');
    const cardPendentes = document.getElementById('dashboard-counter-pendentes-card');
    const cardAplicadas = document.getElementById('dashboard-counter-aplicadas-card');

    if (cardDependentes && !cardDependentes.dataset.bound) {
        cardDependentes.dataset.bound = '1';
        cardDependentes.addEventListener('click', () => {
            navegarParaAba('wallet');
            setTimeout(() => {
                document.getElementById('btn-add-dependente')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 80);
        });
    }

    if (cardPendentes && !cardPendentes.dataset.bound) {
        cardPendentes.dataset.bound = '1';
        cardPendentes.addEventListener('click', () => {
            navegarParaAba('reminders');
            setTimeout(() => {
                const buscaLocal = document.getElementById('input-busca-local');
                buscaLocal?.focus();
                buscaLocal?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 80);
        });
    }

    if (cardAplicadas && !cardAplicadas.dataset.bound) {
        cardAplicadas.dataset.bound = '1';
        cardAplicadas.addEventListener('click', () => {
            navegarParaAba('wallet');
            setTimeout(() => {
                document.getElementById('wallet-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        });
    }
}

function configurarAccordionDashboard() {
    const secaoDashboard = document.getElementById('screen-dashboard');
    if (!secaoDashboard) return;

    secaoDashboard.querySelectorAll('.accordion-card').forEach(card => {
        const novoCard = card.cloneNode(true);
        card.parentNode?.replaceChild(novoCard, card);
        const cabecalho = novoCard.querySelector('.accordion-header');

        if (!cabecalho) return;

        cabecalho.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const targetId = novoCard.getAttribute('data-target');
            const conteudo = targetId ? document.getElementById(targetId) : null;
            if (!conteudo) return;

            const estavaEscondido = conteudo.classList.contains('hidden');

            secaoDashboard.querySelectorAll('.accordion-content').forEach(c => c.classList.add('hidden'));
            secaoDashboard.querySelectorAll('.accordion-card').forEach(c => c.classList.remove('open'));

            if (estavaEscondido) {
                conteudo.classList.remove('hidden');
                novoCard.classList.add('open');
            }
        });
    });
}

function configurarReatividadePerfil() {
    const seletorPerfil = document.getElementById('select-dependente');
    if (!seletorPerfil || seletorPerfil.dataset.dashboardBound) return;

    seletorPerfil.dataset.dashboardBound = '1';
    seletorPerfil.addEventListener('change', () => {
        const secaoDashboard = document.getElementById('screen-dashboard');
        if (secaoDashboard && !secaoDashboard.classList.contains('hidden')) {
            inicializarDashboard();
        }
    });
}

function montarHtmlAlertaRegional(resultado) {
    const fonteTexto = resultado?.fonte || 'Fonte não informada';
    const statusFonte = resultado?.remoto ? 'fonte externa em tempo real' : 'fallback local';
    const riscoMeta = obterMetaRisco(resultado?.risco || 'baixo');
    const tendenciaMeta = obterMetaTendencia(resultado?.tendencia || 'estavel');
    const atualizado = formatarTempoRelativo(resultado?.atualizadoEm);

    return `
        <div style="background: rgba(217, 83, 79, 0.08); padding: 0.75rem; border-radius: 0.5rem; border-left: 4px solid var(--danger);">
            <div class="epi-risk-row">
                <p style="font-weight: bold; color: var(--danger); font-size: 0.875rem;">🚨 Boletim Regional de Vigilância</p>
                <div class="epi-badge-group">
                    <span class="epi-risk-badge ${riscoMeta.className}">${riscoMeta.label}</span>
                    <span class="epi-risk-badge ${tendenciaMeta.className}">${tendenciaMeta.label}</span>
                </div>
            </div>
            <p style="font-size: 0.8125rem; color: var(--text-primary); margin-top: 0.3rem;">${resultado.mensagem}</p>
        </div>
        <div style="margin-top: 0.75rem; font-size: 0.8125rem; color: var(--text-secondary);">
            <p>📍 Fonte: ${fonteTexto} (${statusFonte}).</p>
            <p>🕒 Atualizado há ${atualizado}.</p>
        </div>
    `;
}

export function inicializarDashboard() {
    const leituraAtual = ++dashboardReadVersion;
    const perfilId = appState.perfilAtual || 'principal';
    const perfilAtivo = obterPerfilAtivo(perfilId);
    const vacinasPerfil = obterVacinasPerfil(perfilId);
    const idade = calcularIdadeDetalhada(perfilAtivo.dataNascimento);
    const faixa = obterFaixaEtaria(idade);
    const pendentes = obterPendentesPorFaixa(vacinasPerfil, faixa);
    const progresso = obterProgresso(vacinasPerfil, faixa);
    const campanha = obterCampanhaPorFaixa(faixa, anoAtual());
    const contextoRegional = obterContextoRegional();
    const reforco = calcularReforcoUrgente(vacinasPerfil);

    const perfilTitular = obterPerfilTitular();
    const nomePrincipal = String(perfilTitular?.nomeCompleto || '').trim();
    const primeiroNome = nomePrincipal ? nomePrincipal.split(' ').filter(Boolean)[0] : 'Usuário';

    const saudacao = document.getElementById('dashboard-greeting');
    if (saudacao) saudacao.textContent = `Olá, ${primeiroNome}`;

    const dependentesLocais = JSON.parse(localStorage.getItem('app_dependentes') || '[]');
    const totalDependentes = Array.isArray(dependentesLocais) ? dependentesLocais.length : 0;
    const contadorDependentes = document.getElementById('dashboard-counter-dependentes');
    const contadorPendentes = document.getElementById('dashboard-counter-pendentes');
    const contadorAplicadas = document.getElementById('dashboard-counter-aplicadas');

    if (contadorDependentes) {
        contadorDependentes.textContent = `${totalDependentes} ${totalDependentes === 1 ? 'Dependente' : 'Dependentes'}`;
        document.getElementById('dashboard-counter-dependentes-card')?.setAttribute('aria-label', `Abrir detalhes de dependentes. ${contadorDependentes.textContent}.`);
    }
    if (contadorPendentes) {
        contadorPendentes.textContent = `${pendentes.length} ${pendentes.length === 1 ? 'Pendente' : 'Pendentes'}`;
        document.getElementById('dashboard-counter-pendentes-card')?.setAttribute('aria-label', `Abrir pendências de vacinação. ${contadorPendentes.textContent}.`);
    }
    if (contadorAplicadas) {
        contadorAplicadas.textContent = `${vacinasPerfil.length} ${vacinasPerfil.length === 1 ? 'Aplicada' : 'Aplicadas'}`;
        document.getElementById('dashboard-counter-aplicadas-card')?.setAttribute('aria-label', `Abrir histórico de vacinas aplicadas. ${contadorAplicadas.textContent}.`);
    }

    configurarContadoresNavegaveis();

    const barra = document.getElementById('dashboard-progress');
    const badge = document.getElementById('dashboard-progress-badge');
    const texto = document.getElementById('dashboard-text');
    const meta = document.getElementById('dashboard-goal-text');

    if (barra) barra.style.width = `${progresso.percentual}%`;
    if (badge) badge.textContent = `${progresso.percentual}%`;

    if (texto) {
        texto.innerHTML = `Você tomou <strong>${progresso.tomadasRecomendadas} de ${progresso.totalRecomendado}</strong> vacinas recomendadas para a sua faixa etária.`;
    }

    if (meta) {
        const restante = Math.max(progresso.totalRecomendado - progresso.tomadasRecomendadas, 0);
        meta.textContent = restante === 0
            ? 'Excelente! Seu perfil está com as vacinas recomendadas em dia.'
            : `Falta pouco para imunizar o seu perfil: restam ${restante} vacina(s) para completar essa etapa.`;
    }

    renderizarProximasVacinas(pendentes, idade);

    const agendamento = obterProximoAgendamento(vacinasPerfil, pendentes, perfilAtivo.nome);
    const bannerAgendamento = document.getElementById('dashboard-next-schedule-text');
    if (bannerAgendamento) {
        if (!agendamento) {
            bannerAgendamento.innerHTML = '🎉 Nenhum agendamento pendente no momento para este perfil.';
        } else if (agendamento.dias < 0) {
            const atrasoTexto = Math.abs(agendamento.dias) < 30
                ? `${Math.abs(agendamento.dias)} ${Math.abs(agendamento.dias) === 1 ? 'dia' : 'dias'}`
                : Math.abs(agendamento.dias) < 365
                    ? `${Math.floor(Math.abs(agendamento.dias) / 30)} ${Math.floor(Math.abs(agendamento.dias) / 30) === 1 ? 'mês' : 'meses'}`
                    : `${Math.floor(Math.abs(agendamento.dias) / 365)} ${Math.floor(Math.abs(agendamento.dias) / 365) === 1 ? 'ano' : 'anos'}`;
            bannerAgendamento.innerHTML = `Próxima Vacina: <strong>${agendamento.nome}</strong> (${agendamento.perfil})<br>📅 Data: <strong>${formatarDataBr(agendamento.data)}</strong> • ⏳ <strong>Atrasada há ${atrasoTexto}</strong>.`;
        } else {
            const faltamTexto = agendamento.dias < 30
                ? `${agendamento.dias} ${agendamento.dias === 1 ? 'dia' : 'dias'}`
                : agendamento.dias < 365
                    ? `${Math.floor(agendamento.dias / 30)} ${Math.floor(agendamento.dias / 30) === 1 ? 'mês' : 'meses'}`
                    : `${Math.floor(agendamento.dias / 365)} ${Math.floor(agendamento.dias / 365) === 1 ? 'ano' : 'anos'}`;
            bannerAgendamento.innerHTML = `Próxima Vacina: <strong>${agendamento.nome}</strong> (${agendamento.perfil})<br>📅 Data: <strong>${formatarDataBr(agendamento.data)}</strong> • ⏳ <strong>Faltam ${faltamTexto}</strong>.`;
        }
    }

    const campanhasContainer = document.getElementById('dashboard-campaigns-list');
    if (campanhasContainer) {
        campanhasContainer.innerHTML = `
            <div style="margin-bottom: 0.75rem;">
                <p style="font-weight: bold; color: #0275d8;">${campanha.titulo}</p>
                <p style="font-size: 0.875rem; margin-top: 0.3rem;"><strong>${campanha.periodo}</strong></p>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">${campanha.apoio}</p>
            </div>
        `;
    }

    const surtosContainer = document.getElementById('dashboard-outbreaks-list');
    if (surtosContainer) {
        surtosContainer.innerHTML = `
            <div style="background: rgba(217, 83, 79, 0.08); padding: 0.75rem; border-radius: 0.5rem; border-left: 4px solid var(--danger);">
                <p style="font-weight: bold; color: var(--danger); font-size: 0.875rem;">🚨 Boletim Regional de Vigilância</p>
                <p style="font-size: 0.8125rem; color: var(--text-primary); margin-top: 0.3rem;">Buscando dados epidemiológicos atualizados...</p>
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.8125rem; color: var(--text-secondary);">
                <p>📡 Consultando fontes públicas de saúde...</p>
            </div>
        `;

        buscarAlertaRegionalRemoto(contextoRegional).then((resultado) => {
            if (leituraAtual !== dashboardReadVersion) return;
            if ((appState.perfilAtual || 'principal') !== perfilId) return;
            surtosContainer.innerHTML = montarHtmlAlertaRegional(resultado);
        });
    }

    const validadeContainer = document.getElementById('dashboard-expirations-list');
    const cardValidade = document.getElementById('dashboard-expirations-card');
    if (validadeContainer) {
        validadeContainer.innerHTML = `
            <p style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.2rem;">${reforco.titulo}</p>
            <p style="font-size: 0.8125rem; color: var(--text-secondary);">${reforco.descricao}</p>
        `;
    }

    if (cardValidade) {
        cardValidade.classList.remove('dashboard-urgent-yellow', 'dashboard-urgent-red', 'dashboard-urgent-green');
        if (reforco.nivel === 'red') cardValidade.classList.add('dashboard-urgent-red');
        else if (reforco.nivel === 'green') cardValidade.classList.add('dashboard-urgent-green');
        else cardValidade.classList.add('dashboard-urgent-yellow');
    }

    const familiaContainer = document.getElementById('dashboard-family-list');
    if (familiaContainer) {
        const dependentes = JSON.parse(localStorage.getItem('app_dependentes') || '[]');
        const totalPerfis = Array.isArray(dependentes) ? dependentes.length + 1 : 1;
        familiaContainer.innerHTML = `
            <p style="font-size: 0.875rem;">👥 <strong>Perfis cadastrados no app:</strong> ${totalPerfis}</p>
            <p style="font-size: 0.875rem; margin-top: 0.25rem;">💉 <strong>Doses registradas neste perfil:</strong> ${vacinasPerfil.length}</p>
            <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.4rem;">Dica: use o atalho + Dependente para cadastrar familiares e acompanhar cada carteira separadamente.</p>
        `;
    }

    const notificacoes = montarNotificacoes({ faixa, campanha, contexto: contextoRegional, reforco });
    configurarPainelNotificacoes(notificacoes);
    configurarAcoesRapidas();
    configurarAccordionDashboard();
    renderizarJogoVacinaSemFake();
    configurarReatividadePerfil();
}

const DESAFIOS_VACINA = [
    {
        pergunta: 'A vacina da gripe causa gripe?',
        resposta: 'fato',
        explicacao: 'Não. A vacina do SUS usa vírus inativado e não provoca a doença.'
    },
    {
        pergunta: 'Tomar mais de uma vacina no mesmo dia faz mal?',
        resposta: 'boato',
        explicacao: 'Em geral, vacinas diferentes podem ser aplicadas no mesmo atendimento quando indicado pela equipe de saúde.'
    },
    {
        pergunta: 'Vacinas podem ser atualizadas ao longo da vida?',
        resposta: 'fato',
        explicacao: 'Sim. Algumas vacinas precisam de reforços periódicos para manter a proteção.'
    },
    {
        pergunta: 'Se eu já tive uma doença, nunca mais preciso de vacina?',
        resposta: 'boato',
        explicacao: 'Isso depende de cada imunizante e avaliação profissional; vacinas continuam importantes.'
    }
];

function renderizarJogoVacinaSemFake() {
    const container = document.getElementById('dashboard-fakenews-list');
    if (!container) return;

    const indiceAtual = Number(container.dataset.quizIndex || '0');
    const acertos = Number(container.dataset.quizScore || '0');
    const desafio = DESAFIOS_VACINA[indiceAtual % DESAFIOS_VACINA.length];

    container.innerHTML = `
        <div class="vaccine-game-card">
            <div class="vaccine-game-header">
                <div>
                    <p class="vaccine-game-kicker">🛡️ Vacina Sem Fake</p>
                    <h3>Jogo do Mito ou Fato</h3>
                </div>
                <span class="vaccine-game-score">${acertos} acerto${acertos === 1 ? '' : 's'}</span>
            </div>

            <p class="vaccine-game-question">${desafio.pergunta}</p>

            <div class="vaccine-game-actions">
                <button type="button" class="vaccine-game-btn" data-answer="boato">Boato</button>
                <button type="button" class="vaccine-game-btn" data-answer="fato">Fato</button>
            </div>

            <div class="vaccine-game-feedback hidden"></div>
            <div class="vaccine-game-footer">
                <span>${indiceAtual + 1}/${DESAFIOS_VACINA.length}</span>
                <button type="button" class="vaccine-game-next btn-secondary hidden">Próxima pergunta</button>
            </div>
        </div>
    `;

    const feedback = container.querySelector('.vaccine-game-feedback');
    const nextBtn = container.querySelector('.vaccine-game-next');
    const answerButtons = container.querySelectorAll('.vaccine-game-btn');

    const mostrarFeedback = (acertou) => {
        if (!feedback) return;
        feedback.classList.remove('hidden');
        feedback.innerHTML = acertou
            ? `✅ Acertou! ${desafio.explicacao}`
            : `❌ Ainda não. ${desafio.explicacao}`;
        feedback.className = `vaccine-game-feedback ${acertou ? 'success' : 'error'}`;
    };

    const avancar = () => {
        container.dataset.quizIndex = String((indiceAtual + 1) % DESAFIOS_VACINA.length);
        renderizarJogoVacinaSemFake();
    };

    answerButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const resposta = btn.getAttribute('data-answer');
            const acertou = resposta === desafio.resposta;
            const scoreAtual = Number(container.dataset.quizScore || '0');
            if (acertou) {
                container.dataset.quizScore = String(scoreAtual + 1);
            }
            mostrarFeedback(acertou);
            answerButtons.forEach(b => b.disabled = true);
            if (nextBtn) nextBtn.classList.remove('hidden');
        });
    });

    nextBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        avancar();
    });
}
