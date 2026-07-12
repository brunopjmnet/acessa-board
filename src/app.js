import {
  cloudConfigured,
  isPasswordRecoveryRedirect,
  isUserInviteRedirect,
  inviteBoardUser,
  listBoardProfiles,
  loadCloudContext,
  onAuthEvent,
  requestPasswordReset,
  saveCloudState,
  signIn,
  signOut,
  subscribeToWorkspace,
  updateBoardProfile,
  updatePassword,
} from "./cloud.js";

const statuses = [
  { id: "todo", label: "A fazer" },
  { id: "doing", label: "Em andamento" },
  { id: "waiting", label: "Aguardando" },
  { id: "done", label: "Concluído" },
  { id: "archived", label: "Arquivo" },
];

const storageKey = "acessa-board-state-v4";
const backupVersion = 1;
const stateCollections = ["tasks", "meetings", "documents", "people"];

const defaultAreas = [
  {
    id: "comercial-b2b",
    name: "Diretoria Comercial B2B",
    owner: "Rodrigo",
    headcount: 6,
    purpose: "Crescimento da receita empresarial, grandes contas, vendas corporativas e licitacoes.",
    teams: ["Vendas corporativas", "Grandes contas", "Licitacoes"],
    processes: ["Prospeccao B2B", "Propostas comerciais", "Licitacoes", "Gestao da carteira empresarial"],
    indicators: ["Receita B2B", "Conversao B2B", "Ticket medio", "Ciclo de venda"],
  },
  {
    id: "comercial-b2c",
    name: "Diretoria Comercial B2C",
    owner: "Felipe Cassiano",
    headcount: 12,
    purpose: "Crescimento da base residencial, vendas, marketing integral e operacao de backoffice comercial.",
    teams: ["Vendas B2C", "Marketing", "Backoffice comercial"],
    processes: ["Vendas residenciais", "Vendas internas", "Backoffice comercial", "Analise de midia", "Gestao de trafego", "Design e criacoes"],
    indicators: ["Receita B2C", "Conversao B2C", "CAC", "Leads gerados"],
  },
  {
    id: "admin",
    name: "Diretoria Administrativo-Financeira",
    owner: "Bruno",
    headcount: 28,
    purpose: "Controle economico, pessoas, conformidade, compras, almoxarifado, TI e base administrativa.",
    teams: ["Seguranca do trabalho", "Administrativo", "Departamento pessoal", "Recursos humanos", "Fiscal", "Financeiro", "Compras", "Almoxarifado", "TI"],
    processes: ["Contas a pagar", "Contas a receber", "Renatas", "Admissao", "Demissao", "Beneficios", "Compras", "Estoque", "Equipamentos", "Sistemas internos"],
    indicators: ["Fluxo de caixa", "Inadimplencia", "Custo operacional", "Prazo de compra"],
  },
  {
    id: "relacionamento",
    name: "Diretoria Relacionamento",
    owner: "Shisley",
    headcount: 36,
    purpose: "Experiencia do cliente, suporte, SAC, retencao, satisfacao, cobranca e gestao da base.",
    teams: ["Suporte tecnico", "SAC", "Retencao", "Satisfacao", "Cobranca", "Gestao da base"],
    processes: ["Apoio ao usuario N1", "Apoio ao usuario N2", "Encantamento", "Troca de plano", "NPS", "Pos-atendimento", "Inadimplencia", "Refidelizacao", "Venda na base"],
    indicators: ["NPS", "Churn", "Tempo de atendimento", "Base ativa"],
  },
  {
    id: "tecnica-operacoes",
    name: "Diretoria Tecnica de Operacoes",
    owner: "Harley",
    headcount: 50,
    purpose: "Executar instalacoes, manutencoes, retiradas e mudancas com produtividade, qualidade, seguranca e cumprimento de prazos.",
    teams: ["Operacional B2B", "Operacional B2C", "Campo", "Frota", "Logistica"],
    processes: ["Agendamento", "Ativacao", "Manutencao", "Instalacao", "Retiradas", "Mudancas", "Controle de combustivel", "Logistica de materiais"],
    indicators: ["SLA de campo", "Instalacoes", "Reincidencia", "Produtividade"],
  },
  {
    id: "tecnica-infra-noc",
    name: "Diretoria Tecnica de Infraestrutura e NOC",
    owner: "Lailson Araujo",
    headcount: 20,
    purpose: "Garantir disponibilidade, capacidade e evolucao da rede por meio da infraestrutura, backbone, projetos, NOC e gestao de incidentes.",
    teams: ["Infraestrutura", "NOC", "Backbone", "Projetos de rede", "Telefonia"],
    processes: ["Monitoramento de rede", "Gestao de incidentes", "Backbone", "Projetos", "Capacidade", "Telefonia", "Pos-mortem"],
    indicators: ["Disponibilidade", "MTTR", "Capacidade de rede", "Incidentes criticos"],
  },
  {
    id: "regional",
    name: "Diretoria Regional",
    owner: "Adson",
    headcount: 1,
    purpose: "Coordenar o desempenho das regioes, integrar as diretorias, acompanhar metas, expansao, operacao e relacionamento institucional.",
    teams: ["Integracao regional", "Expansao", "Relacionamento institucional"],
    processes: ["Plano regional", "Acompanhamento das diretorias", "Expansao territorial", "Analise de resultados", "Articulacao institucional"],
    indicators: ["Resultado regional", "Crescimento", "SLA consolidado", "Execucao do plano"],
  },
];

const defaultKpis = [
  { id: "kpi-receita-nova", area: "Comercial", name: "Receita nova", value: "92%", target: "100%", trend: "+8%", status: "good" },
  { id: "kpi-conversao", area: "Comercial", name: "Conversao de leads", value: "31%", target: "35%", trend: "+3%", status: "watch" },
  { id: "kpi-fechamento", area: "Administrativo-Financeira", name: "Fechamento mensal", value: "D+3", target: "D+2", trend: "-1 dia", status: "watch" },
  { id: "kpi-compras", area: "Administrativo-Financeira", name: "Compras no prazo", value: "87%", target: "95%", trend: "+5%", status: "watch" },
  { id: "kpi-nps", area: "Relacionamento", name: "NPS", value: "71", target: "75", trend: "+4", status: "good" },
  { id: "kpi-churn", area: "Relacionamento", name: "Churn", value: "2.8%", target: "2.2%", trend: "-0.3%", status: "risk" },
  { id: "kpi-sla", area: "Tecnica de Operacoes", name: "SLA de campo", value: "89%", target: "96%", trend: "+2%", status: "risk" },
  { id: "kpi-disponibilidade", area: "Tecnica de Infraestrutura e NOC", name: "Disponibilidade de rede", value: "99.3%", target: "99.7%", trend: "0.0%", status: "watch" },
];

const defaultRisks = [
  { id: "risco-processos-manuais", title: "Dependencia de processos manuais", area: "Administrativo-Financeira", probability: 4, impact: 4, owner: "Bruno", mitigation: "Automatizar aprovacao, compras, contratos e fechamento mensal.", status: "Em tratamento" },
  { id: "risco-sla-tecnico", title: "Disponibilidade e resposta a incidentes abaixo da meta", area: "Tecnica de Infraestrutura e NOC", probability: 4, impact: 5, owner: "Lailson Araujo", mitigation: "Fortalecer monitoramento, capacidade, escalonamento e gestao de incidentes do NOC.", status: "Em tratamento" },
  { id: "risco-churn", title: "Churn e retencao sem causa raiz consolidada", area: "Relacionamento", probability: 4, impact: 4, owner: "Shisley", mitigation: "Classificar motivos, cruzar NPS e acionar plano de recuperacao.", status: "Aberto" },
  { id: "risco-capacidade", title: "Crescimento comercial sem governanca de capacidade", area: "Comercial", probability: 3, impact: 4, owner: "Rodrigo", mitigation: "Conectar metas comerciais com capacidade tecnica e estoque.", status: "Aberto" },
  { id: "risco-indicadores", title: "Indicadores dispersos entre diretorias", area: "Conselho de Socios", probability: 4, impact: 4, owner: "Conselho", mitigation: "Definir pacote executivo semanal com dono, meta, tendencia e acao.", status: "Em tratamento" },
];

