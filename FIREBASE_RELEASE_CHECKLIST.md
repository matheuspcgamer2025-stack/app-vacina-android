# Firebase e Android Release - Checklist

Guia complementar de submissão:

- PLAY_STORE_SUBMISSION_GUIDE.md

## 1) Gerar keystore de release

Execute no terminal (sem compartilhar as senhas):

```bash
keytool -genkeypair -v \
  -keystore ~/vacinaapp-release.jks \
  -alias vacinaapp-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

## 2) Extrair SHA-1 e SHA-256 da keystore de release

```bash
keytool -list -v -keystore ~/vacinaapp-release.jks -alias vacinaapp-release
```

## 3) SHA debug atual do projeto (ja verificada)

- SHA1: 21:97:71:87:DD:48:F9:85:09:EF:53:28:0C:6E:D0:1A:FF:E5:37:26
- SHA-256: 94:96:21:24:61:4C:A6:D7:D0:EE:62:C0:02:03:61:38:7A:EB:84:D1:DD:21:83:FB:05:B6:EA:35:21:20:FB:B8

## 4) Cadastrar fingerprints no Firebase Console

Projeto: vacinaapp-2cca0

1. Firebase Console -> Project settings -> Your apps -> Android app.
2. Adicione SHA-1 e SHA-256 de debug e release.
3. Baixe novamente o google-services.json.
4. Substitua o arquivo em android/app/google-services.json.

## 5) Validar provedores de Auth

Authentication -> Sign-in method:

- Email/Password: habilitado
- Google: habilitado

## 6) Aplicar regras Firestore

Arquivo de regras preparado neste repositório:

- firestore.rules

Deploy (se usar Firebase CLI):

```bash
firebase deploy --only firestore:rules
```

Se nao tiver Firebase CLI:

```bash
npm i -g firebase-tools
firebase login
firebase use vacinaapp-2cca0
firebase deploy --only firestore:rules
```

## 7) Sincronizar Android apos trocar google-services.json

```bash
cd /home/matheus/Downloads/vacina
npx cap sync android
```

## 8) Teste final em dispositivo

1. Teste login com Email/Senha.
2. Teste login com Google.
3. Salve vacina e confirme escrita no Firestore.
4. Feche e abra o app e confirme leitura da carteira.

---

## 9) Checklist Play Store (Auth e Conta)

Objetivo: garantir os fluxos exigidos pela loja para publicar sem bloqueio de conformidade.

### 9.1 Recuperacao de senha (Email)

- [x] Link Esqueci minha senha ativo na tela de login.
- [x] Envio de reset implementado via Firebase Auth.
- [x] Idioma do email configurado em pt-BR (auth.languageCode = 'pt-BR').
- [x] Tratamento de erros do reset (usuario inexistente, email invalido, rede, muitas tentativas).
- [ ] Conferir no Firebase Console o nome do app exibido no template de email.
- [ ] Validar pasta Spam/Promocoes no Gmail em teste real.

Passos de teste manual:

1. Abrir o app e inserir um email valido no campo de login.
2. Tocar em Esqueci minha senha.
3. Confirmar modal de sucesso e verificar recebimento do email.
4. Abrir o link recebido e redefinir a senha.
5. Voltar ao app e autenticar com a nova senha.

### 9.2 Exclusao de conta

- [x] Opcao de Excluir Conta implementada no menu de perfil.
- [x] Confirmacao explicita antes da exclusao definitiva.
- [x] Exclusao no Firebase Auth implementada.
- [x] Limpeza de dados locais implementada.
- [x] Tentativa de limpeza de dados em Firestore (vacinas e usuario) antes da exclusao.
- [x] Tratamento de erro requires-recent-login implementado.

Passos de teste manual:

1. Entrar com conta de teste.
2. Ir em Perfil -> Sobre -> Excluir Conta.
3. Confirmar a exclusao.
4. Validar que a sessao foi encerrada e o app voltou para login.
5. Tentar login novamente com a conta excluida e confirmar falha esperada.

### 9.3 Evidencias para envio na loja

- [ ] Capturas da tela de recuperacao de senha (inicio, sucesso, email recebido).
- [ ] Capturas da tela de exclusao de conta (menu, confirmacao, resultado).
- [ ] Texto de politica de privacidade com secao explicita sobre exclusao de conta.
- [ ] Texto no formulario da Play Console informando onde a exclusao esta no app.

---

## 10) Comandos de validacao rapida no projeto

Executar no terminal do projeto:

```bash
cd /home/matheus/Downloads/vacina
npx cap sync android
```

Se for gerar pacote para loja:

```bash
cd /home/matheus/Downloads/vacina/android
./gradlew bundleRelease
```

---

## 11) Textos Play Console (copiar e colar)

Use os blocos abaixo diretamente nos campos de politica/descricao da Play Console.

### 11.1 Exclusao de conta (versao completa)

```text
O VacinaApp permite exclusao de conta diretamente no aplicativo.
Caminho: Icone de Perfil > Sobre > Excluir Conta.
Ao confirmar, a conta de autenticacao e excluida e os dados do usuario sao removidos.
Para voltar a usar o app apos exclusao, e necessario criar uma nova conta.
```

### 11.2 Exclusao de conta (versao curta)

```text
Exclusao de conta no app: Perfil > Sobre > Excluir Conta.
```

### 11.3 Recuperacao de senha (versao completa)

```text
O VacinaApp oferece recuperacao de senha por e-mail na tela de login.
Caminho: Login > Esqueci minha senha.
O usuario informa o e-mail da conta e recebe link seguro do Firebase Authentication para redefinir a senha.
```

### 11.4 Recuperacao de senha (versao curta)

```text
Recuperacao de senha no app: Login > Esqueci minha senha.
```

### 11.5 Nota de versao (release notes)

```text
Correcoes de autenticacao e conformidade para publicacao.
Inclui recuperacao de senha em portugues, exclusao de conta no app, melhorias na area de perfil e ajustes de interface.
```

### 11.6 Politica de privacidade (trecho sugerido)

```text
O usuario pode solicitar e executar a exclusao da propria conta diretamente no aplicativo em Perfil > Sobre > Excluir Conta. A exclusao remove a conta de autenticacao e os dados associados ao usuario.
```

---

## 12) Versoes dos textos (tecnica e simples)

Use a versao tecnica para formularios de revisao da Play Console.
Use a versao simples para politica publica, FAQ e canais de usuario final.

### 12.1 Exclusao de conta

Versao tecnica (revisor Play Console):

```text
O aplicativo oferece mecanismo nativo de exclusao de conta no proprio fluxo autenticado.
Caminho in-app: Perfil > Sobre > Excluir Conta.
Ao confirmar, o sistema executa a exclusao da conta de autenticacao (Firebase Auth) e remove dados associados do usuario.
```

Versao simples (usuario final):

```text
Se voce quiser apagar sua conta, basta entrar no app e ir em Perfil > Sobre > Excluir Conta.
Depois da confirmacao, sua conta e dados sao removidos.
```

### 12.2 Recuperacao de senha

Versao tecnica (revisor Play Console):

```text
O aplicativo disponibiliza recuperacao de credencial por e-mail no fluxo de autenticacao.
Caminho in-app: Login > Esqueci minha senha.
Ao informar um e-mail valido, e enviado um link seguro de redefinicao via Firebase Authentication.
```

Versao simples (usuario final):

```text
Esqueceu sua senha? Na tela de login, toque em Esqueci minha senha.
Informe seu e-mail para receber o link de redefinicao.
```

### 12.3 Politica de privacidade

Versao tecnica (texto juridico-operacional):

```text
Titulares podem solicitar e realizar a exclusao da conta pelo proprio aplicativo em Perfil > Sobre > Excluir Conta. A operacao remove a conta de autenticacao e os dados vinculados ao identificador do usuario, observadas limitacoes tecnicas e legais aplicaveis.
```

Versao simples (transparencia ao usuario):

```text
Voce pode excluir sua conta a qualquer momento no app em Perfil > Sobre > Excluir Conta.
Quando a exclusao e confirmada, removemos os dados vinculados a sua conta.
```
