import axios, { AxiosError } from 'axios';
import type {
  Agendamento,
  DiaSemana,
  Disponibilidade,
  HealthStatus,
  Profissional,
  Servico,
} from '../types';

export interface ProblemDetailPayload {
  title?: string;
  status?: number;
  detail?: string;
  campos?: Record<string, string>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly title?: string;
  readonly campos?: Record<string, string>;

  constructor(message: string, status = 0, title?: string, campos?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.title = title;
    this.campos = campos;
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
});

http.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('agendefacil_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // localStorage indisponível no contexto
  }
  return config;
});

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<ProblemDetailPayload>;
    if (!axErr.response) {
      return new ApiError(
        'Não foi possível conectar à API. Verifique se o backend está em execução.',
        0,
        'Sem conexão'
      );
    }
    const { status, data } = axErr.response;
    const msg =
      data?.detail ||
      data?.title ||
      `Erro na requisição (HTTP ${status}).`;
    return new ApiError(msg, status, data?.title, data?.campos);
  }
  return new ApiError(err instanceof Error ? err.message : 'Erro inesperado.');
}

async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Formata data/hora local em YYYY-MM-DDTHH:mm:ss sem offset UTC para LocalDateTime do Spring Boot. */
export function formatLocalDateTime(input: Date | string): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(input)) {
    return input.length === 16 ? `${input}:00` : input;
  }
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export const normalizarHora = (h: string) => h.slice(0, 5);

const normalizarDisponibilidade = (d: Disponibilidade): Disponibilidade => ({
  ...d,
  horaInicio: normalizarHora(d.horaInicio),
  horaFim: normalizarHora(d.horaFim),
});

export interface AgendamentoPayload {
  profissionalId: number;
  servicoId: number;
  dataHoraInicio: string;
}

export interface ServicoPayload {
  nome: string;
  descricao?: string;
  categoria?: string;
  duracaoMinutos: number;
  preco: number;
  ativo?: boolean;
  profissionalId?: number;
}

export interface DisponibilidadePayload {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  profissionalId?: number;
}

export const api = {
  health: () => request<HealthStatus>(() => http.get<HealthStatus>('/health')),

  cliente: {
    buscarServicos: (busca?: string) =>
      request<Servico[]>(() => http.get<Servico[]>('/cliente/servicos', { params: busca ? { busca } : undefined })),
    buscarProfissionais: (busca?: string) =>
      request<Profissional[]>(() =>
        http.get<Profissional[]>('/cliente/profissionais', { params: busca ? { busca } : undefined })
      ),
    listarDisponibilidades: async (profissionalId: number) => {
      const lista = await request<Disponibilidade[]>(() =>
        http.get<Disponibilidade[]>(`/cliente/profissionais/${profissionalId}/disponibilidades`)
      );
      return lista.map(normalizarDisponibilidade);
    },
    listarAgendamentos: (clienteId: number) =>
      request<Agendamento[]>(() => http.get<Agendamento[]>(`/cliente/${clienteId}/agendamentos`)),
    criarAgendamento: (clienteId: number, payload: AgendamentoPayload) =>
      request<Agendamento>(() =>
        http.post<Agendamento>(`/cliente/${clienteId}/agendamentos`, {
          ...payload,
          dataHoraInicio: formatLocalDateTime(payload.dataHoraInicio),
        })
      ),
    cancelarAgendamento: (clienteId: number, id: number) =>
      request<Agendamento>(() => http.patch<Agendamento>(`/cliente/${clienteId}/agendamentos/${id}/cancelar`)),
  },

  profissional: {
    listarServicos: (profissionalId: number) =>
      request<Servico[]>(() => http.get<Servico[]>(`/profissional/${profissionalId}/servicos`)),
    criarServico: (profissionalId: number, payload: ServicoPayload) =>
      request<Servico>(() => http.post<Servico>(`/profissional/${profissionalId}/servicos`, payload)),
    atualizarServico: (profissionalId: number, id: number, payload: ServicoPayload) =>
      request<Servico>(() => http.put<Servico>(`/profissional/${profissionalId}/servicos/${id}`, payload)),
    alternarStatusServico: (profissionalId: number, id: number) =>
      request<void>(() => http.patch<void>(`/profissional/${profissionalId}/servicos/${id}/status`)),
    excluirServico: (profissionalId: number, id: number) =>
      request<void>(() => http.delete<void>(`/profissional/${profissionalId}/servicos/${id}`)),

    listarDisponibilidades: async (profissionalId: number) => {
      const lista = await request<Disponibilidade[]>(() =>
        http.get<Disponibilidade[]>(`/profissional/${profissionalId}/disponibilidades`)
      );
      return lista.map(normalizarDisponibilidade);
    },
    criarDisponibilidade: async (profissionalId: number, payload: DisponibilidadePayload) =>
      normalizarDisponibilidade(
        await request<Disponibilidade>(() =>
          http.post<Disponibilidade>(`/profissional/${profissionalId}/disponibilidades`, payload)
        )
      ),
    atualizarDisponibilidade: async (profissionalId: number, id: number, payload: DisponibilidadePayload) =>
      normalizarDisponibilidade(
        await request<Disponibilidade>(() =>
          http.put<Disponibilidade>(`/profissional/${profissionalId}/disponibilidades/${id}`, payload)
        )
      ),
    excluirDisponibilidade: (profissionalId: number, id: number) =>
      request<void>(() => http.delete<void>(`/profissional/${profissionalId}/disponibilidades/${id}`)),

    listarAgenda: (profissionalId: number, data?: string) =>
      request<Agendamento[]>(() =>
        http.get<Agendamento[]>(`/profissional/${profissionalId}/agendamentos`, {
          params: data ? { data } : undefined,
        })
      ),
    concluirAgendamento: (profissionalId: number, id: number) =>
      request<Agendamento>(() => http.patch<Agendamento>(`/profissional/${profissionalId}/agendamentos/${id}/concluir`)),
    marcarFalta: (profissionalId: number, id: number) =>
      request<Agendamento>(() => http.patch<Agendamento>(`/profissional/${profissionalId}/agendamentos/${id}/falta`)),
    cancelarAgendamento: (profissionalId: number, id: number) =>
      request<Agendamento>(() => http.patch<Agendamento>(`/profissional/${profissionalId}/agendamentos/${id}/cancelar`)),
    obterDashboard: (profissionalId: number) =>
      request<unknown>(() => http.get(`/profissional/${profissionalId}/dashboard`)),
  },

  admin: {
    listarProfissionais: () => request<Profissional[]>(() => http.get<Profissional[]>('/admin/profissionais')),
    listarServicos: () => request<Servico[]>(() => http.get<Servico[]>('/admin/servicos')),
    criarServico: (payload: ServicoPayload) =>
      request<Servico>(() => http.post<Servico>('/admin/servicos', payload)),
    atualizarServico: (id: number, payload: ServicoPayload) =>
      request<Servico>(() => http.put<Servico>(`/admin/servicos/${id}`, payload)),
    alternarStatusServico: (id: number) =>
      request<void>(() => http.patch<void>(`/admin/servicos/${id}/status`)),
    excluirServico: (id: number) =>
      request<void>(() => http.delete<void>(`/admin/servicos/${id}`)),
    listarAgendamentos: () => request<Agendamento[]>(() => http.get<Agendamento[]>('/admin/agendamentos')),
    obterDashboard: () => request<unknown>(() => http.get('/admin/dashboard')),
  },
};
