/* ==========================================================================
   CONFIGURAÇÃO OFICIAL DO BACKEND (FIREBASE CLOUD - REVISADO)
   ========================================================================== */
import { initializeApp } from "https://gstatic.com";
import { getFirestore } from "https://gstatic.com";
import { getAuth } from "https://gstatic.com";

// Suas chaves oficiais do console ajustadas e sem cortes de texto
const firebaseConfig = {
    apiKey: "AIzaSyCYSzG4PPzs9w-PT195VZKp2MvYdyX0Puc",
    authDomain: "vacinaapp-2cca0.firebaseapp.com",
    projectId: "vacinaapp-2cca0",
    storageBucket: "vacinaapp-2cca0.firebasestorage.app",
    messagingSenderId: "317556925550",
    appId: "1:317556925550:web:0c1ed36f43cca960dcf27f"
};

// Inicializa os serviços em nuvem de forma definitiva
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Estado global do aplicativo conectado à nuvem (Obrigatório para o app.js)
export const appState = {
    usuarioLogado: null, 
    perfilAtual: "principal", 
    carteira: [] 
};

// Lista de vacinas do SUS totalmente organizada e limpa
export const CALENDARIO_SUS = [
    { 
        nome: "BCG", 
        faixa: "criança", 
        dose: "Dose Única", 
        recomendacao: "Ao nascer", 
        protege: "Formas graves de Tuberculose.", 
        reacoes: "Formação de pequena cicatriz no braço direito.", 
        via: "Injeção (Intradérmica)" 
    },
    { 
        nome: "Hepatite B", 
        faixa: "criança", 
        dose: "1ª Dose", 
        recomendacao: "Ao nascer", 
        protege: "Infecção no fígado.", 
        reacoes: "Dor local, febre baixa nas primeiras 24h.", 
        via: "Injeção (Intramuscular)" 
    },
    { 
        nome: "Penta (DTP/HB/Hib)", 
        faixa: "criança", 
        dose: "1ª Dose", 
        recomendacao: "Aos 2 meses", 
        protege: "Difteria, Tétano, Coqueluche, Hepatite B e Meningite por Hib.", 
        reacoes: "Febre, irritabilidade, dor e endurecimento local.", 
        via: "Injeção (Intramuscular)" 
    },
    { 
        nome: "Tríplice Viral", 
        faixa: "criança", 
        dose: "1ª Dose", 
        recomendacao: "Aos 12 meses", 
        protege: "Sarampo, Caxumba e Rubéola.", 
        reacoes: "Febre baixa que pode surgir de 5 a 12 dias após.", 
        via: "Injeção (Subcutânea)" 
    },
    { 
        nome: "Influenza (Gripe)", 
        faixa: "idoso", 
        dose: "Anual", 
        recomendacao: "Campanha anual", 
        protege: "Principais cepas circulantes do vírus Influenza.", 
        reacoes: "Dor leve no braço, mal-estar passageiro.", 
        via: "Injeção (Intramuscular)" 
    }
];
