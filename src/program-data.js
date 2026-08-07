export const integrationPhaseBlueprints = [
  {
    id: "phase-1", number: 1, title: "Organização do programa",
    description: "Definir responsáveis, rotina de gestão, atas, decisões, documentos e dados faltantes.",
    items: ["Definir patrocinador", "Definir coordenador da integração", "Definir líderes de cada frente", "Cadastrar representantes das seis empresas", "Cadastrar rotina de reuniões", "Criar modelo de ata", "Criar registro de decisões", "Criar matriz de responsabilidades", "Definir regras de aprovação", "Organizar repositório de documentos", "Identificar dados faltantes"],
  },
  {
    id: "phase-2", number: 2, title: "Fundamentos e sociedade",
    description: "Formalizar a Acessa, holdings, participações, governança e pareceres profissionais.",
    items: ["Validar propósito, missão, visão e valores", "Vincular comprovante do CNPJ da Acessa", "Definir estrutura de S.A.", "Cadastrar holdings e beneficiários", "Diferenciar sócios atuais e acionistas da Acessa", "Formalizar acordo de acionistas", "Definir direitos de voto e regras de decisão", "Definir critérios de rateio", "Contratar assessoria jurídica", "Registrar validação da Contaxx"],
  },
  {
    id: "phase-3", number: 3, title: "Diagnóstico das seis empresas",
    description: "Coletar dados comparáveis, com fonte, competência, responsável, validação e evidência.",
    items: ["Diagnosticar PJMNET", "Diagnosticar Megalink", "Diagnosticar ISPTEC", "Diagnosticar PointNet", "Diagnosticar TurboLink", "Diagnosticar Linax", "Conferir documentos faltantes", "Identificar divergências entre fontes"],
  },
  {
    id: "phase-4", number: 4, title: "Modelo operacional da Acessa",
    description: "Decidir o que será centralizado, compartilhado, mantido, substituído ou migrado depois.",
    items: ["Definir modelo comercial", "Definir atendimento e suporte", "Definir operação de campo", "Definir NOC e redes", "Definir financeiro e cobrança", "Definir contabilidade", "Definir compras e estoque", "Definir marketing e pessoas", "Definir jurídico e contratos", "Definir sistemas e segurança", "Definir gestão de frota"],
  },
  {
    id: "phase-5", number: 5, title: "Preparação",
    description: "Preparar pessoas, prédios, sistemas, rede, comunicação, treinamento e contingência.",
    items: ["Validar organograma, cargos e salários", "Definir alocação das pessoas", "Comparar prédios e unidades", "Definir NOC, administrativo e almoxarifado", "Aprovar planos comerciais", "Aprovar marca e comunicação", "Preparar treinamentos", "Preparar IXC", "Preparar rede", "Preparar evento", "Aprovar plano de continuidade", "Aprovar plano de contingência"],
  },
  {
    id: "phase-6", number: 6, title: "Pilotos",
    description: "Validar uma migração controlada antes de qualquer movimento em massa.",
    items: ["Escolher escopo piloto", "Definir critérios de sucesso", "Confirmar backup", "Testar migração", "Reconciliar registros", "Testar faturamento", "Testar atendimento e suporte", "Testar estoque e integrações", "Testar comunicação", "Validar plano de retorno", "Registrar e corrigir falhas", "Aprovar avanço"],
  },
  {
    id: "phase-7", number: 7, title: "Migração por ondas",
    description: "Migrar empresas, cidades e grupos de clientes com janela, suporte e aprovação.",
    items: ["Definir ondas e escopos", "Definir responsáveis e equipes", "Quantificar clientes por onda", "Definir janela de mudança", "Validar comunicação", "Validar riscos e plano de retorno", "Reforçar suporte", "Executar reconciliação", "Registrar aceite técnico", "Registrar aceite financeiro", "Aprovar cada onda"],
  },
  {
    id: "phase-8", number: 8, title: "Estabilização",
    description: "Acompanhar clientes, faturamento, rede, incidentes, satisfação e economias realizadas.",
    items: ["Acompanhar clientes afetados", "Acompanhar chamados e incidentes", "Comparar faturamento e cobranças", "Corrigir contratos", "Acompanhar rede e NOC", "Medir satisfação e cancelamentos", "Medir economias realizadas", "Encerrar pendências", "Registrar aprendizados"],
  },
];

export const ixcStageBlueprints = [
  "Inventário dos sistemas atuais", "Versões e integrações", "Bancos e cadastros", "Mapeamento entre campos", "Limpeza e deduplicação", "Padronização", "Ambiente de teste", "Migração piloto", "Reconciliação", "Operação paralela", "Migração por ondas", "Estabilização", "Desativação controlada dos sistemas antigos",
].map((title, index) => ({ id: `ixc-${index + 1}`, order: index + 1, title }));

export const zeroImpactGateBlueprint = [
  "Responsável definido", "Análise de risco", "Plano de comunicação", "Backup confirmado", "Plano de retorno", "Equipe de suporte", "Critérios de sucesso", "Validação técnica", "Validação financeira", "Aprovação registrada",
].map((label, index) => ({ id: `zero-impact-${index + 1}`, label }));

