import { 
    appState, 
    auth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup
} from './database.js';
import { salvarPerfilTitular } from './profile.js';
import { parseDateToIso } from './date-input.js';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_CPF = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const REGEX_SENHA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\S]{8,}$/;
const CHAVE_CONTAS_LOCAIS = 'vacinaapp_contas_locais_v1';

function validarDataNascimento(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''))) return false;
    const data = new Date(`${valor}T00:00:00`);
    if (Number.isNaN(data.getTime())) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return data <= hoje;
}

function validarIdentificador(valor) {
    if (REGEX_EMAIL.test(valor)) return { valido: true, tipo: 'email' };
    if (REGEX_CPF.test(valor)) return { valido: true, tipo: 'cpf' };
    return { valido: false, tipo: null };
}

function validarSenhaForte(senha) {
    return REGEX_SENHA.test(senha);
}

function normalizarIdentificador(id) {
    const texto = id.trim();
    const validacao = validarIdentificador(texto);
    if (!validacao.valido) return null;
    if (validacao.tipo === 'cpf') return { tipo: 'cpf', valor: texto.replace(/\D/g, '') };
    return { tipo: 'email', valor: texto.toLowerCase() };
}

function obterContasLocais() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_CONTAS_LOCAIS) || '[]');
    } catch (_) {
        return [];
    }
}

function salvarContasLocais(contas) {
    localStorage.setItem(CHAVE_CONTAS_LOCAIS, JSON.stringify(contas));
}

function salvarContaLocal(id, senha) {
    const norm = normalizarIdentificador(id);
    if (!norm) return;
    const contas = obterContasLocais();
    const idx = contas.findIndex(c => c.tipo === norm.tipo && c.valor === norm.valor);
    const conta = { tipo: norm.tipo, valor: norm.valor, senha };
    if (idx >= 0) contas[idx] = conta;
    else contas.push(conta);
    salvarContasLocais(contas);
}

function loginLocal(id, senha) {
    const norm = normalizarIdentificador(id);
    if (!norm) return false;
    const contas = obterContasLocais();
    const conta = contas.find(c => c.tipo === norm.tipo && c.valor === norm.valor);
    return Boolean(conta && conta.senha === senha);
}

function resolverIdentificadorPrincipal(id, authEmail) {
    if (authEmail) return authEmail.trim().toLowerCase();

    const norm = normalizarIdentificador(id);
    if (!norm) return id.trim().toLowerCase();
    if (norm.tipo === 'cpf') return `${norm.valor}@vacinaapp.local`;
    return norm.valor;
}

function construirIdentificadoresUsuario(id, principal) {
    const identificadores = new Set([principal, id.trim()]);
    const norm = normalizarIdentificador(id);

    if (norm) {
        if (norm.tipo === 'cpf') {
            identificadores.add(norm.valor);
            identificadores.add(`${norm.valor}@vacinaapp.local`);
        } else {
            identificadores.add(norm.valor);
        }
    }

    return Array.from(identificadores)
        .map(valor => String(valor || '').trim())
        .filter(Boolean)
        .slice(0, 10);
}

function concluirLogin(id, authEmail, screenLogin, appMain, onLoginSuccess) {
    const principal = resolverIdentificadorPrincipal(id, authEmail);
    appState.usuarioLogado = principal;
    appState.identificadoresUsuario = construirIdentificadoresUsuario(id, principal);
    screenLogin.classList.add('hidden');
    appMain.classList.remove('hidden');
    if (typeof onLoginSuccess === 'function') onLoginSuccess();
}

function exibirErroAutenticacao(error) {
    const codigo = error?.code || '';
    if (codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request') {
        alert('⚠️ Login com Google cancelado.');
        return;
    }
    if (codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password' || codigo === 'auth/user-not-found') {
        alert('❌ Credenciais inválidas. Confira e-mail/CPF e senha.');
        return;
    }
    if (codigo === 'auth/network-request-failed') {
        alert('❌ Falha de rede ao autenticar. Verifique sua conexão e bloqueadores de rastreio/extensões do navegador.');
        return;
    }
    alert('❌ Falha na autenticação. Tente novamente.');
}

function extrairCodigoGoogle(error) {
    return (
        error?.code ||
        error?.status ||
        error?.nativeErrorCode ||
        error?.result?.status ||
        error?.data?.code ||
        ''
    );
}

