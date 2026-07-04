import { db, appState } from './database.js';
import { calcularIntervaloDose } from './features.js';
// Importações oficiais das ferramentas de nuvem do Firestore
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc 
} from "https://gstatic.com";

// ==========================================================================
// 1. CONFIGURAÇÃO E ENVIO DE REGISTROS PARA A NUVEM
// ==========================================================================
export function configurarFormularioCarteira(onUpdate) {
    const form = document.getElementById('wallet-form');
    
    // Remove ouvintes duplicados para evitar envios repetidos na nuvem
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    novoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nomeSelecionado = document.getElementById('vax-nome').value;
        const dataOriginal = document.getElementById('vax-data').value;
        
        // Calcula se a vacina selecionada exige um reforço programado
        const proximaDoseCalculada = calcularIntervaloDose(nomeSelecionado, dataOriginal);

        // Monta o objeto com as chaves estruturadas para o Firestore
        const novaVacina = {
            usuarioId: appState.usuarioLogado || "anonimo", // Vincula ao login ativo
            perfilId: appState.perfilAtual || "principal",   // Vincula ao perfil/dependente ativo
            nome: nomeSelecionado,
            lote: document.getElementById('vax-lote').value.trim(),
            local: document.getElementById('vax-local').value.trim(),
            data: dataOriginal,
            proximaDose: proximaDoseCalculada || null,
            dataRegistro: new Date().toISOString()
        };

        try {
            // Salva o documento de forma definitiva na coleção "vacinas" do Firebase
            await addDoc(collection(db, "vacinas"), novaVacina);

            if (proximaDoseCalculada) {
                const dataBr = new Date(proximaDoseCalculada + 'T00:00:00').toLocaleDateString('pt-BR');
                alert(`📌 Registro Salvo! Próxima dose agendada para: ${dataBr}`);
            } else {
                alert("🎉 Vacina registrada com sucesso na nuvem!");
            }

            novoForm.reset();
            
            // Recarrega os dados do servidor para atualizar o painel e a listagem
            await carregarDadosDoFirebase(onUpdate);
        } catch (error) {
            console.error("Erro ao salvar no Firestore:", error);
            alert("❌ Erro de conexão: Não foi possível salvar os dados na nuvem.");
        }
    });
}

// ==========================================================================
// 2. BUSCA DE DADOS EM TEMPO REAL NO FIREBASE
// ==========================================================================
export async function carregarDadosDoFirebase(onUpdateCallback) {
    if (!appState.usuarioLogado) return;

    try {
        // Cria uma consulta filtrando apenas as vacinas pertencentes ao usuário logado
        const q = query(
            collection(db, "vacinas"), 
            where("usuarioId", "==", appState.usuarioLogado)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Limpa a carteira local antiga para reescrevê-la com os dados frescos do servidor
        appState.carteira = [];
        
        querySnapshot.forEach((documento) => {
            appState.carteira.push({
                id: documento.id, // O ID único gerado de forma aleatória pela Google
                ...documento.data()
            });
        });

        if (onUpdateCallback) onUpdateCallback();
    } catch (error) {
        console.error("Erro ao puxar dados do Firestore:", error);
    }
}

// ==========================================================================
// 3. RENDERIZAÇÃO DA CARTEIRA DIGITAL NA TELA
// ==========================================================================
export function renderizarCarteira(onDeleteCallback) {
    const container = document.getElementById('wallet-list');
    if (!container) return;
    container.innerHTML = "";

    // Filtra localmente apenas as vacinas do dependente ativo selecionado no cabeçalho
    const perfilAtivo = appState.perfilAtual || "principal";
    const vacinasFiltradas = appState.carteira.filter(v => v.perfilId === perfilAtivo);

    if (vacinasFiltradas.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding: 2rem; color: var(--text-secondary);'>Nenhuma vacina salva para este perfil ainda.</p>";
        return;
    }

    // Desenha cada card de vacina na tela com o estilo e efeito roxo neon unificado
    vacinasFiltradas.forEach(vax => {
        const dataFormatada = new Date(vax.data + 'T00:00:00').toLocaleDateString('pt-BR');
        const card = document.createElement('div');
        card.className = "card vax-item applied";
        
        let textoProximaDose = "";
        if (vax.proximaDose) {
            const proxBr = new Date(vax.proximaDose + 'T00:00:00').toLocaleDateString('pt-BR');
            textoProximaDose = `<p style="color: #f0ad4e; font-weight: bold; font-size: 0.8125rem; margin-top: 0.25rem;">⏳ Reforço Recomendado: ${proxBr}</p>`;
        }

        card.innerHTML = `
            <div class="vax-info">
                <h4 style="color: var(--primary); font-size: 1.125rem;">${vax.nome}</h4>
                <p style="font-size: 0.875rem; margin-top: 0.25rem;">📍 Local: ${vax.local} | 📦 Lote: ${vax.lote}</p>
                <p style="font-weight: bold; color: var(--success); font-size: 0.875rem; margin-top: 0.25rem;">🗓️ Aplicada em: ${dataFormatada}</p>
                ${textoProximaDose}
            </div>
            <button class="delete-btn" data-id="${vax.id}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.25rem; width: auto; padding: 0.5rem; display: inline-block;">🗑️</button>
        `;
        
        // Mecanismo de exclusão direta do documento no servidor da Google
        card.querySelector('.delete-btn').addEventListener('click', async function() {
            if (!confirm(`Deseja realmente apagar o registro da vacina ${vax.nome} de forma permanente da nuvem?`)) return;

            try {
                // Deleta o documento específico usando o ID gerado pelo Firebase
                await deleteDoc(doc(db, "vacinas", vax.id));
                
                // Remove do estado local e redesenha a interface
                appState.carteira = appState.carteira.filter(v => v.id !== vax.id);
                renderizarCarteira(onDeleteCallback);
                
                if (onDeleteCallback) onDeleteCallback();
            } catch (error) {
                console.error("Erro ao deletar do Firestore:", error);
                alert("❌ Não foi possível excluir a vacina. Verifique sua conexão de rede.");
            }
        });

        container.appendChild(card);
    });
}
