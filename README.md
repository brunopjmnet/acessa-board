# Acessa Board

MVP local para controlar reunioes, tarefas, documentos, lembretes e responsabilidades do grupo empresarial Acessa.

## Objetivo

Criar um SaaS simples, sem login nesta fase, preparado para ser conectado depois a outro projeto que ja possui entrada de usuarios.

## Modulos iniciais

- Dashboard com resumo operacional.
- Quadro de tarefas com status, responsavel, prazo, prioridade e checklist.
- Reunioes com pauta, participantes, decisoes e atalhos para email/WhatsApp.
- Biblioteca de documentos com links e responsaveis.
- Organograma com funcoes e responsabilidades.

## Regra de simplicidade

Este projeto deve evitar complexidade precoce. Primeiro validar o fluxo com dados locais. Depois evoluir para banco, login integrado, armazenamento de documentos e automacoes reais.

## Proximos passos sugeridos

1. Validar se os modulos do MVP fazem sentido para a rotina dos socios.
2. Definir campos obrigatorios de reuniao e tarefa.
3. Escolher onde os documentos serao armazenados.
4. Definir como sera a integracao com email e WhatsApp.
5. Conectar ao projeto existente de login.

## Fundação corporativa

A conexão com o Supabase, autenticação, papéis, persistência central, auditoria e documentos já está preparada. Consulte `FUNDACAO_CORPORATIVA.md` e aplique a migration em `supabase/migrations` para ativar o modo multiusuário.