const defaultGovernance = [
  { id: "forum-conselho", code: "GOV-01", forum: "Conselho de Socios", type: "Estrategico", cadence: "Mensal", mandate: "Capital, estrategia, riscos, investimentos e aprovacoes de alto impacto.", owner: "Conselho de Socios", secretary: "Bruno", quorum: "Maioria dos socios", evidence: "Ata assinada e registro das decisoes", decisionAuthority: "Estrategia, capital, endividamento, M&A e investimentos fora do orcamento", reviewDate: "2026-12-15", version: 1, status: "Ativo" },
  { id: "forum-executivo", code: "GOV-02", forum: "Comite Executivo", type: "Executivo", cadence: "Semanal", mandate: "Prioridades, metas, travas entre diretorias e acompanhamento dos indicadores.", owner: "Adson", secretary: "PMO Acessa", quorum: "Diretor Regional e maioria das diretorias", evidence: "Pauta, ata, decisoes e plano de acao", decisionAuthority: "Prioridades e remanejamentos dentro do orcamento aprovado", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
  { id: "forum-war-room", code: "GOV-03", forum: "War room operacional", type: "Operacional", cadence: "Semanal", mandate: "SLA de campo, capacidade, NOC, atendimento, estoque e incidentes operacionais.", owner: "Harley e Lailson Araujo", secretary: "PMO Acessa", quorum: "Operacoes, Infraestrutura/NOC e Relacionamento", evidence: "Painel de indicadores, incidentes e plano de recuperacao", decisionAuthority: "Contingencia operacional e priorizacao de filas", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
  { id: "forum-riscos", code: "GOV-04", forum: "Comite de Riscos e Auditoria", type: "Controle", cadence: "Mensal", mandate: "Riscos corporativos, controles, evidencias, nao conformidades e planos corretivos.", owner: "Bruno", secretary: "Controladoria", quorum: "Administrativo-Financeira e donos dos riscos", evidence: "Mapa de riscos, testes de controle e atas", decisionAuthority: "Planos corretivos e escalonamento ao Conselho", reviewDate: "2026-10-15", version: 1, status: "Ativo" },
  { id: "forum-comercial", code: "GOV-05", forum: "Comite Comercial e Capacidade", type: "Tatico", cadence: "Semanal", mandate: "Integrar demanda B2B/B2C, marketing, capacidade de instalacao, estoque e metas de crescimento.", owner: "Rodrigo e Felipe Cassiano", secretary: "Backoffice Comercial", quorum: "B2B, B2C, Marketing, Operacoes e Financeiro", evidence: "Forecast, funil, capacidade e decisoes registradas", decisionAuthority: "Campanhas e priorizacao comercial dentro das metas aprovadas", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
];

const defaultRaci = [
  { id: "raci-expansao", code: "EST-001", area: "Diretoria Regional", category: "Estrategico", process: "Investimentos e expansao territorial", responsible: "Adson", approver: "Conselho de Socios", consulted: "Bruno, Rodrigo, Felipe, Harley e Lailson", informed: "Diretorias", authority: "Conselho conforme orcamento e valor do investimento", evidence: "Business case e ata de aprovacao", reviewDate: "2026-12-15", version: 1, status: "Ativo" },
  { id: "raci-campanhas", code: "COM-001", area: "Comercial B2C", category: "Comercial", process: "Campanhas, ofertas e metas B2C", responsible: "Marketing e Backoffice Comercial", approver: "Felipe Cassiano", consulted: "Harley, Bruno e Shisley", informed: "Adson e Conselho", authority: "Dentro do orcamento comercial aprovado", evidence: "Briefing, orcamento, meta e resultado", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
  { id: "raci-compras", code: "ADM-001", area: "Administrativo-Financeira", category: "Financeiro", process: "Compras, estoque e equipamentos", responsible: "Compras e Almoxarifado", approver: "Bruno", consulted: "Harley e Lailson Araujo", informed: "Adson", authority: "Conforme politica de alcadas e orcamento", evidence: "Cotacoes, pedido, aprovacao e recebimento", reviewDate: "2026-10-15", version: 1, status: "Ativo" },
  { id: "raci-retencao", code: "REL-001", area: "Relacionamento", category: "Cliente", process: "Retencao, churn e refidelizacao", responsible: "Equipe de Retencao", approver: "Shisley", consulted: "Felipe Cassiano, Bruno e Operacoes", informed: "Adson", authority: "Politica comercial e limites de desconto aprovados", evidence: "Motivo, oferta, aceite e resultado", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
  { id: "raci-sla", code: "TEC-001", area: "Tecnica de Infraestrutura e NOC", category: "Tecnico", process: "Disponibilidade, NOC e incidentes criticos", responsible: "NOC", approver: "Lailson Araujo", consulted: "Harley e Shisley", informed: "Adson e Conselho", authority: "Contingencia tecnica e escalonamento de incidentes", evidence: "Evento NOC, comunicados e pos-mortem", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
  { id: "raci-instalacao", code: "OPE-001", area: "Tecnica de Operacoes", category: "Operacional", process: "Instalacao, manutencao e qualidade de campo", responsible: "Supervisao de Campo", approver: "Harley", consulted: "Lailson Araujo, Shisley e Almoxarifado", informed: "Adson", authority: "Priorizacao de equipes e agenda operacional", evidence: "OS, fotos, testes e aceite do cliente", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
  { id: "raci-vendas-b2b", code: "B2B-001", area: "Comercial B2B", category: "Comercial", process: "Propostas, precificacao e contratos B2B", responsible: "Equipe Comercial B2B", approver: "Rodrigo", consulted: "Bruno, Lailson Araujo e Juridico", informed: "Adson", authority: "Margem, prazo e desconto conforme politica comercial", evidence: "Viabilidade, proposta, aprovacao e contrato", reviewDate: "2026-10-01", version: 1, status: "Ativo" },
  { id: "raci-fechamento", code: "FIN-001", area: "Administrativo-Financeira", category: "Financeiro", process: "Fechamento financeiro e gerencial", responsible: "Financeiro e Controladoria", approver: "Bruno", consulted: "Diretorias", informed: "Adson e Conselho", authority: "Politicas contabeis e calendario de fechamento", evidence: "Conciliacoes, DRE, fluxo de caixa e parecer", reviewDate: "2026-10-15", version: 1, status: "Ativo" },
];

const defaultProcessManuals = [
  {
    id: "processo-mapa-cliente",
    title: "Mapa do cliente",
    area: "Relacionamento",
    owner: "Shisley",
    objective: "Mapear a jornada completa do assinante, do primeiro contato ao cancelamento ou expansao de plano.",
    steps: ["Origem do lead", "Consulta de viabilidade", "Venda", "Agendamento", "Instalacao", "Boas-vindas", "Suporte", "Retencao", "Renovacao"],
    evidence: "CRM, contrato, ordem de servico, NPS, historico de atendimento e motivo de churn.",
  },
  {
    id: "processo-instalacao-fibra",
    title: "Instalacao de cliente fibra",
    area: "Tecnica",
    owner: "Harley",
    objective: "Garantir instalacao padronizada, segura, documentada e com validacao de qualidade.",
    steps: ["Confirmar agendamento", "Checar material", "Validar rota", "Executar instalacao", "Testar sinal", "Registrar fotos", "Orientar cliente", "Fechar OS"],
    evidence: "OS concluida, fotos, teste de velocidade, potencia optica e aceite do cliente.",
  },
  {
    id: "processo-suporte-n1-n2",
    title: "Atendimento e suporte N1/N2",
    area: "Relacionamento",
    owner: "Shisley",
    objective: "Resolver demandas com triagem clara, escalonamento correto e linguagem padronizada.",
    steps: ["Identificar cliente", "Classificar motivo", "Executar checklist N1", "Escalar N2/NOC", "Comunicar prazo", "Registrar solucao", "Medir satisfacao"],
    evidence: "Ticket, motivo, tempo de atendimento, solucao aplicada e avaliacao.",
  },
  {
    id: "processo-incidente-rede",
    title: "Manutencao e incidente de rede",
    area: "Tecnica",
    owner: "Lailson Araujo",
    objective: "Reduzir indisponibilidade e garantir comunicacao executiva em incidentes criticos.",
    steps: ["Detectar alarme", "Abrir incidente", "Classificar impacto", "Acionar equipe", "Comunicar areas", "Resolver causa", "Registrar pos-mortem"],
    evidence: "Evento NOC, tempo fora, causa raiz, clientes afetados e plano preventivo.",
  },
  {
    id: "processo-compras-estoque",
    title: "Compras, estoque e equipamentos",
    area: "Administrativo-Financeira",
    owner: "Bruno",
    objective: "Controlar solicitacoes, aprovacao, recebimento, estoque e rastreio de equipamentos.",
    steps: ["Solicitar compra", "Validar orcamento", "Aprovar alcada", "Emitir pedido", "Receber item", "Lancar estoque", "Vincular ao projeto"],
    evidence: "Pedido, nota fiscal, aprovacao, entrada em estoque e responsavel pela retirada.",
  },
  {
    id: "processo-cargos-carreira",
    title: "Plano de cargo e carreira",
    area: "Recursos Humanos",
    owner: "Bruno",
    objective: "Padronizar cargos, faixas salariais, competencias e caminho de crescimento.",
    steps: ["Definir área de carreira", "Criar níveis", "Mapear competências", "Definir faixa salarial", "Avaliar desempenho", "Aprovar promoção"],
    evidence: "Descricao do cargo, matriz salarial, avaliacao e historico de evolucao.",
  },
];

const attentionCareerModel = {
  id: "carreira-atendimento",
  modelVersion: 3,
  family: "Atendimento, vendas e cobrança",
  directorate: "Relacionamento e Comercial",
  mission: "Desenvolver profissionais multicanais capazes de atender, vender, cobrar, reter clientes e formar futuras lideranças da Acessa.",
  levels: ["Atendente Trainee", "Atendente Júnior", "Atendente Pleno", "Atendente Sênior", "Líder de Atendimento", "Supervisor Comercial e Atendimento", "Coordenador Comercial", "Gerente Comercial"],
  salary: "R$ 1.750 a R$ 18.000 + variável",
  confidentiality: "Restrito",
  competencies: ["Comunicação", "Vendas", "Cobrança", "CRM", "Retenção", "Experiência do cliente"],
  requirements: ["Nota mínima de 85 pontos por 3 meses consecutivos", "Disponibilidade de vaga", "Treinamentos obrigatórios concluídos", "Aprovação da liderança e do RH"],
  trainings: ["Técnicas de vendas", "Negociação", "Cobrança inteligente", "Atendimento ao cliente", "Comunicação", "Inteligência emocional", "Sistemas da Acessa", "OPA e robôs de atendimento", "Produtos e serviços da empresa"],
  next: "Trilha de liderança ou especialização",
  levelDetails: [
    { name: "Atendente Trainee", time: "0 a 3 meses", pay: "R$ 1.750 fixo | bônus até R$ 250", responsibilities: ["Atendimento por WhatsApp, telefone e chat", "Cadastro de clientes e atualização do CRM", "Aprender processos e cumprir roteiros"], promotion: ["Aprovação na experiência", "Boa comunicação e baixo índice de erros", "Conhecimento dos planos, frequência e pontualidade"] },
    { name: "Atendente Júnior", time: "3 a 12 meses", pay: "R$ 1.950 fixo | variável até R$ 600", responsibilities: ["Atendimento completo e cobrança de inadimplentes", "Venda ativa, recuperação e retenção", "Uso de robôs e solução de problemas simples"], indicators: ["Nota de atendimento", "Tempo de resposta", "Conversão", "Recuperação", "Organização do CRM"] },
    { name: "Atendente Pleno", time: "1 a 2 anos", pay: "R$ 2.350 fixo | variável até R$ 900", responsibilities: ["Atender casos complexos", "Apoiar e treinar novos colaboradores", "Melhorar processos e acompanhar indicadores"], promotion: ["Alta produtividade", "Baixo índice de reclamações", "Qualidade e metas constantes"] },
    { name: "Atendente Sênior", time: "2 anos ou desempenho equivalente", pay: "R$ 2.900 fixo | variável até R$ 1.200", responsibilities: ["Ser referência técnica e resolver conflitos", "Apoiar a supervisão e treinar a equipe", "Criar materiais e acompanhar metas"], promotion: ["Liderança", "Excelente comunicação", "Domínio dos sistemas"] },
    { name: "Líder de Atendimento", time: "Conforme vaga e desempenho", pay: "R$ 3.800 fixo | variável até R$ 1.500", responsibilities: ["Gerenciar rotina, reuniões e indicadores", "Avaliar e desenvolver colaboradores", "Participar de contratações"], indicators: ["SLA", "NPS", "Conversão", "Inadimplência", "Cancelamentos", "Tempo médio de atendimento"] },
    { name: "Supervisor Comercial e Atendimento", time: "Conforme vaga e desempenho", pay: "R$ 5.200 fixo | variável até R$ 2.500", responsibilities: ["Supervisionar comercial, cobrança e retenção", "Integrar pós-venda e atendimento", "Gerenciar líderes e desenvolver estratégias"] },
    { name: "Coordenador Comercial", time: "Conforme estrutura organizacional", pay: "R$ 7.500 fixo | variável até R$ 4.000", responsibilities: ["Coordenar metas, canais e capacidade da operação", "Integrar marketing, vendas, cobrança e relacionamento", "Desenvolver supervisores e líderes"] },
    { name: "Gerente Comercial", time: "Conforme estrutura organizacional", pay: "R$ 12.000 a R$ 18.000 | variável até 35%", responsibilities: ["Definir estratégia comercial e orçamento", "Responder por receita, retenção e produtividade", "Formar lideranças e prestar contas à diretoria"] },
  ],
  scorecard: [
    ["Pontualidade", 10], ["Assiduidade", 10], ["Qualidade do atendimento", 20], ["Conhecimento técnico", 15],
    ["Vendas", 20], ["Cobrança", 15], ["Organização", 5], ["Trabalho em equipe", 5],
  ],
  bonuses: ["Meta de vendas", "Recuperação de inadimplentes", "Redução de cancelamentos", "Avaliação dos clientes", "Menor tempo de resposta", "Ideias que gerem economia ou melhorias"],
  careerPaths: {
    leadership: ["Atendente", "Líder", "Supervisor", "Coordenador", "Gerente"],
    specialist: ["Atendente", "Especialista em Vendas", "Especialista em Retenção", "Analista de CRM e Automação", "Consultor Comercial"],
  },
};

const careerModel = ({ id, family, directorate, mission, levels, salary, competencies, levelDetails, scorecard, bonuses, leadership, specialist, next }) => ({
  id, family, directorate, mission, levels, salary, competencies, levelDetails, scorecard, bonuses, next,
  modelVersion: 3,
  confidentiality: "Restrito",
  requirements: ["Mínimo de 85 pontos por três meses", "Treinamentos concluídos", "Disponibilidade de vaga", "Aprovação da liderança e do RH"],
  trainings: ["Cultura e processos Acessa", "Segurança e LGPD", "Indicadores da área", "Comunicação e trabalho em equipe", "Formação técnica da função"],
  careerPaths: { leadership, specialist },
});

const directorCareerModel = careerModel({
  id: "carreira-diretoria", family: "Diretoria e gestão executiva", directorate: "Conselho e todas as diretorias",
  mission: "Transformar a estratégia da Acessa em crescimento sustentável, governança, resultados e desenvolvimento de lideranças.",
  levels: ["Gerente", "Diretor", "Diretor Executivo"], salary: "R$ 10.000 a R$ 28.000 + variável", next: "Conselho / CEO",
  competencies: ["Estratégia", "Pessoas", "Orçamento", "Riscos", "Governança", "Indicadores"],
  levelDetails: [
    { name:"Gerente", time:"3 a 5 anos de liderança", pay:"R$ 10.000 a R$ 14.000 | variável até 20%", responsibilities:["Gerenciar orçamento, metas e equipes", "Integrar processos e apresentar resultados"], indicators:["Orçamento", "Metas", "Turnover", "SLA"] },
    { name:"Diretor", time:"Conforme sucessão executiva", pay:"R$ 15.000 a R$ 20.000 | variável até 30%", responsibilities:["Definir estratégia da diretoria", "Responder por resultado, riscos e pessoas"], indicators:["EBITDA", "Receita/custo", "NPS", "Riscos"] },
    { name:"Diretor Executivo", time:"Conforme decisão societária", pay:"R$ 22.000 a R$ 28.000 | variável até 40%", responsibilities:["Integrar toda a companhia", "Executar estratégia aprovada pelo conselho"], indicators:["EBITDA", "Caixa", "Crescimento", "Governança"] },
  ],
  scorecard:[["Resultado econômico",25],["Execução estratégica",20],["Pessoas e sucessão",15],["Governança",15],["Cliente",10],["Riscos",10],["Inovação",5]],
  bonuses:["EBITDA acima da meta", "Crescimento sustentável", "Redução de riscos", "NPS e retenção", "Projetos estratégicos"],
  leadership:["Gerente","Diretor","Diretor Executivo","Conselho / CEO"], specialist:["Gerente especialista","Head corporativo","Consultor executivo","Conselheiro técnico"],
});

const leadershipCareerModel = careerModel({
  id:"carreira-lideranca", family:"Liderança operacional", directorate:"Todas as diretorias", mission:"Formar líderes que organizem rotinas, desenvolvam equipes e entreguem indicadores com segurança e previsibilidade.",
  levels:["Líder","Supervisor","Coordenador","Gerente"], salary:"R$ 3.500 a R$ 14.000 + variável", next:"Diretoria",
  competencies:["Gestão de pessoas","Rotina","SLA","Feedback","Conflitos","Indicadores"],
  levelDetails:[
    {name:"Líder",time:"12 a 24 meses de destaque",pay:"R$ 3.500 a R$ 4.500 | variável até R$ 800",responsibilities:["Distribuir rotina e apoiar a equipe","Acompanhar qualidade e produtividade"],indicators:["SLA","Qualidade","Absenteísmo"]},
    {name:"Supervisor",time:"2 a 3 anos de liderança",pay:"R$ 5.000 a R$ 6.500 | variável até R$ 1.500",responsibilities:["Supervisionar metas, escala e desempenho","Treinar líderes e corrigir desvios"],indicators:["Produtividade","Retrabalho","Turnover"]},
    {name:"Coordenador",time:"3 a 5 anos de liderança",pay:"R$ 7.000 a R$ 9.500 | variável até R$ 2.500",responsibilities:["Integrar equipes e processos","Planejar capacidade e orçamento"],indicators:["Custo","SLA","Capacidade","Clima"]},
    {name:"Gerente",time:"Conforme sucessão",pay:"R$ 10.000 a R$ 14.000 | variável até 20%",responsibilities:["Responder pelo resultado da área","Formar sucessores e reportar à diretoria"],indicators:["Resultado","Pessoas","Cliente","Risco"]},
  ],
  scorecard:[["Entrega de metas",25],["Gestão de pessoas",20],["Qualidade",15],["SLA",15],["Desenvolvimento",10],["Disciplina",10],["Melhoria",5]],
  bonuses:["Meta da equipe","Qualidade e SLA","Redução de retrabalho","Turnover controlado","Projetos de melhoria"],
  leadership:["Líder","Supervisor","Coordenador","Gerente","Diretor"],specialist:["Líder técnico","Especialista","Consultor interno","Head técnico"],
});

const technicalCareerModel = careerModel({
  id:"carreira-tecnica", family:"Técnica, campo e redes", directorate:"Técnica", mission:"Garantir instalações, manutenção, redes e disponibilidade com produtividade, segurança e excelência técnica.",
  levels:["Auxiliar Técnico","Técnico I","Técnico II","Técnico Sênior","Especialista de Redes","Líder Técnico"], salary:"R$ 1.850 a R$ 7.500 + produtividade", next:"Liderança técnica ou engenharia de redes",
  competencies:["Fibra óptica","Instalação","Redes","Segurança","Diagnóstico","Documentação"],
  levelDetails:[
    {name:"Auxiliar Técnico",time:"0 a 6 meses",pay:"R$ 1.850 fixo | produtividade até R$ 300",responsibilities:["Apoiar instalações e organizar materiais","Seguir checklist e normas de segurança"],indicators:["Pontualidade","Segurança","Checklist"]},
    {name:"Técnico I",time:"6 a 18 meses",pay:"R$ 2.300 fixo | produtividade até R$ 700",responsibilities:["Executar instalações padrão","Registrar fotos, sinal e evidências"],indicators:["OS/dia","Retrabalho","Prazo"]},
    {name:"Técnico II",time:"1,5 a 3 anos",pay:"R$ 3.000 fixo | produtividade até R$ 1.000",responsibilities:["Resolver falhas complexas","Apoiar técnicos iniciantes"],indicators:["Solução no primeiro atendimento","Qualidade","SLA"]},
    {name:"Técnico Sênior",time:"3 anos ou certificação equivalente",pay:"R$ 4.000 fixo | produtividade até R$ 1.300",responsibilities:["Diagnosticar incidentes críticos","Padronizar execução e treinar equipe"],indicators:["Disponibilidade","MTTR","Retrabalho"]},
    {name:"Especialista de Redes",time:"Especialização comprovada",pay:"R$ 5.500 a R$ 6.800 | bônus até 15%",responsibilities:["Projetar e otimizar redes","Atuar em causa raiz e capacidade"],indicators:["Disponibilidade","Capacidade","Incidentes"]},
    {name:"Líder Técnico",time:"Conforme vaga e liderança",pay:"R$ 6.000 a R$ 7.500 | variável até R$ 1.800",responsibilities:["Gerir equipe e produtividade","Planejar escala, materiais e qualidade"],indicators:["SLA","Produtividade","Segurança","Custo"]},
  ],
  scorecard:[["Qualidade técnica",20],["Produtividade",20],["SLA",15],["Segurança",15],["Retrabalho",10],["Documentação",10],["Cliente",5],["Equipe",5]],
  bonuses:["Produtividade com qualidade","Zero retrabalho","SLA cumprido","Plantão e criticidade conforme política","Economia de materiais"],
  leadership:["Técnico","Líder Técnico","Supervisor de Campo","Coordenador Técnico","Gerente Técnico"],specialist:["Técnico","Técnico Sênior","Especialista de Redes","Arquiteto de Redes","Consultor Técnico"],
});

const administrativeCareerModel = careerModel({
  id:"carreira-administrativo", family:"Administrativo-financeira e pessoas", directorate:"Administrativo-Financeira", mission:"Assegurar controles, pessoas, compras, finanças e conformidade para o crescimento sustentável da Acessa.",
  levels:["Assistente","Analista Júnior","Analista Pleno","Analista Sênior","Especialista","Coordenador"], salary:"R$ 1.900 a R$ 9.000 + variável", next:"Gerência administrativo-financeira",
  competencies:["Controles","Financeiro","Compras","RH/DP","Compliance","Análise"],
  levelDetails:[
    {name:"Assistente",time:"0 a 18 meses",pay:"R$ 1.900 a R$ 2.300 | bônus até R$ 250",responsibilities:["Executar registros e conferências","Organizar documentos e prazos"],indicators:["Prazo","Erros","Pendências"]},
    {name:"Analista Júnior",time:"1 a 2 anos",pay:"R$ 2.600 a R$ 3.200 | bônus até R$ 500",responsibilities:["Analisar rotinas e conciliações","Apoiar fechamentos e controles"],indicators:["Acurácia","Prazo","Conformidade"]},
    {name:"Analista Pleno",time:"2 a 4 anos",pay:"R$ 3.500 a R$ 4.500 | bônus até R$ 800",responsibilities:["Conduzir processos completos","Criar análises e melhorias"],indicators:["Fechamento","Economia","Automação"]},
    {name:"Analista Sênior",time:"4 anos ou domínio equivalente",pay:"R$ 4.800 a R$ 6.000 | bônus até R$ 1.200",responsibilities:["Atuar em temas complexos","Orientar analistas e controlar riscos"],indicators:["Risco","Auditoria","Previsão"]},
    {name:"Especialista",time:"Especialização comprovada",pay:"R$ 6.000 a R$ 7.500 | bônus até 15%",responsibilities:["Definir padrões e políticas","Liderar projetos corporativos"],indicators:["Compliance","Eficiência","Projeto"]},
    {name:"Coordenador",time:"Conforme vaga e liderança",pay:"R$ 7.500 a R$ 9.000 | variável até 20%",responsibilities:["Coordenar equipe e calendário","Responder por orçamento e controles"],indicators:["Orçamento","Prazo","Auditoria","Pessoas"]},
  ],
  scorecard:[["Precisão",20],["Prazo",20],["Conformidade",15],["Controle de custos",15],["Produtividade",10],["Melhoria",10],["Cliente interno",5],["Equipe",5]],
  bonuses:["Fechamento no prazo","Economia comprovada","Zero não conformidade","Automação de processos","Projeto estratégico"],
  leadership:["Assistente","Analista","Coordenador","Gerente","Diretor"],specialist:["Analista","Sênior","Especialista","Controller / BP","Consultor corporativo"],
});

const commercialCareerModel = careerModel({
  id:"carreira-comercial", family:"Comercial e expansão", directorate:"Comercial", mission:"Gerar crescimento rentável, previsível e conectado à capacidade de instalação e à experiência do cliente.",
  levels:["Consultor Júnior","Consultor Pleno","Executivo Sênior","Supervisor Comercial","Coordenador Comercial","Gerente Comercial"], salary:"R$ 1.900 a R$ 16.000 + comissão", next:"Diretoria Comercial",
  competencies:["Prospecção","CRM","Negociação","Conversão","Carteira","Previsibilidade"],
  levelDetails:[
    {name:"Consultor Júnior",time:"0 a 12 meses",pay:"R$ 1.900 fixo | comissão estimada R$ 400 a R$ 1.200",responsibilities:["Prospectar e qualificar clientes","Registrar funil e fechar vendas padrão"],indicators:["Conversão","Receita","CRM"]},
    {name:"Consultor Pleno",time:"1 a 2 anos",pay:"R$ 2.400 fixo | comissão estimada R$ 800 a R$ 2.000",responsibilities:["Gerir carteira e negociações","Vender soluções combinadas"],indicators:["Ticket médio","Conversão","Churn inicial"]},
    {name:"Executivo Sênior",time:"2 anos ou alta performance",pay:"R$ 3.200 fixo | comissão estimada R$ 1.500 a R$ 4.000",responsibilities:["Conduzir contas estratégicas e B2B","Apoiar formação de vendedores"],indicators:["MRR","Margem","Pipeline"]},
    {name:"Supervisor Comercial",time:"Conforme vaga e liderança",pay:"R$ 5.000 fixo | variável R$ 1.500 a R$ 3.500",responsibilities:["Supervisionar equipe e funil","Garantir cadência e qualidade da venda"],indicators:["Meta da equipe","Conversão","Forecast"]},
    {name:"Coordenador Comercial",time:"3 a 5 anos de liderança",pay:"R$ 7.500 fixo | variável R$ 2.500 a R$ 5.000",responsibilities:["Coordenar canais e territórios","Integrar marketing, vendas e instalação"],indicators:["CAC","Receita","Capacidade","Churn"]},
    {name:"Gerente Comercial",time:"Conforme sucessão",pay:"R$ 11.000 a R$ 16.000 | variável até 40%",responsibilities:["Definir estratégia e orçamento comercial","Responder por crescimento e margem"],indicators:["Receita","EBITDA","CAC","LTV"]},
  ],
  scorecard:[["Receita/margem",25],["Conversão",20],["CRM e forecast",15],["Qualidade da venda",15],["Carteira",10],["Inadimplência inicial",5],["Disciplina",5],["Equipe",5]],
  bonuses:["Venda instalada e adimplente","Meta de receita recorrente","Margem mínima","Mix de produtos","Retenção da carteira","Acelerador por supermeta"],
  leadership:["Consultor","Supervisor","Coordenador","Gerente","Diretor Comercial"],specialist:["Consultor","Executivo B2B","Key Account","Especialista em Expansão","Consultor estratégico"],
});

const tenureByLevel = ["Na admissão", "6 meses", "1 ano", "2 anos", "3 anos", "4 anos", "5 anos", "6 anos"];
const benefitsForLevel = (index) => [
  "Vale-alimentação ou refeição",
  "Vale-transporte ou auxílio mobilidade",
  "Plano de saúde conforme política",
  "Seguro de vida",
  "Desconto em serviços Acessa",
  ...(index >= 1 ? ["Reconhecimento por tempo de casa"] : []),
  ...(index >= 2 ? ["Auxílio-educação conforme política"] : []),
  ...(index >= 3 ? ["Plano odontológico conforme política"] : []),
  ...(index >= 4 ? ["Bônus de retenção ou benefício adicional por tempo de empresa"] : []),
];
const defaultBenefitTiers = () => [
  { tenure: "Na admissão", label: "Benefícios essenciais", benefits: ["Vale-alimentação ou refeição", "Vale-transporte ou auxílio mobilidade", "Plano de saúde conforme política", "Seguro de vida", "Desconto em serviços Acessa"] },
  { tenure: "1 ano de empresa", label: "Reconhecimento inicial", benefits: ["Benefícios essenciais", "Reconhecimento anual", "Auxílio-educação conforme política"] },
  { tenure: "3 anos de empresa", label: "Permanência e desenvolvimento", benefits: ["Benefícios anteriores", "Plano odontológico conforme política", "Prioridade em programas internos de desenvolvimento"] },
  { tenure: "5 anos de empresa", label: "Reconhecimento por trajetória", benefits: ["Benefícios anteriores", "Bonificação ou prêmio de permanência conforme política", "Folga comemorativa por tempo de casa"] },
  { tenure: "10 anos de empresa", label: "Reconhecimento especial", benefits: ["Benefícios anteriores", "Reconhecimento institucional", "Benefício adicional definido pela diretoria"] },
];
const withTenureBenefits = (track) => ({
  ...track,
  modelVersion: 5,
  benefitTiers: track.benefitTiers?.length ? track.benefitTiers : defaultBenefitTiers(),
  levelDetails: (track.levelDetails || []).map((level, index) => ({
    ...level,
    companyTenure: level.companyTenure || tenureByLevel[index] || `${index} anos`,
    benefits: level.benefits?.length ? level.benefits : benefitsForLevel(index),
  })),
});
const defaultCareerTracks = [directorCareerModel, leadershipCareerModel, technicalCareerModel, attentionCareerModel, administrativeCareerModel, commercialCareerModel].map(withTenureBenefits);
const careerModelById = Object.fromEntries(defaultCareerTracks.map((track) => [track.id, track]));

const learningModules = [
  { audience: "Diretores", title: "Como conduzir a diretoria por indicadores", lessons: ["Definir meta", "Ler tendencia", "Cobrar plano de acao", "Escalar risco", "Prestar contas ao conselho"] },
  { audience: "Lideres", title: "Como liderar rotina operacional", lessons: ["Abrir reuniao diaria", "Distribuir fila", "Treinar equipe", "Registrar evidencias", "Fechar pendencias"] },
  { audience: "Tecnicos", title: "Padrao de instalacao e manutencao", lessons: ["Checklist de seguranca", "Padrao de fotos", "Teste de sinal", "Comunicacao com cliente", "Fechamento da OS"] },
  { audience: "Atendimento", title: "Jornada do cliente e retencao", lessons: ["Identificar momento do cliente", "Classificar motivo", "Usar script correto", "Escalar com contexto", "Medir satisfacao"] },
  { audience: "Administrativo", title: "Controle, evidencia e conformidade", lessons: ["Validar documento", "Registrar aprovacao", "Organizar evidencias", "Controlar prazo", "Reportar excecao"] },
  { audience: "Todos", title: "Cultura operacional Acessa", lessons: ["Cliente em primeiro lugar", "Dono claro", "Processo escrito", "Evidencia registrada", "Melhoria continua"] },
];

const audits = [
  { control: "Dono por processo critico", owner: "Diretorias", cadence: "Mensal", evidence: "Mapa de diretorias e rotinas", status: "Em implantacao" },
  { control: "Ata e decisoes do Conselho", owner: "Conselho de Socios", cadence: "Mensal", evidence: "Ritual Conselho de Socios", status: "Ativo" },
  { control: "Indicador com meta e tendencia", owner: "Controladoria", cadence: "Semanal", evidence: "Painel de KPIs", status: "Em implantacao" },
  { control: "Risco com mitigacao e responsavel", owner: "Diretoria responsavel", cadence: "Quinzenal", evidence: "Mapa de riscos", status: "Ativo" },
  { control: "Rastreio de acoes criticas", owner: "PMO Acessa", cadence: "Semanal", evidence: "Quadro operacional", status: "Ativo" },
];

const seed = {
  businessModelVersion: 9,
  auditLog: [],
  areas: defaultAreas,
  careerTracks: defaultCareerTracks,
  kpis: defaultKpis,
  processManuals: defaultProcessManuals,
  risks: defaultRisks,
  governance: defaultGovernance,
  raci: defaultRaci,
  tasks: [
    {
      id: crypto.randomUUID(),
      title: "Fechar pacote executivo de indicadores por diretoria",
      owner: "Conselho de Socios",
      due: "2026-07-18",
      priority: "Critica",
      status: "doing",
      checklist: ["Definir indicador", "Definir meta", "Definir dono", "Definir frequencia"],
    },
    {
      id: crypto.randomUUID(),
      title: "Criar torre de controle de SLA tecnico e NOC",
      owner: "Diretoria Tecnica",
      due: "2026-07-22",
      priority: "Critica",
      status: "todo",
      checklist: ["Separar instalacao e manutencao", "Definir filas", "Publicar SLA", "Reportar reincidencias"],
    },
    {
      id: crypto.randomUUID(),
      title: "Conectar funil comercial com capacidade de ativacao",
      owner: "Diretoria Comercial",
      due: "2026-07-23",
      priority: "Alta",
      status: "todo",
      checklist: ["Separar B2B/B2C", "Projetar demanda", "Validar agenda tecnica"],
    },
    {
      id: crypto.randomUUID(),
      title: "Implantar rotina de churn, NPS e recuperacao da base",
      owner: "Diretoria Relacionamento",
      due: "2026-07-26",
      priority: "Alta",
      status: "doing",
      checklist: ["Classificar motivos", "Gerar lista de risco", "Acionar plano de retencao"],
    },
    {
      id: crypto.randomUUID(),
      title: "Padronizar fluxo de compras, estoque e equipamentos",
      owner: "Diretoria Administrativo-Financeira",
      due: "2026-07-29",
      priority: "Alta",
      status: "waiting",
      checklist: ["Mapear aprovadores", "Definir alçadas", "Auditar estoque", "Criar status de pedido"],
    },
  ],
  meetings: [
    {
      id: crypto.randomUUID(),
      title: "Conselho de Socios",
      date: "2026-07-20",
      time: "09:00",
      participants: "Bruno, Harley, Shirley, Adson, Filipe, Rodrigo",
      agenda: "Indicadores gerais, riscos, investimentos, prioridades e aprovacoes.",
      decisions: "Validar metas e responsaveis por diretoria.",
    },
    {
      id: crypto.randomUUID(),
      title: "War room operacional",
      date: "2026-07-22",
      time: "15:00",
      participants: "Comercial, Administrativo-Financeira, Relacionamento e Tecnica",
      agenda: "SLA, capacidade, base de clientes, estoque, frota, cobranca e dependencias.",
      decisions: "Atualizar quadro operacional apos a reuniao.",
    },
    {
      id: crypto.randomUUID(),
      title: "Comite de experiencia do cliente",
      date: "2026-07-24",
      time: "10:30",
      participants: "Relacionamento, Tecnica e Comercial",
      agenda: "NPS, churn, suporte tecnico, ativacoes, reclamacoes recorrentes e plano de recuperacao.",
      decisions: "Definir donos de causa raiz.",
    },
  ],
  documents: [
    {
      id: crypto.randomUUID(),
      title: "Organograma executivo Acessa Nordeste",
      type: "Governanca",
      owner: "Conselho de Socios",
      link: "https://lucid.app/lucidchart/32e8d609-a1c2-4657-b86a-7b6d332855b7/edit",
      note: "Referencia atual com diretorias, cargos, equipes e volumes por area.",
    },
    {
      id: crypto.randomUUID(),
      title: "Pacote executivo semanal",
      type: "Indicadores",
      owner: "Controladoria",
      link: "#",
      note: "Metas, realizado, tendencia, risco e acao por diretoria.",
    },
    {
      id: crypto.randomUUID(),
      title: "Matriz de responsabilidades",
      type: "RACI",
      owner: "PMO Acessa",
      link: "#",
      note: "Dono, aprovador, consultado e informado para processos criticos.",
    },
  ],
  people: [
    {
      id: "conselho",
      name: "Conselho de Socios",
      role: "Decisao estrategica e aprovacao",
      area: "Governanca",
      level: "Conselho",
      salary: "Pro-labore / distribuicao",
      managerId: "",
      type: "Conselho",
      responsibilities: "Diretrizes, metas, investimentos, riscos e prioridades corporativas.",
      contact: "conselho@acessa.local",
    },
    { id: "dir-comercial", name: "Rodrigo", role: "Diretor Comercial B2B", area: "Comercial B2B", level: "Diretor", salary: "R$ 15.000", managerId: "conselho", type: "Diretor", responsibilities: "Estratégia comercial B2B, carteira corporativa, licitações, metas e expansão empresarial.", contact: "rodrigo@acessa.local" },
    { id: "dir-comercial-b2c", name: "Felipe Cassiano", role: "Diretor Comercial B2C", area: "Comercial B2C", level: "Diretor", salary: "A definir", managerId: "conselho", type: "Diretor", responsibilities: "Estratégia comercial B2C, vendas residenciais, marketing integral, backoffice comercial, conversão e crescimento da base.", contact: "felipe.cassiano@acessa.local" },
    { id: "lider-b2b", name: "Lider B2B", role: "Supervisor B2B", area: "Comercial B2B", level: "Lider", salary: "R$ 6.500", managerId: "dir-comercial", type: "Lider", responsibilities: "Carteira corporativa, metas B2B, propostas e previsao de vendas.", contact: "b2b@acessa.local" },
    { id: "lider-marketing", name: "Lider Marketing", role: "Coordenacao de marketing", area: "Comercial B2C", level: "Lider", salary: "R$ 5.800", managerId: "dir-comercial-b2c", type: "Lider", responsibilities: "Marketing integral da Acessa, campanhas, trafego, criativos, conteudo, marca e geracao de demanda.", contact: "marketing@acessa.local" },
    { id: "dir-admin", name: "Bruno", role: "Diretor Administrativo-Financeiro", area: "Administrativo-Financeira", level: "Diretor", salary: "R$ 18.000", managerId: "conselho", type: "Diretor", responsibilities: defaultAreas[2].purpose, contact: "bruno@acessa.local" },
    { id: "lider-rh", name: "Lider RH", role: "Coordenacao de RH/DP", area: "Administrativo-Financeira", level: "Lider", salary: "R$ 6.200", managerId: "dir-admin", type: "Lider", responsibilities: "Admissao, demissao, cargos, carreira, treinamento e desempenho.", contact: "rh@acessa.local" },
    { id: "lider-compras", name: "Lider Compras", role: "Analista lider de compras", area: "Administrativo-Financeira", level: "Lider", salary: "R$ 5.500", managerId: "dir-admin", type: "Lider", responsibilities: "Compras, cotacoes, estoque, equipamentos e controles de entrega.", contact: "compras@acessa.local" },
    { id: "dir-relacionamento", name: "Shisley", role: "Diretora de Relacionamento", area: "Relacionamento", level: "Diretor", salary: "R$ 15.000", managerId: "conselho", type: "Diretor", responsibilities: defaultAreas[3].purpose, contact: "shisley@acessa.local" },
    { id: "lider-sac", name: "Lider SAC", role: "Supervisao SAC", area: "Relacionamento", level: "Lider", salary: "R$ 5.200", managerId: "dir-relacionamento", type: "Lider", responsibilities: "Atendimento, triagem, scripts, qualidade e escalonamento.", contact: "sac@acessa.local" },
    { id: "analista-sac-1", name: "Analista SAC I", role: "Atendente SAC", area: "Relacionamento", level: "Equipe", salary: "R$ 2.100", managerId: "lider-sac", type: "Equipe", responsibilities: "Atender clientes, registrar tickets, seguir scripts e escalar casos fora do padrao.", contact: "sac1@acessa.local" },
    { id: "lider-retencao", name: "Lider Retencao", role: "Supervisao de retencao", area: "Relacionamento", level: "Lider", salary: "R$ 5.700", managerId: "dir-relacionamento", type: "Lider", responsibilities: "Churn, NPS, recuperacao da base e campanhas de fidelizacao.", contact: "retencao@acessa.local" },
    { id: "dir-regional-adson", name: "Adson", role: "Diretor Regional", area: "Diretoria Regional", level: "Diretor", salary: "R$ 18.000", managerId: "conselho", type: "Diretor", responsibilities: "Coordenar o desempenho regional, integrar diretorias, acompanhar metas, expansão, operação e relacionamento institucional nas regiões atendidas.", contact: "adson@acessa.local" },
    { id: "dir-tecnica-operacoes", name: "Harley", role: "Diretor Tecnico de Operacoes", area: "Tecnica de Operacoes", level: "Diretor", salary: "A definir", managerId: "conselho", type: "Diretor", responsibilities: defaultAreas[4].purpose, contact: "harley@acessa.local" },
    { id: "dir-tecnica", name: "Lailson Araujo", role: "Diretor Tecnico de Infraestrutura e NOC", area: "Tecnica de Infraestrutura e NOC", level: "Diretor", salary: "A definir", managerId: "conselho", type: "Diretor", responsibilities: defaultAreas[5].purpose, contact: "lailson.araujo@acessa.local" },
    { id: "lider-noc", name: "Lider NOC", role: "Coordenacao NOC", area: "Tecnica de Infraestrutura e NOC", level: "Lider", salary: "R$ 7.500", managerId: "dir-tecnica", type: "Lider", responsibilities: "Monitoramento, incidentes, disponibilidade, escalonamento e pos-mortem.", contact: "noc@acessa.local" },
    { id: "lider-campo", name: "Lider Campo", role: "Supervisor de campo", area: "Tecnica de Operacoes", level: "Lider", salary: "R$ 6.800", managerId: "dir-tecnica-operacoes", type: "Lider", responsibilities: "Instalacao, manutencao, retirada, agenda e produtividade tecnica.", contact: "campo@acessa.local" },
    { id: "tecnico-campo-1", name: "Tecnico Campo I", role: "Tecnico de instalacao", area: "Tecnica de Operacoes", level: "Equipe", salary: "R$ 2.400", managerId: "lider-campo", type: "Equipe", responsibilities: "Instalar clientes, registrar evidencias, testar sinal e fechar ordem de servico.", contact: "campo1@acessa.local" },
  ],
};

let state = loadState();

const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".nav-item");
const taskModal = document.querySelector("#task-modal");
const taskForm = document.querySelector("#task-form");
const taskModalTitle = document.querySelector("#task-modal-title");
const simpleModal = document.querySelector("#simple-modal");
const simpleForm = document.querySelector("#simple-form");
const simpleTitle = document.querySelector("#simple-title");
const simpleFields = document.querySelector("#simple-fields");
const themeToggle = document.querySelector("#theme-toggle");
const cloudStatus = document.querySelector("#cloud-status");
const accountButton = document.querySelector("#account-button");
const authGate = document.querySelector("#auth-gate");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const recoveryForm = document.querySelector("#recovery-form");
const recoveryMessage = document.querySelector("#recovery-message");
const newPasswordForm = document.querySelector("#new-password-form");
const newPasswordMessage = document.querySelector("#new-password-message");
const forgotPasswordButton = document.querySelector("#forgot-password");
const backToLoginButton = document.querySelector("#back-to-login");
const usersNav = document.querySelector("#users-nav");
const adminNavLabel = document.querySelector("#admin-nav-label");
const usersTableBody = document.querySelector("#users-table-body");
const usersMessage = document.querySelector("#users-message");
const refreshUsersButton = document.querySelector("#refresh-users");
const inviteUserForm = document.querySelector("#invite-user-form");
let simpleMode = null;
let simpleEditId = null;
let taskEditId = null;
let activeCareerTrackId = null;
let careerLevelContext = null;
let careerBenefitContext = null;
let cloudSaveTimer = null;
let unsubscribeWorkspace = () => {};
let passwordRecoveryPending = isPasswordRecoveryRedirect || isUserInviteRedirect;
const cloudContext = {
  configured: cloudConfigured,
  connected: false,
  workspaceId: null,
  version: null,
  role: "local",
  canEdit: !cloudConfigured,
  currentUserId: null,
};

function showAuthPanel(panel) {
  authGate.hidden = false;
  authForm.hidden = panel !== "login";
  recoveryForm.hidden = panel !== "recovery";
  newPasswordForm.hidden = panel !== "new-password";
}

function clearDialogContext(dialog) {
  if (dialog === taskModal) taskEditId = null;
  if (dialog === simpleModal) {
    simpleEditId = null;
    careerLevelContext = null;
    careerBenefitContext = null;
  }
}

document.querySelectorAll("[data-dialog-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = document.querySelector(`#${button.dataset.dialogClose}`);
    if (!(dialog instanceof HTMLDialogElement)) return;
    clearDialogContext(dialog);
    dialog.close("cancel");
  });
});

[taskModal, simpleModal].forEach((dialog) => {
  dialog.addEventListener("cancel", () => clearDialogContext(dialog));
});

function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.title = dark ? "Ativar tema claro" : "Ativar tema escuro";
  themeToggle.innerHTML = dark ? "☀ <span>Tema claro</span>" : "◐ <span>Tema escuro</span>";
}

applyTheme(localStorage.getItem("acessa-board-theme") === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("acessa-board-theme", nextTheme);
  applyTheme(nextTheme);
});

function setCloudStatus(label, mode = "local") {
  cloudStatus.textContent = `● ${label}`;
  cloudStatus.className = `cloud-status ${mode}`;
}

function applyAccessMode() {
  const readOnly = cloudContext.configured && (!cloudContext.connected || !cloudContext.canEdit);
  document.body.classList.toggle("read-only", readOnly);
  document.querySelectorAll("[data-task-status]").forEach((control) => { control.disabled = readOnly; });
}

function scheduleCloudSave() {
  if (!cloudContext.connected || !cloudContext.canEdit || !cloudContext.workspaceId) return;
  clearTimeout(cloudSaveTimer);
  setCloudStatus("Salvando", "saving");
  cloudSaveTimer = setTimeout(persistStateToCloud, 450);
}

async function persistStateToCloud() {
  if (!cloudContext.connected || !cloudContext.canEdit || cloudContext.version === null) return;
  try {
    const result = await saveCloudState(cloudContext.workspaceId, state, cloudContext.version);
    cloudContext.version = Number(result.version);
    localStorage.removeItem(storageKey);
    setCloudStatus("Sincronizado", "connected");
  } catch (error) {
    setCloudStatus("Conflito ao salvar", "error");
    window.alert(error instanceof Error ? error.message : "Não foi possível sincronizar os dados.");
  }
}

function migrateBusinessStructure(source) {
  if (Number(source.businessModelVersion || 0) >= 9) return source;
  const areas = (source.areas || []).filter((area) => !["comercial", "tecnica"].includes(area.id)).map((area) => area.id === "tecnica-operacoes" ? { ...area, owner: "Harley" } : area);
  if (!areas.some((area) => area.id === "comercial-b2b")) areas.unshift(defaultAreas.find((area) => area.id === "comercial-b2b"));
  if (!areas.some((area) => area.id === "comercial-b2c")) areas.splice(1, 0, defaultAreas.find((area) => area.id === "comercial-b2c"));
  if (!areas.some((area) => area.id === "tecnica-operacoes")) areas.push(defaultAreas.find((area) => area.id === "tecnica-operacoes"));
  if (!areas.some((area) => area.id === "tecnica-infra-noc")) areas.push(defaultAreas.find((area) => area.id === "tecnica-infra-noc"));
  if (!areas.some((area) => area.id === "regional")) areas.push(defaultAreas.find((area) => area.id === "regional"));
  const people = (source.people || []).map((person) => {
    if (person.id === "dir-comercial") return { ...person, name: "Rodrigo", area: "Comercial B2B", role: "Diretor Comercial B2B", responsibilities: "Estratégia comercial B2B, carteira corporativa, licitações, metas e expansão empresarial." };
    if (person.id === "dir-comercial-b2c") return { ...person, area: "Comercial B2C", responsibilities: "Estratégia comercial B2C, vendas residenciais, marketing integral, backoffice comercial, conversão e crescimento da base." };
    if (person.id === "lider-b2b") return { ...person, area: "Comercial B2B", managerId: "dir-comercial" };
    if (person.id === "lider-marketing") return { ...person, area: "Comercial B2C", managerId: "dir-comercial-b2c", responsibilities: "Marketing integral da Acessa, campanhas, tráfego, criativos, conteúdo, marca e geração de demanda." };
    if (person.id === "dir-tecnica") return { ...person, name: "Lailson Araujo", role: "Diretor Tecnico de Infraestrutura e NOC", area: "Tecnica de Infraestrutura e NOC", salary: person.name === "Adson" ? "A definir" : person.salary, managerId: "conselho", responsibilities: defaultAreas[5].purpose, contact: "lailson.araujo@acessa.local" };
    if (person.id === "dir-tecnica-operacoes") return { ...person, name: "Harley", role: "Diretor Tecnico de Operacoes", area: "Tecnica de Operacoes", salary: person.salary || "A definir", managerId: "conselho", type: "Diretor", responsibilities: defaultAreas[4].purpose, contact: "harley@acessa.local" };
    if (person.id === "lider-noc") return { ...person, area: "Tecnica de Infraestrutura e NOC", managerId: "dir-tecnica" };
    if (person.id === "lider-campo") return { ...person, area: "Tecnica de Operacoes", managerId: "dir-tecnica-operacoes" };
    if (person.id === "tecnico-campo-1") return { ...person, area: "Tecnica de Operacoes" };
    return person;
  });
  if (!people.some((person) => person.id === "dir-comercial-b2c")) {
    people.push({ id: "dir-comercial-b2c", name: "Felipe Cassiano", role: "Diretor Comercial B2C", area: "Comercial B2C", level: "Diretor", salary: "A definir", managerId: "conselho", type: "Diretor", responsibilities: "Estratégia comercial B2C, vendas residenciais, marketing integral, backoffice comercial, conversão e crescimento da base.", contact: "felipe.cassiano@acessa.local" });
  }
  if (!people.some((person) => person.id === "dir-regional-adson")) {
    people.push({ id: "dir-regional-adson", name: "Adson", role: "Diretor Regional", area: "Diretoria Regional", level: "Diretor", salary: "R$ 18.000", managerId: "conselho", type: "Diretor", responsibilities: "Coordenar o desempenho regional, integrar diretorias, acompanhar metas, expansão, operação e relacionamento institucional nas regiões atendidas.", contact: "adson@acessa.local" });
  }
  if (!people.some((person) => person.id === "dir-tecnica-operacoes")) {
    people.push({ id: "dir-tecnica-operacoes", name: "Harley", role: "Diretor Tecnico de Operacoes", area: "Tecnica de Operacoes", level: "Diretor", salary: "A definir", managerId: "conselho", type: "Diretor", responsibilities: defaultAreas[4].purpose, contact: "harley@acessa.local" });
  }
  const risks = (source.risks || []).map((risk) => risk.id === "risco-sla-tecnico" ? { ...risk, title: "Disponibilidade e resposta a incidentes abaixo da meta", area: "Tecnica de Infraestrutura e NOC", owner: "Lailson Araujo", mitigation: "Fortalecer monitoramento, capacidade, escalonamento e gestao de incidentes do NOC." } : risk);
  const raci = (source.raci || []).map((item) => item.id === "raci-sla" ? { ...item, process: "Disponibilidade, NOC e incidentes criticos", responsible: "Tecnica de Infraestrutura e NOC", approver: "Lailson Araujo", consulted: "Operacoes e Relacionamento" } : item);
  const processManuals = (source.processManuals || []).map((manual) => manual.id === "processo-instalacao-fibra" ? { ...manual, area: "Tecnica de Operacoes", owner: "Harley" } : manual.id === "processo-incidente-rede" ? { ...manual, area: "Tecnica de Infraestrutura e NOC", owner: "Lailson Araujo" } : manual);
  const kpis = (source.kpis || []).map((kpi) => kpi.id === "kpi-sla" ? { ...kpi, area: "Tecnica de Operacoes", name: "SLA de campo" } : kpi.id === "kpi-disponibilidade" ? { ...kpi, area: "Tecnica de Infraestrutura e NOC" } : kpi);
  const governance = (source.governance || []).map((item) => ({ ...(defaultGovernance.find((standard) => standard.id === item.id) || {}), ...item }));
  defaultGovernance.forEach((standard) => { if (!governance.some((item) => item.id === standard.id)) governance.push(standard); });
  const enrichedRaci = raci.map((item) => ({ ...(defaultRaci.find((standard) => standard.id === item.id) || {}), ...item }));
  defaultRaci.forEach((standard) => { if (!enrichedRaci.some((item) => item.id === standard.id)) enrichedRaci.push(standard); });
  return { ...source, businessModelVersion: 9, areas, people, risks, raci: enrichedRaci, governance, processManuals, kpis };
}

function mergeCloudState(remoteState) {
  return migrateBusinessStructure({
    ...seed,
    ...remoteState,
    businessModelVersion: remoteState.businessModelVersion ?? 0,
    kpis: Array.isArray(remoteState.kpis) ? remoteState.kpis : seed.kpis,
    processManuals: Array.isArray(remoteState.processManuals) ? remoteState.processManuals : seed.processManuals,
    risks: Array.isArray(remoteState.risks) ? remoteState.risks : seed.risks,
    governance: Array.isArray(remoteState.governance) ? remoteState.governance : seed.governance,
    raci: Array.isArray(remoteState.raci) ? remoteState.raci : seed.raci,
    areas: Array.isArray(remoteState.areas) ? remoteState.areas : seed.areas,
    careerTracks: Array.isArray(remoteState.careerTracks) ? remoteState.careerTracks : seed.careerTracks,
    auditLog: Array.isArray(remoteState.auditLog) ? remoteState.auditLog : [],
  });
}

async function initializeCloud() {
  if (!cloudConfigured) {
    setCloudStatus("Local", "local");
    applyAccessMode();
    return;
  }
  accountButton.hidden = false;
  setCloudStatus("Conectando", "saving");
  try {
    const context = await loadCloudContext();
    if (!context.session) {
      cloudContext.connected = false;
      cloudContext.canEdit = false;
      authGate.hidden = false;
      accountButton.textContent = "Entrar";
      setCloudStatus("Login necessário", "error");
      applyAccessMode();
      return;
    }
    if (!context.profile?.active) throw new Error("Este usuário não possui acesso ativo ao Acessa Board.");
    cloudContext.connected = true;
    cloudContext.currentUserId = context.session.user.id;
    cloudContext.workspaceId = context.workspace.id;
    cloudContext.version = Number(context.workspace.version);
    cloudContext.role = context.profile.role;
    cloudContext.canEdit = ["admin", "socio", "diretor", "gestor", "rh"].includes(context.profile.role);
    const canManageUsers = ["admin", "socio", "rh"].includes(context.profile.role);
    usersNav.hidden = !canManageUsers;
    adminNavLabel.hidden = !canManageUsers;
    if (passwordRecoveryPending) showAuthPanel("new-password");
    else authGate.hidden = true;
    accountButton.textContent = context.profile.display_name || context.session.user.email;
    accountButton.title = `Perfil: ${context.profile.role}. Clique para sair.`;
    const remoteState = context.workspace.state;
    if (remoteState && Object.keys(remoteState).length) {
      state = mergeCloudState(remoteState);
      localStorage.removeItem(storageKey);
    } else if (cloudContext.canEdit) {
      await persistStateToCloud();
    }
    unsubscribeWorkspace();
    unsubscribeWorkspace = subscribeToWorkspace(cloudContext.workspaceId, (payload) => {
      const incomingVersion = Number(payload.new?.version ?? 0);
      if (incomingVersion <= Number(cloudContext.version)) return;
      cloudContext.version = incomingVersion;
      state = mergeCloudState(payload.new.state || {});
      localStorage.removeItem(storageKey);
      render();
      setCloudStatus("Atualizado", "connected");
    });
    setCloudStatus(cloudContext.canEdit ? "Sincronizado" : "Somente leitura", "connected");
    render();
  } catch (error) {
    cloudContext.connected = false;
    cloudContext.canEdit = false;
    authGate.hidden = false;
    authError.textContent = error instanceof Error ? error.message : "Falha ao conectar.";
    setCloudStatus("Erro de conexão", "error");
    applyAccessMode();
  }
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return seed;
  try {
    const parsed = JSON.parse(saved);
    const savedCareerTracks = Array.isArray(parsed.careerTracks) ? parsed.careerTracks : seed.careerTracks;
    const careerTracks = savedCareerTracks.map((track) => {
      const currentModel = careerModelById[track.id];
      return currentModel && Number(track.modelVersion || 0) < currentModel.modelVersion
        ? { ...track, ...currentModel }
        : track;
    });
    return migrateBusinessStructure({
      ...seed,
      ...parsed,
      businessModelVersion: parsed.businessModelVersion ?? 0,
      kpis: Array.isArray(parsed.kpis) ? parsed.kpis : seed.kpis,
      processManuals: Array.isArray(parsed.processManuals) ? parsed.processManuals : seed.processManuals,
      risks: Array.isArray(parsed.risks) ? parsed.risks : seed.risks,
      governance: Array.isArray(parsed.governance) ? parsed.governance : seed.governance,
      raci: Array.isArray(parsed.raci) ? parsed.raci : seed.raci,
      areas: Array.isArray(parsed.areas) ? parsed.areas : seed.areas,
      careerTracks,
      auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog : [],
    });
  } catch {
    return seed;
  }
}

function saveState() {
  if (!cloudConfigured) localStorage.setItem(storageKey, JSON.stringify(state));
  scheduleCloudSave();
}

function auditLabel(item) {
  return item?.title ?? item?.name ?? item?.forum ?? item?.process ?? item?.family ?? item?.id ?? "Registro";
}

function logAudit(action, collection, item, detail = "") {
  state.auditLog = Array.isArray(state.auditLog) ? state.auditLog : [];
  state.auditLog.unshift({
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    actor: "Usuário local",
    action,
    collection,
    recordId: item?.id ?? null,
    label: auditLabel(item),
    detail,
    origin: "Acessa Board local",
  });
  state.auditLog = state.auditLog.slice(0, 500);
}

function isValidState(candidate) {
  return Boolean(
    candidate &&
    typeof candidate === "object" &&
    stateCollections.every((collection) => Array.isArray(candidate[collection])),
  );
}

function exportBackup() {
  logAudit("backup_exportado", "sistema", { id: "backup", title: "Backup local" });
  saveState();
  renderAudits();
  const payload = {
    product: "Acessa Board",
    version: backupVersion,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = payload.exportedAt.replaceAll(":", "-").replace(".000Z", "Z");
  link.href = url;
  link.download = `acessa-board-backup-${timestamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function restoreBackup(file) {
  const payload = JSON.parse(await file.text());
  if (payload?.product !== "Acessa Board" || payload?.version !== backupVersion || !isValidState(payload.state)) {
    throw new Error("O arquivo não é um backup compatível do Acessa Board.");
  }
  if (!window.confirm("Restaurar este backup substituirá os dados locais atuais. Deseja continuar?")) return;
  state = {
    ...seed,
    ...payload.state,
    kpis: Array.isArray(payload.state.kpis) ? payload.state.kpis : seed.kpis,
    processManuals: Array.isArray(payload.state.processManuals) ? payload.state.processManuals : seed.processManuals,
    risks: Array.isArray(payload.state.risks) ? payload.state.risks : seed.risks,
    governance: Array.isArray(payload.state.governance) ? payload.state.governance : seed.governance,
    raci: Array.isArray(payload.state.raci) ? payload.state.raci : seed.raci,
    areas: Array.isArray(payload.state.areas) ? payload.state.areas : seed.areas,
    careerTracks: Array.isArray(payload.state.careerTracks) ? payload.state.careerTracks : seed.careerTracks,
    auditLog: Array.isArray(payload.state.auditLog) ? payload.state.auditLog : [],
  };
  logAudit("backup_restaurado", "sistema", { id: "backup", title: file.name }, `Backup exportado em ${payload.exportedAt ?? "data desconhecida"}.`);
  saveState();
  render();
  window.alert("Backup restaurado com sucesso.");
}

function setView(id) {
  views.forEach((view) => view.classList.toggle("active", view.id === id));
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === id));
  if (id === "users") renderUsers();
}

const boardRoles = ["admin", "socio", "diretor", "gestor", "rh", "auditor", "colaborador"];

async function renderUsers() {
  usersMessage.textContent = "Carregando usuários...";
  usersMessage.classList.remove("auth-success");
  try {
    const profiles = await listBoardProfiles();
    usersTableBody.innerHTML = profiles.map((profile) => {
      const isSelf = profile.user_id === cloudContext.currentUserId;
      return `<tr data-profile-id="${escapeHtml(profile.user_id)}">
        <td><strong>${escapeHtml(profile.display_name || "Usuário")}</strong><small>${isSelf ? "Sua conta" : "Cadastrado no Supabase"}</small></td>
        <td><select data-profile-field="role" ${isSelf ? "disabled title=\"Seu próprio papel deve ser alterado por outro administrador\"" : ""}>${boardRoles.map((role) => `<option value="${role}" ${profile.role === role ? "selected" : ""}>${role}</option>`).join("")}</select></td>
        <td><input data-profile-field="directorate" value="${escapeHtml(profile.directorate || "")}" placeholder="Ex.: Comercial" /></td>
        <td><label class="access-switch"><input data-profile-field="active" type="checkbox" ${profile.active ? "checked" : ""} ${isSelf ? "disabled" : ""} /><span>${profile.active ? "Ativo" : "Inativo"}</span></label></td>
      </tr>`;
    }).join("") || `<tr><td colspan="4">Nenhum usuário encontrado.</td></tr>`;
    usersMessage.textContent = `${profiles.length} usuário(s) carregado(s). Alterações são salvas automaticamente.`;
    usersMessage.classList.add("auth-success");
  } catch (error) {
    usersMessage.textContent = error instanceof Error ? error.message : "Não foi possível carregar os usuários.";
  }
}

usersTableBody.addEventListener("change", async (event) => {
  const control = event.target.closest("[data-profile-field]");
  const row = event.target.closest("[data-profile-id]");
  if (!control || !row) return;
  const field = control.dataset.profileField;
  const value = field === "active" ? control.checked : control.value.trim();
  control.disabled = true;
  usersMessage.classList.remove("auth-success");
  usersMessage.textContent = "Salvando permissão...";
  try {
    await updateBoardProfile(row.dataset.profileId, { [field]: value });
    usersMessage.textContent = "Permissão atualizada com sucesso.";
    usersMessage.classList.add("auth-success");
    if (field === "active") control.closest("label").querySelector("span").textContent = value ? "Ativo" : "Inativo";
  } catch (error) {
    usersMessage.textContent = error instanceof Error ? error.message : "Não foi possível atualizar a permissão.";
    await renderUsers();
  } finally {
    if (!(field === "active" && row.dataset.profileId === cloudContext.currentUserId)) control.disabled = false;
  }
});

refreshUsersButton.addEventListener("click", renderUsers);

inviteUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = inviteUserForm.querySelector("button[type='submit']");
  const form = new FormData(inviteUserForm);
  button.disabled = true;
  button.textContent = "Enviando...";
  usersMessage.classList.remove("auth-success");
  usersMessage.textContent = "Enviando convite seguro...";
  try {
    await inviteBoardUser({
      email: String(form.get("email") || "").trim(),
      role: String(form.get("role") || "colaborador"),
      directorate: String(form.get("directorate") || "").trim(),
    });
    inviteUserForm.reset();
    usersMessage.textContent = "Convite enviado. O usuário receberá um link para definir a senha.";
    usersMessage.classList.add("auth-success");
    await renderUsers();
  } catch (error) {
    usersMessage.textContent = error instanceof Error ? error.message : "Não foi possível enviar o convite.";
  } finally {
    button.disabled = false;
    button.textContent = "Enviar convite";
  }
});

function render() {
  renderMetrics();
  renderDashboardLists();
  renderGovernance();
  renderAreas();
  renderProcessManuals();
  renderCareer();
  renderLearning();
  renderKpis();
  renderRisks();
  renderKanban();
  renderMeetings();
  renderDocuments();
  renderAudits();
  renderArchive();
  renderPeople();
  renderOrgChart();
  applyAccessMode();
}

function renderMetrics() {
  const open = state.tasks.filter((task) => !["done", "archived"].includes(task.status)).length;
  const next = state.meetings
    .filter((meeting) => !meeting.archivedAt)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const activeAreas = state.areas.filter((area) => !area.archivedAt);
  const processCount = activeAreas.reduce((total, area) => total + area.processes.length, 0);
  const activeRisks = state.risks.filter((risk) => !risk.archivedAt);
  const riskAverage = activeRisks.length
    ? (activeRisks.reduce((total, risk) => total + riskLevel(risk), 0) / activeRisks.length).toFixed(1)
    : "0.0";
  document.querySelector("#metric-areas").textContent = activeAreas.length;
  document.querySelector("#metric-processes").textContent = processCount;
  document.querySelector("#metric-open").textContent = open;
  document.querySelector("#metric-risk").textContent = riskAverage;
  document.querySelector("#metric-next").textContent = next ? formatDate(next.date) : "-";
}

function renderDashboardLists() {
  document.querySelector("#priority-list").innerHTML = state.tasks
    .filter((task) => task.status !== "archived")
    .sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority))
    .slice(0, 5)
    .map(renderActionItem)
    .join("");

  document.querySelector("#dashboard-meetings").innerHTML = [...state.meetings]
    .filter((meeting) => !meeting.archivedAt)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)
    .map(renderMeetingCompact)
    .join("");

  document.querySelector("#dashboard-kpis").innerHTML = state.kpis.filter((kpi) => !kpi.archivedAt).slice(0, 6).map(renderKpiMini).join("");
}

function renderGovernance() {
  const search = document.querySelector("#governance-search")?.value.trim().toLowerCase() || "";
  const areaFilter = document.querySelector("#governance-area-filter")?.value || "";
  const statusFilter = document.querySelector("#governance-status-filter")?.value || "";
  const today = currentCivilDateIso();
  const activeForums = state.governance.filter((item) => !item.archivedAt && item.status !== "Supersedido");
  const activeRaci = state.raci.filter((item) => !item.archivedAt && item.status !== "Supersedido");
  const isReviewDue = (item) => Boolean(item.reviewDate && item.reviewDate <= today);
  const validRaci = activeRaci.filter((item) => String(item.responsible || "").trim() && String(item.approver || "").trim());
  const reviewDue = [...activeForums, ...activeRaci].filter(isReviewDue).length;
  const evidenceCoverage = activeRaci.filter((item) => String(item.evidence || "").trim()).length;

  document.querySelector("#governance-health").innerHTML = `
    <article><span>RACI válido</span><strong>${activeRaci.length ? Math.round(validRaci.length / activeRaci.length * 100) : 0}%</strong><small>com R e um aprovador</small></article>
    <article><span>Fóruns ativos</span><strong>${activeForums.length}</strong><small>com cadência definida</small></article>
    <article class="${reviewDue ? "needs-attention" : ""}"><span>Revisões pendentes</span><strong>${reviewDue}</strong><small>vencidas ou para hoje</small></article>
    <article><span>Com evidência</span><strong>${activeRaci.length ? Math.round(evidenceCoverage / activeRaci.length * 100) : 0}%</strong><small>processos rastreáveis</small></article>`;

  const areaSelect = document.querySelector("#governance-area-filter");
  const selectedArea = areaSelect.value;
  const areas = [...new Set(activeRaci.map((item) => item.area).filter(Boolean))].sort();
  areaSelect.innerHTML = `<option value="">Todas as diretorias</option>${areas.map((area) => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join("")}`;
  areaSelect.value = selectedArea;

  document.querySelector("#governance-grid").innerHTML = activeForums.map((item) => `
    <article class="governance-card">
      <div class="governance-card-top"><span>${escapeHtml(item.code || "Fórum")} · ${escapeHtml(item.type || "Governança")}</span><b class="governance-status ${isReviewDue(item) ? "review" : "active"}">${isReviewDue(item) ? "Revisar" : escapeHtml(item.status || "Ativo")}</b></div>
      <h3>${escapeHtml(item.forum)}</h3>
      <p>${escapeHtml(item.mandate)}</p>
      <dl class="governance-details"><div><dt>Cadência</dt><dd>${escapeHtml(item.cadence)}</dd></div><div><dt>Dono</dt><dd>${escapeHtml(item.owner)}</dd></div><div><dt>Quórum</dt><dd>${escapeHtml(item.quorum || "Definir")}</dd></div><div><dt>Evidência</dt><dd>${escapeHtml(item.evidence || "Ata e decisões")}</dd></div><div><dt>Próxima revisão</dt><dd>${item.reviewDate ? formatDate(item.reviewDate) : "Agendar"}</dd></div><div><dt>Versão</dt><dd>${escapeHtml(item.version || 1)}</dd></div></dl>
      <small>Alçada: ${escapeHtml(item.decisionAuthority || item.mandate)}</small>
      <div class="card-actions"><button class="ghost-button" type="button" data-edit-id="${item.id}">Editar</button><button class="text-button" type="button" data-archive-id="${item.id}">Arquivar</button></div>
    </article>
  `).join("");
  bindSimpleActions("governance", "#governance-grid");

  const filteredRaci = activeRaci.filter((item) => {
    const searchable = [item.code, item.process, item.area, item.responsible, item.approver, item.consulted, item.informed].join(" ").toLowerCase();
    if (search && !searchable.includes(search)) return false;
    if (areaFilter && item.area !== areaFilter) return false;
    if (statusFilter === "Revisar" && !isReviewDue(item)) return false;
    if (statusFilter === "Ativo" && isReviewDue(item)) return false;
    return true;
  });
  document.querySelector("#raci-result-count").textContent = `${filteredRaci.length} de ${activeRaci.length} processos`;
  document.querySelector("#raci-body").innerHTML = filteredRaci.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.code || "SEM-CÓDIGO")} · ${escapeHtml(item.process)}</strong><small>${escapeHtml(item.area || "Área não definida")} · ${escapeHtml(item.category || "Processo")}</small></td>
      <td>${escapeHtml(item.responsible)}</td><td>${escapeHtml(item.approver)}</td><td>${escapeHtml(item.consulted)}</td><td>${escapeHtml(item.informed)}</td>
      <td><span class="governance-status ${isReviewDue(item) ? "review" : "active"}">${isReviewDue(item) ? "Revisar" : "Vigente"}</span><small>v${escapeHtml(item.version || 1)} · ${item.reviewDate ? formatDate(item.reviewDate) : "sem revisão"}</small><small>${escapeHtml(item.evidence || "Evidência não definida")}</small></td>
      <td><div class="card-actions"><button class="ghost-button" type="button" data-edit-id="${item.id}">Editar</button><button class="text-button" type="button" data-archive-id="${item.id}">Arquivar</button></div></td>
    </tr>
  `).join("");
  bindSimpleActions("raci", "#raci-body");
}

function renderAreas() {
  document.querySelector("#area-grid").innerHTML = state.areas.filter((area) => !area.archivedAt).map((area) => `
    <article class="area-card area-${area.id}">
      <div class="area-heading">
        <div>
          <span>${area.directors?.length ? "Direcao compartilhada" : escapeHtml(area.owner)}</span>
          <h3>${escapeHtml(area.name)}</h3>
        </div>
        <div class="headcount-summary" aria-label="Resumo de pessoas da diretoria">
          <div class="headcount-metric" title="Pessoas desta diretoria já incluídas individualmente no organograma">
            <strong>${registeredPeopleForArea(area)}</strong>
            <span>No organograma</span>
          </div>
          <div class="headcount-metric headcount-metric-planned" title="Quantidade total estimada de colaboradores para esta diretoria">
            <strong>${escapeHtml(area.headcount || "—")}</strong>
            <span>Quadro estimado</span>
          </div>
        </div>
      </div>
      <p class="headcount-help"><strong>Entenda os números:</strong> ${registeredPeopleForArea(area)} pessoa(s) já estão identificadas no organograma; o quadro total estimado desta diretoria é de ${escapeHtml(area.headcount || "quantidade ainda não definida")} colaboradores.</p>
      <p>${escapeHtml(area.purpose)}</p>
      ${area.directors?.length ? `
        <div class="area-director-grid" aria-label="Diretores da area">
          ${area.directors.map((director) => `
            <section class="area-director-card">
              <span class="area-director-segment">${escapeHtml(director.segment)}</span>
              <div class="area-director-identity">
                <small>${escapeHtml(director.role)}</small>
                <strong>${escapeHtml(director.name)}</strong>
              </div>
              <p>${escapeHtml(director.scope)}</p>
              <div class="tag-row">${director.teams.map((team) => `<span class="tag">${escapeHtml(team)}</span>`).join("")}</div>
            </section>
          `).join("")}
        </div>
      ` : ""}
      <div class="tag-row">${area.teams.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
      <div class="process-list">
        ${area.processes.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="indicator-row">
        ${area.indicators.map((item) => `<small>${escapeHtml(item)}</small>`).join("")}
      </div>
      <div class="card-actions">
        <button class="ghost-button" type="button" data-edit-id="${area.id}">Editar</button>
        <button class="text-button" type="button" data-archive-id="${area.id}">Arquivar</button>
      </div>
    </article>
  `).join("");
  bindSimpleActions("area", "#area-grid");
}

function registeredPeopleForArea(area) {
  const keys = [area.id, area.name, area.name.replace(/^Diretoria\s+/i, "")]
    .map((value) => String(value).trim().toLowerCase());
  return state.people.filter((person) => !person.archivedAt && keys.includes(String(person.area).trim().toLowerCase())).length;
}

function renderProcessManuals() {
  document.querySelector("#process-manual-grid").innerHTML = state.processManuals.filter((manual) => !manual.archivedAt).map((manual) => `
    <article class="manual-card">
      <div>
        <span>${escapeHtml(manual.area)} | Dono: ${escapeHtml(manual.owner)}</span>
        <h3>${escapeHtml(manual.title)}</h3>
      </div>
      <p>${escapeHtml(manual.objective)}</p>
      <ol>
        ${manual.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>
      <small>Evidencia obrigatoria: ${escapeHtml(manual.evidence)}</small>
      <dl class="kpi-details">
        <div><dt>Versão</dt><dd>${escapeHtml(manual.version || "1.0")}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(manual.status || "Rascunho")}</dd></div>
        <div><dt>Aprovador</dt><dd>${escapeHtml(manual.approver || "Não definido")}</dd></div>
        <div><dt>Vigência</dt><dd>${manual.effectiveFrom ? formatDate(manual.effectiveFrom) : "Não definida"}</dd></div>
        <div><dt>Revisão</dt><dd>${manual.reviewDate ? formatDate(manual.reviewDate) : "Não definida"}</dd></div>
      </dl>
      <div class="card-actions">
        <button class="ghost-button" type="button" data-edit-id="${manual.id}">Editar</button>
        <button class="text-button" type="button" data-archive-id="${manual.id}">Arquivar</button>
      </div>
    </article>
  `).join("");
  bindSimpleActions("process", "#process-manual-grid");
}

function renderCareerPlaybook(track) {
  if (!track.levelDetails?.length) return "";
  const scoreTotal = (track.scorecard || []).reduce((total, [, weight]) => total + Number(weight || 0), 0);
  const path = (items = []) => items.map((item, index) => `<span>${escapeHtml(item)}${index < items.length - 1 ? '<i aria-hidden="true">→</i>' : ""}</span>`).join("");
  return `
    <details class="career-playbook">
      <summary><span>Ver plano completo da área</span><small>Níveis, metas, avaliação e carreira em Y</small></summary>
      <div class="career-playbook-content">
        <section>
          <div class="career-subheading"><span>01</span><div><strong>Níveis e responsabilidades</strong><small>O que é esperado em cada etapa</small></div></div>
          <div class="career-level-detail-grid">
            ${track.levelDetails.map((level, index) => `
              <article>
                <header><i>${index + 1}</i><div><strong>${escapeHtml(level.name)}</strong><small>${escapeHtml(level.time)}</small></div></header>
                <div class="career-pay-reference">${escapeHtml(level.pay)}</div>
                <h5>Responsabilidades</h5>
                <ul>${(level.responsibilities || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                ${(level.indicators || []).length ? `<h5>Indicadores</h5><div class="tag-row">${level.indicators.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>` : ""}
                ${(level.promotion || []).length ? `<h5>Para evoluir</h5><ul>${level.promotion.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
              </article>
            `).join("")}
          </div>
        </section>
        <section class="career-score-section">
          <div class="career-subheading"><span>02</span><div><strong>Avaliação mensal</strong><small>Promoção recomendada com 85 pontos ou mais por três meses consecutivos</small></div><b>${scoreTotal} pontos</b></div>
          <div class="career-score-grid">
            ${(track.scorecard || []).map(([criterion, weight]) => `<div><span>${escapeHtml(criterion)}</span><strong>${escapeHtml(weight)} pts</strong><i style="--score:${Number(weight)}%"></i></div>`).join("")}
          </div>
          <p class="career-rule"><strong>Regra de promoção:</strong> nota mínima de 85 pontos durante três meses consecutivos, treinamentos concluídos, aprovação da liderança e disponibilidade para o novo cargo.</p>
        </section>
        <section class="career-support-grid">
          <div><div class="career-subheading"><span>03</span><div><strong>Capacitações obrigatórias</strong><small>Conhecimentos necessários para avançar</small></div></div><ul class="career-check-list">${(track.trainings || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
          <div><div class="career-subheading"><span>04</span><div><strong>Bonificações possíveis</strong><small>Resultados que podem gerar reconhecimento</small></div></div><ul class="career-check-list">${(track.bonuses || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
        </section>
        <section class="career-y-section">
          <div class="career-subheading"><span>Y</span><div><strong>Duas possibilidades de crescimento</strong><small>O colaborador pode liderar pessoas ou aprofundar sua especialidade</small></div></div>
          <div class="career-paths">
            <div><strong>Trilha de liderança</strong><p>${path(track.careerPaths?.leadership)}</p></div>
            <div><strong>Trilha de especialista</strong><p>${path(track.careerPaths?.specialist)}</p></div>
          </div>
        </section>
      </div>
    </details>
  `;
}

function renderCareer() {
  const tracks = state.careerTracks.filter((track) => !track.archivedAt);
  const levels = tracks.reduce((total, track) => total + (track.levels?.length || 0), 0);
  const directorates = new Set(tracks.map((track) => track.directorate).filter(Boolean));
  const reviewsPending = tracks.filter((track) => !track.reviewDate).length;
  document.querySelector("#career-overview").innerHTML = `
    <article><span>Setores com plano</span><strong>${tracks.length}</strong><small>caminhos de desenvolvimento</small></article>
    <article><span>Cargos e níveis</span><strong>${levels}</strong><small>etapas de progressão</small></article>
    <article><span>Áreas responsáveis</span><strong>${directorates.size || "Todas"}</strong><small>abrangência organizacional</small></article>
    <article class="${reviewsPending ? "attention" : "complete"}"><span>Sem data de revisão</span><strong>${reviewsPending}</strong><small>${reviewsPending ? "trilhas sem data definida" : "plano atualizado"}</small></article>
  `;
  document.querySelector("#career-grid").innerHTML = tracks.map((track, index) => `
    <article class="career-sector-card" style="--career-index: ${index}">
      <header class="career-card-header">
        <div class="career-family-mark">${escapeHtml(String(track.family || "C").charAt(0))}</div>
        <div>
          <span>Área de carreira</span>
          <h3>${escapeHtml(track.family)}</h3>
          <small>${escapeHtml(track.directorate || "Aplicável a todas as diretorias")}</small>
        </div>
        <span class="career-confidentiality">${escapeHtml(track.confidentiality || "Restrito")}</span>
      </header>
      ${track.mission ? `<p class="career-mission">${escapeHtml(track.mission)}</p>` : ""}
      <div class="career-sector-stats"><span><strong>${track.levelDetails?.length || 0}</strong> níveis</span><span><strong>${escapeHtml(track.salary || "A definir")}</strong> faixa estimada</span></div>
      <div class="tag-row">${(track.competencies || []).slice(0, 4).map((item) => `<span class="tag violet">${escapeHtml(item)}</span>`).join("")}</div>
      <button class="primary-button career-open-button" type="button" data-open-career="${track.id}">Abrir subpágina</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-open-career]").forEach((button) => button.addEventListener("click", () => openCareerSubpage(button.dataset.openCareer)));
  if (activeCareerTrackId) renderCareerDetail(activeCareerTrackId);
}

function careerPay(level) {
  if (level.baseSalary || level.variablePay) return `${level.baseSalary || "Fixo a definir"}${level.variablePay ? ` | ${level.variablePay}` : ""}`;
  return level.pay || "Remuneração a definir";
}

function indicatorLabel(indicator) {
  const labels = {
    "Orçamento": "Controle do orçamento",
    "Metas": "Cumprimento das metas",
    "Turnover": "Rotatividade da equipe",
    "SLA": "Prazo de atendimento (SLA)",
    "EBITDA": "Resultado operacional (EBITDA)",
    "Receita/custo": "Relação entre receita e custo",
    "NPS": "Satisfação dos clientes (NPS)",
    "Riscos": "Riscos sob controle",
    "Caixa": "Disponibilidade de caixa",
    "Crescimento": "Crescimento da empresa",
    "Governança": "Cumprimento da governança",
  };
  return labels[indicator] || indicator;
}

function openCareerSubpage(trackId) {
  activeCareerTrackId = trackId;
  document.querySelector("#career-home").hidden = true;
  document.querySelector("#career-detail").hidden = false;
  renderCareerDetail(trackId);
  document.querySelector("#career").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeCareerSubpage() {
  activeCareerTrackId = null;
  document.querySelector("#career-home").hidden = false;
  document.querySelector("#career-detail").hidden = true;
}

function renderCareerDetail(trackId) {
  const track = state.careerTracks.find((item) => item.id === trackId && !item.archivedAt);
  if (!track) return closeCareerSubpage();
  const detail = document.querySelector("#career-detail");
  detail.innerHTML = `
    <div class="career-subpage-topbar"><button class="ghost-button" type="button" id="career-back">← Voltar para setores</button><span>Subpágina de carreira</span></div>
    <header class="career-subpage-hero">
      <div class="career-family-mark">${escapeHtml(String(track.family).charAt(0))}</div>
      <div><p class="eyebrow">${escapeHtml(track.directorate || "Acessa")}</p><h2>${escapeHtml(track.family)}</h2><p>${escapeHtml(track.mission || "Missão a definir")}</p></div>
      <div class="career-subpage-actions"><button class="ghost-button" type="button" id="edit-career-track">Editar carreira</button><button class="primary-button" type="button" id="new-career-level">Adicionar nível</button></div>
    </header>
    <div class="career-subpage-summary">
      <article><span>Níveis</span><strong>${track.levelDetails?.length || 0}</strong></article>
      <article><span>Faixa estimada</span><strong>${escapeHtml(track.salary || "A definir")}</strong></article>
      <article><span>Próximo caminho</span><strong>${escapeHtml(track.next || "A definir")}</strong></article>
    </div>
    <section class="career-subpage-section"><div class="career-section-title"><div><p class="eyebrow">Progressão</p><h3>Níveis, salários e benefícios</h3></div><small>Todos os valores podem ser editados</small></div>
      <div class="career-level-page-grid">${(track.levelDetails || []).map((level, index) => `
        <article class="career-level-page-card">
          <header><i>${index + 1}</i><div><h4>${escapeHtml(level.name)}</h4><span>${escapeHtml(level.time || "Tempo no cargo a definir")}</span></div><button class="ghost-button" type="button" data-edit-career-level="${index}">Editar</button></header>
          <div class="career-level-facts"><div><span>Tempo mínimo de empresa</span><strong>${escapeHtml(level.companyTenure || "A definir")}</strong></div><div><span>Salário e variável</span><strong>${escapeHtml(careerPay(level))}</strong></div></div>
          <div class="career-level-columns"><div><h5>Responsabilidades</h5><ul>${(level.responsibilities || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h5>Benefícios previstos</h5><ul class="benefit-list">${(level.benefits || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Não definidos</li>"}</ul></div></div>
          ${(level.indicators || []).length ? `<div class="career-indicators"><h5>Indicadores acompanhados</h5><div>${level.indicators.map((item) => `<span><i aria-hidden="true"></i>${escapeHtml(indicatorLabel(item))}</span>`).join("")}</div></div>` : ""}
        </article>`).join("")}
      </div>
    </section>
    <section class="career-subpage-section"><div class="career-section-title"><div><p class="eyebrow">Tempo de casa</p><h3>Benefícios por permanência na empresa</h3></div><button class="ghost-button" type="button" id="new-benefit-tier">Adicionar faixa</button></div>
      <p class="career-tenure-explanation">Esta política acompanha o tempo total do funcionário na Acessa, independentemente de mudança de cargo ou setor.</p>
      <div class="career-benefit-tier-grid">${(track.benefitTiers || []).map((tier, index) => `
        <article><header><div><span>${escapeHtml(tier.tenure)}</span><strong>${escapeHtml(tier.label)}</strong></div><button class="text-button" type="button" data-edit-benefit-tier="${index}">Editar</button></header><ul>${(tier.benefits || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
      `).join("")}</div>
    </section>
    <section class="career-subpage-bottom">
      <article><p class="eyebrow">Avaliação</p><h3>Critérios de promoção</h3><div class="career-score-grid">${(track.scorecard || []).map(([name, weight]) => `<div><span>${escapeHtml(name)}</span><strong>${escapeHtml(weight)} pts</strong><i style="--score:${Number(weight)}%"></i></div>`).join("")}</div></article>
      <article><p class="eyebrow">Desenvolvimento</p><h3>Treinamentos obrigatórios</h3><ul class="career-check-list">${(track.trainings || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
    </section>
  `;
  detail.querySelector("#career-back").addEventListener("click", closeCareerSubpage);
  detail.querySelector("#edit-career-track").addEventListener("click", () => openSimpleModal("career", track.id));
  detail.querySelector("#new-career-level").addEventListener("click", () => openCareerLevelModal(track.id));
  detail.querySelectorAll("[data-edit-career-level]").forEach((button) => button.addEventListener("click", () => openCareerLevelModal(track.id, Number(button.dataset.editCareerLevel))));
  detail.querySelector("#new-benefit-tier").addEventListener("click", () => openCareerBenefitModal(track.id));
  detail.querySelectorAll("[data-edit-benefit-tier]").forEach((button) => button.addEventListener("click", () => openCareerBenefitModal(track.id, Number(button.dataset.editBenefitTier))));
}

function renderLearning() {
  document.querySelector("#learning-grid").innerHTML = learningModules.map((module) => `
    <article class="learning-card">
      <span>${escapeHtml(module.audience)}</span>
      <h3>${escapeHtml(module.title)}</h3>
      <ul>
        ${module.lessons.map((lesson) => `<li>${escapeHtml(lesson)}</li>`).join("")}
      </ul>
    </article>
  `).join("");
}

function renderKpis() {
  document.querySelector("#kpi-grid").innerHTML = state.kpis.filter((kpi) => !kpi.archivedAt).map(renderKpiCard).join("");
  bindSimpleActions("kpi", "#kpi-grid");
}

function renderKpiCard(kpi) {
  return `
    <article class="kpi-card ${kpiStatus(kpi.status)}">
      <span>${escapeHtml(kpi.area)}</span>
      <h3>${escapeHtml(kpi.name)}</h3>
      <div class="kpi-value">${escapeHtml(kpi.value)}</div>
      <div class="kpi-meta">
        <small>Meta ${escapeHtml(kpi.target)}</small>
        <small>Tendencia ${escapeHtml(kpi.trend)}</small>
      </div>
      <dl class="kpi-details">
        <div><dt>Fórmula</dt><dd>${escapeHtml(kpi.formula || "Não definida")}</dd></div>
        <div><dt>Fonte</dt><dd>${escapeHtml(kpi.source || "Não definida")}</dd></div>
        <div><dt>Frequência</dt><dd>${escapeHtml(kpi.frequency || "Não definida")}</dd></div>
        <div><dt>Responsável</dt><dd>${escapeHtml(kpi.owner || "Não definido")}</dd></div>
        <div><dt>Período</dt><dd>${escapeHtml(kpi.period || "Não definido")}</dd></div>
      </dl>
      <div class="card-actions">
        <button class="ghost-button" type="button" data-edit-id="${kpi.id}">Editar</button>
        <button class="text-button" type="button" data-archive-id="${kpi.id}">Arquivar</button>
      </div>
    </article>
  `;
}

function renderKpiMini(kpi) {
  return `
    <article class="kpi-mini ${kpiStatus(kpi.status)}">
      <span>${escapeHtml(kpi.name)}</span>
      <strong>${escapeHtml(kpi.value)}</strong>
      <small>${escapeHtml(kpi.area)}</small>
    </article>
  `;
}

function kpiStatus(status) {
  return ["good", "watch", "risk"].includes(status) ? status : "watch";
}

function renderRisks() {
  document.querySelector("#risk-grid").innerHTML = state.risks.filter((risk) => !risk.archivedAt).map((risk) => `
    <article class="risk-card severity-${riskLevel(risk)}">
      <div>
        <span>${escapeHtml(risk.area)}</span>
        <h3>${escapeHtml(risk.title)}</h3>
      </div>
      <div class="risk-scale" aria-label="Nível ${riskLevel(risk)} de 5">
        ${Array.from({ length: 5 }, (_, index) => `<i class="${index < riskLevel(risk) ? "on" : ""}"></i>`).join("")}
      </div>
      <p>${escapeHtml(risk.mitigation)}</p>
      <dl class="kpi-details">
        <div><dt>Probabilidade</dt><dd>${riskProbability(risk)}/5</dd></div>
        <div><dt>Impacto</dt><dd>${riskImpact(risk)}/5</dd></div>
        <div><dt>Score</dt><dd>${riskProbability(risk) * riskImpact(risk)}/25</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(risk.status || "Aberto")}</dd></div>
        <div><dt>Responsável</dt><dd>${escapeHtml(risk.owner)}</dd></div>
        <div><dt>Prazo</dt><dd>${risk.due ? formatDate(risk.due) : "Não definido"}</dd></div>
      </dl>
      <div class="card-actions">
        <button class="ghost-button" type="button" data-edit-id="${risk.id}">Editar</button>
        <button class="text-button" type="button" data-archive-id="${risk.id}">Arquivar</button>
      </div>
    </article>
  `).join("");
  bindSimpleActions("risk", "#risk-grid");
}

function riskProbability(risk) {
  return Math.min(5, Math.max(1, Number(risk.probability ?? risk.severity ?? 1)));
}

function riskImpact(risk) {
  return Math.min(5, Math.max(1, Number(risk.impact ?? risk.severity ?? 1)));
}

function riskLevel(risk) {
  return Math.max(1, Math.ceil((riskProbability(risk) * riskImpact(risk)) / 5));
}

function renderKanban() {
  const kanban = document.querySelector("#kanban");
  kanban.innerHTML = statuses
    .map((status) => {
      const cards = state.tasks
        .filter((task) => task.status === status.id)
        .map(renderTaskCard)
        .join("");
      return `<section class="column"><h3>${status.label}</h3>${cards || `<p class="empty">Sem itens.</p>`}</section>`;
    })
    .join("");

  kanban.querySelectorAll("[data-task-status]").forEach((select) => {
    select.addEventListener("change", () => {
      const task = state.tasks.find((item) => item.id === select.dataset.taskStatus);
      const previousStatus = task.status;
      task.status = select.value;
      logAudit("status_alterado", "tasks", task, `${previousStatus} → ${task.status}`);
      saveState();
      render();
    });
  });
  kanban.querySelectorAll("[data-task-edit]").forEach((button) => {
    button.addEventListener("click", () => openTaskModal(button.dataset.taskEdit));
  });
}

function renderTaskCard(task) {
  return `
    <article class="task-card">
      <h4>${escapeHtml(task.title)}</h4>
      <div class="task-meta">
        <span class="tag">${escapeHtml(task.owner)}</span>
        <span class="tag violet">${formatDate(task.due)}</span>
        <span class="tag ${task.priority === "Critica" || task.priority === "Alta" ? "warning" : ""}">${escapeHtml(task.priority)}</span>
      </div>
      <ul class="checklist">
        ${task.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
      <select data-task-status="${task.id}" aria-label="Status da acao">
        ${statuses.map((status) => `<option value="${status.id}" ${task.status === status.id ? "selected" : ""}>${status.label}</option>`).join("")}
      </select>
      <button class="ghost-button" type="button" data-task-edit="${task.id}">Editar ação</button>
    </article>
  `;
}

function renderActionItem(task) {
  return `
    <article class="task-card compact">
      <h4>${escapeHtml(task.title)}</h4>
      <div class="task-meta">
        <span class="tag">${escapeHtml(task.owner)}</span>
        <span class="tag violet">${formatDate(task.due)}</span>
        <span class="tag ${task.priority === "Critica" || task.priority === "Alta" ? "warning" : ""}">${escapeHtml(task.priority)}</span>
      </div>
    </article>
  `;
}

function renderMeetings() {
  document.querySelector("#meeting-board").innerHTML = state.meetings
    .filter((meeting) => !meeting.archivedAt)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(renderMeetingCard)
    .join("");
  bindSimpleActions("meeting", "#meeting-board");
}

function renderMeetingCompact(meeting) {
  return `
    <article class="meeting-card compact">
      <div>
        <h3>${escapeHtml(meeting.title)}</h3>
        <p class="muted">${formatDate(meeting.date)} às ${meeting.time}</p>
      </div>
      <span class="tag violet">${escapeHtml(meeting.participants)}</span>
    </article>
  `;
}

function renderMeetingCard(meeting) {
  const subject = encodeURIComponent(`Pauta: ${meeting.title}`);
  const body = encodeURIComponent(`${meeting.title}\nData: ${formatDate(meeting.date)} ${meeting.time}\n\nPauta:\n${meeting.agenda}`);
  const whatsapp = encodeURIComponent(`Lembrete Acessa: ${meeting.title} em ${formatDate(meeting.date)} às ${meeting.time}. Pauta: ${meeting.agenda}`);
  return `
    <article class="meeting-card">
      <div>
        <h3>${escapeHtml(meeting.title)}</h3>
        <p class="muted">${formatDate(meeting.date)} às ${meeting.time}</p>
      </div>
      <div class="tag-row">
        <span class="tag">${escapeHtml(meeting.participants)}</span>
        <span class="tag violet">Pauta</span>
      </div>
      <p class="muted">${escapeHtml(meeting.agenda)}</p>
      <p><strong>Decisoes:</strong> ${escapeHtml(meeting.decisions)}</p>
      <div class="card-actions">
        <a class="ghost-button" href="mailto:?subject=${subject}&body=${body}">Email</a>
        <a class="ghost-button" href="https://wa.me/?text=${whatsapp}" target="_blank" rel="noreferrer">WhatsApp</a>
        <button class="ghost-button" type="button" data-edit-id="${meeting.id}">Editar</button>
        <button class="text-button" type="button" data-archive-id="${meeting.id}">Arquivar</button>
      </div>
    </article>
  `;
}

function renderDocuments() {
  document.querySelector("#document-grid").innerHTML = state.documents.filter((doc) => !doc.archivedAt).map((doc) => `
    <article class="document-card">
      <div>
        <h3>${escapeHtml(doc.title)}</h3>
        <p class="muted">${escapeHtml(doc.note)}</p>
      </div>
      <div class="tag-row">
        <span class="tag">${escapeHtml(doc.type)}</span>
        <span class="tag violet">${escapeHtml(doc.owner)}</span>
        <span class="tag ${doc.confidentiality === "Restrito" ? "warning" : ""}">${escapeHtml(doc.confidentiality || "Interno")}</span>
      </div>
      <dl class="kpi-details">
        <div><dt>Versão</dt><dd>${escapeHtml(doc.version || "1.0")}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(doc.status || "Rascunho")}</dd></div>
        <div><dt>Partes</dt><dd>${escapeHtml(doc.parties || "Não informadas")}</dd></div>
        <div><dt>Repositório</dt><dd>${escapeHtml(doc.repository || "Não definido")}</dd></div>
        <div><dt>Vigência</dt><dd>${doc.effectiveDate ? formatDate(doc.effectiveDate) : "Não definida"}</dd></div>
        <div><dt>Revisão</dt><dd>${doc.reviewDate ? formatDate(doc.reviewDate) : "Não definida"}</dd></div>
      </dl>
      <div class="card-actions">
        ${doc.link && doc.link !== "#" ? `<a class="ghost-button" href="${escapeHtml(doc.link)}" target="_blank" rel="noreferrer">Abrir documento</a>` : `<span class="tag warning">Link pendente</span>`}
        <button class="ghost-button" type="button" data-edit-id="${doc.id}">Editar</button>
        <button class="text-button" type="button" data-archive-id="${doc.id}">Arquivar</button>
      </div>
    </article>
  `).join("");
  bindSimpleActions("document", "#document-grid");
}

function renderAudits() {
  const controls = audits.map((audit) => `
    <article class="audit-card">
      <span>${escapeHtml(audit.status)}</span>
      <h3>${escapeHtml(audit.control)}</h3>
      <dl>
        <div><dt>Dono</dt><dd>${escapeHtml(audit.owner)}</dd></div>
        <div><dt>Cadência</dt><dd>${escapeHtml(audit.cadence)}</dd></div>
        <div><dt>Evidência</dt><dd>${escapeHtml(audit.evidence)}</dd></div>
      </dl>
    </article>
  `).join("");
  const events = (state.auditLog ?? []).map((event) => `
    <article class="audit-card audit-event">
      <span>${formatDateTime(event.occurredAt)}</span>
      <h3>${escapeHtml(event.action)}</h3>
      <dl>
        <div><dt>Registro</dt><dd>${escapeHtml(event.label)}</dd></div>
        <div><dt>Entidade</dt><dd>${escapeHtml(event.collection)}</dd></div>
        <div><dt>Autor</dt><dd>${escapeHtml(event.actor)}</dd></div>
        <div><dt>Detalhe</dt><dd>${escapeHtml(event.detail || "Sem detalhe adicional")}</dd></div>
      </dl>
    </article>
  `).join("");
  document.querySelector("#audit-grid").innerHTML = `
    <section class="audit-section"><h3>Controles planejados</h3><div class="audit-grid">${controls}</div></section>
    <section class="audit-section"><h3>Eventos registrados</h3><div class="audit-grid">${events || `<p class="empty">Nenhum evento registrado ainda.</p>`}</div></section>
  `;
}

function renderArchive() {
  const groups = [
    {
      label: "Ações",
      collection: "tasks",
      items: state.tasks.filter((item) => item.status === "archived"),
    },
    {
      label: "Rituais",
      collection: "meetings",
      items: state.meetings.filter((item) => item.archivedAt),
    },
    {
      label: "Documentos",
      collection: "documents",
      items: state.documents.filter((item) => item.archivedAt),
    },
    {
      label: "Pessoas",
      collection: "people",
      items: state.people.filter((item) => item.archivedAt),
    },
    {
      label: "Indicadores",
      collection: "kpis",
      items: state.kpis.filter((item) => item.archivedAt),
    },
    {
      label: "Processos e manuais",
      collection: "processManuals",
      items: state.processManuals.filter((item) => item.archivedAt),
    },
    {
      label: "Riscos",
      collection: "risks",
      items: state.risks.filter((item) => item.archivedAt),
    },
    {
      label: "Fóruns de governança",
      collection: "governance",
      items: state.governance.filter((item) => item.archivedAt),
    },
    {
      label: "Matrizes RACI",
      collection: "raci",
      items: state.raci.filter((item) => item.archivedAt),
    },
    {
      label: "Diretorias",
      collection: "areas",
      items: state.areas.filter((item) => item.archivedAt),
    },
    {
      label: "Cargos e carreiras",
      collection: "careerTracks",
      items: state.careerTracks.filter((item) => item.archivedAt),
    },
  ];

  document.querySelector("#archive-groups").innerHTML = groups.map((group) => `
    <section class="panel archive-group">
      <div class="panel-heading">
        <h3>${group.label}</h3>
        <span class="tag">${group.items.length}</span>
      </div>
      <div class="archive-list">
        ${group.items.length ? group.items.map((item) => `
          <article class="document-card">
            <div>
              <h3>${escapeHtml(item.title ?? item.name ?? item.forum ?? item.process ?? "Registro")}</h3>
              <p class="muted">${item.archivedAt ? `Arquivado em ${formatDateTime(item.archivedAt)}` : "Arquivado pelo status da ação"}</p>
            </div>
            <button class="ghost-button" type="button" data-restore-collection="${group.collection}" data-restore-id="${item.id}">Restaurar</button>
          </article>
        `).join("") : `<p class="empty">Nenhum item arquivado.</p>`}
      </div>
    </section>
  `).join("");

  document.querySelectorAll("[data-restore-id]").forEach((button) => {
    button.addEventListener("click", () => restoreArchivedItem(button.dataset.restoreCollection, button.dataset.restoreId));
  });
}

function restoreArchivedItem(collection, id) {
  const item = state[collection]?.find((entry) => entry.id === id);
  if (!item) return;
  if (["governance", "raci"].includes(collection) && item.status === "Supersedido") {
    window.alert("Versões supersedidas fazem parte do histórico e não podem ser restauradas.");
    return;
  }
  if (collection === "tasks") item.status = "todo";
  else delete item.archivedAt;
  logAudit("restaurado", collection, item);
  saveState();
  render();
}

function renderPeople() {
  document.querySelector("#org-grid").innerHTML = state.people.filter((person) => !person.archivedAt).map((person) => `
    <article class="person-card">
      <div>
        <h3>${escapeHtml(person.name)}</h3>
        <p class="muted">${escapeHtml(person.role)}</p>
      </div>
      <div class="tag-row">
        <span class="tag">${escapeHtml(person.id)}</span>
        <span class="tag">${escapeHtml(person.area)}</span>
        <span class="tag violet">${escapeHtml(person.level || person.type || "Equipe")}</span>
        <span class="tag success">${escapeHtml(person.salary || "Salario nao informado")}</span>
      </div>
      <p>${escapeHtml(person.responsibilities)}</p>
      <small class="muted">Reporta para: ${escapeHtml(managerName(person.managerId))}</small>
      <a href="mailto:${escapeHtml(person.contact)}">${escapeHtml(person.contact)}</a>
      <div class="card-actions">
        <button class="ghost-button" type="button" data-edit-id="${person.id}">Editar</button>
        <button class="text-button" type="button" data-archive-id="${person.id}">Arquivar</button>
      </div>
    </article>
  `).join("");
  bindSimpleActions("person", "#org-grid");
}

function renderOrgChart() {
  const childrenByManager = state.people.filter((person) => !person.archivedAt).reduce((map, person) => {
    const key = person.managerId || "root";
    map[key] = map[key] || [];
    map[key].push(person);
    return map;
  }, {});
  const directors = childrenByManager.conselho || [];

  document.querySelector("#org-chart").innerHTML = `
    <div class="org-node root">
      <span>Conselho de Socios</span>
      <strong>Bruno, Harley, Shirley, Adson, Filipe, Rodrigo</strong>
      <small>Direcao estrategica, capital, prioridades e governanca</small>
    </div>
    <div class="org-branches">
      ${directors.map((director) => `
        <article class="org-node">
          <span>${escapeHtml(director.name)} | ${escapeHtml(director.salary || "")}</span>
          <strong>${escapeHtml(director.role)}</strong>
          <small>${escapeHtml(director.area)}</small>
          ${renderOrgChildren(director.id, childrenByManager)}
        </article>
      `).join("")}
    </div>
  `;
}

function renderOrgChildren(managerId, childrenByManager) {
  const children = childrenByManager[managerId] || [];
  if (!children.length) return "";

  return `
    <div class="org-subnodes">
      ${children.map((person) => `
        <div>
          <strong>${escapeHtml(person.name)}</strong>
          <small>${escapeHtml(person.role)} | ${escapeHtml(person.salary || "")}</small>
          ${renderOrgChildren(person.id, childrenByManager)}
        </div>
      `).join("")}
    </div>
  `;
}

function managerName(managerId) {
  if (!managerId) return "Topo da estrutura";
  return state.people.find((person) => person.id === managerId)?.name || managerId;
}

function openTaskModal(id = null) {
  taskEditId = id;
  taskForm.reset();
  taskModalTitle.textContent = id ? "Editar ação" : "Nova ação";
  const task = id ? state.tasks.find((item) => item.id === id) : null;
  if (task) {
    taskForm.elements.namedItem("title").value = task.title ?? "";
    taskForm.elements.namedItem("owner").value = task.owner ?? "";
    taskForm.elements.namedItem("due").value = task.due ?? "";
    taskForm.elements.namedItem("priority").value = task.priority ?? "Media";
    taskForm.elements.namedItem("checklist").value = (task.checklist ?? []).join("\n");
  }
  taskModal.showModal();
}

function openSimpleModal(mode, id = null) {
  simpleMode = mode;
  simpleEditId = id;
  simpleForm.reset();
  const config = simpleConfigs[mode];
  const item = id ? state[config.collection].find((entry) => entry.id === id) : null;
  simpleTitle.textContent = item ? config.editTitle : config.title;
  simpleFields.innerHTML = config.fields.map(renderField).join("");
  if (item) {
    config.fields.forEach(([name]) => {
      const field = simpleForm.elements.namedItem(name);
      if (field) field.value = Array.isArray(item[name]) ? item[name].join("\n") : item[name] ?? "";
    });
  }
  simpleModal.showModal();
}

function openCareerLevelModal(trackId, levelIndex = null) {
  const track = state.careerTracks.find((item) => item.id === trackId);
  if (!track) return;
  const level = levelIndex === null ? null : track.levelDetails?.[levelIndex];
  careerLevelContext = { trackId, levelIndex };
  simpleMode = "careerLevel";
  simpleEditId = levelIndex === null ? null : String(levelIndex);
  simpleForm.reset();
  const config = simpleConfigs.careerLevel;
  simpleTitle.textContent = level ? "Editar nível, salário e benefícios" : "Adicionar nível de carreira";
  simpleFields.innerHTML = config.fields.map(renderField).join("");
  if (level) {
    const [legacyBaseSalary = "", legacyVariablePay = ""] = String(level.pay || "").split("|").map((value) => value.trim());
    const editableLevel = { ...level, baseSalary: level.baseSalary || legacyBaseSalary, variablePay: level.variablePay || legacyVariablePay };
    config.fields.forEach(([name]) => {
      const field = simpleForm.elements.namedItem(name);
      if (field) field.value = Array.isArray(editableLevel[name]) ? editableLevel[name].join("\n") : editableLevel[name] ?? "";
    });
  }
  simpleModal.showModal();
}

function openCareerBenefitModal(trackId, tierIndex = null) {
  const track = state.careerTracks.find((item) => item.id === trackId);
  if (!track) return;
  const tier = tierIndex === null ? null : track.benefitTiers?.[tierIndex];
  careerBenefitContext = { trackId, tierIndex };
  simpleMode = "careerBenefit";
  simpleEditId = tierIndex === null ? null : String(tierIndex);
  simpleForm.reset();
  const config = simpleConfigs.careerBenefit;
  simpleTitle.textContent = tier ? "Editar benefícios por tempo de casa" : "Adicionar faixa de benefícios";
  simpleFields.innerHTML = config.fields.map(renderField).join("");
  if (tier) {
    config.fields.forEach(([name]) => {
      const field = simpleForm.elements.namedItem(name);
      if (field) field.value = Array.isArray(tier[name]) ? tier[name].join("\n") : tier[name] ?? "";
    });
  }
  simpleModal.showModal();
}

function bindSimpleActions(mode, containerSelector) {
  const container = document.querySelector(containerSelector);
  container.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => openSimpleModal(mode, button.dataset.editId));
  });
  container.querySelectorAll("[data-archive-id]").forEach((button) => {
    button.addEventListener("click", () => archiveSimpleItem(mode, button.dataset.archiveId));
  });
}

function archiveSimpleItem(mode, id) {
  const config = simpleConfigs[mode];
  const item = state[config.collection].find((entry) => entry.id === id);
  if (!item) return;
  if (mode === "person" && state.people.some((person) => !person.archivedAt && person.managerId === id)) {
    window.alert("Esta pessoa possui subordinados ativos. Reatribua-os antes de arquivar.");
    return;
  }
  if (!window.confirm(`Arquivar \"${item.title ?? item.name}\"?`)) return;
  item.archivedAt = new Date().toISOString();
  logAudit("arquivado", config.collection, item);
  saveState();
  render();
}

const simpleConfigs = {
  meeting: {
    title: "Novo ritual",
    editTitle: "Editar ritual",
    collection: "meetings",
    fields: [
      ["title", "Titulo", "text"],
      ["date", "Data", "date"],
      ["time", "Hora", "time"],
      ["participants", "Participantes", "text"],
      ["agenda", "Pauta", "textarea"],
      ["decisions", "Decisoes iniciais", "textarea"],
    ],
  },
  document: {
    title: "Novo documento",
    editTitle: "Editar documento",
    collection: "documents",
    fields: [
      ["title", "Titulo", "text"],
      ["type", "Categoria documental", "text"],
      ["owner", "Responsavel", "text"],
      ["parties", "Partes envolvidas", "text"],
      ["version", "Versão", "text"],
      ["status", "Status: Rascunho, Em revisão, Vigente ou Encerrado", "text"],
      ["confidentiality", "Confidencialidade: Interno, Restrito ou Conselho", "text"],
      ["repository", "Repositório oficial", "text"],
      ["link", "Link seguro do documento", "text"],
      ["effectiveDate", "Início da vigência", "date"],
      ["reviewDate", "Próxima revisão", "date"],
      ["note", "Observacao", "textarea"],
    ],
  },
  person: {
    title: "Nova pessoa",
    editTitle: "Editar pessoa",
    collection: "people",
    fields: [
      ["name", "Nome", "text"],
      ["role", "Funcao", "text"],
      ["area", "Area", "text"],
      ["level", "Nivel", "text"],
      ["salary", "Salario", "text"],
      ["managerId", "ID do gestor", "text"],
      ["type", "Tipo: Diretor, Lider ou Equipe", "text"],
      ["responsibilities", "Responsabilidades", "textarea"],
      ["contact", "Email", "email"],
    ],
  },
  kpi: {
    title: "Novo indicador",
    editTitle: "Editar indicador",
    collection: "kpis",
    fields: [
      ["name", "Nome", "text"],
      ["area", "Área", "text"],
      ["value", "Resultado atual", "text"],
      ["target", "Meta", "text"],
      ["trend", "Tendência", "text"],
      ["status", "Status: good, watch ou risk", "text"],
      ["formula", "Fórmula", "textarea"],
      ["source", "Fonte oficial", "text"],
      ["frequency", "Frequência", "text"],
      ["owner", "Responsável", "text"],
      ["period", "Período de referência", "text"],
    ],
  },
  process: {
    title: "Novo processo",
    editTitle: "Editar processo",
    collection: "processManuals",
    fields: [
      ["title", "Título", "text"],
      ["area", "Área", "text"],
      ["owner", "Responsável", "text"],
      ["objective", "Objetivo", "textarea"],
      ["steps", "Passo a passo — uma etapa por linha", "list"],
      ["evidence", "Evidências obrigatórias", "textarea"],
      ["version", "Versão", "text"],
      ["status", "Status: Rascunho, Em revisão, Aprovado ou Arquivado", "text"],
      ["approver", "Aprovador", "text"],
      ["effectiveFrom", "Início da vigência", "date"],
      ["reviewDate", "Próxima revisão", "date"],
    ],
  },
  risk: {
    title: "Novo risco",
    editTitle: "Editar risco",
    collection: "risks",
    fields: [
      ["title", "Risco", "text"],
      ["area", "Área", "text"],
      ["probability", "Probabilidade de 1 a 5", "number"],
      ["impact", "Impacto de 1 a 5", "number"],
      ["owner", "Responsável", "text"],
      ["mitigation", "Plano de mitigação", "textarea"],
      ["due", "Prazo", "date"],
      ["status", "Status: Aberto, Em tratamento, Monitorado ou Encerrado", "text"],
    ],
  },
  governance: {
    title: "Novo fórum",
    editTitle: "Nova versão do fórum",
    collection: "governance",
    fields: [
      ["code", "Código do fórum", "text"],
      ["forum", "Fórum", "text"],
      ["type", "Tipo: Estratégico, Executivo, Tático, Operacional ou Controle", "text"],
      ["cadence", "Cadência", "text"],
      ["mandate", "Mandato e autoridade", "textarea"],
      ["owner", "Responsável", "text"],
      ["secretary", "Secretário responsável pela ata", "text"],
      ["quorum", "Quórum mínimo", "text"],
      ["decisionAuthority", "Alçada de decisão", "textarea"],
      ["evidence", "Evidência obrigatória", "textarea"],
      ["validFrom", "Início da vigência", "date"],
      ["validTo", "Fim da vigência", "date"],
      ["reviewDate", "Próxima revisão", "date"],
      ["changeReason", "Motivo da alteração", "textarea"],
    ],
  },
  raci: {
    title: "Nova responsabilidade RACI",
    editTitle: "Nova versão da responsabilidade RACI",
    collection: "raci",
    fields: [
      ["code", "Código único do processo", "text"],
      ["process", "Processo", "text"],
      ["area", "Diretoria responsável", "text"],
      ["category", "Categoria do processo", "text"],
      ["responsible", "Responsável — R", "text"],
      ["approver", "Aprovador único — A", "text"],
      ["consulted", "Consultados — C", "text"],
      ["informed", "Informados — I", "text"],
      ["authority", "Alçada e limites de decisão", "textarea"],
      ["evidence", "Evidência obrigatória", "textarea"],
      ["forumId", "Código do fórum relacionado", "text"],
      ["validFrom", "Início da vigência", "date"],
      ["validTo", "Fim da vigência", "date"],
      ["reviewDate", "Próxima revisão", "date"],
      ["changeReason", "Motivo da alteração", "textarea"],
    ],
  },
  area: {
    title: "Nova diretoria",
    editTitle: "Editar diretoria",
    collection: "areas",
    fields: [
      ["name", "Nome", "text"],
      ["owner", "Responsável", "text"],
      ["purpose", "Propósito", "textarea"],
      ["headcount", "Quadro de referência", "number"],
      ["teams", "Equipes — uma por linha", "list"],
      ["processes", "Processos — um por linha", "list"],
      ["indicators", "Indicadores — um por linha", "list"],
      ["validFrom", "Início da vigência", "date"],
      ["reviewDate", "Próxima revisão", "date"],
    ],
  },
  career: {
    title: "Nova carreira",
    editTitle: "Editar carreira",
    collection: "careerTracks",
    fields: [
      ["family", "Nome da área de carreira", "text"],
      ["directorate", "Diretoria", "text"],
      ["mission", "Objetivo da área de carreira", "textarea"],
      ["levels", "Níveis — um por linha", "list"],
      ["salary", "Faixa salarial de referência", "text"],
      ["confidentiality", "Confidencialidade", "text"],
      ["competencies", "Competências — uma por linha", "list"],
      ["requirements", "Requisitos — um por linha", "list"],
      ["trainings", "Treinamentos obrigatórios — um por linha", "list"],
      ["next", "Próximo passo de carreira", "text"],
      ["validFrom", "Início da vigência", "date"],
      ["reviewDate", "Próxima revisão", "date"],
    ],
  },
  careerLevel: {
    title: "Novo nível",
    editTitle: "Editar nível",
    collection: "careerTracks",
    fields: [
      ["name", "Nome do cargo ou nível", "text"],
      ["time", "Tempo médio no cargo", "text"],
      ["companyTenure", "Tempo mínimo de empresa", "text"],
      ["baseSalary", "Salário fixo estimado", "text"],
      ["variablePay", "Comissão ou bônus estimado", "text"],
      ["benefits", "Benefícios — um por linha", "list"],
      ["responsibilities", "Responsabilidades — uma por linha", "list"],
      ["indicators", "Indicadores — um por linha", "list"],
      ["promotion", "Critérios para promoção — um por linha", "list"],
    ],
  },
  careerBenefit: {
    title: "Nova faixa de benefícios",
    editTitle: "Editar faixa de benefícios",
    collection: "careerTracks",
    fields: [
      ["tenure", "Tempo de empresa", "text"],
      ["label", "Nome da faixa", "text"],
      ["benefits", "Benefícios — um por linha", "list"],
    ],
  },
};

function renderField([name, label, type]) {
  const input = type === "textarea" || type === "list"
    ? `<textarea name="${name}" required></textarea>`
    : `<input name="${name}" type="${type}" required />`;
  return `<label>${label}${input}</label>`;
}

function priorityValue(priority) {
  return { Critica: 4, Alta: 3, Media: 2, Baixa: 1 }[priority] ?? 0;
}

function formatDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return "Data inválida";
  const [year, month, day] = String(date).split("-");
  return `${day}/${month}/${year}`;
}

function currentCivilDateIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function escapeHtml(value) {
  const raw = String(value);
  const normalized = raw.includes("@") || /^https?:\/\//i.test(raw)
    ? raw
    : normalizePortuguese(raw);
  return normalized
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePortuguese(value) {
  const replacements = [
    ["acao", "ação"], ["acoes", "ações"], ["alcada", "alçada"],
    ["analise", "análise"], ["aprovacao", "aprovação"], ["aprovacoes", "aprovações"],
    ["ativacao", "ativação"], ["cadencia", "cadência"], ["cadencias", "cadências"],
    ["comite", "comitê"], ["competencias", "competências"], ["concluido", "concluído"],
    ["conversao", "conversão"], ["coordenacao", "coordenação"], ["critica", "crítica"],
    ["criticas", "críticas"], ["critico", "crítico"], ["criticos", "críticos"],
    ["decisao", "decisão"], ["decisoes", "decisões"],
    ["demissao", "demissão"], ["direcao", "direção"], ["evidencia", "evidência"],
    ["evidencias", "evidências"], ["excelencia", "excelência"], ["execucao", "execução"],
    ["experiencia", "experiência"], ["familia", "família"], ["familias", "famílias"],
    ["fidelizacao", "fidelização"], ["frequencia", "frequência"], ["funcao", "função"],
    ["funcoes", "funções"], ["gestao", "gestão"], ["governanca", "governança"],
    ["implantacao", "implantação"], ["inadimplencia", "inadimplência"], ["indicacao", "indicação"], ["instalacao", "instalação"],
    ["instalacoes", "instalações"], ["inovacao", "inovação"], ["lider", "líder"],
    ["lideranca", "liderança"], ["lideres", "líderes"], ["licitacoes", "licitações"],
    ["manutencao", "manutenção"], ["media", "média"], ["mitigacao", "mitigação"],
    ["nao", "não"], ["negociacao", "negociação"], ["nivel", "nível"],
    ["niveis", "níveis"], ["operacao", "operação"], ["optica", "óptica"],
    ["orcamento", "orçamento"], ["padrao", "padrão"], ["pos-atendimento", "pós-atendimento"],
    ["pos-mortem", "pós-mortem"], ["pro-labore", "pró-labore"], ["proximo", "próximo"],
    ["reclamacoes", "reclamações"], ["recuperacao", "recuperação"], ["referencia", "referência"],
    ["reincidencia", "reincidência"], ["relacao", "relação"], ["remuneracao", "remuneração"],
    ["responsavel", "responsável"], ["responsaveis", "responsáveis"],
    ["retencao", "retenção"], ["reuniao", "reunião"], ["reunioes", "reuniões"],
    ["salario", "salário"], ["salarios", "salários"], ["seguranca", "segurança"],
    ["socios", "sócios"], ["solucao", "solução"], ["solucoes", "soluções"],
    ["supervisao", "supervisão"], ["sustentavel", "sustentável"], ["tecnica", "técnica"],
    ["tecnicas", "técnicas"], ["tecnico", "técnico"], ["tecnicos", "técnicos"],
    ["tendencia", "tendência"], ["tracao", "tração"], ["transparencia", "transparência"],
    ["usuario", "usuário"], ["usuarios", "usuários"], ["validacao", "validação"],
    ["variavel", "variável"], ["visao", "visão"],
  ];
  return replacements.reduce((text, [source, target]) => text.replace(
    new RegExp(`\\b${source}\\b`, "gi"),
    (match) => match[0] === match[0].toUpperCase() ? target[0].toUpperCase() + target.slice(1) : target,
  ), value);
}

navButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelectorAll("[data-view-jump]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewJump));
});

document.querySelector("#new-task").addEventListener("click", openTaskModal);
document.querySelector("#new-task-board").addEventListener("click", openTaskModal);
document.querySelector("#new-meeting").addEventListener("click", () => openSimpleModal("meeting"));
document.querySelector("#new-document").addEventListener("click", () => openSimpleModal("document"));
document.querySelector("#new-person").addEventListener("click", () => openSimpleModal("person"));
document.querySelector("#new-kpi").addEventListener("click", () => openSimpleModal("kpi"));
document.querySelector("#new-process").addEventListener("click", () => openSimpleModal("process"));
document.querySelector("#new-risk").addEventListener("click", () => openSimpleModal("risk"));
document.querySelector("#new-governance").addEventListener("click", () => openSimpleModal("governance"));
document.querySelector("#new-raci").addEventListener("click", () => openSimpleModal("raci"));
document.querySelector("#governance-search").addEventListener("input", renderGovernance);
document.querySelector("#governance-area-filter").addEventListener("change", renderGovernance);
document.querySelector("#governance-status-filter").addEventListener("change", renderGovernance);
document.querySelector("#new-area").addEventListener("click", () => openSimpleModal("area"));
document.querySelector("#new-career").addEventListener("click", () => openSimpleModal("career"));
document.querySelector("#export-backup").addEventListener("click", exportBackup);
document.querySelector("#import-backup").addEventListener("click", () => {
  document.querySelector("#backup-file").click();
});
document.querySelector("#backup-file").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    await restoreBackup(file);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Não foi possível restaurar o backup.");
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#email-summary").addEventListener("click", () => {
  const open = state.tasks.filter((task) => !["done", "archived"].includes(task.status)).length;
  const subject = encodeURIComponent("Resumo executivo Acessa Board");
  const body = encodeURIComponent(
    `Diretorias: ${state.areas.filter((area) => !area.archivedAt).length}\n` +
    `Processos mapeados: ${state.areas.filter((area) => !area.archivedAt).reduce((total, area) => total + area.processes.length, 0)}\n` +
    `Acoes abertas: ${open}\n` +
    `Riscos mapeados: ${state.risks.filter((risk) => !risk.archivedAt).length}\n` +
    `Rituais marcados: ${state.meetings.length}`,
  );
  location.href = `mailto:?subject=${subject}&body=${body}`;
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(taskForm);
  const existing = taskEditId ? state.tasks.find((task) => task.id === taskEditId) : null;
  const task = existing ?? {
    id: crypto.randomUUID(),
    status: "todo",
  };
  Object.assign(task, {
    title: data.get("title"),
    owner: data.get("owner"),
    due: data.get("due"),
    priority: data.get("priority"),
    checklist: String(data.get("checklist") || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  });
  if (!existing) state.tasks.push(task);
  logAudit(existing ? "editado" : "criado", "tasks", task);
  saveState();
  taskModal.close();
  taskEditId = null;
  setView("board");
  render();
});

simpleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const config = simpleConfigs[simpleMode];
  const data = new FormData(simpleForm);
  if (simpleMode === "careerBenefit") {
    const values = {};
    config.fields.forEach(([name, , type]) => {
      const value = data.get(name);
      values[name] = type === "list"
        ? String(value || "").split("\n").map((entry) => entry.trim()).filter(Boolean)
        : value;
    });
    const track = state.careerTracks.find((item) => item.id === careerBenefitContext?.trackId);
    if (!track) return;
    track.benefitTiers = Array.isArray(track.benefitTiers) ? track.benefitTiers : [];
    if (careerBenefitContext.tierIndex === null) track.benefitTiers.push(values);
    else Object.assign(track.benefitTiers[careerBenefitContext.tierIndex], values);
    logAudit(careerBenefitContext.tierIndex === null ? "benefício_criado" : "benefício_editado", "careerTracks", track, values.tenure);
    saveState();
    simpleModal.close();
    careerBenefitContext = null;
    simpleEditId = null;
    render();
    return;
  }
  if (simpleMode === "careerLevel") {
    const values = {};
    config.fields.forEach(([name, , type]) => {
      const value = data.get(name);
      values[name] = type === "list"
        ? String(value || "").split("\n").map((entry) => entry.trim()).filter(Boolean)
        : value;
    });
    const track = state.careerTracks.find((item) => item.id === careerLevelContext?.trackId);
    if (!track) return;
    track.levelDetails = Array.isArray(track.levelDetails) ? track.levelDetails : [];
    if (careerLevelContext.levelIndex === null) track.levelDetails.push(values);
    else Object.assign(track.levelDetails[careerLevelContext.levelIndex], values);
    track.levels = track.levelDetails.map((level) => level.name);
    logAudit(careerLevelContext.levelIndex === null ? "nível_criado" : "nível_editado", "careerTracks", track, values.name);
    saveState();
    simpleModal.close();
    careerLevelContext = null;
    simpleEditId = null;
    render();
    return;
  }
  const existing = simpleEditId
    ? state[config.collection].find((entry) => entry.id === simpleEditId)
    : null;
  const values = {};
  config.fields.forEach(([name, , type]) => {
    const value = data.get(name);
    values[name] = type === "list"
      ? String(value || "").split("\n").map((entry) => entry.trim()).filter(Boolean)
      : value;
  });

  if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
    window.alert("O fim da vigência não pode ser anterior ao início.");
    return;
  }
  if (simpleMode === "raci" && (!String(values.responsible).trim() || !String(values.approver).trim())) {
    window.alert("O RACI exige pelo menos um responsável e exatamente um aprovador.");
    return;
  }
  if (simpleMode === "raci" && /[,;\n]/.test(String(values.approver))) {
    window.alert("O campo A deve ter somente um aprovador. Para aprovações colegiadas, informe o fórum como único aprovador e detalhe o quórum no cadastro do fórum.");
    return;
  }
  if (simpleMode === "raci" && (!String(values.code || "").trim() || !String(values.area || "").trim() || !String(values.evidence || "").trim() || !values.reviewDate)) {
    window.alert("Para publicar um RACI robusto, informe código, diretoria, evidência obrigatória e próxima revisão.");
    return;
  }
  if (simpleMode === "governance" && (!String(values.code || "").trim() || !String(values.owner || "").trim() || !String(values.quorum || "").trim() || !String(values.evidence || "").trim() || !values.reviewDate)) {
    window.alert("Para ativar um fórum, informe código, dono, quórum, evidência obrigatória e próxima revisão.");
    return;
  }
  if (
    simpleMode === "raci" &&
    !existing &&
    state.raci.some((entry) => !entry.archivedAt && entry.process.trim().toLowerCase() === String(values.process).trim().toLowerCase())
  ) {
    window.alert("Já existe uma matriz RACI ativa para este processo. Edite a existente para criar uma nova versão.");
    return;
  }
  if (["raci", "governance"].includes(simpleMode)) {
    const code = String(values.code || "").trim().toLowerCase();
    const duplicateCode = state[config.collection].some((entry) => !entry.archivedAt && entry.id !== simpleEditId && String(entry.code || "").trim().toLowerCase() === code);
    if (duplicateCode) {
      window.alert("Este código já está em uso. Utilize um código único para manter a rastreabilidade.");
      return;
    }
  }

  const versioned = ["governance", "raci"].includes(simpleMode);
  let item;
  if (existing && versioned) {
    const now = new Date().toISOString();
    existing.status = "Supersedido";
    existing.archivedAt = now;
    existing.validTo = currentCivilDateIso();
    existing.updatedAt = now;
    item = {
      id: crypto.randomUUID(),
      baseId: existing.baseId ?? existing.id,
      version: Number(existing.version ?? 1) + 1,
      status: "Ativo",
      createdAt: now,
      updatedAt: now,
    };
  } else {
    item = existing ?? {
      id: crypto.randomUUID(),
      ...(versioned ? { baseId: null, version: 1, status: "Ativo", createdAt: new Date().toISOString() } : {}),
    };
    if (versioned && !item.baseId) item.baseId = item.id;
  }

  Object.assign(item, values);
  if (versioned) item.updatedAt = new Date().toISOString();
  if (!existing || versioned) state[config.collection].push(item);
  logAudit(existing ? (versioned ? "nova_versao" : "editado") : "criado", config.collection, item);
  saveState();
  simpleModal.close();
  simpleEditId = null;
  render();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.textContent = "";
  const button = authForm.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Entrando...";
  const data = new FormData(authForm);
  try {
    await signIn(String(data.get("email") || "").trim(), String(data.get("password") || ""));
    await initializeCloud();
    authForm.reset();
  } catch (error) {
    authError.textContent = error instanceof Error ? error.message : "Não foi possível entrar.";
  } finally {
    button.disabled = false;
    button.textContent = "Entrar com segurança";
  }
});

forgotPasswordButton.addEventListener("click", () => {
  recoveryMessage.textContent = "";
  recoveryMessage.classList.remove("auth-success");
  recoveryForm.elements.email.value = authForm.elements.email.value;
  showAuthPanel("recovery");
});

backToLoginButton.addEventListener("click", () => showAuthPanel("login"));

recoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = recoveryForm.querySelector("button[type='submit']");
  button.disabled = true;
  recoveryMessage.classList.remove("auth-success");
  recoveryMessage.textContent = "Enviando...";
  try {
    await requestPasswordReset(String(recoveryForm.elements.email.value || "").trim());
    recoveryMessage.textContent = "Se o e-mail estiver autorizado, você receberá um link para criar uma nova senha.";
    recoveryMessage.classList.add("auth-success");
  } catch (error) {
    recoveryMessage.textContent = error instanceof Error ? error.message : "Não foi possível enviar o link.";
  } finally {
    button.disabled = false;
  }
});

newPasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = String(newPasswordForm.elements.password.value || "");
  const confirmation = String(newPasswordForm.elements.passwordConfirm.value || "");
  newPasswordMessage.classList.remove("auth-success");
  if (password !== confirmation) {
    newPasswordMessage.textContent = "As senhas não coincidem.";
    return;
  }
  const button = newPasswordForm.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Salvando...";
  try {
    await updatePassword(password);
    passwordRecoveryPending = false;
    newPasswordMessage.textContent = "Senha atualizada. Conectando ao Acessa Board...";
    newPasswordMessage.classList.add("auth-success");
    history.replaceState({}, document.title, `${location.pathname}${location.search}`);
    await initializeCloud();
  } catch (error) {
    newPasswordMessage.textContent = error instanceof Error ? error.message : "Não foi possível atualizar a senha.";
  } finally {
    button.disabled = false;
    button.textContent = "Salvar nova senha";
  }
});

onAuthEvent((event) => {
  if (event === "PASSWORD_RECOVERY") {
    passwordRecoveryPending = true;
    showAuthPanel("new-password");
  }
});

accountButton.addEventListener("click", async () => {
  if (!cloudContext.connected) {
    showAuthPanel("login");
    return;
  }
  if (!window.confirm("Deseja sair do Acessa Board?")) return;
  await signOut();
  window.location.reload();
});

render();
initializeCloud();
