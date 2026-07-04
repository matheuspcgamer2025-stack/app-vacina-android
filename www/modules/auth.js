import { appState, auth } from './database.js';
// Importação dos métodos oficiais de login e cadastro da Google
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://gstatic.com";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CPF = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const REGEX_SENHA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\S]{8,}$/;

function validarIdentificador(valor) {
    if (REGEX_EMAIL.test(valor)) return { valido: true, tipo: 'email' };
    if (REGEX_CPF.test(valor)) return { valido: true, tipo: 'cpf' };
    return { valido: false, tipo: null };
}

function validarSenhaForte(senha) {
    return REGEX_SENHA.test(senha);
}

export function inicializarAutentication(onLoginSuccess) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const screenLogin = document.getElementById('screen-login');
    const screenRegister = document.getElementById('screen-register');
    const appMain = document.getElementById('app-main');

    // Alternância visual entre telas de Login e Cadastro
    document.getElementById('link-cadastro')?.addEventListener('click', (e) => {
        e.preventDefault();
        screenLogin.classList.add('hidden');
        screenRegister.classList.remove('hidden');
    });

    document.getElementById('link-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        screenRegister.classList.add('hidden');
        screenLogin.classList.remove('hidden');
    });

    // ==========================================
    // LOGIN REAL NO FIREBASE AUTHENTICATION
    // ==========================================
    loginForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('login-identificador').value.trim();
        const senha = document.getElementById('login-senha').value;
        
        const validacao = validarIdentificador(id);
        if (!validacao.valido || !validarSenhaForte(senha)) {
            alert("❌ Dados inválidos ou senha fora do padrão seguro!");
            return;
        }

        // Se o usuário digitou um CPF, adiciona um sufixo para o Firebase aceitar como e-mail técnico
        const emailFirebase = validacao.tipo === 'cpf' ? `${id.replace(/\D/g, '')}@vacinaapp.local` : id;

        try {
            // Executa a validação direto nos servidores da Google
            const userCredential = await signInWithEmailAndPassword(auth, emailFirebase, senha);
            
            appState.usuarioLogado = id; // Guarda o identificador original digitado
            
            screenLogin.classList.add('hidden');
            appMain.classList.remove('hidden');
            onLoginSuccess();
        } catch (error) {
            console.error("Erro no login:", error);
            alert("❌ Falha na autenticação! Verifique se o e-mail/CPF e a senha estão corretos.");
        }
    });

    // ==========================================
    // CADASTRO REAL NO FIREBASE AUTHENTICATION
    // ==========================================
    registerForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('register-identificador').value.trim();
        const senha = document.getElementById('register-senha').value;
        const conf = document.getElementById('register-confirmar-senha').value;
        
        const validacao = validarIdentificador(id);
        if (!validacao.valido || !validarSenhaForte(senha) || senha !== conf) {
            alert("❌ Verifique os campos! As senhas devem ser iguais e seguras.");
            return;
        }

        // Converte CPF para formato compatível de e-mail se necessário
        const emailFirebase = validacao.tipo === 'cpf' ? `${id.replace(/\D/g, '')}@vacinaapp.local` : id;

        try {
            // Cria a conta de forma definitiva na nuvem do Firebase
            const userCredential = await createUserWithEmailAndPassword(auth, emailFirebase, senha);
            
            alert("🎉 Conta criada com sucesso com segurança na nuvem!");
            appState.usuarioLogado = id;
            
            screenRegister.classList.add('hidden');
            appMain.classList.remove('hidden');
            onLoginSuccess();
        } catch (error) {
            console.error("Erro no cadastro:", error);
            if (error.code === 'auth/email-already-in-matter' || error.code === 'auth/email-already-in-use') {
                alert("❌ Este CPF ou E-mail já está cadastrado no sistema!");
            } else {
                alert("❌ Falha ao criar conta no servidor. Tente novamente.");
            }
        }
    });
}