function exibirErroGoogleDetalhado(error) {
    const codigo = String(extrairCodigoGoogle(error));
    const mensagem = error?.message || error?.localizedMessage || 'sem detalhe adicional';

    if (codigo === '10' || mensagem.toUpperCase().includes('DEVELOPER_ERROR')) {
        alert('❌ Google Sign-In falhou (DEVELOPER_ERROR/10). Verifique SHA, package name e google-services.json atual no app.');
        return;
    }

    if (codigo === '12501' || codigo === '16') {
        alert('⚠️ Login Google cancelado pelo usuário.');
        return;
    }

    if (codigo === '7' || codigo === 'auth/network-request-failed') {
        alert('❌ Falha de rede no login Google. Verifique internet do celular.');
        return;
    }

    alert(`❌ Falha no Google Sign-In. Código: ${codigo || 'desconhecido'}. Detalhe: ${mensagem}`);
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

    // Recuperação de senha por e-mail
    document.getElementById('link-esqueci-senha')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const identificador = document.getElementById('login-identificador')?.value?.trim() || '';

        if (!REGEX_EMAIL.test(identificador)) {
            alert('❌ Para recuperar senha, informe um e-mail válido no campo de login.');
            return;
        }

        const email = identificador.toLowerCase();

        try {
            await sendPasswordResetEmail(auth, email);
            alert(`📩 Enviamos um link de recuperação para ${email}. Verifique sua caixa de entrada.`);
        } catch (error) {
            const codigo = error?.code || '';

            if (codigo === 'auth/user-not-found') {
                alert('❌ Não encontramos uma conta com este e-mail.');
                return;
            }

            if (codigo === 'auth/invalid-email') {
                alert('❌ E-mail inválido para recuperação de senha.');
                return;
            }

            if (codigo === 'auth/network-request-failed') {
                alert('❌ Falha de rede ao enviar recuperação. Verifique sua conexão.');
                return;
            }

            alert('❌ Não foi possível enviar o e-mail de recuperação agora. Tente novamente.');
        }
    });

    // ==========================================
    // LOGIN REAL NO FIREBASE AUTHENTICATION
    // ==========================================
    loginForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('login-identificador').value.trim();
        const senha = document.getElementById('login-senha').value;
        
        const validacao = validarIdentificador(id);
        if (!validacao.valido || !senha) {
            alert("❌ Informe um CPF/e-mail válido e a senha.");
            return;
        }

        const emailFirebase = validacao.tipo === 'cpf' ? `${id.replace(/\D/g, '')}@vacinaapp.local` : id.toLowerCase();

        try {
            await signInWithEmailAndPassword(auth, emailFirebase, senha);
            salvarContaLocal(id, senha);
            concluirLogin(id, auth.currentUser?.email, screenLogin, appMain, onLoginSuccess);
        } catch (error) {
            console.error("Erro no login:", error);
            if (error?.code === 'auth/network-request-failed') {
                if (loginLocal(id, senha)) {
                    concluirLogin(id, null, screenLogin, appMain, onLoginSuccess);
                    alert('⚠️ Sem conexão com Firebase. Login local offline realizado com sucesso.');
                    return;
                }

                const criarContaOffline = confirm('Sem conexão com Firebase e não encontramos conta local para este CPF/e-mail. Deseja criar uma conta local offline neste dispositivo com essas credenciais?');
                if (criarContaOffline) {
                    salvarContaLocal(id, senha);
                    concluirLogin(id, null, screenLogin, appMain, onLoginSuccess);
                    alert('⚠️ Conta local offline criada e login realizado neste dispositivo.');
                    return;
                }
            }
            exibirErroAutenticacao(error);
        }
    });

    // ==========================================
    // CADASTRO REAL NO FIREBASE AUTHENTICATION
    // ==========================================
    registerForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const nomeCompleto = document.getElementById('register-nome-completo').value.trim();
        const dataNascimentoDigitada = document.getElementById('register-data-nascimento').value;
        const dataNascimento = parseDateToIso(dataNascimentoDigitada);
        const sexo = document.querySelector('input[name="register-sexo"]:checked')?.value;
        const aceitouTermos = document.getElementById('register-aceite-termos')?.checked === true;
        const id = document.getElementById('register-identificador').value.trim();
        const senha = document.getElementById('register-senha').value;
        const conf = document.getElementById('register-confirmar-senha').value;
        
        const validacao = validarIdentificador(id);
        if (!nomeCompleto || !validarDataNascimento(dataNascimento) || (sexo !== 'Feminino' && sexo !== 'Masculino')) {
            alert('❌ Preencha nome completo, data de nascimento válida e selecione sexo.');
            return;
        }

        if (!validacao.valido || !validarSenhaForte(senha) || senha !== conf) {
            alert("❌ Verifique os campos! As senhas devem ser iguais e seguras.");
            return;
        }

        if (!aceitouTermos) {
            alert('❌ Para criar a conta, você precisa aceitar os Termos de Uso e a Política de Privacidade.');
            return;
        }

        const emailFirebase = validacao.tipo === 'cpf' ? `${id.replace(/\D/g, '')}@vacinaapp.local` : id.toLowerCase();

        try {
            await createUserWithEmailAndPassword(auth, emailFirebase, senha);
            salvarPerfilTitular({ nomeCompleto, dataNascimento, sexo });
            alert("🎉 Conta criada com sucesso com segurança na nuvem!");
            salvarContaLocal(id, senha);
            concluirLogin(id, auth.currentUser?.email, screenRegister, appMain, onLoginSuccess);
        } catch (error) {
            console.error("Erro no cadastro:", error);
            if (error?.code === 'auth/network-request-failed') {
                salvarPerfilTitular({ nomeCompleto, dataNascimento, sexo });
                salvarContaLocal(id, senha);
                concluirLogin(id, null, screenRegister, appMain, onLoginSuccess);
                alert('⚠️ Sem conexão com Firebase. Conta salva localmente neste dispositivo e login realizado.');
                return;
            }
            if (error.code === 'auth/email-already-in-use') {
                alert("❌ Este CPF ou E-mail já está cadastrado no sistema!");
            } else {
                alert("❌ Falha ao criar conta no servidor. Tente novamente.");
            }
        }
    });

    // ==========================================
    // AUTENTICAÇÃO NATIVA COM O GOOGLE SIGN-IN
    // ==========================================
    document.getElementById('btn-google-signin')?.addEventListener('click', async () => {
        try {
            const FirebaseAuthentication = window.Capacitor?.Plugins?.FirebaseAuthentication;
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            if (!FirebaseAuthentication) {
                // No navegador, usa popup real do Google/Firebase em vez de login simulado.
                const credencialWeb = await signInWithPopup(auth, provider);
                concluirLogin(
                    credencialWeb?.user?.email || 'usuario_google',
                    credencialWeb?.user?.email,
                    screenLogin,
                    appMain,
                    onLoginSuccess
                );
                return;
            }

            // Força a desconexao previa para garantir escolha de conta no Android
            try { await FirebaseAuthentication.signOut(); } catch (_) {}

            const resultado = await FirebaseAuthentication.signInWithGoogle();
            const idToken = resultado?.credential?.idToken || resultado?.authentication?.idToken;
            const accessToken = resultado?.credential?.accessToken || resultado?.authentication?.accessToken;
            const email = resultado?.user?.email;
            
            if (idToken) {
                // Conecta a sessao do Google com o Firebase Auth Web SDK
                const credential = GoogleAuthProvider.credential(idToken);
                await signInWithCredential(auth, credential);
                concluirLogin(
                    email || auth.currentUser?.email || 'usuario_google',
                    auth.currentUser?.email || email,
                    screenLogin,
                    appMain,
                    onLoginSuccess
                );
            } else if (accessToken) {
                // Alguns dispositivos podem retornar apenas accessToken
                const credential = GoogleAuthProvider.credential(null, accessToken);
                await signInWithCredential(auth, credential);
                concluirLogin(
                    email || auth.currentUser?.email || 'usuario_google',
                    auth.currentUser?.email || email,
                    screenLogin,
                    appMain,
                    onLoginSuccess
                );
            } else {
                alert("❌ Login Google incompleto: não recebemos token para autenticar no Firebase. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro completo no login com o Google:", error);
            if (error?.code === 'auth/network-request-failed') {
                alert('❌ Google Login indisponível sem acesso aos servidores Google/Firebase. Use CPF/E-mail (modo offline local).');
                return;
            }
            exibirErroGoogleDetalhado(error);
        }
    });
}
