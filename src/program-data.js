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

// Receita e despesas reais das 6 empresas — fonte: Faturamento-Acessa.xlsx (Drive, dez/25–abr/26).
// Dados validados pelo grupo. Não substituem demonstrativo contábil oficial.
export const preliminaryRevenue = [
  {
    company: "PJMNET",
    grossRevenue: 689777,
    participation: 0.2414,
    monthlyDividend: 96569,
    operationalCosts: 292505,
    payroll: 70904,
    revenueHistory: [
      { month: "2025-12", value: 630448.83 },
      { month: "2026-01", value: 709309.21 },
      { month: "2026-02", value: 635669.62 },
      { month: "2026-03", value: 741519.16 },
      { month: "2026-04", value: 731938.86 },
    ],
    source: "Faturamento-Acessa.xlsx – Drive (dez/25–abr/26)", validation: "Confirmado",
    referenceDate: "2026-04-30", owner: "Bruno",
    note: "Maior empresa do grupo (24,14%). Folha R$ 70.904. Links R$ 70.239.",
    svaUsers: 3427, svaCost: 10305, abrintONTs: 125,
  },
  {
    company: "ISPTEC",
    grossRevenue: 525043,
    participation: 0.1838,
    monthlyDividend: 73506,
    operationalCosts: 310203,
    payroll: 62306,
    revenueHistory: [
      { month: "2025-12", value: 498570.15 },
      { month: "2026-01", value: 549203.13 },
      { month: "2026-02", value: 493682.71 },
      { month: "2026-03", value: 545209.05 },
      { month: "2026-04", value: 538550.64 },
    ],
    source: "Faturamento-Acessa.xlsx – Drive (dez/25–abr/26)", validation: "Confirmado",
    referenceDate: "2026-04-30", owner: "Rodrigo",
    note: "2ª maior empresa (18,38%). Alto custo de links (R$ 101.649) e tributário (R$ 65.559).",
    svaUsers: 0, svaCost: 0, abrintONTs: 50,
  },
  {
    company: "Linax",
    grossRevenue: 451085,
    participation: 0.1507,
    monthlyDividend: 60291,
    operationalCosts: 217091,
    payroll: 60400,
    revenueHistory: [
      { month: "2025-12", value: 434713.60 },
      { month: "2026-01", value: 420703.93 },
      { month: "2026-02", value: 410070.76 },
      { month: "2026-03", value: 459716.64 },
      { month: "2026-04", value: 428042.44 },
      { month: "2026-05", value: 471402.59 },
      { month: "2026-06", value: 460793.66 },
      { month: "2026-07", value: 476484.60 },
    ],
    source: "Faturamento-Acessa.xlsx + Planilha Linax Drive (dez/25–jul/26)", validation: "Confirmado",
    referenceDate: "2026-07-31", owner: "Harley",
    note: "Crescimento consistente. 24 funcionários (11 Soluções + 13 Internet). 8 meses de dados.",
    svaUsers: 900, svaCost: 6936, abrintONTs: 125,
  },
  {
    company: "PointNet",
    grossRevenue: 416417,
    participation: 0.1457,
    monthlyDividend: 58298,
    operationalCosts: 250510,
    payroll: 75101,
    revenueHistory: [
      { month: "2025-12", value: 426425.77 },
      { month: "2026-01", value: 359485.80 },
      { month: "2026-02", value: 456662.39 },
      { month: "2026-03", value: 421193.98 },
      { month: "2026-04", value: 418317.46 },
    ],
    source: "Faturamento-Acessa.xlsx – Drive (dez/25–abr/26)", validation: "Confirmado",
    referenceDate: "2026-04-30", owner: "Shisley",
    note: "Maior folha salarial do grupo (R$ 75.101). SVA R$ 21.686. ONT R$ 45.442.",
    svaUsers: 400, svaCost: 4076, abrintONTs: 130,
  },
  {
    company: "TurboLink",
    grossRevenue: 410008,
    participation: 0.1435,
    monthlyDividend: 57401,
    operationalCosts: 194232,
    payroll: 56300,
    revenueHistory: [
      { month: "2025-12", value: 447628.26 },
      { month: "2026-01", value: 394462.50 },
      { month: "2026-02", value: 369854.63 },
      { month: "2026-03", value: 441141.16 },
      { month: "2026-04", value: 396953.86 },
    ],
    source: "Faturamento-Acessa.xlsx – Drive (dez/25–abr/26)", validation: "Confirmado",
    referenceDate: "2026-04-30", owner: "Adson",
    note: "Menor custo operacional do grupo (R$ 194.232). Bom controle de despesas.",
    svaUsers: 400, svaCost: 3976, abrintONTs: 85,
  },
  {
    company: "Megalink",
    grossRevenue: 385458,
    participation: 0.1349,
    monthlyDividend: 53964,
    operationalCosts: 147077,
    payroll: 31367,
    revenueHistory: [
      { month: "2025-12", value: 394156.95 },
      { month: "2026-01", value: 377208.92 },
      { month: "2026-02", value: 374632.43 },
      { month: "2026-03", value: 399449.95 },
      { month: "2026-04", value: 381842.10 },
    ],
    source: "Faturamento-Acessa.xlsx – Drive (dez/25–abr/26)", validation: "Confirmado",
    referenceDate: "2026-04-30", owner: "Felipe",
    note: "Menor folha (R$ 31.367) e menor custo total. Menor participação (13,49%).",
    svaUsers: 700, svaCost: 2885, abrintONTs: 85,
  },
].map((item) => ({
  id: `revenue-${item.company.toLowerCase().replace(/[^a-z]/g, "")}`,
  netRevenue: null,
  billed: null,
  received: null,
  delinquency: null,
  referenceDate: "",
  evidence: "",
  ...item,
}));

// Totais consolidados do grupo (dez/25–abr/26)
export const groupFinancials = {
  monthlyRevenue: 2857353,
  annualizedValuation: 71433824,
  dividendRate: 0.14,
  monthlyDividend: 400029,
  monthlyOperationalCosts: 1411618,
  payrollTotal: 356379,
  linksTotal: 254677,
  taxesTotal: 305189,
  source: "Faturamento-Acessa.xlsx – Drive (dez/25–abr/26)",
};

export const programFronts = [
  { id: "society", title: "Sociedade e holdings", description: "Sócios atuais, holdings, acionistas da Acessa, participações e aprovações.", view: "governance" },
  { id: "finance", title: "Financeiro, contábil e tributário", description: "Contaxx, fechamentos, cenários, rateios, custos e documentos.", view: "expenses" },
  { id: "people", title: "Pessoas, cargos e salários", description: "Estrutura consolidada, competências, alocação e acesso restrito.", view: "people-transition" },
  { id: "buildings", title: "Prédios e estrutura física", description: "Comparação de unidades para administração, NOC, atendimento e estoque.", view: "start" },
  { id: "fleet", title: "Veículos, cidades e logística", description: "Cobertura, sobreposição, demanda, SLA, custos e contingência.", view: "start" },
  { id: "network", title: "Rede neutra e anéis ópticos", description: "Interligações, capacidade, redundância, obras, riscos e aceite.", view: "implementation" },
  { id: "corporate", title: "Clientes corporativos", description: "Contratos, SLA, links dedicados, IP fixo e migração separada.", view: "commercial" },
  { id: "marketing", title: "Marketing e preparação dos clientes", description: "Campanhas, mensagens, artes, aprovações e comprovação de publicação.", view: "start" },
  { id: "event", title: "Evento de apresentação", description: "Planejamento, fornecedores, roteiro, contingência e acompanhamento.", view: "start" },
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
