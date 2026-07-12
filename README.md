# 💉 VacinaApp - Carteira Digital de Vacinação

[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow)](https://github.com)
[![Android](https://img.shields.io/badge/Android-5.0+-green)](https://www.android.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-5.0-blue)](https://capacitorjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📱 Sobre o Projeto

**VacinaApp** é um aplicativo Android moderno que funciona como uma **carteira digital segura** para armazenar e gerenciar o histórico de vacinação. O app utiliza tecnologias web modernas encapsuladas no Capacitor para oferecer uma experiência nativa otimizada.

### ✨ Principais Características

- 🔐 **Autenticação Segura** — Login com CPF/E-mail e senha
- 💾 **Sincronização em Nuvem** — Backup automático no Firebase
- 📊 **Dashboard Inteligente** — Visualização de próximas doses pendentes
- 👥 **Perfis de Dependentes** — Gerencie vacinação de família inteira
- 📅 **Calendário Interativo** — Histórico visual de aplicações
- 📤 **Compartilhamento Nativo** — Envie histórico via WhatsApp, Gmail, Drive
- 🌙 **Tema Escuro/Claro** — Interface adaptável às preferências
- 📍 **GPS Integrado** — Localize postos de saúde próximos
- 🔔 **Notificações** — Alertas para próximas doses
- 💰 **Carteira de Benefícios** — Acompanhe programas de saúde

---

## 🚀 Início Rápido

### 📋 Requisitos Pré-requisitos

- **Node.js** 16+ e npm/yarn
- **Android Studio** com SDK 30+
- **Java Development Kit (JDK)** 11+
- **Git** para versionamento

### 📦 Instalação

#### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/app-vacina-android.git
cd vacina
```

#### 2. Instale as dependências
```bash
npm install
```

#### 3. Sincronize com o Android
```bash
npx cap sync android
```

#### 4. Abra no Android Studio
```bash
npx cap open android
```

#### 5. Compile e execute
No Android Studio, clique em **Run → Run 'app'** ou pressione `Shift + F10`

### 🌐 Desenvolvimento Local (Browser)

Para testar no navegador antes de sincronizar:

```bash
# Inicie um servidor local
npm run dev

# Abra em http://localhost:5173
```

---

## 📁 Estrutura do Projeto

```
vacina/
├── www/                          # Código-fonte web
│   ├── index.html               # Página principal
│   ├── app.js                   # Lógica central do app
│   ├── style.css                # Estilos globais
│   └── modules/
│       ├── auth.js              # Autenticação e login
│       ├── dashboard.js         # Painel principal
│       ├── wallet.js            # Carteira de vacinas (compartilhamento PDF)
│       ├── calendar.js          # Calendário interativo
│       ├── reminders.js         # Sistema de notificações
│       ├── gps.js               # Busca de postos de saúde
│       ├── database.js          # Conexão Firebase
│       ├── navigation.js        # Navegação entre telas
│       ├── sidebar.js           # Menu lateral
│       └── components.js        # Componentes reutilizáveis
├── android/                      # Projeto Android (Capacitor)
│   ├── app/
│   │   ├── build.gradle         # Configuração de build
│   │   └── src/                 # Código nativo Android
│   └── gradle/                  # Build tools
├── capacitor.config.json        # Configuração do Capacitor
├── package.json                 # Dependências do projeto
└── README.md                    # Este arquivo
```

---

## 🔑 Configuração Importante

### 1. Firebase Setup

O app usa Firebase Firestore para sincronização em nuvem. Configure as credenciais em `www/modules/database.js`:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "seu-id",
  appId: "seu-app-id"
};
```

#### Coleção `postos`

Para a busca de postos de vacinação, o app agora puxa dados diretamente do Firestore na coleção `postos`. Cada documento deve conter campos como:

- `nome` (ex: "UBS Centro")
- `endereco` (ex: "Rua Major Facundo, 500")
- `bairro` (ex: "Centro")
- `cep` (ex: "60000-000")
- `telefone` (ex: "(85) 3251-1000")
- `funcionamento` (ex: "07:00 às 17:00")
- `vacinas` (ex: "BCG, Influenza, Tríplice Viral")

Se o Firestore não estiver disponível, o app usa um pequeno fallback local de estações de saúde para manter a busca funcional.

### 2. Capacitor Plugins

Plugins já configurados:
- ✅ `@capacitor/app` — Controle de ciclo de vida
- ✅ `@capacitor/keyboard` — Teclado nativo
- ✅ `@capacitor/geolocation` — GPS
- ✅ `@capacitor/notification` — Push notifications

---

## 📱 Funcionalidades em Detalhes

### 🔐 Autenticação
- Login com CPF ou E-mail
- Cadastro de nova conta com validação de força de senha
- Recuperação de senha via e-mail
- Sessão persistente

### 💊 Carteira de Vacinas
- Adicionar novos registros de vacinação
- Excluir registros (com confirmação)
- Cálculo automático de próximas doses
- Visualização em cards intuitivos
- **Compartilhamento via PDF com Web Share API**

### 📊 Dashboard
- Resumo de vacinação do perfil ativo
- Próximas doses pendentes
- Histórico visual

### 👥 Perfis
- Crie perfis para dependentes
- Alterne entre perfis facilmente
- Dados isolados por perfil

### 🌍 Postos de Saúde
- Busca por CEP/Bairro
- Localização via GPS
- Integração com mapas

### 🔔 Notificações
- Alertas para próximas doses
- Lembretes configuráveis

---

## 🛠️ Comandos Principais

```bash
# Desenvolvimento
npm install                    # Instalar dependências
npm run dev                   # Rodar em servidor local

# Build
npm run build                 # Compilar produção
npx cap build android         # Build APK/AAB

# Sincronização
npx cap sync                  # Sincronizar todo o código
npx cap sync android          # Sincronizar apenas Android

# Abertura
npx cap open android          # Abrir Android Studio

# Atualização
npx cap update                # Atualizar plataformas
npm update                    # Atualizar dependências
```

---

## 🔒 Segurança

- ✅ Autenticação via Firebase Auth
- ✅ Dados criptografados em trânsito (HTTPS)
- ✅ Validação de entrada em formulários
- ✅ Proteção contra XSS
- ✅ Tokens de sessão com expiração

---

## 📄 Libs e Dependências

| Biblioteca | Versão | Propósito |
|-----------|--------|----------|
| Capacitor | 5.0+ | Framework híbrido iOS/Android |
| Firebase | 9.22.0 | Backend em nuvem |
| html2pdf.js | 0.10.1 | Geração de PDFs |
| CSS Variables | Nativo | Temas dinâmicos |

---

## 🐛 Troubleshooting

### "Erro ao conectar ao Firebase"
- Verifique se as credenciais estão corretas em `database.js`
- Confirme que o projeto Firebase está ativo
- Verifique regras de segurança do Firestore

### "APK não instala no Android"
- Limpe o build: `rm -rf android/app/build`
- Sincronize novamente: `npx cap sync`
- Verifique SDK versions no `build.gradle`

### "Splash screen não desaparece"
- Verifique `setTimeout` em `app.js` (deve ser 2500ms)
- Limpe cache do Android: `adb shell pm clear seu.pacote`

---

## 🤝 Contribuição

Quer contribuir? Siga o fluxo:

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/MinhaFuncionalidade`
3. Commit: `git commit -m "Descrição clara da mudança"`
4. Push: `git push origin feature/MinhaFuncionalidade`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

## 📞 Suporte

- 📧 **E-mail**: matheuspcgamer2025@gmail.com
- 🐞 **Issues**: [GitHub Issues](https://github.com)
- 💬 **Discussões**: [GitHub Discussions](https://github.com)

---

## 🎯 Roadmap Futuro

- [ ] Integração com SUS (Sistema Único de Saúde)
- [ ] QR Code para compartilhamento rápido
- [ ] Sincronização offline
- [ ] Reconhecimento facial para segurança
- [ ] Versão iOS via Capacitor
- [ ] App em outras línguas

---

**Desenvolvido com ❤️ para a saúde pública brasileira.**
