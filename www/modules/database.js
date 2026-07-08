/* ==========================================================================
   CONFIGURAÇÃO OFICIAL DO BACKEND (FIREBASE CLOUD - REVISADO)
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

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

// EXPORTAÇÃO DAS FUNÇÕES DE AUTENTICAÇÃO PARA OS OUTROS MÓDULOS
export { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup
};

// Estado global do aplicativo conectado à nuvem (Obrigatório para o app.js)
export const appState = {
    usuarioLogado: null, 
    identificadoresUsuario: [],
    perfilAtual: "principal", 
    carteira: [] 
};

// Lista de vacinas do SUS totalmente organizada e limpa
export const CALENDARIO_SUS = [
    { nome: "BCG", faixa: "criança", dose: "Dose única", recomendacao: "Ao nascer", protege: "Formas graves de tuberculose", reacoes: "Cicatriz local, vermelhidão", via: "Intradérmica" },
    { nome: "Hepatite B", faixa: "criança", dose: "Ao nascer", recomendacao: "Primeiras 12 horas de vida", protege: "Hepatite B", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "Hepatite B", faixa: "criança", dose: "2ª e 3ª doses", recomendacao: "2 e 6 meses (esquema com penta)", protege: "Hepatite B", reacoes: "Dor local e febre", via: "Intramuscular" },
    { nome: "Pentavalente (DTP/HB/Hib)", faixa: "criança", dose: "1ª, 2ª, 3ª doses", recomendacao: "2, 4 e 6 meses", protege: "Difteria, tétano, coqueluche, hepatite B e Hib", reacoes: "Dor local, febre e irritabilidade", via: "Intramuscular" },
    { nome: "Poliomielite VIP", faixa: "criança", dose: "1ª, 2ª, 3ª doses", recomendacao: "2, 4 e 6 meses", protege: "Poliomielite", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "Poliomielite VOP", faixa: "criança", dose: "Reforços", recomendacao: "15 meses e 4 anos", protege: "Poliomielite", reacoes: "Eventos leves gastrointestinais", via: "Oral" },
    { nome: "Rotavírus Humano", faixa: "criança", dose: "1ª e 2ª doses", recomendacao: "2 e 4 meses", protege: "Diarreia por rotavírus", reacoes: "Irritabilidade e desconforto gastrointestinal", via: "Oral" },
    { nome: "Pneumocócica 10-valente", faixa: "criança", dose: "1ª, 2ª e reforço", recomendacao: "2, 4 e 12 meses", protege: "Otite, pneumonia e meningite", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "Meningocócica C", faixa: "criança", dose: "1ª, 2ª e reforço", recomendacao: "3, 5 e 12 meses", protege: "Meningite e meningococcemia C", reacoes: "Dor local, sonolência, febre", via: "Intramuscular" },
    { nome: "Meningocócica ACWY", faixa: "criança", dose: "Reforço", recomendacao: "12 meses (conforme cenário local)", protege: "Meningite por A, C, W e Y", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "Febre Amarela", faixa: "criança", dose: "1ª dose", recomendacao: "9 meses", protege: "Febre amarela", reacoes: "Dor local, cefaleia e febre", via: "Subcutânea" },
    { nome: "Febre Amarela", faixa: "criança", dose: "Reforço", recomendacao: "4 anos", protege: "Febre amarela", reacoes: "Dor local e febre", via: "Subcutânea" },
    { nome: "Tríplice Viral", faixa: "criança", dose: "1ª dose", recomendacao: "12 meses", protege: "Sarampo, caxumba e rubéola", reacoes: "Febre e exantema leve", via: "Subcutânea" },
    { nome: "Tetraviral", faixa: "criança", dose: "2ª dose de SCR + varicela", recomendacao: "15 meses", protege: "Sarampo, caxumba, rubéola e varicela", reacoes: "Febre e dor local", via: "Subcutânea" },
    { nome: "Hepatite A", faixa: "criança", dose: "Dose única", recomendacao: "15 meses", protege: "Hepatite A", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "DTP (tríplice bacteriana)", faixa: "criança", dose: "1º e 2º reforços", recomendacao: "15 meses e 4 anos", protege: "Difteria, tétano e coqueluche", reacoes: "Febre, dor local e irritabilidade", via: "Intramuscular" },
    { nome: "Varicela", faixa: "criança", dose: "Reforço", recomendacao: "4 anos", protege: "Catapora", reacoes: "Febre leve e dor local", via: "Subcutânea" },

    { nome: "HPV quadrivalente", faixa: "adolescente", dose: "2 doses", recomendacao: "9 a 14 anos", protege: "HPV e cânceres relacionados", reacoes: "Dor local, tontura, mal-estar", via: "Intramuscular" },
    { nome: "Meningocócica ACWY", faixa: "adolescente", dose: "Dose única ou reforço", recomendacao: "11 a 14 anos", protege: "Meningites por A, C, W e Y", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "dT (dupla adulto)", faixa: "adolescente", dose: "Esquema básico e reforço", recomendacao: "Atualização conforme caderneta", protege: "Difteria e tétano", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "Hepatite B", faixa: "adolescente", dose: "3 doses (se esquema incompleto)", recomendacao: "Conferir caderneta", protege: "Hepatite B", reacoes: "Dor local e fadiga leve", via: "Intramuscular" },
    { nome: "Tríplice Viral", faixa: "adolescente", dose: "2 doses", recomendacao: "Não vacinados ou esquema incompleto", protege: "Sarampo, caxumba e rubéola", reacoes: "Febre e dor local", via: "Subcutânea" },
    { nome: "Febre Amarela", faixa: "adolescente", dose: "Dose única", recomendacao: "Conforme situação vacinal", protege: "Febre amarela", reacoes: "Febre baixa e dor local", via: "Subcutânea" },

    { nome: "dT (dupla adulto)", faixa: "adulto", dose: "Reforço a cada 10 anos", recomendacao: "A partir dos 20 anos", protege: "Difteria e tétano", reacoes: "Dor local e mal-estar leve", via: "Intramuscular" },
    { nome: "Hepatite B", faixa: "adulto", dose: "3 doses", recomendacao: "Não vacinados", protege: "Hepatite B", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "Tríplice Viral", faixa: "adulto", dose: "1 ou 2 doses", recomendacao: "Conforme faixa etária e esquema prévio", protege: "Sarampo, caxumba e rubéola", reacoes: "Febre, dor local", via: "Subcutânea" },
    { nome: "Febre Amarela", faixa: "adulto", dose: "Dose única", recomendacao: "Residentes e viajantes para área de risco", protege: "Febre amarela", reacoes: "Cefaleia e dor local", via: "Subcutânea" },
    { nome: "Influenza (Gripe)", faixa: "adulto", dose: "Anual", recomendacao: "Grupos prioritários e campanhas", protege: "Complicações por influenza", reacoes: "Dor local e mialgia leve", via: "Intramuscular" },
    { nome: "Covid-19", faixa: "adulto", dose: "Reforço", recomendacao: "Conforme campanha vigente", protege: "Formas graves de Covid-19", reacoes: "Dor local, febre e fadiga", via: "Intramuscular" },
    { nome: "dTpa (gestantes)", faixa: "adulto", dose: "1 dose por gestação", recomendacao: "A partir da 20ª semana", protege: "Coqueluche em recém-nascidos", reacoes: "Dor local e febre leve", via: "Intramuscular" },

    { nome: "Influenza (Gripe)", faixa: "idoso", dose: "Anual", recomendacao: "Todo ano", protege: "Complicações respiratórias", reacoes: "Dor local e mal-estar leve", via: "Intramuscular" },
    { nome: "Covid-19", faixa: "idoso", dose: "Reforço periódico", recomendacao: "Conforme orientação oficial", protege: "Formas graves e internação", reacoes: "Dor local e fadiga", via: "Intramuscular" },
    { nome: "Pneumocócica 23-valente", faixa: "idoso", dose: "Dose e reforço conforme orientação", recomendacao: "60+ anos, especialmente com comorbidades", protege: "Pneumonia e doença pneumocócica invasiva", reacoes: "Dor local e febre baixa", via: "Intramuscular" },
    { nome: "dT (dupla adulto)", faixa: "idoso", dose: "Reforço a cada 10 anos", recomendacao: "Atualização periódica", protege: "Difteria e tétano", reacoes: "Dor local", via: "Intramuscular" },
    { nome: "Hepatite B", faixa: "idoso", dose: "3 doses", recomendacao: "Não vacinados", protege: "Hepatite B", reacoes: "Dor local e cansaço", via: "Intramuscular" },
    { nome: "Febre Amarela", faixa: "idoso", dose: "Avaliação individual", recomendacao: "Somente quando indicado", protege: "Febre amarela", reacoes: "Dor local e febre", via: "Subcutânea" }
];
