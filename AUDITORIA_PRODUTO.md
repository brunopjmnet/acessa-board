# Auditoria do Acessa Board

Data: 11/07/2026  
Escopo: produto, operação, telecom, dados, datas, KPIs, segurança e usabilidade

## Conclusão executiva

O Acessa Board é um protótipo conceitual bem estruturado de manual empresarial vivo. A navegação, as quatro diretorias e os blocos de governança devem ser preservados. A versão atual, entretanto, ainda não pode ser a fonte oficial de uma empresa: não possui backend, usuários, permissões, auditoria nem backup, e grava parte dos dados somente no navegador.

O build de produção passa. A evolução recomendada é incremental: manter a interface, profissionalizar conteúdo e datas, completar o CRUD e então substituir o `localStorage` por uma API com banco e autenticação.

## Estado atual

| Recurso | Estado | Persistência | Ação recomendada |
| --- | --- | --- | --- |
| Centro de comando | Demonstrativo | Valores calculados e fixos | Manter e conectar às fontes oficiais |
| Governança e RACI | Estático | Código-fonte | Tornar versionado e editável |
| Diretorias | Estático | Código-fonte | Manter e permitir vigência/histórico |
| Processos e manuais | Estático | Código-fonte | Transformar em manual versionado |
| Cargos e carreira | Estático | Código-fonte | Restringir dados salariais por permissão |
| Manual de aprendizado | Estático | Código-fonte | Evoluir para trilhas e comprovação de leitura |
| Indicadores | Demonstrativo | Código-fonte | Criar catálogo de KPIs e medições |
| Riscos | Estático | Código-fonte | Criar CRUD, plano de ação e histórico |
| Execução/tarefas | Parcial | `localStorage` | Completar edição, arquivamento e auditoria |
| Rituais/reuniões | Parcial | `localStorage` | Completar ata, decisões, ações e edição |
| Documentos | Parcial | `localStorage` | Versionar, controlar acesso e armazenar arquivos |
| Auditoria | Demonstrativo | Código-fonte | Substituir por eventos reais e imutáveis |
| Organograma | Parcial | `localStorage` | Completar edição, vigência e histórico |

## Bloqueadores P0

1. Dados importantes ficam no `localStorage` e podem ser perdidos.
2. Não existem autenticação nem autorização.
3. Não existe trilha real de quem criou, alterou ou arquivou registros.
4. O CRUD é incompleto: criar funciona em algumas entidades, editar e excluir não.
5. KPIs, riscos, processos, RACI e diretorias são arrays fixos.
6. Não existem backup, restauração ou versionamento.

## Melhorias P1

1. Corrigir a acentuação de toda a interface e do conteúdo.
2. Padronizar datas civis, instantes, competências e timezone.
3. Consolidar a marca: uma única empresa Acessa, preservando histórico dos seis provedores apenas quando necessário.
4. Criar workflows de elaboração, revisão, aprovação, publicação e arquivamento.
5. Incluir fonte, atualização e responsável em cada indicador.
6. Separar conteúdo público interno de dados confidenciais.
7. Criar integrações graduais com OSS/BSS, atendimento, financeiro e monitoramento.

## O que manter

- a ideia de manual empresarial vivo;
- a navegação por governança, diretorias, processos e execução;
- as quatro diretorias atuais como ponto de partida;
- os modelos RACI, riscos, rituais e evidências;
- o centro de comando como visão executiva;
- o visual responsivo e direto.

## O que alterar

- “Acessa Nordeste/Grupo Acessa” para a identidade institucional aprovada de uma única Acessa;
- dados fixos para registros editáveis e versionados;
- `localStorage` para banco central após validação do modelo;
- auditoria demonstrativa para log imutável;
- datas sem contexto para data, hora, período, timezone e última atualização explícitos;
- exclusão física para arquivamento/inativação na maioria das entidades.

## O que adicionar

### Fundação da plataforma

- usuários, papéis e permissões;
- banco PostgreSQL e API;
- histórico de versões;
- log de auditoria;
- backup e recuperação;
- notificações e aprovações;
- anexos e documentos versionados.

### Manual empresarial

Cada processo deve conter:

1. objetivo;
2. escopo;
3. gatilho de início;
4. entradas e pré-requisitos;
5. responsável, aprovador, consultados e informados;
6. passo a passo;
7. prazo/SLA;
8. sistemas utilizados;
9. evidências obrigatórias;
10. exceções e escalonamento;
11. riscos e controles;
12. KPIs relacionados;
13. versão, vigência, revisor e data da próxima revisão.

### Processos essenciais de um provedor

- lead, viabilidade, venda, contrato, instalação, ativação e primeira cobrança;
- suporte N1/N2/NOC, incidente, manutenção e comunicação ao cliente;
- cancelamento, retenção, churn e retirada de equipamentos;
- planejamento de capacidade de POP, OLT, PON e CTO;
- inventário de ONUs/ONTs, roteadores, materiais e ferramentas;
- compras, estoque, movimentações e fornecedores;
- faturamento, inadimplência, negociação, bloqueio e desbloqueio;
- LGPD, ANATEL, segurança da informação e continuidade;
- gestão de frota e segurança do trabalho;
- pessoas, cargos, treinamento, desempenho e desligamento.

