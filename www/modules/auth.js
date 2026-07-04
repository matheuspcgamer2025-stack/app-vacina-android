import { appState } from './database.js';

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

    // Troca de telas através dos links
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

    // Validação do Login Local
    loginForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('login-identificador').value.trim();
        const senha = document.getElementById('login-senha').value;
        
        if (!validarIdentificador(id).valido || !validarSenhaForte(senha)) {
            alert("❌ Dados inválidos ou senha fora do padrão seguro!");
            return;
        }

        // Armazena o identificador e limpa as telas para o login local
        appState.usuarioLogado = id;
        
        screenLogin.classList.add('hidden');
        appMain.classList.remove('hidden');
        onLoginSuccess();
    });

    // Validação do Cadastro Local
    registerForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('register-identificador').value.trim();
        const senha = document.getElementById('register-senha').value;
        const conf = document.getElementById('register-confirmar-senha').value;
        
        if (!validarIdentificador(id).valido || !validarSenhaForte(senha) || senha !== conf) {
            alert("❌ Verifique os campos! As senhas devem ser iguais e seguras.");
            return;
        }

        // Armazena o identificador e limpa as telas para o cadastro local
        appState.usuarioLogado = id;
        
        screenRegister.classList.add('hidden');
        appMain.classList.remove('hidden');
        onLoginSuccess();
    });
}
