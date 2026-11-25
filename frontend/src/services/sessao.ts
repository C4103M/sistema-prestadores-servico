import type { Area, Tela } from '../types';

export type Papel = 'CLIENTE' | 'PROFISSIONAL' | 'ADMIN';

/** Resposta de /api/auth/login, /cadastro/* e /renovar (AuthResponse do backend). */
export interface AuthResponse {
  token: string;
  tipo: string;
  expiraEmMinutos: number;
  usuarioId: number;
  /** id do Cliente ou do Profissional; null para ADMIN. É o id usado nas rotas /cliente/{id} e /profissional/{id}. */
  perfilId: number | null;
  nome: string;
  email: string;
  papel: Papel;
}

export interface Sessao extends AuthResponse {
  /** instante (ms) em que o token expira */
  expiraEm: number;
}

export interface CadastroPayload {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface CadastroProfissionalPayload extends CadastroPayload {
  especialidade: string;
}

// A chave do token é a mesma que o interceptor de services/api.ts já lê.
const CHAVE_TOKEN = 'agendefacil_token';
const CHAVE_SESSAO = 'agendefacil_sessao';

/** Disparado pelo interceptor quando a API responde 401 com a pessoa logada (token vencido ou inválido). */
export const EVENTO_SESSAO_EXPIRADA = 'agendefacil:sessao-expirada';

export function salvarSessao(r: AuthResponse): Sessao {
  const sessao: Sessao = { ...r, expiraEm: Date.now() + r.expiraEmMinutos * 60_000 };
  try {
    localStorage.setItem(CHAVE_TOKEN, r.token);
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    // sem localStorage: a sessão fica só em memória e as chamadas à API seguem sem token
  }
  return sessao;
}

export function limparSessao() {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // nada a limpar
  }
}

/** Sessão guardada, ou null se não existe, está corrompida ou já expirou. */
export function lerSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    const sessao = JSON.parse(bruto) as Sessao;
    if (!sessao.token || sessao.expiraEm <= Date.now()) {
      limparSessao();
      return null;
    }
    return sessao;
  } catch {
    limparSessao();
    return null;
  }
}

/** Para onde cada perfil vai depois de entrar. */
const TELA_INICIAL: Record<Papel, Tela> = {
  CLIENTE: 'cliente/buscar',
  PROFISSIONAL: 'profissional/agenda',
  ADMIN: 'admin/servicos',
};

const AREA_DO_PAPEL: Record<Papel, Area> = {
  CLIENTE: 'cliente',
  PROFISSIONAL: 'profissional',
  ADMIN: 'admin',
};

export const telaInicial = (papel: Papel): Tela => TELA_INICIAL[papel];
export const areaDoPapel = (papel: Papel): Area => AREA_DO_PAPEL[papel];
