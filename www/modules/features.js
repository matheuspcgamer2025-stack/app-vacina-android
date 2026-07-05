import { appState } from './database.js';

export function inicializarNovasFuncoes(onUpdateCallback) {
    
    // ==========================================
    // 1. GERENCIAMENTO DE DEPENDENTES (FAMÍLIA)
    // ==========================================
    const selectDep = document.getElementById('select-dependente');
    const btnAddDep = document.getElementById('btn-add-dependente');

    // Carrega dependentes já salvos no dispositivo
    const dependentesSalvos = JSON.parse(localStorage.getItem('app_dependentes')) || [];
    dependentesSalvos.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep.id;
        opt.innerText = `👶 ${dep.nome}`;
        selectDep?.appendChild(opt);
    });

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
        onUpdateCallback();
    });

    selectDep?.addEventListener('change', (e) => {
        appState.perfilAtual = e.target.value;
        onUpdateCallback();
    });

    // ==========================================
    // 2. EXPORTAÇÃO EM PDF (NATIVA E PROFISSIONAL)
    // ==========================================
    document.getElementById('btn-exportar-pdf')?.addEventListener('click', () => {
        const listaHtml = document.getElementById('wallet-list').innerHTML;
        const nomePerfil = selectDep.options[selectDep.selectedIndex].text;

        // Cria uma janela oculta otimizada apenas com os dados estruturados para a impressão limpa
        const janelaImpressao = window.open('', '', 'width=800,height=600');
        janelaImpressao.document.write(`
            <html>
            <head>
                <title>Carteira Digital de Vacinação</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                    .header { text-align: center; border-bottom: 3px solid #0275d8; padding-bottom: 20px; margin-bottom: 30px; }
                    .vax-item { background: #f8f9fa; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 5px solid #5cb85c; page-break-inside: avoid; }
                    h4 { margin: 0 0 5px 0; color: #0275d8; font-size: 18px; }
                    p { margin: 3px 0; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>🛡️ VacinaApp - Histórico de Imunização</h2>
                    <p><strong>Carteira:</strong> ${nomePerfil}</p>
                    <p>Documento gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
                </div>
                ${listaHtml}
            </body>
            </html>
        `);
        janelaImpressao.document.close();
        janelaImpressao.focus();
        
        // Dispara a caixa nativa de Salvar como PDF do Android/PC
        setTimeout(() => {
            janelaImpressao.print();
            janelaImpressao.close();
        }, 500);
    });
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
