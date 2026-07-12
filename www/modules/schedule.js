import { adicionarAoIso as adicionarAoIsoDayjs, diferencaDias as diferencaDiasDayjs, formatarDataBr as formatarDataBrDayjs } from './dayjs.js';

function parsePrimeiroNumero(regex, texto) {
    const match = texto.match(regex);
    return match ? Number(match[1]) : null;
}

function extrairOffset(recomendacao) {
    const texto = String(recomendacao || '').toLowerCase();

    if (!texto) return null;
    if (texto.includes('ao nascer') || texto.includes('primeiras 12 horas')) {
        return { anos: 0, meses: 0, semanas: 0, dias: 0 };
    }

    const offsets = [];

    const adicionarOffset = (offset) => {
        if (!offset) return;
        offsets.push({
            anos: Number(offset.anos || 0),
            meses: Number(offset.meses || 0),
            semanas: Number(offset.semanas || 0),
            dias: Number(offset.dias || 0)
        });
    };

    const adicionarLista = (regex, unidade) => {
        for (const match of texto.matchAll(regex)) {
            const numeros = String(match[1] || '')
                .split(/\s*,\s*|\s+e\s+/i)
                .map(valor => Number(valor.trim()))
                .filter(valor => Number.isFinite(valor));

            numeros.forEach((numero) => {
                adicionarOffset({ anos: 0, meses: 0, semanas: 0, dias: 0, [unidade]: numero });
            });
        }
    };

    const adicionarFaixa = (regex, unidade) => {
        const match = texto.match(regex);
        if (!match) return;
        const numeroFinal = Number(match[2]);
        if (!Number.isFinite(numeroFinal)) return;
        adicionarOffset({ anos: 0, meses: 0, semanas: 0, dias: 0, [unidade]: numeroFinal });
    };

    adicionarFaixa(/(\d+)\s*(?:a|ª|até|-|–|—)\s*(\d+)\s*anos?/, 'anos');
    adicionarFaixa(/(\d+)\s*(?:a|ª|até|-|–|—)\s*(\d+)\s*mes(?:es)?/, 'meses');
    adicionarFaixa(/(\d+)\s*(?:a|ª|até|-|–|—)\s*(\d+)\s*semana(?:s)?/, 'semanas');

    adicionarLista(/((?:\d+\s*(?:,|\s+e\s+)\s*)*\d+)\s*anos?/g, 'anos');
    adicionarLista(/((?:\d+\s*(?:,|\s+e\s+)\s*)*\d+)\s*mes(?:es)?/g, 'meses');
    adicionarLista(/((?:\d+\s*(?:,|\s+e\s+)\s*)*\d+)\s*semana(?:s)?/g, 'semanas');

    if (offsets.length === 0) {
        return null;
    }

    let melhorOffset = offsets[0];
    let melhorData = adicionarAoIsoDayjs('2000-01-01', melhorOffset);

    for (let i = 1; i < offsets.length; i += 1) {
        const dataAtual = adicionarAoIsoDayjs('2000-01-01', offsets[i]);
        if (dataAtual && melhorData && dataAtual > melhorData) {
            melhorData = dataAtual;
            melhorOffset = offsets[i];
        }
    }

    return melhorOffset;
}

function formatarQuantidade(valor, singular, plural) {
    return `${valor} ${Math.abs(valor) === 1 ? singular : plural}`;
}

function formatarDiferencaDiasHumana(dias) {
    const valor = Number(dias);
    if (!Number.isFinite(valor)) return null;

    const abs = Math.abs(valor);
    if (abs < 30) return formatarQuantidade(abs, 'dia', 'dias');

    const meses = Math.floor(abs / 30);
    if (abs < 365) return formatarQuantidade(meses, 'mês', 'meses');

    const anos = Math.floor(abs / 365);
    const mesesRestantes = Math.floor((abs % 365) / 30);
    if (mesesRestantes === 0) {
        return formatarQuantidade(anos, 'ano', 'anos');
    }

    return `${formatarQuantidade(anos, 'ano', 'anos')} e ${formatarQuantidade(mesesRestantes, 'mês', 'meses')}`;
}

