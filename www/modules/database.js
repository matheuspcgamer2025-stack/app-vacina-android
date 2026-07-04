// Arquivo puramente local - Sem conexões externas
export const db = null;
export const auth = null;

export const appState = {
    usuarioLogado: "Ana Néri", // Nome padrão para exibir na aba lateral
    carteira: JSON.parse(localStorage.getItem('vacina_carteira')) || [
        { id: 1, nome: "BCG", lote: "B90X21", local: "UBS Central", data: "2026-01-15" },
        { id: 2, nome: "Hepatite B (1ª Dose)", lote: "H5521A", local: "Maternidade Santa Maria", data: "2026-01-15" }
    ]
};

export function salvarCarteiraNoDispositivo() {
    localStorage.setItem('vacina_carteira', JSON.stringify(appState.carteira));
}

export const CALENDARIO_SUS = [
    { 
        nome: "BCG", 
        faixa: "criança", 
        dose: "Dose Única", 
        recomendacao: "Ao nascer",
        protege: "Formas graves de Tuberculose (miliar e meníngea).",
        reacoes: "Formação de pequena cicatriz no braço direito, vermelhidão local. Não colocar produtos ou curativos.",
        via: "Injeção (Intradérmica)"
    },
    { 
        nome: "Hepatite B", 
        faixa: "criança", 
        dose: "1ª Dose", 
        recomendacao: "Ao nascer",
        protege: "Infecção no fígado causada pelo vírus da Hepatite B.",
        reacoes: "Dor e sensibilidade no local da aplicação, febre baixa nas primeiras 24 horas.",
        via: "Injeção (Intramuscular)"
    },
    { 
        nome: "Penta (DTP/HB/Hib)", 
        faixa: "criança", 
        dose: "1ª Dose", 
        recomendacao: "Aos 2 meses",
        protege: "Difteria, Tétano, Coqueluche, Hepatite B e Meningite por Hib.",
        reacoes: "Febre, irritabilidade, dor, vermelhidão e endurecimento no local. Recomendado compressa fria.",
        via: "Injeção (Intramuscular)"
    },
    { 
        nome: "Tríplice Viral", 
        faixa: "criança", 
        dose: "1ª Dose", 
        recomendacao: "Aos 12 meses",
        protege: "Sarampo, Caxumba e Rubéola.",
        reacoes: "Febre baixa que pode surgir de 5 a 12 dias após a aplicação, manchas vermelhas leves na pele.",
        via: "Injeção (Subcutânea)"
    },
    { 
        nome: "Influenza (Gripe)", 
        faixa: "idoso", 
        dose: "Anual", 
        recomendacao: "Campanha anual",
        protege: "Principais cepas circulantes do vírus do Influenza.",
        reacoes: "Dor leve no braço, mal-estar passageiro. O vírus é morto, então não causa gripe.",
        via: "Injeção (Intramuscular)"
    }
];
