import { appState, salvarCarteiraNoDispositivo } from './database.js';
import { calcularIntervaloDose } from './features.js';

export function configurarFormularioCarteira(onUpdate) {
    document.getElementById('wallet-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const nomeSelecionado = document.getElementById('vax-nome').value;
        const dataOriginal = document.getElementById('vax-data').value;
        
        // Executa o cálculo inteligente de intervalo da dose
        const proximaDoseCalculada = calcularIntervaloDose(nomeSelecionado, dataOriginal);

        const novaVacina = {
            id: Date.now(),
            perfilId: appState.perfilAtual || "principal", // Vincula ao perfil familiar selecionado
            nome: nomeSelecionado,
            lote: document.getElementById('vax-lote').value,
            local: document.getElementById('vax-local').value,
            data: dataOriginal,
            proximaDose: proximaDoseCalculada
        };

        appState.carteira.push(novaVacina);
        salvarCarteiraNoDispositivo();
        
        // Se houver uma próxima dose calculada, exibe o lembrete em tela na hora
        if (proximaDoseCalculada) {
            const dataBr = new Date(proximaDoseCalculada + 'T00:00:00').toLocaleDateString('pt-BR');
            alert(`📌 Atenção: Esta vacina exige reforço! O sistema agendou automaticamente a sua próxima dose para o dia: ${dataBr}`);
        }

        document.getElementById('wallet-form').reset();
        onUpdate();
    });
}

export function renderizarCarteira(onDeleteCallback) {
    const container = document.getElementById('wallet-list');
    if (!container) return;
    container.innerHTML = "";

    // Filtra para exibir APENAS as vacinas pertencentes ao dependente selecionado
    const perfilAtivo = appState.perfilAtual || "principal";
    const vacinasFiltradas = appState.carteira.filter(v => (v.perfilId === perfilAtivo) || (!v.perfilId && perfilAtivo === "principal"));

    if (vacinasFiltradas.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding: 20px; color:#888;'>Nenhuma vacina salva para este perfil ainda.</p>";
        return;
    }

    vacinasFiltradas.forEach(vax => {
        const dataFormatada = new Date(vax.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const card = document.createElement('div');
        card.className = "vax-item applied";
        
        let textoProximaDose = "";
        if (vax.proximaDose) {
            const proxBr = new Date(vax.proximaDose + 'T00:00:00').toLocaleDateString('pt-BR');
            textoProximaDose = `<p style="color: #f0ad4e; font-weight: bold; font-size: 13px;">⏳ Próxima Dose Recomendada: ${proxBr}</p>`;
        }

        card.innerHTML = `
            <div class="vax-info">
                <h4>${vax.nome}</h4>
                <p>📍 Local: ${vax.local} | 📦 Lote: ${vax.lote}</p>
                <p style="font-weight: bold; color: var(--success)">🗓️ Aplicada em: ${dataFormatada}</p>
                ${textoProximaDose}
            </div>
            <button class="delete-btn" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:18px;">🗑️</button>
        `;
        
        card.querySelector('.delete-btn').addEventListener('click', function() {
            appState.carteira = appState.carteira.filter(v => v.id !== vax.id);
            salvarCarteiraNoDispositivo();
            renderizarCarteira(onDeleteCallback);
        });

        container.appendChild(card);
    });
}
