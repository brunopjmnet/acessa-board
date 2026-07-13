# Implantação do Jitsi/JaaS no Acessa Board

O Acessa Board usa a Edge Function `create-jaas-session` para emitir um JWT individual e temporário. A chave privada permanece somente nos segredos do Supabase.

## 1. Criar a aplicação no JaaS

No console JaaS, crie a aplicação e uma API Key. Guarde:

- App ID, no formato `vpaas-magic-cookie-...`;
- API Key ID (`kid`);
- chave privada RSA em PEM.

## 2. Configurar os segredos da Edge Function

```powershell
npx supabase secrets set JAAS_APP_ID="vpaas-magic-cookie-..." --project-ref syfnslczrrkaqnlpkafm
npx supabase secrets set JAAS_API_KEY_ID="vpaas-magic-cookie-.../ID-DA-CHAVE" --project-ref syfnslczrrkaqnlpkafm
npx supabase secrets set JAAS_PRIVATE_KEY_B64="CHAVE_PRIVADA_PEM_EM_BASE64" --project-ref syfnslczrrkaqnlpkafm
npx supabase secrets set JAAS_ENABLE_RECORDING="false" JAAS_ENABLE_TRANSCRIPTION="false" --project-ref syfnslczrrkaqnlpkafm
```

No Windows, converta o arquivo PEM para Base64 antes do envio para preservar as quebras de linha. A função decodifica a chave somente em memória. Nunca salve a chave privada no Git, `.env` do frontend ou JSON do workspace.

## 3. Publicar a função

```powershell
npx supabase functions deploy create-jaas-session --project-ref syfnslczrrkaqnlpkafm
```

## 4. Política aplicada

- somente usuários autenticados e ativos entram;
- a reunião precisa existir no workspace e não pode estar arquivada ou cancelada;
- administradores, sócios, diretores e gestores recebem papel de moderador;
- demais papéis entram como participantes;
- o token fica restrito à sala daquela reunião e expira após a duração prevista mais uma margem;
- gravação e transcrição começam desabilitadas e dependem de configuração explícita.

## 5. Validação antes de produção

1. Entrar como administrador e abrir uma reunião.
2. Entrar em outro navegador como colaborador e confirmar que não recebe moderação.
3. Validar câmera, microfone, compartilhamento de tela e saída da sala.
4. Confirmar que reunião cancelada não abre.
5. Aprovar aviso de gravação, retenção e acesso antes de habilitar gravações/transcrições.
