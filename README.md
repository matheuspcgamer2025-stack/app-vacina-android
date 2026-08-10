# VacinaApp

Aplicativo de carteira digital de vacinacao para Android, construido com tecnologias web (HTML, CSS e JavaScript) e empacotado com Capacitor.

## Visao Geral

O VacinaApp permite:

- Login com CPF ou e-mail e senha.
- Login com Google (Firebase Authentication).
- Controle de carteira vacinal por perfil.
- Cadastro e gerenciamento de dependentes.
- Dashboard com status vacinal, pendencias e proximas doses.
- Lembretes e notificacoes locais no Android.
- Busca de posto por localizacao e consultas auxiliares.
- Compartilhamento do historico (PDF via html2pdf/Web Share API).

## Stack Tecnica

- Frontend: HTML, CSS, JavaScript (modulos ES no diretorio www)
- Mobile: Capacitor Android
- Backend: Firebase Authentication + Firestore
- Bibliotecas:
  - dayjs
  - lucide
  - @capacitor-firebase/authentication
  - @capacitor/geolocation
  - @capacitor/local-notifications

## Estrutura Principal

- www/index.html: shell da aplicacao
- www/app.js: inicializacao geral e wiring entre modulos
- www/style.css: estilos globais
- www/modules/auth.js: autenticacao e sessao
- www/modules/dashboard.js: painel principal
- www/modules/wallet.js: carteira e historico
- www/modules/calendar.js: calendario e status
- www/modules/reminders.js: lembretes e notificacoes
- www/modules/features.js: dependentes e recursos auxiliares
- www/modules/sidebar.js: menu lateral e perfil
- www/modules/database.js: Firebase e calendario base
- www/modules/dayjs.js: helpers de data
- www/modules/icons.js: renderizacao de icones Lucide

## Requisitos

- Node.js 18+
- npm
- Android Studio com SDK instalado
- JDK compativel com o Android Gradle Plugin

## Instalacao

1. Instale as dependencias:

```bash
npm install
```

2. Sincronize os assets web e plugins no projeto Android:

```bash
npx cap sync android
```

3. Abra o projeto Android:

```bash
npx cap open android
```

4. Rode no dispositivo/emulador pelo Android Studio.

## Fluxo de Atualizacao no Celular

Quando alterar arquivos em www, siga este fluxo para garantir que o app instalado reflita as mudancas:

1. Sincronizar:

```bash
npx cap sync android
```

2. Rebuild do app:

```bash
cd android
./gradlew assembleDebug
```

3. Reinstalar o APK no dispositivo (ou rodar novamente pelo Android Studio).

Se o celular continuar exibindo versao antiga, desinstale o app antes de reinstalar.

## Build Debug

Gerar APK debug:

```bash
cd android
./gradlew assembleDebug
```

Saida esperada:

- android/app/build/outputs/apk/debug/app-debug.apk

## Configuracao Firebase

A configuracao do Firebase esta em:

- www/modules/database.js

As regras do Firestore estao em:

- firestore.rules

Resumo das protecoes atuais:

- Requer usuario autenticado.
- Restringe leitura/escrita por ownership (usuarioUid e usuarioId).
- Valida payload minimo dos documentos de vacinas.

## Plugins Capacitor em Uso

- @capacitor-firebase/authentication
- @capacitor/geolocation
- @capacitor/local-notifications

A configuracao do Capacitor esta em:

- capacitor.config.json

## Comandos Uteis

Instalar dependencias:

```bash
npm install
```

Sincronizar Android:

```bash
npx cap sync android
```

Abrir Android Studio:

```bash
npx cap open android
```

Build debug:

```bash
cd android
./gradlew assembleDebug
```

## Troubleshooting

1. Mudancas nao aparecem no celular
- Rode npx cap sync android.
- Gere novo build com ./gradlew assembleDebug.
- Reinstale o APK (desinstale a versao anterior se necessario).

2. Erro de permissao no Firestore
- Verifique login ativo.
- Confirme que os campos usuarioUid/usuarioId estao sendo enviados corretamente.
- Revise firestore.rules publicado no projeto certo.

3. Login Google falhando no Android
- Confira package name, SHA-1/SHA-256 e google-services.json.
- Rode npx cap sync android apos ajustes.

## Observacoes

- O webDir atual do Capacitor e www.
- O repositorio usa fluxo hibrido; evite editar diretamente android/app/src/main/assets/public.
- Sempre altere primeiro os arquivos em www e depois sincronize.