function ordenarIso(a, b) {
    return String(a || '').localeCompare(String(b || ''));
}

function vacinaTomadaNoPerfil(vaxNome, carteiraPerfil) {
    const alvo = String(vaxNome || '').toLowerCase();
    return carteiraPerfil.some(item => String(item?.nome || '').toLowerCase().includes(alvo));
}

export function calcularDataAlvoVacina(vacina, dataNascimento) {
    const textoNascimento = String(dataNascimento || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(textoNascimento)) return null;

    const offset = extrairOffset(vacina?.recomendacao);
    if (!offset) return null;

    return adicionarAoIsoDayjs(textoNascimento, offset);
}

export function avaliarStatusVacina(vacina, carteiraPerfil, dataNascimento) {
    const tomada = vacinaTomadaNoPerfil(vacina?.nome, carteiraPerfil || []);
    const dataAlvo = calcularDataAlvoVacina(vacina, dataNascimento);

    if (tomada) {
        return {
            tomada: true,
            status: 'tomada',
            marcador: 'Tomada',
            dataAlvo,
            dataAlvoIso: dataAlvo,
            dataAlvoBr: dataAlvo ? formatarDataBrDayjs(dataAlvo) : null,
            diasParaDataAlvo: null,
            diasAtraso: 0
        };
    }

    if (!dataAlvo) {
        return {
            tomada: false,
            status: 'sem-data',
            marcador: `Recomendado: ${vacina?.recomendacao || 'sem data definida'}`,
            dataAlvo: null,
            dataAlvoIso: null,
            dataAlvoBr: null,
            diasParaDataAlvo: null,
            diasAtraso: 0
        };
    }

    const deltaDias = diferencaDiasDayjs(dataAlvo);

    if (deltaDias < 0) {
        return {
            tomada: false,
            status: 'atrasada',
            marcador: `Dose Atrasada ⚠️ (${formatarDiferencaDiasHumana(deltaDias)})` ,
            dataAlvo,
            dataAlvoIso: dataAlvo,
            dataAlvoBr: formatarDataBrDayjs(dataAlvo),
            diasParaDataAlvo: deltaDias,
            diasAtraso: Math.abs(deltaDias),
            diasAtrasoTexto: formatarDiferencaDiasHumana(deltaDias)
        };
    }

    if (deltaDias === 0) {
        return {
            tomada: false,
            status: 'hoje',
            marcador: 'Vacina de Hoje',
            dataAlvo,
            dataAlvoIso: dataAlvo,
            dataAlvoBr: formatarDataBrDayjs(dataAlvo),
            diasParaDataAlvo: 0,
            diasAtraso: 0,
            diasParaDataAlvoTexto: 'hoje'
        };
    }

    return {
        tomada: false,
        status: 'agendada',
        marcador: `Faltam ${formatarDiferencaDiasHumana(deltaDias)}`,
        dataAlvo,
        dataAlvoIso: dataAlvo,
        dataAlvoBr: formatarDataBrDayjs(dataAlvo),
        diasParaDataAlvo: deltaDias,
        diasAtraso: 0,
        diasParaDataAlvoTexto: formatarDiferencaDiasHumana(deltaDias)
    };
}

export function montarPendenciasPersonalizadas(calendario, carteiraPerfil, dataNascimento) {
    const pendencias = [];

    (calendario || []).forEach((vacina) => {
        const status = avaliarStatusVacina(vacina, carteiraPerfil || [], dataNascimento);
        if (status.tomada) return;

        pendencias.push({
            ...vacina,
            ...status
        });
    });

    return pendencias.sort((a, b) => {
        if (!a.dataAlvo && !b.dataAlvo) return a.nome.localeCompare(b.nome, 'pt-BR');
        if (!a.dataAlvo) return 1;
        if (!b.dataAlvo) return -1;
        return ordenarIso(a.dataAlvoIso, b.dataAlvoIso);
    });
}
