import type { Agendamento, Disponibilidade, Servico } from '../types';
import { gerarAgendamentos, mockDisponibilidades, mockServicos } from './mockData';

// Persistência do protótipo em localStorage. Na Etapa 3 estas funções passam a chamar a API REST.

const CHAVES = {
  servicos: 'agendefacil_servicos_v4',
  agendamentos: 'agendefacil_agendamentos_v4',
  disponibilidades: 'agendefacil_disponibilidades_v4',
};

function ler<T>(chave: string, inicial: () => T): T {
  try {
    const raw = localStorage.getItem(chave);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // localStorage indisponível: segue com os dados iniciais
  }
  const valor = inicial();
  gravar(chave, valor);
  return valor;
}

function gravar<T>(chave: string, valor: T) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // sem persistência; o estado continua em memória
  }
}

export const getServicos = () => ler<Servico[]>(CHAVES.servicos, () => mockServicos);
export const saveServicos = (v: Servico[]) => gravar(CHAVES.servicos, v);

export const getAgendamentos = () => ler<Agendamento[]>(CHAVES.agendamentos, () => gerarAgendamentos());
export const saveAgendamentos = (v: Agendamento[]) => gravar(CHAVES.agendamentos, v);

export const getDisponibilidades = () => ler<Disponibilidade[]>(CHAVES.disponibilidades, () => mockDisponibilidades);
export const saveDisponibilidades = (v: Disponibilidade[]) => gravar(CHAVES.disponibilidades, v);
