import { appState, auth, db, obterDependentesLocais, salvarDependentesLocais, salvarDependenteLocal } from './database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { formatarIdadeHumana } from './profile.js';
import { formatIsoToDisplay, parseDateToIso } from './date-input.js';
import { appConfirm } from './dialogs.js';

function normalizarDependente(dep) {
    const nome = String(dep?.nome || '').trim();
    const sexoRaw = String(dep?.sexo || 'Feminino').trim();
    const sexo = sexoRaw === 'Masculino' ? 'Masculino' : 'Feminino';
    const dataNascimento = String(dep?.dataNascimento || '').trim();
    const dataNascimentoValida = parseDateToIso(dataNascimento);

    if (!nome) return null;

    return {
        id: dep?.id || `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        nome,
        dataNascimento: dataNascimentoValida,
        sexo,
        carteira: Array.isArray(dep?.carteira) ? dep.carteira : []
    };
}

async function carregarDependentesNuvem(uid) {
    const refUsuario = doc(db, 'usuarios', uid);
    const snap = await getDoc(refUsuario);
    if (!snap.exists()) return [];

    const data = snap.data();
    if (!Array.isArray(data?.dependentes)) return [];

    return data.dependentes
        .map(normalizarDependente)
        .filter(Boolean);
}

async function salvarDependentesNuvem(uid, dependentes) {
    const refUsuario = doc(db, 'usuarios', uid);
    await setDoc(refUsuario, {
        usuarioUid: uid,
        usuarioEmail: auth.currentUser?.email || null,
        dependentes,
        atualizadoEm: new Date().toISOString()
    }, { merge: true });
}

export function inicializarNovasFuncoes(onUpdateCallback) {

    const selectDep = document.getElementById('select-dependente');
    const btnAddDep = document.getElementById('btn-add-dependente');
    const btnRemoveDep = document.getElementById('btn-remove-dependente');
    const dependentesList = document.getElementById('dependentes-list');
    const formDependente = document.getElementById('dependente-form');
    const inputDepId = document.getElementById('dependente-id');
    const inputDepNome = document.getElementById('dependente-nome');
    const inputDepNascimento = document.getElementById('dependente-data-nascimento');
    const inputDepSexo = document.getElementById('dependente-sexo');
    const btnCancelarEdicao = document.getElementById('btn-cancelar-dependente');

    let dependentes = obterDependentesLocais();

    function notificarTrocaPerfil(perfilId) {
        document.dispatchEvent(new CustomEvent('app:perfil-trocado', {
            detail: {
                perfilId: perfilId || appState.perfilAtual || 'principal'
            }
        }));
    }

    function renderizarSelectDependentes() {
        if (!selectDep) return;

        const valorAtual = selectDep.value || appState.perfilAtual || 'principal';
        selectDep.innerHTML = '<option value="principal">Minha Carteira (Titular)</option>';

        dependentes.forEach(dep => {
            const opt = document.createElement('option');
            opt.value = dep.id;
            opt.innerText = `👶 ${dep.nome}`;
            selectDep.appendChild(opt);
        });

        const existeValor = valorAtual === 'principal' || dependentes.some(d => d.id === valorAtual);
        selectDep.value = existeValor ? valorAtual : 'principal';
        appState.perfilAtual = selectDep.value;
    }

    function renderizarListaDependentes() {
        if (!dependentesList) return;
        dependentesList.innerHTML = '';

        if (dependentes.length === 0) {
            dependentesList.innerHTML = '<li class="dependente-empty">Nenhum dependente cadastrado ainda.</li>';
            return;
        }

        dependentes.forEach(dep => {
            const item = document.createElement('li');
            item.className = 'dependente-item';
            const idadeExibicao = formatarIdadeHumana(dep.dataNascimento);
            item.innerHTML = `
                <div class="dependente-info">
                    <strong>${dep.nome}</strong>
                    <span>${idadeExibicao} • ${dep.sexo}</span>
                </div>
                <div class="dependente-actions">
                    <button type="button" class="btn-mini btn-switch" data-action="switch" data-id="${dep.id}">Carteira</button>
                    <button type="button" class="btn-mini btn-edit" data-action="edit" data-id="${dep.id}">Editar ✏️</button>
                </div>
            `;

            dependentesList.appendChild(item);
        });
    }

    function abrirFormulario(dep = null) {
        if (!formDependente) return;
        formDependente.classList.remove('hidden');
        inputDepId.value = dep?.id || '';
        inputDepNome.value = dep?.nome || '';
        inputDepNascimento.value = dep?.dataNascimento ? formatIsoToDisplay(dep.dataNascimento) : '';
        inputDepSexo.value = dep?.sexo || 'Feminino';
        inputDepNome.focus();
    }

    function fecharFormulario() {
        if (!formDependente) return;
        formDependente.classList.add('hidden');
        formDependente.reset();
        inputDepId.value = '';
        inputDepSexo.value = 'Feminino';
    }

    async function persistirDependentes() {
        dependentes = salvarDependentesLocais(dependentes);
        if (auth.currentUser?.uid) {
            await salvarDependentesNuvem(auth.currentUser.uid, dependentes);
        }
    }

    async function sincronizarDependentes() {
        const locais = obterDependentesLocais();
        dependentes = locais;

        if (auth.currentUser?.uid) {
            try {
                const nuvem = await carregarDependentesNuvem(auth.currentUser.uid);
                if (nuvem.length > 0 || locais.length === 0) {
                    dependentes = nuvem;
                    salvarDependentesLocais(dependentes);
                } else {
                    await salvarDependentesNuvem(auth.currentUser.uid, dependentes);
                }
            } catch (error) {
                console.error('Erro ao sincronizar dependentes na nuvem:', error);
            }
        }

        renderizarSelectDependentes();
        renderizarListaDependentes();
        atualizarBotaoRemover();
    }

    function atualizarBotaoRemover() {
        const valorSelecionado = selectDep?.value;
        if (btnRemoveDep) {
            btnRemoveDep.style.display = valorSelecionado === 'principal' ? 'none' : 'block';
        }
    }

    btnAddDep?.addEventListener('click', () => {
        abrirFormulario();
    });

    btnRemoveDep?.addEventListener('click', async () => {
        const idSelecionado = selectDep?.value;
        if (!idSelecionado || idSelecionado === 'principal') {
            alert("❌ Você não pode remover o perfil titular!");
            return;
        }

        const nomeDependente = dependentes.find(d => d.id === idSelecionado)?.nome;
        const confirmarRemocao = await appConfirm(`Deseja realmente remover o perfil de "${nomeDependente}"? Todas as vacinas associadas também serão apagadas.`, {
            titulo: 'Remover dependente',
            textoConfirmar: 'Remover',
            textoCancelar: 'Cancelar',
            tipo: 'error'
        });

        if (!confirmarRemocao) {
            return;
        }

        const indice = dependentes.findIndex(d => d.id === idSelecionado);
        if (indice !== -1) {
            dependentes.splice(indice, 1);
            await persistirDependentes();
            renderizarSelectDependentes();
            renderizarListaDependentes();

            if (selectDep) selectDep.value = 'principal';
            appState.perfilAtual = 'principal';

            alert(`✅ Perfil de "${nomeDependente}" removido com sucesso!`);
            atualizarBotaoRemover();
            onUpdateCallback();
        }
    });

    dependentesList?.addEventListener('click', (event) => {
        const alvo = event.target;
        if (!(alvo instanceof HTMLElement)) return;

        const action = alvo.getAttribute('data-action');
        const depId = alvo.getAttribute('data-id');
        if (!action || !depId) return;

        const dep = dependentes.find(d => d.id === depId);
        if (!dep) return;

        if (action === 'switch') {
            if (selectDep) selectDep.value = dep.id;
            appState.perfilAtual = dep.id;
            atualizarBotaoRemover();
            notificarTrocaPerfil(dep.id);
            onUpdateCallback();
            return;
        }

        if (action === 'edit') {
            abrirFormulario(dep);
        }
    });

    formDependente?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const depNormalizado = normalizarDependente({
            id: inputDepId.value || undefined,
            nome: inputDepNome.value,
            dataNascimento: parseDateToIso(inputDepNascimento.value),
            sexo: inputDepSexo.value
        });

        if (!depNormalizado) {
            alert('❌ Informe um nome válido para o dependente.');
            return;
        }

        if (!depNormalizado.dataNascimento) {
            alert('❌ Informe uma data de nascimento válida para o dependente.');
            return;
        }

        const indiceExistente = dependentes.findIndex(d => d.id === depNormalizado.id);
        if (indiceExistente >= 0) dependentes[indiceExistente] = depNormalizado;
        else dependentes.push(depNormalizado);

        // Mantém persistência de um dependente por vez com carteira inicial []
        salvarDependenteLocal(depNormalizado);

        await persistirDependentes();
        renderizarSelectDependentes();
        renderizarListaDependentes();
        if (selectDep) selectDep.value = depNormalizado.id;
        appState.perfilAtual = depNormalizado.id;
        atualizarBotaoRemover();
        fecharFormulario();
        notificarTrocaPerfil(depNormalizado.id);
        onUpdateCallback();
    });

    btnCancelarEdicao?.addEventListener('click', () => {
        fecharFormulario();
    });

    selectDep?.addEventListener('change', (e) => {
        appState.perfilAtual = e.target.value;
        atualizarBotaoRemover();
        notificarTrocaPerfil(e.target.value);
        onUpdateCallback();
    });

    onAuthStateChanged(auth, () => {
        sincronizarDependentes();
    });

    sincronizarDependentes();
}

// ==========================================
// 3. CALCULADORA DE DATA DA PRÓXIMA DOSE
// ==========================================
export function calcularIntervaloDose(nomeVacina, dataAplicada) {
    if (!dataAplicada) return null;

    let dataObjeto = new Date(dataAplicada + 'T00:00:00');
    
    // Verifica se o nome escolhido exige uma segunda dose automática
    if (nomeVacina.includes("Múltiplas Doses")) {
        dataObjeto.setDate(dataObjeto.getDate() + 30); // Soma exatamente 30 dias para o reforço
        return dataObjeto.toISOString().split('T')[0];
    }
    
    return null; // Dose única ou anual não calculam intervalo curto fixa
}
