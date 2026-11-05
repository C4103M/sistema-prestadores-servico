import type { Agendamento, Cliente, Disponibilidade, Profissional, Servico, StatusAgendamento } from '../types';
import { comHorario, faixasDoDia, paraMinutos, temConflito } from './horarios';

// Dados de demonstração do protótipo. Os agendamentos são gerados a partir da data de hoje
// para que a agenda e o dashboard sempre tenham movimento durante a apresentação.

export const PROFISSIONAL_LOGADO_ID = 1;
export const CLIENTE_LOGADO_ID = 1;

export const mockProfissionais: Profissional[] = [
  { id: 1, nome: 'Carlos Silva', especialidade: 'Barbearia', email: 'carlos@barbearia.com', telefone: '(11) 98765-4321' },
  { id: 2, nome: 'Beatriz Mendes', especialidade: 'Estética', email: 'beatriz@estetica.com', telefone: '(11) 97654-3210' },
  { id: 3, nome: 'Marcos Andrade', especialidade: 'Elétrica residencial', email: 'marcos@eletrica.com', telefone: '(11) 96543-2109' },
];

export const mockClientes: Cliente[] = [
  { id: 1, nome: 'Lucas Pereira', email: 'lucas@email.com', telefone: '(11) 91234-5678' },
  { id: 2, nome: 'Mariana Souza', email: 'mariana@email.com', telefone: '(11) 92345-6789' },
  { id: 3, nome: 'Rafael Lima', email: 'rafael@email.com', telefone: '(11) 93456-7890' },
  { id: 4, nome: 'Ana Costa', email: 'ana@email.com', telefone: '(11) 94567-8901' },
  { id: 5, nome: 'João Martins', email: 'joao@email.com', telefone: '(11) 95678-9012' },
  { id: 6, nome: 'Pedro Alves', email: 'pedro@email.com', telefone: '(11) 96789-0123' },
];

const servico = (
  id: number,
  profissionalId: number,
  categoria: string,
  nome: string,
  descricao: string,
  duracaoMinutos: number,
  preco: number
): Servico => ({
  id,
  nome,
  descricao,
  duracaoMinutos,
  preco,
  ativo: true,
  profissionalId,
  profissionalNome: mockProfissionais.find((p) => p.id === profissionalId)!.nome,
  categoria,
});

export const mockServicos: Servico[] = [
  servico(1, 1, 'Barbearia', 'Corte degradê', 'Corte na máquina e tesoura, lavagem e finalização.', 45, 50),
  servico(2, 1, 'Barbearia', 'Barba com toalha quente', 'Modelagem na navalha, toalha quente e óleo hidratante.', 30, 40),
  servico(3, 1, 'Barbearia', 'Corte + barba', 'Corte completo, barba e acabamento da sobrancelha.', 75, 85),
  servico(4, 2, 'Estética', 'Limpeza de pele', 'Extração, esfoliação e máscara calmante.', 60, 140),
  servico(5, 2, 'Estética', 'Massagem relaxante', 'Massagem corporal com pedras quentes.', 50, 120),
  servico(6, 3, 'Elétrica', 'Revisão do quadro elétrico', 'Diagnóstico de sobrecarga, aperto de bornes e troca de disjuntores.', 90, 180),
  servico(7, 3, 'Elétrica', 'Instalação de chuveiro', 'Instalação com troca de resistência e teste de aterramento.', 60, 120),
];

let proximaFaixaId = 1;
const faixa = (profissionalId: number, dias: Disponibilidade['diaSemana'][], horaInicio: string, horaFim: string) =>
  dias.map((diaSemana) => ({ id: proximaFaixaId++, profissionalId, diaSemana, horaInicio, horaFim }));

const UTEIS: Disponibilidade['diaSemana'][] = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];

export const mockDisponibilidades: Disponibilidade[] = [
  ...faixa(1, UTEIS, '09:00', '12:00'),
  ...faixa(1, UTEIS, '13:00', '19:00'),
  ...faixa(1, ['SABADO'], '08:00', '14:00'),
  ...faixa(2, ['TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'], '10:00', '18:00'),
  ...faixa(3, UTEIS, '08:00', '17:00'),
];

