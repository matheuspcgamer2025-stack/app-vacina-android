import { db, appState, auth, CALENDARIO_SUS } from './database.js';
import { calcularIntervaloDose } from './features.js';
// CORREÇÃO DA IMPORTAÇÃO: Usando a URL completa oficial da Google sem cortes
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

function listarVacinasUnicas() {
    const nomes = new Set();
    CALENDARIO_SUS.forEach(vax => {
        if (vax?.nome) nomes.add(vax.nome);
    });
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function preencherSelectVacinas(selectEl) {
    if (!selectEl) return;

    const valorAnterior = selectEl.value;
    selectEl.innerHTML = '<option value="" disabled selected>Escolha a Vacina...</option>';

    listarVacinasUnicas().forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        selectEl.appendChild(option);
    });

    if (valorAnterior && Array.from(selectEl.options).some(op => op.value === valorAnterior)) {
        selectEl.value = valorAnterior;
    }
}

async function salvarRegistroVacina({ nome, lote, local, data, perfilId }) {
    const proximaDoseCalculada = calcularIntervaloDose(nome, data);
    const emailAtual = auth.currentUser?.email || null;
    const uidAtual = auth.currentUser?.uid || null;

    const novaVacina = {
        usuarioId: emailAtual || appState.usuarioLogado || 'anonimo',
        usuarioUid: uidAtual,
        perfilId: perfilId || appState.perfilAtual || 'principal',
        nome,
        lote,
        local,
        data,
        proximaDose: proximaDoseCalculada || null,
        dataRegistro: new Date().toISOString()
    };

    await addDoc(collection(db, 'vacinas'), novaVacina);
    return { proximaDoseCalculada };
}