## Política de datas

- Instantes como criação, alteração, aprovação e incidente: UTC no banco (`timestamptz`).
- Datas civis como nascimento, vencimento e competência: tipo `date`, sem conversão de fuso.
- Exibição padrão: `pt-BR`, timezone `America/Sao_Paulo`.
- Reunião deve registrar início, término, timezone e situação.
- Processo e documento devem registrar vigência, versão e próxima revisão.
- KPI deve registrar início/fim do período, data da medição e última atualização.
- Toda tela gerencial deve exibir a fonte e a data/hora da atualização.

## Regras de salvar, alterar e excluir

### Salvar

- validar campos obrigatórios e duplicidade;
- registrar autor e data/hora;
- mostrar confirmação ou erro acionável;
- salvar rascunho quando o fluxo exigir revisão.

### Alterar

- exigir permissão;
- guardar versão anterior para conteúdo governado;
- registrar justificativa em alterações sensíveis;
- impedir sobrescrita silenciosa por dois usuários.

### Excluir

- preferir arquivar, cancelar ou inativar;
- não apagar documentos aprovados, medições, reuniões, riscos ou auditoria;
- permitir exclusão física apenas de rascunhos ou cadastros inválidos, com permissão elevada;
- registrar quem executou a ação e o motivo.

## Catálogo inicial de KPIs

| Área | KPI | Fórmula resumida | Fonte esperada | Frequência | Responsável |
| --- | --- | --- | --- | --- | --- |
| Executivo | Receita recorrente mensal | mensalidades recorrentes ativas | ERP/IXC | diária/mensal | Financeiro |
| Executivo | EBITDA | receita líquida - custos/despesas operacionais | DRE | mensal | Diretoria financeira |
| Comercial | Conversão | vendas aprovadas / leads elegíveis | CRM/IXC | diária | Comercial |
| Comercial | CAC | despesas de aquisição / novos clientes | financeiro/CRM | mensal | Comercial/Financeiro |
| Clientes | Churn | cancelamentos / base ativa inicial | IXC | mensal | Relacionamento |
| Clientes | NPS | % promotores - % detratores | pesquisa | mensal | Relacionamento |
| Atendimento | FCR | resolvidos no primeiro contato / encerrados | atendimento | diária | Relacionamento |
| Atendimento | SLA cumprido | tickets dentro do SLA / encerrados | atendimento | diária | Relacionamento |
| Técnico | Instalação no prazo | instalações no SLA / concluídas | OSS/BSS | diária | Técnica |
| Técnico | Reincidência | retornos no período / OS concluídas | OSS/BSS | semanal | Técnica |
| Rede | Disponibilidade | minutos disponíveis / minutos do período | monitoramento | contínua | NOC |
| Rede | MTTR | tempo de restauração / incidentes | NOC | semanal | NOC |
| Rede | Ocupação PON | ONUs ativas / capacidade configurada | OLT/OSS | diária | Engenharia |
| Financeiro | Inadimplência | saldo vencido / saldo faturado | ERP/IXC | diária | Cobrança |
| Pessoas | Turnover | desligamentos / efetivo médio | RH | mensal | RH |
| Pessoas | Absenteísmo | horas ausentes / horas previstas | ponto | mensal | RH |

Metas não devem ficar codificadas. Cada meta precisa de valor, vigência, unidade, responsável e aprovação.

## Roadmap incremental

### Etapa 1 — profissionalizar o protótipo

- corrigir acentuação e identidade;
- marcar dados demonstrativos;
- completar CRUD local com edição e arquivamento;
- padronizar datas;
- criar exportação/importação de backup local;
- escrever o modelo de dados e permissões.

### Etapa 2 — tornar multiusuário

- adicionar autenticação;
- implantar PostgreSQL/API;
- migrar dados locais;
- criar papéis e permissões;
- registrar auditoria e versões.

### Etapa 3 — tornar o manual vivo

- CRUD de processos, RACI, riscos, indicadores e documentos;
- workflow de aprovação/publicação;
- vigência e revisão periódica;
- busca e trilhas de aprendizado;
- comprovação de leitura.

### Etapa 4 — conectar a operação

- integrar IXC/ERP/CRM/monitoramento;
- alimentar KPIs com dados oficiais;
- criar drill-down até a origem;
- implantar alertas e rotinas de gestão.

## Próximo passo técnico

Executar a Etapa 1 sem trocar a arquitetura: corrigir linguagem e datas, sinalizar dados demonstrativos, implementar edição/arquivamento e backup local. Em paralelo, desenhar o banco e as permissões para que a migração posterior não exija refazer a interface.
