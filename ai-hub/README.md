# AI Hub do Acessa Board

Serviço local que consulta OpenAI, Claude e Gemini e mantém o Codex como supervisor das alterações no repositório.

## Iniciar

As credenciais devem ficar fora do Git. Por padrão, o serviço lê `.env.local` na raiz do projeto:

```powershell
npm.cmd run ai-hub
```

Também é possível apontar para um arquivo seguro já existente:

```powershell
$env:AI_HUB_ENV_FILE="C:\caminho\seguro\.env.local"
npm.cmd run ai-hub
```

O serviço responde em `http://127.0.0.1:8787`. A tela **AI Hub** do Acessa Board verifica `/health` e envia consultas para `/api/tasks`.

## Segurança

- Nunca coloque chaves no frontend, no Supabase público ou no Git.
- O executor somente aceita caminhos dentro do diretório em que o serviço foi iniciado.
- A aplicação automática fica desabilitada por padrão e exige `AI_HUB_ALLOW_APPLY=true` além de confirmação explícita.
- O CORS aceita apenas o site oficial configurado e os endereços locais de desenvolvimento.
- Antes de aplicar qualquer mudança, revise a resposta do Gemini e mantenha o Codex como supervisor final.