export async function registrarVacinaPeloCalendario(vacina) {
    const hoje = new Date().toISOString().split('T')[0];
    const nome = String(vacina?.nome || '').trim();
    if (!nome) {
        throw new Error('Nome da vacina inválido para registro rápido.');
    }

    const dataAplicada = vacina?.dataAplicada || hoje;
    await salvarRegistroVacina({
        nome,
        lote: `AUTO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        local: 'Registro rápido no calendário',
        data: dataAplicada,
        perfilId: appState.perfilAtual || 'principal'
    });
}


// ==========================================================================
// 1. CONFIGURAÇÃO E ENVIO DE REGISTROS PARA A NUVEM
// ==========================================================================
export function configurarFormularioCarteira(onUpdate) {
    const form = document.getElementById('wallet-form');
    
    // Remove ouvintes duplicados para evitar envios repetidos na nuvem
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);

    const selectVacina = document.getElementById('vax-nome');
    preencherSelectVacinas(selectVacina);

    novoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nomeSelecionado = document.getElementById('vax-nome').value;
        const dataOriginal = document.getElementById('vax-data').value;
        
        const lote = document.getElementById('vax-lote').value.trim();
        const local = document.getElementById('vax-local').value.trim();

        try {
            const { proximaDoseCalculada } = await salvarRegistroVacina({
                nome: nomeSelecionado,
                lote,
                local,
                data: dataOriginal,
                perfilId: appState.perfilAtual || 'principal'
            });

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
            const codigo = error?.code || '';
            const mensagem = error?.message || 'sem detalhe';

            if (codigo === 'permission-denied') {
                alert('❌ Sem permissão para salvar no Firestore. Faça login novamente com Google para renovar a sessão.');
                return;
            }

            if (codigo === 'unauthenticated') {
                alert('❌ Sessão inválida no Firebase. Entre novamente para salvar na nuvem.');
                return;
            }

            if (codigo === 'unavailable') {
                alert('❌ Firestore indisponível no momento. Verifique a conexão e tente novamente.');
                return;
            }

            alert(`❌ Erro ao salvar na nuvem. Código: ${codigo || 'desconhecido'}. Detalhe: ${mensagem}`);
        }
    });
}

// ==========================================================================
// 2. BUSCA DE DADOS EM TEMPO REAL NO FIREBASE
// ==========================================================================
export async function carregarDadosDoFirebase(onUpdateCallback) {
    if (!appState.usuarioLogado) return;

    try {
        const uidAtual = auth.currentUser?.uid || null;
        const identificadores = Array.isArray(appState.identificadoresUsuario)
            ? appState.identificadoresUsuario.filter(Boolean)
            : [];

        const idsConsulta = Array.from(new Set([
            appState.usuarioLogado,
            ...identificadores
        ].filter(Boolean))).slice(0, 10);

        if (idsConsulta.length === 0) return;

        // Compatibilidade: prioriza UID atual e complementa por identificadores legados
        const consultas = [];
        if (uidAtual) {
            consultas.push(getDocs(query(collection(db, "vacinas"), where("usuarioUid", "==", uidAtual))));
        }

        consultas.push(
            getDocs(
                idsConsulta.length === 1
                    ? query(collection(db, "vacinas"), where("usuarioId", "==", idsConsulta[0]))
                    : query(collection(db, "vacinas"), where("usuarioId", "in", idsConsulta))
            )
        );

        const snapshots = await Promise.all(consultas);
        
        // Limpa a carteira local antiga para reescrevê-la com os dados frescos do servidor
        appState.carteira = [];
        const idsAdicionados = new Set();
        
        snapshots.forEach((querySnapshot) => {
            querySnapshot.forEach((documento) => {
                if (idsAdicionados.has(documento.id)) return;
                idsAdicionados.add(documento.id);

                appState.carteira.push({
                    id: documento.id, // O ID único gerado de forma aleatória pela Google
                    ...documento.data()
                });
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

    // Adiciona o botão flutuante de compartilhamento ao final da carteira
    if (vacinasFiltradas.length > 0) {
        const botaoCompartilhar = document.createElement('button');
        botaoCompartilhar.className = 'btn-share-history';
        botaoCompartilhar.innerHTML = '📤 Compartilhar Histórico';
        botaoCompartilhar.style.cssText = `
            display: block;
            margin: 1.5rem auto 0;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, var(--primary), #8e44ad);
            color: white;
            border: none;
            border-radius: 2rem;
            font-weight: bold;
            cursor: pointer;
            font-size: 0.9375rem;
            box-shadow: 0 4px 15px rgba(155, 89, 182, 0.4);
            transition: all 0.3s ease;
        `;
        botaoCompartilhar.addEventListener('mouseover', () => {
            botaoCompartilhar.style.transform = 'scale(1.05)';
            botaoCompartilhar.style.boxShadow = '0 6px 20px rgba(155, 89, 182, 0.6)';
        });
        botaoCompartilhar.addEventListener('mouseout', () => {
            botaoCompartilhar.style.transform = 'scale(1)';
            botaoCompartilhar.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.4)';
        });
        botaoCompartilhar.addEventListener('click', () => compartilharHistoricoVacinas());
        container.appendChild(botaoCompartilhar);
    }
}

// ==========================================================================
// 4. COMPARTILHAMENTO NATIVO DO HISTÓRICO DE VACINAS (WEB SHARE API)
// ==========================================================================
export async function compartilharHistoricoVacinas() {
    const perfilAtivo = appState.perfilAtual || "principal";
    const vacinasFiltradas = appState.carteira.filter(v => v.perfilId === perfilAtivo);

    if (vacinasFiltradas.length === 0) {
        alert("⚠️ Nenhuma vacina para compartilhar!");
        return;
    }

    try {
        // Gera o PDF com o histórico
        const pdfBlob = await gerarPDFHistorico(vacinasFiltradas);
        const arquivo = new File([pdfBlob], "Historico_Vacinacao.pdf", { type: "application/pdf" });

        // Verifica se o navegador suporta Web Share API
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
            // Compartilha usando a API nativa do Android
            await navigator.share({
                title: "VacinaApp - Histórico de Vacinação",
                text: "Veja meu histórico completo de vacinas",
                files: [arquivo]
            });
            console.log("✅ Compartilhado com sucesso!");
        } else {
            // Fallback: Download do PDF se não suportar compartilhamento
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = "Historico_Vacinacao.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            alert("✅ PDF baixado com sucesso! Você pode compartilhá-lo agora.");
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Erro ao compartilhar:", error);
            alert("❌ Erro ao gerar o PDF. Tente novamente.");
        }
    }
}

// ==========================================================================
// 5. GERAÇÃO DO PDF COM HTML2PDF
// ==========================================================================
function gerarPDFHistorico(vacinasFiltradas) {
    // Cria o HTML estruturado do PDF
    const htmlConteudo = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: white;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #9b59b6;
                        padding-bottom: 15px;
                    }
                    .logo {
                        font-size: 28px;
                        font-weight: bold;
                        color: #9b59b6;
                        margin-bottom: 10px;
                    }
                    .subtitle {
                        color: #666;
                        font-size: 14px;
                        margin-bottom: 5px;
                    }
                    .timestamp {
                        color: #999;
                        font-size: 12px;
                    }
                    .vacina-card {
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                        background: #f9f9f9;
                    }
                    .vacina-nome {
                        font-size: 16px;
                        font-weight: bold;
                        color: #9b59b6;
                        margin-bottom: 8px;
                    }
                    .vacina-info {
                        font-size: 13px;
                        line-height: 1.6;
                        color: #555;
                    }
                    .info-linha {
                        margin-bottom: 5px;
                    }
                    .reforco {
                        color: #f0ad4e;
                        font-weight: bold;
                        background: #fffbf0;
                        padding: 8px;
                        border-radius: 5px;
                        margin-top: 8px;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 2px solid #e0e0e0;
                        text-align: center;
                        font-size: 11px;
                        color: #999;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">💉 VacinaApp</div>
                    <div class="subtitle">Histórico Digital de Vacinação</div>
                    <div class="timestamp">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
                </div>

                <div class="vacinas-container">
                    ${vacinasFiltradas.map(vax => {
                        const dataFormatada = new Date(vax.data + 'T00:00:00').toLocaleDateString('pt-BR');
                        let reforcoHtml = '';
                        if (vax.proximaDose) {
                            const proxBr = new Date(vax.proximaDose + 'T00:00:00').toLocaleDateString('pt-BR');
                            reforcoHtml = `<div class="reforco">⏳ Reforço Recomendado: ${proxBr}</div>`;
                        }
                        return `
                            <div class="vacina-card">
                                <div class="vacina-nome">${vax.nome}</div>
                                <div class="vacina-info">
                                    <div class="info-linha"><strong>📅 Data:</strong> ${dataFormatada}</div>
                                    <div class="info-linha"><strong>📍 Local:</strong> ${vax.local}</div>
                                    <div class="info-linha"><strong>📦 Lote:</strong> ${vax.lote}</div>
                                </div>
                                ${reforcoHtml}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="footer">
                    <p>Este documento foi gerado automaticamente pelo VacinaApp.</p>
                    <p>Compartilhe este PDF com profissionais de saúde quando necessário.</p>
                </div>
            </body>
        </html>
    `;

    // Converte HTML para Blob usando html2pdf (via callback)
    return new Promise((resolve) => {
        const element = document.createElement('div');
        element.innerHTML = htmlConteudo.match(/<body>[\s\S]*<\/body>/)[0].replace(/<\/?body>/g, '');
        
        const opt = {
            margin: 5,
            filename: 'Histórico_Vacinação.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };

        html2pdf()
            .set(opt)
            .from(element)
            .outputPdf('blob')
            .then(pdf => resolve(pdf));
    }).catch(() => {
        // Fallback se html2pdf não funcionar
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return canvas.toBlob(blob => blob);
    });
}