export const preliminaryRevenue = [
  ["PJMNET", 600000], ["Megalink", 400000], ["ISPTEC", 540000], ["PointNet", 450000], ["TurboLink", 400000], ["Linax", 440000],
].map(([company, grossRevenue]) => ({
  id: `revenue-${company.toLowerCase()}`,
  company,
  grossRevenue,
  netRevenue: null,
  billed: null,
  received: null,
  delinquency: null,
  referenceDate: "",
  source: "Informado no briefing do projeto",
  owner: "",
  evidence: "",
  validation: "Preliminar",
  note: "Referência aproximada; não utilizar como número contábil oficial.",
}));

export const programFronts = [
  { id: "society", title: "Sociedade e holdings", description: "Sócios atuais, holdings, acionistas da Acessa, participações e aprovações.", view: "governance" },
  { id: "finance", title: "Financeiro, contábil e tributário", description: "Contaxx, fechamentos, cenários, rateios, custos e documentos.", view: "expenses" },
  { id: "people", title: "Pessoas, cargos e salários", description: "Estrutura consolidada, competências, alocação e acesso restrito.", view: "people-transition" },
  { id: "buildings", title: "Prédios e estrutura física", description: "Comparação de unidades para administração, NOC, atendimento e estoque.", view: "program" },
  { id: "fleet", title: "Veículos, cidades e logística", description: "Cobertura, sobreposição, demanda, SLA, custos e contingência.", view: "program" },
  { id: "network", title: "Rede neutra e anéis ópticos", description: "Interligações, capacidade, redundância, obras, riscos e aceite.", view: "implementation" },
  { id: "corporate", title: "Clientes corporativos", description: "Contratos, SLA, links dedicados, IP fixo e migração separada.", view: "commercial" },
  { id: "marketing", title: "Marketing e preparação dos clientes", description: "Campanhas, mensagens, artes, aprovações e comprovação de publicação.", view: "program" },
  { id: "event", title: "Evento de apresentação", description: "Planejamento, fornecedores, roteiro, contingência e acompanhamento.", view: "program" },
  { id: "synergies", title: "Sinergias e economias", description: "Economia estimada, aprovada, contratada e efetivamente realizada.", view: "synergies" },
  { id: "ixc", title: "Migração para o IXC", description: "Inventário, saneamento, piloto, reconciliação, ondas e estabilização.", view: "migration" },
  { id: "continuity", title: "Impacto zero ao cliente", description: "Riscos, controles obrigatórios, incidentes, comunicação e aprendizados.", view: "continuity" },
];

export const synergyCategories = ["Links e trânsito", "Sistemas", "Contabilidade", "Jurídico", "Marketing", "Prédios", "Energia", "Compras", "Estoque", "Veículos", "Combustíveis", "Seguros", "Fornecedores", "Contratos", "Equipamentos", "Rede", "Pessoas", "Atendimento", "Operação"];

export const expansionStages = ["Identificado", "Contato inicial", "Reunião", "NDA", "Informações preliminares", "Diligência", "Proposta", "Negociação", "Aprovação", "Integração", "Encerrado"];

export const glossaryEntries = [
  ["Governança", "Regras que definem quem decide, quem executa e como as decisões são registradas."],
  ["Holding", "Empresa criada para deter participações em outras empresas."],
  ["Acionista", "Pessoa ou empresa que possui ações de uma sociedade anônima."],
  ["Rateio", "Divisão de um custo entre empresas conforme um critério aprovado."],
  ["Diligência", "Conferência estruturada de informações, documentos, riscos e obrigações."],
  ["Lucro Real", "Regime tributário calculado a partir do lucro contábil ajustado. A definição exige análise profissional."],
  ["S.A.", "Sociedade anônima cujo capital é dividido em ações."],
  ["Indicador", "Medida usada para acompanhar resultado, qualidade, prazo ou risco."],
  ["SLA", "Prazo ou nível de serviço acordado para uma entrega ou atendimento."],
  ["NOC", "Centro responsável por monitorar a rede e coordenar incidentes."],
  ["ERP", "Sistema integrado usado para controlar processos e dados empresariais."],
  ["IXC", "ERP escolhido para a unificação operacional das seis empresas."],
  ["Rede neutra", "Infraestrutura compartilhada que pode atender várias empresas com regras de uso e rateio."],
  ["Anel óptico", "Rota de fibra em formato redundante para reduzir interrupções."],
  ["Reconciliação", "Comparação entre origem e destino para confirmar que os dados migraram corretamente."],
  ["Evidência", "Documento, foto, contrato, relatório ou registro que comprova uma entrega."],
  ["Risco", "Situação incerta que pode prejudicar prazo, custo, operação ou clientes."],
  ["Bloqueio", "Impedimento atual que precisa ser resolvido para a atividade avançar."],
  ["Migração por ondas", "Transferência gradual de grupos controlados, em vez de migrar tudo de uma vez."],
  ["Plano de retorno", "Procedimento para voltar ao estado anterior quando uma mudança falha."],
];
