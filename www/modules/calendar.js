import { CALENDARIO_SUS, appState } from './database.js';
import { registrarVacinaPeloCalendario, carregarDadosDoFirebase } from './wallet.js';
import { obterPerfilAtivo, formatarIdadeHumana } from './profile.js';
import { avaliarStatusVacina } from './schedule.js';
import { appConfirm } from './dialogs.js';

let faixaEtariaAtual = 'criança'; // Guarda a aba ativa para o filtro secundário da busca

export function filtrarCalendario(categoria) {
    faixaEtariaAtual = categoria;
    
    // Atualiza o estado visual das abas de idade
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const textoBotao = btn.innerText.toLowerCase();
        textoBotao === categoria ? btn.classList.add('active') : btn.classList.remove('active');
    });

    renderizarListaFiltrada("");
}

// Nova função interna que desenha as vacinas com base na idade ou no texto pesquisado
function renderizarListaFiltrada(textoPesquisa) {
    const container = document.getElementById('calendar-list');
    if (!container) return;
    container.innerHTML = "";

    const perfilAtivo = appState.perfilAtual || 'principal';
    const perfilInfo = obterPerfilAtivo(perfilAtivo);
    const carteiraPerfil = appState.carteira.filter(v => (v.perfilId || 'principal') === perfilAtivo);

    // Filtra: se houver pesquisa ativa, busca no banco todo, senão filtra por idade
    const filtradas = CALENDARIO_SUS.filter(vax => {
        if (textoPesquisa !== "") {
            return vax.nome.toLowerCase().includes(textoPesquisa);
        }
        return vax.faixa === faixaEtariaAtual;
    });

    if (filtradas.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding: 20px; color:#888;'>Nenhuma vacina encontrada.</p>";
        return;
    }

    filtradas.forEach((vax, index) => {
        const status = avaliarStatusVacina(vax, carteiraPerfil, perfilInfo.dataNascimento);
        const jaTomou = status.tomada;

        let corStatus = '#f0ad4e';
        if (status.status === 'tomada') corStatus = 'var(--success)';
        if (status.status === 'hoje') corStatus = '#0275d8';
        if (status.status === 'atrasada') corStatus = 'var(--danger)';

        const classeAtrasada = status.status === 'atrasada' ? 'overdue' : '';
        const marcadorAgendamento = status.dataAlvoBr
            ? (status.status === 'agendada' ? `Faltam ${status.diasParaDataAlvo} dias` : `Agendada para ${status.dataAlvoBr}`)
            : `Recomendado: ${vax.recomendacao}`;
        const resumoPerfil = perfilInfo?.dataNascimento
            ? `Perfil: ${perfilInfo.nome} (${formatarIdadeHumana(perfilInfo.dataNascimento)})`
            : `Perfil: ${perfilInfo.nome} (cadastre a data de nascimento para cálculo exato)`;
        
        const card = document.createElement('div');
        card.className = `card accordion-card vax-item ${jaTomou ? 'applied' : 'pending'} ${classeAtrasada}`;
        card.style.cursor = "pointer";
        card.style.marginBottom = "10px";
        
        // Estrutura do card com cabeçalho compacto e bloco interno de detalhes (hidden)
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div class="vax-info" style="flex:1;">
                    <h4 style="margin:0; font-size:16px;">${vax.nome}</h4>
                    <p style="margin:2px 0 0 0; font-size:13px; color:var(--text-secondary);">${vax.dose} | ${marcadorAgendamento}</p>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="status-tag" style="font-size:12px; font-weight:bold; color: ${corStatus}">
                        ${status.status === 'tomada' ? 'Tomada ✔️' : status.status === 'atrasada' ? 'Dose Atrasada ⚠️' : status.status === 'hoje' ? 'Vacina de Hoje 🚨' : 'Pendente ⏳'}
                    </span>
                    <span class="seta-calendario-${index}" style="font-size:12px; color:var(--text-secondary);">▼</span>
                </div>
            </div>
            
            <!-- Bloco de Informações Ocultas (Será exibido via Clique) -->
            <div id="detalhe-vax-${index}" class="hidden" style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border-color); font-size:13px; line-height:1.4; text-align:left;">
                <p>👤 <strong>${resumoPerfil}</strong></p>
                <p>🛡️ <strong>O que protege:</strong> ${vax.protege}</p>
                <p style="margin-top:4px;">📍 <strong>Via de Aplicação:</strong> ${vax.via}</p>
                <p style="margin-top:4px; color:#c9302c;">⚠️ <strong>Reações comuns:</strong> ${vax.reacoes}</p>
                ${status.dataAlvoBr ? `<p style="margin-top:4px;"><strong>📅 Data Alvo Calculada:</strong> ${status.dataAlvoBr}</p>` : ''}
                ${status.status === 'agendada' ? `<p style="margin-top:4px; color:#0275d8;"><strong>⏱️ Faltam ${status.diasParaDataAlvo} dias.</strong></p>` : ''}
                ${status.status === 'atrasada' ? `<p style="margin-top:4px; color:var(--danger); font-weight:bold;">⚠️ Vacina com atraso de ${status.diasAtraso} dias.</p>` : ''}
                
                ${!jaTomou ? `<button class="btn-ja-tomei" data-nome="${vax.nome}" style="margin-top:10px; padding:6px; font-size:12px; background:var(--success); color:white; border-radius:5px; width:auto; display:inline-block;">🚀 Já tomei esta vacina</button>` : ''}
            </div>
        `;

        // EVENTO 1: Mecanismo de Expansão (Acordeão) ao clicar no Card
        card.addEventListener('click', (e) => {
            // Impede a abertura caso o usuário clique diretamente no botão interno "Já Tomei"
            if (e.target.classList.contains('btn-ja-tomei')) return;

            const detalhe = document.getElementById(`detalhe-vax-${index}`);
            const seta = card.querySelector(`.seta-calendario-${index}`);
            if (detalhe) {
                const escondido = detalhe.classList.contains('hidden');
                detalhe.classList.toggle('hidden');
                if (seta) seta.style.transform = escondido ? "rotate(180deg)" : "rotate(0deg)";
            }
        });

        // EVENTO 2: Atalho inteligente "Já Tomei"
        const btnTomei = card.querySelector('.btn-ja-tomei');
        if (btnTomei) {
            btnTomei.addEventListener('click', async () => {
                const nomeVacina = btnTomei.getAttribute('data-nome');
                if (!nomeVacina) return;

                const confirmarRegistro = await appConfirm(`Registrar "${nomeVacina}" como aplicada no perfil atual?`, {
                    titulo: 'Registrar vacina',
                    textoConfirmar: 'Registrar',
                    textoCancelar: 'Cancelar',
                    tipo: 'warning'
                });

                if (!confirmarRegistro) {
                    return;
                }

                btnTomei.disabled = true;
                btnTomei.textContent = 'Salvando...';

                try {
                    await registrarVacinaPeloCalendario({ nome: nomeVacina });
                    await carregarDadosDoFirebase();
                    renderizarListaFiltrada('');
                    alert('✅ Vacina registrada com sucesso e enviada para o Histórico Oficial na Carteira.');

                    const botaoAbaCarteira = document.querySelectorAll('.bottom-nav .nav-item')[2];
                    if (window.mudarAba && botaoAbaCarteira) {
                        window.mudarAba('wallet', botaoAbaCarteira);
                    }
                } catch (error) {
                    console.error('Erro no registro rápido pelo calendário:', error);
                    alert(`❌ Não foi possível registrar a vacina. ${error?.message || 'Tente novamente.'}`);
                } finally {
                    btnTomei.disabled = false;
                    btnTomei.textContent = '🚀 Já tomei esta vacina';
                }
            });
        }

        container.appendChild(card);
    });
}

// Configura o escutador da Barra de Pesquisa de vacinas
document.addEventListener('DOMContentLoaded', () => {
    const inputBusca = document.getElementById('input-busca-calendario');
    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            const texto = e.target.value.trim().toLowerCase();
            renderizarListaFiltrada(texto);
        });
    }
});

// Vincula a função interna à janela global para o input do HTML continuar funcionando
window.renderizarListaFiltrada = renderizarListaFiltrada;


