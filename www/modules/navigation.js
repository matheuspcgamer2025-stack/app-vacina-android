export function mudarAba(targetId, elementoBotao) {
    // 1. Oculta todas as telas internas e exibe apenas a tela selecionada
    document.querySelectorAll('.sub-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(`screen-${targetId}`).classList.remove('hidden');
    
    // 2. Remove o estado ativo dos botões inferiores e destaca o botão clicado
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    elementoBotao.classList.add('active');

    // A atualização do texto antigo foi desativada para manter a logo fixa e profissional no topo!
}

