function obterDayjs() {
    return typeof window !== 'undefined' ? window.dayjs : null;
}

function validarIsoData(iso) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''));
}

function formatarFallbackBr(iso) {
    if (!validarIsoData(iso)) return '';
    const [ano, mes, dia] = String(iso).split('-');
    return `${dia}/${mes}/${ano}`;
}

function formatarFallbackIso(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function criarDataFallback(iso) {
    const data = new Date(`${iso}T00:00:00`);
    return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarDataBr(iso) {
    if (!validarIsoData(iso)) return '';
    const dayjsFn = obterDayjs();
    if (dayjsFn) return dayjsFn(iso).format('DD/MM/YYYY');
    return formatarFallbackBr(iso);
}

export function formatarDataIso(iso) {
    if (!validarIsoData(iso)) return '';
    return iso;
}

export function hojeIso() {
    const dayjsFn = obterDayjs();
    if (dayjsFn) return dayjsFn().format('YYYY-MM-DD');

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export function adicionarAoIso(iso, { anos = 0, meses = 0, semanas = 0, dias = 0 } = {}) {
    if (!validarIsoData(iso)) return null;
    const dayjsFn = obterDayjs();
    if (dayjsFn) {
        let data = dayjsFn(iso);
        if (anos) data = data.add(anos, 'year');
        if (meses) data = data.add(meses, 'month');
        if (semanas) data = data.add(semanas, 'week');
        if (dias) data = data.add(dias, 'day');
        return data.format('YYYY-MM-DD');
    }

    const fallback = criarDataFallback(iso);
    if (!fallback) return null;
    if (anos) fallback.setFullYear(fallback.getFullYear() + anos);
    if (meses) fallback.setMonth(fallback.getMonth() + meses);
    if (semanas) fallback.setDate(fallback.getDate() + (semanas * 7));
    if (dias) fallback.setDate(fallback.getDate() + dias);
    return formatarFallbackIso(fallback);
}

export function diferencaDias(isoAlvo, isoBase = null) {
    if (!validarIsoData(isoAlvo)) return null;
    const dayjsFn = obterDayjs();
    if (dayjsFn) {
        const hoje = isoBase ? dayjsFn(isoBase).startOf('day') : dayjsFn().startOf('day');
        const alvo = dayjsFn(isoAlvo).startOf('day');
        return alvo.diff(hoje, 'day');
    }

    const alvo = criarDataFallback(isoAlvo);
    const base = isoBase && validarIsoData(isoBase)
        ? criarDataFallback(isoBase)
        : new Date();
    if (!alvo || !base) return null;

    alvo.setHours(0, 0, 0, 0);
    base.setHours(0, 0, 0, 0);
    return Math.round((alvo.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
}

export function calcularIdadeDetalhadaPorIso(isoNascimento) {
    if (!validarIsoData(isoNascimento)) return null;
    const dayjsFn = obterDayjs();
    if (dayjsFn) {
        const nascimento = dayjsFn(isoNascimento).startOf('day');
        const hoje = dayjsFn().startOf('day');
        const anos = hoje.diff(nascimento, 'year');
        const meses = hoje.diff(nascimento.add(anos, 'year'), 'month');
        const totalMeses = Math.max(0, hoje.diff(nascimento, 'month'));
        return {
            anos: Math.max(0, anos),
            meses: Math.max(0, meses),
            totalMeses,
            dataNascimento: isoNascimento
        };
    }

    const nascimento = criarDataFallback(isoNascimento);
    if (!nascimento) return null;

    const hoje = new Date();
    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();
    const dias = hoje.getDate() - nascimento.getDate();

    if (dias < 0) meses -= 1;
    if (meses < 0) {
        anos -= 1;
        meses += 12;
    }

    return {
        anos: Math.max(0, anos),
        meses: Math.max(0, meses),
        totalMeses: Math.max(0, anos * 12 + meses),
        dataNascimento: isoNascimento
    };
}
