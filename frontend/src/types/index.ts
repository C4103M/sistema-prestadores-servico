export type StatusAgendamento = 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO' | 'FALTOU';

export type PapelUsuario = 'CLIENTE' | 'PROFISSIONAL';

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
  email: string;
  telefone: string;
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
  precoCobrado: number;
  status: StatusAgendamento;
  criadoEm: string;
}

export type Tela =
  | 'inicio'
  | 'meus-agendamentos'
  | 'agenda'
  | 'servicos'
  | 'disponibilidade'
  | 'dashboard';
