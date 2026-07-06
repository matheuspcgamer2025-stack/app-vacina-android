import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { appState, auth } from './database.js';
// IMPORTAÇÃO OFICIAL DO FIREBASE COM O CAMINHO COMPLETO DO SCRIPT
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

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

        const emailFirebase = validacao.tipo === 'cpf' ? `${id.replace(/\D/g, '')}@vacinaapp.local` : id;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, emailFirebase, senha);
            appState.usuarioLogado = id;
            
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

        const emailFirebase = validacao.tipo === 'cpf' ? `${id.replace(/\D/g, '')}@vacinaapp.local` : id;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, emailFirebase, senha);
            alert("🎉 Conta criada com sucesso com segurança na nuvem!");
            appState.usuarioLogado = id;
            
            screenRegister.classList.add('hidden');
            appMain.classList.remove('hidden');
            onLoginSuccess();
        } catch (error) {
            console.error("Erro no cadastro:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert("❌ Este CPF ou E-mail já está cadastrado no sistema!");
            } else {
                alert("❌ Falha ao criar conta no servidor. Tente novamente.");
            }
        }
    });

       // ==========================================
    // AUTENTICAÇÃO NATIVA COM O GOOGLE SIGN-IN (BLINDADA)
    // ==========================================
    document.getElementById('btn-google-signin')?.addEventListener('click', async () => {
        try {
            // Dispara o pop-up nativo com as contas do Gmail
            const result = await FirebaseAuthentication.signInWithGoogle();
            
            // Captura o usuário independente de qual versão do plugin esteja rodando
            const user = result.user || (result.authentication ? result.authentication : null);
            
            if (user) {
                // Tenta pegar o e-mail ou usa o ID único do Google como garantia de login
                const emailUsuario = user.email || user.idToken || "usuario_google";
                
                // Salva o usuário logado no estado global do aplicativo
                appState.usuarioLogado = emailUsuario;
                
                // Esconde a tela de login e revela a Dashboard principal do app
                document.getElementById('screen-login').classList.add('hidden');
                document.getElementById('app-main').classList.remove('hidden');
                
                // Executa a função de sucesso para carregar os gráficos e as vacinas da nuvem
                if (typeof onLoginSuccess === 'function') {
                    onLoginSuccess();
                }
            } else {
                alert("⚠️ Não foi possível recuperar os dados da sua conta Google.");
            }
        } catch (error) {
            console.error("Erro completo no login com o Google:", error);
            alert("❌ Erro de conexão com a conta Google.");
        }
    });
}
