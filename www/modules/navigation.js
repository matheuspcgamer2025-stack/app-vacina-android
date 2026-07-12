export function mudarAba(targetId, elementoBotao) {
    // 1. Oculta todas as telas internas e exibe apenas a tela selecionada
    document.querySelectorAll('.sub-screen').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('sub-screen-enter');
    });

    const telaAlvo = document.getElementById(`screen-${targetId}`);
    if (!telaAlvo) return;

    telaAlvo.classList.remove('hidden');
    // Reaplica a classe em frame seguinte para garantir replay da animacao.
    requestAnimationFrame(() => {
        telaAlvo.classList.add('sub-screen-enter');
    });
    
    // 2. Remove o estado ativo dos botões inferiores e destaca o botão clicado
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    elementoBotao.classList.add('active');
    elementoBotao.classList.remove('nav-item-activated');
    requestAnimationFrame(() => {
        elementoBotao.classList.add('nav-item-activated');
    });

    // A atualização do texto antigo foi desativada para manter a logo fixa e profissional no topo!
}

