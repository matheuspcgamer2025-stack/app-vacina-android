import { appState } from './database.js';

export function inicializarNovasFuncoes(onUpdateCallback) {
    
    // ==========================================
    // 1. GERENCIAMENTO DE DEPENDENTES (FAMÍLIA)
    // ==========================================
    const selectDep = document.getElementById('select-dependente');
    const btnAddDep = document.getElementById('btn-add-dependente');
    const btnRemoveDep = document.getElementById('btn-remove-dependente');

    // Carrega dependentes já salvos no dispositivo
    const dependentesSalvos = JSON.parse(localStorage.getItem('app_dependentes')) || [];
    dependentesSalvos.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep.id;
        opt.innerText = `👶 ${dep.nome}`;
        selectDep?.appendChild(opt);
    });

    // Função auxiliar para atualizar visibilidade do botão remover
    function atualizarBotaoRemover() {
        const valorSelecionado = selectDep?.value;
        if (btnRemoveDep) {
            btnRemoveDep.style.display = valorSelecionado === 'principal' ? 'none' : 'block';
        }
    }

    btnAddDep?.addEventListener('click', () => {
        const nomeDep = prompt("Digite o nome do dependente (Filho, Cônjuge ou Idoso):");
        if (!nomeDep || nomeDep.trim() === "") return;

        const novoDep = { id: 'dep_' + Date.now(), nome: nomeDep.trim() };
        dependentesSalvos.push(novoDep);
        localStorage.setItem('app_dependentes', JSON.stringify(dependentesSalvos));

        const opt = document.createElement('option');
        opt.value = novoDep.id;
        opt.innerText = `👶 ${novoDep.nome}`;
        selectDep?.appendChild(opt);
        selectDep.value = novoDep.id;
        
        // Altera a visão para o novo perfil
        appState.perfilAtual = novoDep.id;
        atualizarBotaoRemover();
        onUpdateCallback();
    });

    btnRemoveDep?.addEventListener('click', () => {
        const idSelecionado = selectDep?.value;
        if (!idSelecionado || idSelecionado === 'principal') {
            alert("❌ Você não pode remover o perfil titular!");
            return;
        }

        const nomeDependente = dependentesSalvos.find(d => d.id === idSelecionado)?.nome;
        if (!confirm(`Deseja realmente remover o perfil de "${nomeDependente}"? Todas as vacinas associadas também serão apagadas.`)) {
            return;
        }

        // Remove do array de dependentes
        const indice = dependentesSalvos.findIndex(d => d.id === idSelecionado);
        if (indice !== -1) {
            dependentesSalvos.splice(indice, 1);
            localStorage.setItem('app_dependentes', JSON.stringify(dependentesSalvos));

            // Remove a opção do select
            const opcao = selectDep?.querySelector(`option[value="${idSelecionado}"]`);
            if (opcao) opcao.remove();

            // Volta para o perfil principal
            selectDep.value = 'principal';
            appState.perfilAtual = 'principal';

            alert(`✅ Perfil de "${nomeDependente}" removido com sucesso!`);
            atualizarBotaoRemover();
            onUpdateCallback();
        }
    });

    selectDep?.addEventListener('change', (e) => {
        appState.perfilAtual = e.target.value;
        atualizarBotaoRemover();
        onUpdateCallback();
    });

    // Inicializa o estado do botão remover
    atualizarBotaoRemover();

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
