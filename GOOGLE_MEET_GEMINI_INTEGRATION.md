# Google Meet + Gemini no Acessa Board

## Resultado esperado

Cada reunião do Acessa Board pode guardar:

- link do espaço do Google Meet;
- ID do evento do Google Agenda;
- ata e anexos no dossiê privado;
- transcrição e gravação geradas pelo Meet;
- link do Google Docs criado pelo recurso **Anota pra mim**;
- resumo do Gemini e próximos passos.

O Meet deve avisar os participantes quando notas ou transcrição estiverem ativas. A aplicação não deve usar um participante oculto para gravar a chamada.

## Pré-requisitos do Google Workspace

1. Plano do Google Workspace que inclua **Anota pra mim** no Google Meet.
2. Recurso habilitado pelo administrador e controles inteligentes autorizados.
3. APIs habilitadas no projeto Google Cloud:
   - Google Meet REST API;
   - Google Calendar API;
   - Google Drive API;
   - Google Docs API;
   - Google Workspace Events API (para sincronização automática).
4. Aplicativo OAuth interno com redirect HTTPS do Acessa Board.
5. Política de retenção e aviso aos participantes aprovada pela Acessa.

## Fluxo de produção

1. O organizador conecta sua conta Google Workspace ao Acessa Board via OAuth.
2. Ao cadastrar a reunião, o sistema associa `googleCalendarEventId` e `googleMeetUrl`.
3. No evento do Google Agenda, o anfitrião habilita **Anota pra mim** e, se necessário, transcrição automática.
4. O Google informa os participantes quando a captura começa.
5. Após o encerramento, a Google Workspace Events API notifica o backend.
6. O backend usa a Meet REST API para obter o `conferenceRecord`, participantes e artefatos; usa Drive/Docs para ler as notas autorizadas.
7. O Acessa Board grava o link de origem e importa uma cópia ou resumo para `board_documents`, com `relation_type = 'meeting'` e o ID interno da reunião.
8. A ata final pode então ser enviada aos signatários pelo fluxo de assinatura do próprio Acessa Board.

## Segurança

- Tokens OAuth ficam somente no backend/cofre de segredos; nunca no JSON compartilhado ou navegador.
- Solicitar apenas os escopos estritamente necessários e usar acesso offline somente quando a sincronização automática for aprovada.
- Respeitar as permissões do documento no Drive: ver o anexo no evento não significa ter acesso ao conteúdo.
- Registrar importação, autor, data, fonte, ID do evento e hash do arquivo na auditoria.
- Definir prazo de retenção para áudio, vídeo, transcrição, notas e resumos.
- Informar todos os participantes e disponibilizar um procedimento para reunião sem gravação/transcrição quando necessário.

## Configuração ainda necessária

Para ativar a sincronização automática são necessários o domínio Google Workspace da Acessa, um projeto Google Cloud, as credenciais OAuth e a URL pública definitiva do Acessa Board. Sem esses dados, a interface aceita o link do Meet, o ID do evento, o link das notas e o resumo para operação assistida.