export function gerarAgendamentos(hoje = new Date()): Agendamento[] {
  const lista: Agendamento[] = [];
  let id = 1000;

  const dia = (offset: number) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const marcar = (data: Date, horaInicio: string, servicoId: number, clienteId: number, status: StatusAgendamento) => {
    const s = mockServicos.find((x) => x.id === servicoId)!;
    const c = mockClientes.find((x) => x.id === clienteId)!;
    const inicio = comHorario(data, paraMinutos(horaInicio));
    const fim = new Date(inicio.getTime() + s.duracaoMinutos * 60000);
    const dentroDaFaixa = faixasDoDia(mockDisponibilidades, s.profissionalId, data).some(
      (f) => paraMinutos(horaInicio) >= paraMinutos(f.horaInicio) && paraMinutos(horaInicio) + s.duracaoMinutos <= paraMinutos(f.horaFim)
    );
    const ocupados = lista.filter((a) => a.status !== 'CANCELADO').map((a) => ({ ...a, status: 'AGENDADO' as const }));
    if (!dentroDaFaixa || temConflito(ocupados, s.profissionalId, inicio, fim)) return;
    lista.push({
      id: id++,
      clienteId: c.id,
      clienteNome: c.nome,
      profissionalId: s.profissionalId,
      profissionalNome: s.profissionalNome,
      servicoId: s.id,
      servicoNome: s.nome,
      dataHoraInicio: inicio.toISOString(),
      dataHoraFim: fim.toISOString(),
      preco: s.preco,
      status,
      criadoEm: new Date(inicio.getTime() - 3 * 86400000).toISOString(),
    });
  };

  // Passado ou futuro decide o estado: o que já começou foi atendido
  const auto = (data: Date, horaInicio: string): StatusAgendamento =>
    comHorario(data, paraMinutos(horaInicio)).getTime() < hoje.getTime() ? 'CONCLUIDO' : 'AGENDADO';

  // Agenda de hoje do profissional logado (Carlos)
  const hojeD = dia(0);
  const agendaHoje: [string, number, number][] = [
    ['09:00', 1, 3],
    ['10:00', 2, 2],
    ['10:30', 3, 5],
    ['13:30', 1, 4],
    ['14:30', 2, 6],
    ['15:30', 3, 2],
    ['17:00', 1, 3],
    ['18:00', 2, 5],
  ];
  agendaHoje.forEach(([h, s, c]) => marcar(hojeD, h, s, c, auto(hojeD, h)));

  // Próximos dias
  marcar(dia(1), '10:00', 1, 1, 'AGENDADO');
  marcar(dia(1), '11:00', 3, 4, 'AGENDADO');
  marcar(dia(1), '15:00', 2, 2, 'AGENDADO');
  marcar(dia(2), '09:30', 1, 5, 'AGENDADO');
  marcar(dia(2), '16:00', 3, 6, 'AGENDADO');
  marcar(dia(3), '14:00', 4, 1, 'AGENDADO');
  marcar(dia(4), '10:00', 6, 3, 'AGENDADO');

  // Histórico dos últimos 28 dias, com algumas faltas e cancelamentos
  const horariosBase = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:30', '16:30', '17:30'];
  for (let offset = -1; offset >= -28; offset--) {
    const d = dia(offset);
    horariosBase.forEach((h, i) => {
      const chave = (offset * 7 + i * 13 + 100) % 10;
      if (chave < 4) return;
      const servicoId = [1, 2, 3][(i + offset + 30) % 3];
      const clienteId = 2 + ((i + offset + 30) % 5);
      const status: StatusAgendamento = chave === 9 ? 'FALTOU' : chave === 4 ? 'CANCELADO' : 'CONCLUIDO';
      marcar(d, h, servicoId, clienteId, status);
    });
  }
  // Histórico dos outros profissionais, para o dashboard da administração
  const outros: [number, string[]][] = [
    [4, ['10:00', '14:00']],
    [5, ['11:30', '16:00']],
    [6, ['08:30', '13:00']],
    [7, ['10:30', '15:00']],
  ];
  for (let offset = -1; offset >= -28; offset--) {
    const d = dia(offset);
    outros.forEach(([servicoId, horas], i) => {
      horas.forEach((h, j) => {
        const chave = (offset * 5 + i * 11 + j * 7 + 200) % 9;
        if (chave < 5) return;
        const status: StatusAgendamento = chave === 8 ? 'FALTOU' : 'CONCLUIDO';
        marcar(d, h, servicoId, 1 + ((i + j - offset) % 6), status);
      });
    });
  }
  marcar(dia(-6), '18:00', 2, 1, 'CONCLUIDO');
  marcar(dia(-12), '11:00', 4, 1, 'CONCLUIDO');
  marcar(dia(-20), '10:00', 5, 1, 'CANCELADO');

  return lista;
}
