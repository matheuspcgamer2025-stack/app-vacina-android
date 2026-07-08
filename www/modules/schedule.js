const DIA_MS = 24 * 60 * 60 * 1000;

function toStartOfDay(dateLike) {
    const data = new Date(dateLike);
    data.setHours(0, 0, 0, 0);
    return data;
}

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

    const semanas = parsePrimeiroNumero(/(\d+)\s*(?:a|ª)?\s*semana/, texto);
    const meses = parsePrimeiroNumero(/(\d+)\s*mes(?:es)?/, texto);
    const anos = parsePrimeiroNumero(/(\d+)\s*anos?/, texto);

    if (semanas === null && meses === null && anos === null) {
        return null;
    }

    return {
        anos: anos || 0,
        meses: meses || 0,
        semanas: semanas || 0,
        dias: 0
    };
}

function addOffset(dataBase, offset) {
    const data = new Date(dataBase.getTime());
    if (offset.anos) data.setFullYear(data.getFullYear() + offset.anos);
    if (offset.meses) data.setMonth(data.getMonth() + offset.meses);
    if (offset.semanas) data.setDate(data.getDate() + (offset.semanas * 7));
    if (offset.dias) data.setDate(data.getDate() + offset.dias);
    return data;
}

function formatarDataBR(data) {
    return toStartOfDay(data).toLocaleDateString('pt-BR');
}

function dataToIso(data) {
    return toStartOfDay(data).toISOString().split('T')[0];
}

function calcularDiferencaDias(dataAlvo) {
    const hoje = toStartOfDay(new Date());
    const alvo = toStartOfDay(dataAlvo);
    return Math.round((alvo.getTime() - hoje.getTime()) / DIA_MS);
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

    const nascimento = new Date(`${textoNascimento}T00:00:00`);
    if (Number.isNaN(nascimento.getTime())) return null;

    return addOffset(nascimento, offset);
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
            dataAlvoIso: dataAlvo ? dataToIso(dataAlvo) : null,
            dataAlvoBr: dataAlvo ? formatarDataBR(dataAlvo) : null,
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

    const deltaDias = calcularDiferencaDias(dataAlvo);

    if (deltaDias < 0) {
        return {
            tomada: false,
            status: 'atrasada',
            marcador: `Dose Atrasada ⚠️ (${Math.abs(deltaDias)} dias)` ,
            dataAlvo,
            dataAlvoIso: dataToIso(dataAlvo),
            dataAlvoBr: formatarDataBR(dataAlvo),
            diasParaDataAlvo: deltaDias,
            diasAtraso: Math.abs(deltaDias)
        };
    }

    if (deltaDias === 0) {
        return {
            tomada: false,
            status: 'hoje',
            marcador: 'Vacina de Hoje',
            dataAlvo,
            dataAlvoIso: dataToIso(dataAlvo),
            dataAlvoBr: formatarDataBR(dataAlvo),
            diasParaDataAlvo: 0,
            diasAtraso: 0
        };
    }

    return {
        tomada: false,
        status: 'agendada',
        marcador: `Faltam ${deltaDias} dias`,
        dataAlvo,
        dataAlvoIso: dataToIso(dataAlvo),
        dataAlvoBr: formatarDataBR(dataAlvo),
        diasParaDataAlvo: deltaDias,
        diasAtraso: 0
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
        return a.dataAlvo.getTime() - b.dataAlvo.getTime();
    });
}
