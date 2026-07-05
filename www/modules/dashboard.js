import { CALENDARIO_SUS, appState } from './database.js';

export function inicializarDashboard() {
    // ==========================================
    // 1. CÁLCULO DE PROGRESSO DA CARTEIRA
    // ==========================================
    const totalExigido = CALENDARIO_SUS.length;
    const totalTomado = appState.carteira.length;
    const porcentagem = Math.min(Math.round((totalTomado / totalExigido) * 100), 100);

    const progBar = document.getElementById('dashboard-progress');
    const progText = document.getElementById('dashboard-text');
    if (progBar) {
        progBar.style.width = `${porcentagem}%`;
        progBar.innerText = `${porcentagem}%`;
    }
    if (progText) progText.innerHTML = `Você registrou <strong>${totalTomado} vacinas</strong> no seu histórico oficial.`;

    // ==========================================
    // 2. CONTEÚDO: CAMPANHAS ATIVAS (2026)
    // ==========================================
    const containerCampanhas = document.getElementById('dashboard-campaigns-list');
    if (containerCampanhas) {
        containerCampanhas.innerHTML = `
            <div style="margin-bottom: 0.75rem;">
                <p style="font-weight: bold; color: #0275d8;">💉 Campanha Nacional de Vacinação contra Influenza</p>
                <p style="font-size: 0.875rem; margin-top: 0.25rem;"><strong>Vigência:</strong> Abril a Julho de 2026.</p>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">Meta estipulada pelo Ministério da Saúde para cobrir 90% dos grupos prioritários locais.</p>
            </div>
            <div style="border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
                <p style="font-weight: bold; color: #5cb85c;">🛡️ Atualização vacinal contra Covid-19 (XBB)</p>
                <p style="font-size: 0.875rem; margin-top: 0.25rem;"><strong>Vigência:</strong> Cronograma contínuo de 2026.</p>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">Doses de reforço direcionadas para idosos acima de 60 anos e imunocomprometidos.</p>
            </div>
        `;
    }

    // ==========================================
    // 3. CONTEÚDO: SURTOS REGIONAIS (BOLETIM DATADO)
    // ==========================================
    const containerSurtos = document.getElementById('dashboard-outbreaks-list');
    if (containerSurtos) {
        containerSurtos.innerHTML = `
            <div style="background: rgba(217, 83, 79, 0.08); padding: 0.75rem; border-radius: 0.5rem; border-left: 4px solid var(--danger);">
                <p style="font-weight: bold; color: var(--danger); font-size: 0.875rem;">🚨 Monitoramento Técnico de Arboviroses</p>
                <p style="font-size: 0.8125rem; color: var(--text-primary); margin-top: 0.25rem;"><strong>Boletim de Julho de 2026:</strong> O Ceará registra estabilização nos focos de calor epidêmicos após mutirões locais. Mantenha os cuidados domésticos.</p>
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.8125rem;">
                <p><strong>🌐 Alerta Internacional:</strong> Organizações de saúde pública reforçam a vigilância sobre síndromes respiratórias sazonais de inverno.</p>
            </div>
        `;
    }

    // ==========================================
    // 4. CONTEÚDO: CALENDÁRIO DE REFORÇOS DE LONGO PRAZO
    // ==========================================
    const containerValidade = document.getElementById('dashboard-expirations-list');
    if (containerValidade) {
        const tomouTetano = appState.carteira.find(v => v.nome.toLowerCase().includes("dupla") || v.nome.toLowerCase().includes("tétano"));
        
        let blocoTetano = `<p style="color: #f0ad4e; font-weight: bold;">⚠️ Dupla Adulto (dT - Tétano/Difteria): Alerta de Dose Ausente</p>
                           <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">Não identificamos esse registro. Essa vacina exige um reforço obrigatório a cada 10 anos.</p>`;
        
        if (tomouTetano) {
            const anoAplicacao = new Date(tomouTetano.data).getFullYear();
            const anoReforco = anoAplicacao + 10;
            blocoTetano = `<p style="color: var(--success); font-weight: bold;">✔️ Dupla Adulto (dT - Tétano/Difteria): Registrada</p>
                           <p style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">Sua aplicação foi identificada. O seu próximo reforço decenal deverá ocorrer no ano de <strong>${anoReforco}</strong>.</p>`;
        }

        containerValidade.innerHTML = `
            <div>${blocoTetano}</div>
            <div style="border-top: 1px dashed var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem; font-size: 0.8125rem;">
                <p><strong>⏳ Febre Amarela:</strong> Dose única válida por toda a vida para viajantes e residentes de zonas de recomendação do SUS.</p>
            </div>
        `;
    }

    // ==========================================
    // 5. CONTEÚDO: METRICAS DA SAÚDE FAMILIAR
    // ==========================================
    const containerFamilia = document.getElementById('dashboard-family-list');
    if (containerFamilia) {
        const dependentes = JSON.parse(localStorage.getItem('app_dependentes')) || [];
        const totalPerfis = dependentes.length + 1;
        
        containerFamilia.innerHTML = `
            <p style="font-size: 0.875rem;">👥 <strong>Perfis cadastrados no app:</strong> ${totalPerfis} (${dependentes.length} dependentes ativos)</p>
            <p style="font-size: 0.875rem; margin-top: 0.25rem;">📊 <strong>Doses totais aplicadas na casa:</strong> ${totalTomado} registros salvos.</p>
            <div style="margin-top: 0.5rem; background: var(--bg-app); padding: 0.5rem; border-radius: 0.375rem; font-size: 0.8125rem; color: var(--text-secondary);">
                💡 Dica: Mude o perfil na aba 'Carteira' para gerenciar e exportar individualmente o PDF de cada dependente.
            </div>
        `;
    }

    // ==========================================
    // 6. CONTEÚDO: CENTRAL DE COMBATE A FAKE NEWS
    // ==========================================
    const containerFakeNews = document.getElementById('dashboard-fakenews-list');
    if (containerFakeNews) {
        containerFakeNews.innerHTML = `
            <div style="background: var(--bg-app); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                <p style="font-weight: bold; color: var(--danger); font-size: 0.875rem;">❌ BOATO: "As vacinas em módulos causam efeitos adversos severos ocultados"</p>
                <p style="font-size: 0.8125rem; color: var(--text-primary); margin-top: 0.25rem;"><strong>🟢 FATO:</strong> Mentira. Todas as vacinas disponibilizadas passam por fases rigorosas de testagem internacional e monitoramento contínuo pela ANVISA, garantindo que os efeitos sejam raros, leves e temporários (como vermelhidão local).</p>
            </div>
            <div style="background: var(--bg-app); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem;">
                <p style="font-weight: bold; color: var(--danger); font-size: 0.875rem;">❌ BOATO: "A vacina da gripe causa a própria gripe"</p>
                <p style="font-size: 0.8125rem; color: var(--text-primary); margin-top: 0.25rem;"><strong>🟢 FATO:</strong> Falso. A vacina distribuída no SUS é feita com vírus completamente fragmentado e inativado (morto). É biologicamente impossível ela induzir a infecção.</p>
            </div>
            <div style="background: var(--bg-app); padding: 0.75rem; border-radius: 0.5rem;">
                <p style="font-weight: bold; color: var(--danger); font-size: 0.875rem;">❌ BOATO: "Mercúrio e substâncias tóxicas são injetados nas doses"</p>
                <p style="font-size: 0.8125rem; color: var(--text-primary); margin-top: 0.25rem;"><strong>🟢 FATO:</strong> Desinformação. Os conservantes utilizados servem estritamente para manter a esterilidade dos frascos e são microdosagens totalmente seguras e controladas para o corpo humano.</p>
            </div>
        `;
    }

    // ==========================================
    // 7. CONTEÚDO: PRÓXIMAS DOSES FIXO (MANTIDO)
    // ==========================================
    const alertasContainer = document.getElementById('dashboard-alerts-list');
    if (alertasContainer) {
        alertasContainer.innerHTML = "";
        const jaTomadasNomes = appState.carteira.map(v => v.nome.toLowerCase());
        const pendentes = CALENDARIO_SUS.filter(v => !jaTomadasNomes.some(j => j.includes(v.nome.toLowerCase()))).slice(0, 2);

        if (pendentes.length === 0) {
            alertasContainer.innerHTML = "<li>🎉 Parabéns! Nenhuma vacina pendente no momento.</li>";
        } else {
            pendentes.forEach(p => {
                alertasContainer.innerHTML += `<li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); font-size: 0.875rem;">📌 <strong>${p.nome}</strong> (${p.dose}) - Recomendado: ${p.recomendacao}</li>`;
            });
        }
    }

    // ==========================================
    // 8. INTERAÇÃO DINÂMICA: MOTOR DO ACORDEÃO
    // ==========================================
    document.querySelectorAll('.accordion-card').forEach(card => {
        // Remove ouvintes duplicados caso a função rode mais de uma vez
        const novoCard = card.cloneNode(true);
        card.parentNode.replaceChild(novoCard, card);

        novoCard.addEventListener('click', () => {
            const targetId = novoCard.getAttribute('data-target');
            const conteudo = document.getElementById(targetId);

            if (conteudo) {
                const estaEscondido = conteudo.classList.contains('hidden');
                
                // Fecha todos os outros blocos primeiro
                document.querySelectorAll('.accordion-content').forEach(c => {
                    c.classList.add('hidden');
                });
                
                document.querySelectorAll('.accordion-card').forEach(box => {
                    box.classList.remove('open');
                });

                // Se estava fechado, abre apenas o clicado
                if (estaEscondido) {
                    conteudo.classList.remove('hidden');
                    novoCard.classList.add('open');
                }
            }
        });
    });
}
