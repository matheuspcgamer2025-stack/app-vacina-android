# Guia Rápido de Submissão - Play Console (VacinaApp)

Este guia traz o passo a passo direto para publicar o app sem rejeição por política de conta.

## 1) Upload do pacote

1. Acesse Google Play Console.
2. Entre em Produção (ou Teste fechado).
3. Em Versões, faça upload do arquivo:

- android/app/build/outputs/bundle/release/app-release.aab

## 2) Campos de política: exclusão de conta

No formulário de políticas da Play Console, informe que a exclusão de conta é feita dentro do app.

Texto sugerido (copiar e colar):

"O VacinaApp permite exclusão de conta diretamente no aplicativo.
Caminho: Ícone de Perfil > Sobre > Excluir Conta.
Ao confirmar, a conta de autenticação é excluída e os dados do usuário são removidos.
Caso seja necessário novo acesso, o usuário deverá criar uma nova conta."

## 3) Campos de política: recuperação de senha

Texto sugerido (copiar e colar):

"O VacinaApp oferece recuperação de senha por e-mail na tela de login.
Caminho: Login > Esqueci minha senha.
O usuário informa o e-mail da conta e recebe link seguro do Firebase Authentication para redefinição da senha."

## 4) Evidências recomendadas para revisão

Suba capturas de tela internas (ou mantenha para responder questionamento da revisão):

1. Tela de login com o link Esqueci minha senha.
2. Mensagem de sucesso após solicitar recuperação.
3. E-mail de recuperação recebido.
4. Tela Perfil > Sobre com botão Excluir Conta.
5. Modal de confirmação de exclusão.
6. Confirmação de conta excluída / retorno ao login.

## 5) Checklist final antes de enviar para revisão

1. Confirmar build release gerado com sucesso.
2. Confirmar login Google funcionando em dispositivo real.
3. Confirmar data de nascimento no login Google e atualização no painel.
4. Confirmar fluxo de alterar senha na aba de perfil.
5. Confirmar fluxo de excluir conta (com internet ativa).
6. Confirmar recuperação de senha em conta de e-mail real.

## 6) Observação importante sobre e-mail em spam

Mesmo com idioma pt-BR configurado no app, o e-mail pode cair em spam dependendo da reputação do remetente padrão do Firebase.

Ação recomendada no Firebase Console:

1. Authentication > Templates.
2. Ajustar nome do aplicativo no template.
3. Revisar remetente e conteúdo para reduzir risco de spam.

## 7) Texto curto para "Notas da versão"

Texto sugerido:

"Correções de autenticação e conformidade para publicação.
Inclui recuperação de senha em português, exclusão de conta no app, melhorias na área de perfil e ajustes de interface."
