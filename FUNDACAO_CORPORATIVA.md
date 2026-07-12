# Fundação corporativa do Acessa Board

## Objetivo

Conectar o Acessa Board à mesma infraestrutura Supabase da plataforma Acessa, reutilizando usuários e papéis já existentes. O navegador deixa de ser a fonte oficial; `localStorage` passa a funcionar apenas como cache e contingência de desenvolvimento.

## Componentes implementados

- autenticação pelo Supabase Auth;
- sincronização central do estado do Board;
- controle de concorrência por versão;
- atualização em tempo real entre usuários;
- papéis e acesso somente leitura;
- auditoria de atualizações no banco;
- metadados de documentos;
- bucket privado para documentos;
- migração inicial do conteúdo local;
- fallback local quando a conexão corporativa não está configurada.

## Papéis

| Papel da plataforma | Papel no Board | Acesso inicial |
| --- | --- | --- |
| admin | admin | administração e edição |
| rh | rh | pessoas, carreira e edição |
| gestor | gestor | edição operacional |
| líder | gestor | edição operacional |
| colaborador | colaborador | leitura |

Os papéis `socio`, `diretor` e `auditor` podem ser atribuídos diretamente em `board_profiles`.

## Ativação

1. Aplicar a migration `supabase/migrations/202607120001_acessa_board_foundation.sql` no mesmo projeto Supabase da plataforma Acessa.
2. Copiar `.env.example` para `.env.local`.
3. Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os mesmos valores públicos usados pela plataforma principal.
4. Reiniciar o servidor do Acessa Board.
5. Entrar com um usuário existente da plataforma.

## Comportamento

- Sem configuração: indicador `Local`; o protótipo continua funcionando como antes.
- Configurado e sem sessão: o login corporativo bloqueia o conteúdo.
- Usuário com permissão: indicador `Sincronizado`; alterações são gravadas centralmente.
- Colaborador: indicador `Somente leitura`; controles de alteração ficam ocultos.
- Conflito de edição: o sistema não sobrescreve silenciosamente e solicita recarregamento.

## Próxima evolução

O estado corporativo inicial é armazenado como documento JSON versionado para permitir migração rápida sem reescrever a interface. A evolução seguinte deve normalizar gradualmente processos, KPIs, riscos, reuniões, tarefas e carreiras em tabelas próprias, mantendo a mesma camada visual.
