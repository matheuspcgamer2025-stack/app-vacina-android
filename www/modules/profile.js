const PERFIL_TITULAR_KEY = 'app_perfil_titular';
const DEPENDENTES_KEY = 'app_dependentes';

function normalizarDataNascimento(valor) {
    const texto = String(valor || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
    const data = new Date(`${texto}T00:00:00`);
    if (Number.isNaN(data.getTime())) return null;
    return texto;
}

function normalizarSexo(valor, fallback = 'Não informado') {
    const sexo = String(valor || '').trim();
    if (sexo === 'Masculino' || sexo === 'Feminino') return sexo;
    return fallback;
}

export function obterPerfilTitular() {
    try {
        const bruto = JSON.parse(localStorage.getItem(PERFIL_TITULAR_KEY) || '{}');
        const nomeCompleto = String(bruto?.nomeCompleto || '').trim();
        const dataNascimento = normalizarDataNascimento(bruto?.dataNascimento);
        const sexo = normalizarSexo(bruto?.sexo);

        if (!nomeCompleto) {
            return { nomeCompleto: '', dataNascimento: null, sexo: 'Não informado' };
        }

        return { nomeCompleto, dataNascimento, sexo };
    } catch (_) {
        return { nomeCompleto: '', dataNascimento: null, sexo: 'Não informado' };
    }
}

export function salvarPerfilTitular(perfil) {
    const nomeCompleto = String(perfil?.nomeCompleto || '').trim();
    const dataNascimento = normalizarDataNascimento(perfil?.dataNascimento);
    const sexo = normalizarSexo(perfil?.sexo, 'Feminino');

    const payload = {
        nomeCompleto,
        dataNascimento,
        sexo
    };

    localStorage.setItem(PERFIL_TITULAR_KEY, JSON.stringify(payload));
    return payload;
}

export function obterDependentesLocais() {
    try {
        const lista = JSON.parse(localStorage.getItem(DEPENDENTES_KEY) || '[]');
        return Array.isArray(lista) ? lista : [];
    } catch (_) {
        return [];
    }
}

export function calcularIdadeDetalhada(dataNascimento) {
    const textoData = normalizarDataNascimento(dataNascimento);
    if (!textoData) return null;

    const hoje = new Date();
    const nascimento = new Date(`${textoData}T00:00:00`);

    let anos = hoje.getFullYear() - nascimento.getFullYear();
    let meses = hoje.getMonth() - nascimento.getMonth();
    const dias = hoje.getDate() - nascimento.getDate();

    if (dias < 0) {
        meses -= 1;
    }

    if (meses < 0) {
        anos -= 1;
        meses += 12;
    }

    const totalMeses = Math.max(0, anos * 12 + meses);

    return {
        anos: Math.max(0, anos),
        meses: Math.max(0, meses),
        totalMeses,
        dataNascimento: textoData
    };
}

export function formatarIdadeHumana(dataNascimento) {
    const idade = calcularIdadeDetalhada(dataNascimento);
    if (!idade) return 'Idade não informada';

    if (idade.totalMeses < 24) {
        const m = idade.totalMeses;
        return `${m} ${m === 1 ? 'mês' : 'meses'}`;
    }

    const a = idade.anos;
    return `${a} ${a === 1 ? 'ano' : 'anos'}`;
}

export function obterPerfilAtivo(perfilId) {
    if (!perfilId || perfilId === 'principal') {
        const titular = obterPerfilTitular();
        return {
            id: 'principal',
            tipo: 'titular',
            nome: titular.nomeCompleto || 'Titular',
            dataNascimento: titular.dataNascimento,
            sexo: titular.sexo
        };
    }

    const dependente = obterDependentesLocais().find(dep => dep?.id === perfilId);
    if (!dependente) {
        return {
            id: 'principal',
            tipo: 'titular',
            nome: 'Titular',
            dataNascimento: null,
            sexo: 'Não informado'
        };
    }

    return {
        id: dependente.id,
        tipo: 'dependente',
        nome: String(dependente.nome || 'Dependente'),
        dataNascimento: normalizarDataNascimento(dependente.dataNascimento),
        sexo: normalizarSexo(dependente.sexo)
    };
}
