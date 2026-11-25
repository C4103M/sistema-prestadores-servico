export type StatusAgendamento = 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO' | 'FALTOU';

export type PapelUsuario = 'ADMIN' | 'CLIENTE' | 'PROFISSIONAL';

/** Cada ator do diagrama de casos de uso tem a sua área, com rotas próprias. */
export type Area = 'cliente' | 'profissional' | 'admin';

export type DiaSemana =
  | 'DOMINGO'
  | 'SEGUNDA'
  | 'TERCA'
  | 'QUARTA'
  | 'QUINTA'
  | 'SEXTA'
  | 'SABADO';

export interface Profissional {
  id: number;
  nome: string;
  especialidade: string;
  email?: string;
  telefone?: string;
  servicos?: Servico[];
}

export interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
}

export interface Servico {
  id: number;
  nome: string;
  descricao: string;
  duracaoMinutos: number;
  preco: number;
  ativo: boolean;
  profissionalId: number;
  profissionalNome: string;
  categoria: string;
}

export interface Disponibilidade {
  id: number;
  profissionalId: number;
  diaSemana: DiaSemana;
  horaInicio: string; // HH:MM
  horaFim: string; // HH:MM
}

export interface Agendamento {
  id: number;
  clienteId: number;
  clienteNome: string;
  profissionalId: number;
  profissionalNome: string;
  servicoId: number;
  servicoNome: string;
  dataHoraInicio: string; // ISO
  dataHoraFim: string; // ISO
  preco: number;
  status: StatusAgendamento;
  podeCancelar?: boolean;
  criadoEm?: string;
}

export interface HealthStatus {
  status: 'UP' | 'DOWN';
  database: 'UP' | 'DOWN';
  timestamp: string;
  resumo?: {
    profissionais: number;
    clientes: number;
    servicos: number;
    agendamentos: number;
  };
}

export interface FaturamentoServico {
  servicoId: number;
  servicoNome: string;
  concluidos: number;
  faturamento: number;
}

export interface AtendimentoRecente {
  id: number;
  clienteNome: string;
  servicoNome: string;
  profissionalNome: string;
  dataHoraInicio: string;
  preco: number;
}

export interface DashboardResponse {
  totalAtendimentos: number;
  concluidos: number;
  cancelados: number;
  faltas: number;
  agendados: number;
  agendadosFuturos: number;
  taxaComparecimento: number | null;
  faturamentoTotal: number;
  porServico: FaturamentoServico[];
  recentes: AtendimentoRecente[];
}

export interface FaturamentoProfissional {
  profissionalId: number;
  profissionalNome: string;
  concluidos: number;
  faltas: number;
  faturamento: number;
}

export interface AdminDashboardResponse {
  totais: DashboardResponse;
  profissionais: number;
  servicosAtivos: number;
  porProfissional: FaturamentoProfissional[];
}

export type Tela =
  | 'cliente/buscar'
  | 'cliente/agendamentos'
  | 'profissional/agenda'
  | 'profissional/servicos'
  | 'profissional/disponibilidade'
  | 'profissional/dashboard'
  | 'admin/servicos'
  | 'admin/dashboard';
