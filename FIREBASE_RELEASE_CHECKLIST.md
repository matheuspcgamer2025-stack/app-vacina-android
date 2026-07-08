# Firebase e Android Release - Checklist

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
