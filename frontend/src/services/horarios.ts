import type { Agendamento, DiaSemana, Disponibilidade, Servico } from '../types';

export const DIAS_SEMANA: { valor: DiaSemana; nome: string; curto: string }[] = [
  { valor: 'SEGUNDA', nome: 'Segunda-feira', curto: 'Seg' },
  { valor: 'TERCA', nome: 'Terça-feira', curto: 'Ter' },
  { valor: 'QUARTA', nome: 'Quarta-feira', curto: 'Qua' },
  { valor: 'QUINTA', nome: 'Quinta-feira', curto: 'Qui' },
  { valor: 'SEXTA', nome: 'Sexta-feira', curto: 'Sex' },
  { valor: 'SABADO', nome: 'Sábado', curto: 'Sáb' },
  { valor: 'DOMINGO', nome: 'Domingo', curto: 'Dom' },
];

const POR_GETDAY: DiaSemana[] = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];

const PASSO_MINUTOS = 30;

export const diaSemanaDe = (data: Date): DiaSemana => POR_GETDAY[data.getDay()];

export const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const deMinutos = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

export const comHorario = (data: Date, minutos: number) => {
  const d = new Date(data);
  d.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
  return d;
};

export const faixasDoDia = (disponibilidades: Disponibilidade[], profissionalId: number, data: Date) =>
  disponibilidades
    .filter((d) => d.profissionalId === profissionalId && d.diaSemana === diaSemanaDe(data))
    .sort((a, b) => paraMinutos(a.horaInicio) - paraMinutos(b.horaInicio));

// RN02: intervalos [inicio, fim) de agendamentos ativos do mesmo profissional não podem se cruzar
export const temConflito = (
  agendamentos: Agendamento[],
  profissionalId: number,
  inicio: Date,
  fim: Date,
  ignorarId?: number
) =>
  agendamentos.some(
    (a) =>
      a.id !== ignorarId &&
      a.profissionalId === profissionalId &&
      a.status === 'AGENDADO' &&
      inicio.getTime() < new Date(a.dataHoraFim).getTime() &&
      fim.getTime() > new Date(a.dataHoraInicio).getTime()
  );

export interface Horario {
  inicio: Date;
  fim: Date;
}

// RN01 + RN02: horários livres = faixas de disponibilidade − horários ocupados − passado
export function horariosLivres(
  servico: Servico,
  data: Date,
  disponibilidades: Disponibilidade[],
  agendamentos: Agendamento[],
  agora = new Date()
): Horario[] {
  const livres: Horario[] = [];
  for (const faixa of faixasDoDia(disponibilidades, servico.profissionalId, data)) {
    const fimFaixa = paraMinutos(faixa.horaFim);
    for (let t = paraMinutos(faixa.horaInicio); t + servico.duracaoMinutos <= fimFaixa; t += PASSO_MINUTOS) {
      const inicio = comHorario(data, t);
      const fim = comHorario(data, t + servico.duracaoMinutos);
      if (inicio.getTime() <= agora.getTime()) continue;
      if (temConflito(agendamentos, servico.profissionalId, inicio, fim)) continue;
      livres.push({ inicio, fim });
    }
  }
  return livres;
}

// RN03: cancelamento pelo cliente com no mínimo 2 h de antecedência
export const podeCancelar = (a: Agendamento, agora = new Date()) =>
  a.status === 'AGENDADO' && new Date(a.dataHoraInicio).getTime() - agora.getTime() >= 2 * 60 * 60 * 1000;

export const faixasSobrepostas = (
  faixas: Disponibilidade[],
  nova: Pick<Disponibilidade, 'diaSemana' | 'horaInicio' | 'horaFim' | 'profissionalId'>,
  ignorarId?: number
) =>
  faixas.some(
    (f) =>
      f.id !== ignorarId &&
      f.profissionalId === nova.profissionalId &&
      f.diaSemana === nova.diaSemana &&
      paraMinutos(nova.horaInicio) < paraMinutos(f.horaFim) &&
      paraMinutos(nova.horaFim) > paraMinutos(f.horaInicio)
  );
