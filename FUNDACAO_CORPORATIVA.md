# Fundação corporativa do Acessa Board

## Objetivo

Conectar o Acessa Board à mesma infraestrutura Supabase da plataforma Acessa, reutilizando usuários e papéis já existentes. O navegador deixa de ser a fonte oficial; `localStorage` passa a funcionar apenas como cache e contingência de desenvolvimento.

## Componentes implementados

- autenticação por e-mail/senha ou conta Google pelo Supabase Auth;
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

1. Aplicar as migrations de `supabase/migrations` no mesmo projeto Supabase da plataforma Acessa, incluindo `202608130001_google_oauth_invite_only.sql`.
2. Copiar `.env.example` para `.env.local`.
3. Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os mesmos valores públicos usados pela plataforma principal.
4. Reiniciar o servidor do Acessa Board.
5. Entrar com um usuário existente da plataforma.

## Acesso com Google

1. No Supabase, abra **Authentication → Providers → Google** e habilite o provedor com o Client ID e o Client Secret do Google Cloud.
2. No Google Cloud, adicione a URL de callback exibida pelo Supabase às URIs de redirecionamento autorizadas.
3. Em **Authentication → URL Configuration**, cadastre o domínio publicado do Acessa Board e, para desenvolvimento, `http://127.0.0.1:5173/`.
4. Convide cada sócio em **Usuários e acessos** antes do primeiro login Google e atribua o papel correto.

O fluxo é fechado por convite: uma conta Google desconhecida pode autenticar no provedor, mas recebe perfil inativo e não acessa os dados. O convite administrativo ativa o perfil e define o papel do usuário.

## Comportamento

- Sem configuração: indicador `Local`; o protótipo continua funcionando como antes.
- Configurado e sem sessão: o login corporativo bloqueia o conteúdo.
- Usuário com permissão: indicador `Sincronizado`; alterações são gravadas centralmente.
- Colaborador: indicador `Somente leitura`; controles de alteração ficam ocultos.
- Conflito de edição: o sistema não sobrescreve silenciosamente e solicita recarregamento.

## Próxima evolução

O estado corporativo inicial é armazenado como documento JSON versionado para permitir migração rápida sem reescrever a interface. A evolução seguinte deve normalizar gradualmente processos, KPIs, riscos, reuniões, tarefas e carreiras em tabelas próprias, mantendo a mesma camada visual.
