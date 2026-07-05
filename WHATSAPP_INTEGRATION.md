# 📱 Integração de WhatsApp no VacinaApp

## ✨ Funcionalidades Adicionadas

### 1. **Botão de WhatsApp no Modal de Feedback**
   - Usuários podem escolher entre enviar feedback para a nuvem ou via WhatsApp
   - Ao clicar em "💬 Enviar via WhatsApp", a mensagem é pré-preenchida no app

### 2. **Menu de Suporte via WhatsApp no Sidebar**
   - Novo item: "💬 Suporte via WhatsApp"
   - Abre diretamente o WhatsApp com mensagem padrão: "Olá, preciso de suporte com o VacinaApp!"

### 3. **Configuração Centralizada**
   - Arquivo: `www/modules/config.js`
   - Fácil alteração do número de WhatsApp

---

## ⚙️ Como Configurar

### Alterar o Número de WhatsApp

1. Abra o arquivo: `www/modules/config.js`
2. Procure pela linha:
   ```javascript
   SUPPORT_NUMBER: '5588999999999'
   ```
3. Substitua pelo seu número no formato:
   - **Formato**: `[Código País][DDD][Número]`
   - **Exemplo Brasil**: `55 + 88 (Ceará) + 99999-9999` = `5588999999999`
   - **Sem espaços, sem hífen**

4. Salve o arquivo

---

## 🔗 Como Funciona

### URL da API do WhatsApp
A integração usa a API oficial do WhatsApp:
```
https://wa.me/[NÚMERO]?text=[MENSAGEM_CODIFICADA]
```

### Fluxo do Usuário
1. Usuário clica em "Suporte via WhatsApp" ou "Enviar via WhatsApp"
2. A mensagem é codificada e enviada para a API do WhatsApp
3. App abre o WhatsApp (web, desktop ou mobile) com a conversa pré-preenchida
4. Usuário finaliza o envio da mensagem

---

## 📋 Arquivos Modificados

- **`www/index.html`**
  - Adicionado botão "💬 Enviar via WhatsApp" no modal-feedback
  - Adicionado novo item no sidebar: "💬 Suporte via WhatsApp"

- **`www/modules/sidebar.js`**
  - Função `abrirWhatsApp()` para abrir a API
  - Listeners para botões de WhatsApp
  - Importação do arquivo de configuração

- **`www/style.css`**
  - Estilos verde WhatsApp para o botão
  - Transições e efeitos visuais

- **`www/modules/config.js`** (NOVO)
  - Configuração centralizada
  - Número de WhatsApp
  - URLs de referência

---

## 🎨 Estilos

O botão de WhatsApp possui:
- ✅ Cor verde característica do WhatsApp
- ✅ Gradiente para visual moderno
- ✅ Efeitos de hover e click
- ✅ Suporte a tema escuro

---

## 🚀 Exemplo de Uso

### Via JavaScript
```javascript
import { abrirWhatsApp } from './modules/sidebar.js';

// Abrir WhatsApp com mensagem personalizada
abrirWhatsApp('Olá, tenho uma dúvida sobre vacinação!');
```

### Números de Exemplo
- **Brasil (Ceará)**: `5588999999999`
- **São Paulo**: `5511999999999`
- **Rio de Janeiro**: `5521999999999`

---

## ⚠️ Notas Importantes

1. **Número com Código do País**: Sempre inclua o código do país (+55 para Brasil)
2. **Sem Caracteres Especiais**: Remove espaços, hífens, parênteses
3. **Web vs Mobile**: A função detecta automaticamente (Web abre em wa.web.com, Mobile abre no app)
4. **Mensagem Pré-preenchida**: A mensagem é codificada automaticamente e é apenas um rascunho
5. **Privacidade**: O usuário sempre controla o envio final da mensagem

---

## 📞 Suporte

Para mais informações sobre a API do WhatsApp:
- [WhatsApp Business API](https://www.whatsapp.com/business/api/)
- [Documentação wa.me](https://faq.whatsapp.com/general/26000030/)

