import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import {
  EVENTO_SESSAO_EXPIRADA,
  limparSessao,
  lerSessao,
  salvarSessao,
} from '../services/sessao';
import type {
  AuthResponse,
  CadastroPayload,
  Sessao,
} from '../services/sessao';

interface AuthContextValue {
  sessao: Sessao | null;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrarCliente: (payload: CadastroPayload) => Promise<void>;
  cadastrarProfissional: (payload: CadastroPayload) => Promise<void>;
  atualizarSessao: (auth: AuthResponse) => void;
  sair: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => lerSessao());

  const sair = useCallback(() => {
    limparSessao();
    setSessao(null);
    if (typeof window !== 'undefined') window.location.hash = '/';
  }, []);

  useEffect(() => {
    const aoExpirar = () => {
      limparSessao();
      setSessao(null);
      window.location.hash = '/login';
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  useEffect(() => {
    if (!sessao) return;
    const restante = sessao.expiraEm - Date.now();
    const atrasoExpiracao = Math.max(0, Math.min(restante, 2_147_000_000));
    const timerExpiracao = window.setTimeout(() => {
      limparSessao();
      setSessao(null);
      window.location.hash = '/login';
    }, atrasoExpiracao);

    let cancelado = false;
    let timerRenovacao: number | undefined;
    if (restante > 15_000) {
      const margem = Math.min(5 * 60_000, Math.floor(sessao.expiraEmMinutos * 60_000 * 0.2));
      const atrasoRenovacao = Math.min(Math.max(1_000, restante - margem), 2_147_000_000);
      timerRenovacao = window.setTimeout(() => {
        void api.auth
          .renovar()
          .then((nova) => {
            if (!cancelado) setSessao(salvarSessao(nova));
          })
          .catch(() => {
            // Falha na renovação: o timer de expiração ou o interceptor 401 encerrará a sessão normalmente.
          });
      }, atrasoRenovacao);
    }

    return () => {
      cancelado = true;
      window.clearTimeout(timerExpiracao);
      if (timerRenovacao !== undefined) window.clearTimeout(timerRenovacao);
    };
  }, [sessao]);

  const entrar = useCallback(async (email: string, senha: string) => {
    setSessao(salvarSessao(await api.auth.login(email, senha)));
  }, []);

  const cadastrarCliente = useCallback(async (payload: CadastroPayload) => {
    setSessao(salvarSessao(await api.auth.cadastrarCliente(payload)));
  }, []);

  const cadastrarProfissional = useCallback(async (payload: CadastroPayload) => {
    setSessao(salvarSessao(await api.auth.cadastrarProfissional(payload)));
  }, []);

  const atualizarSessao = useCallback((auth: AuthResponse) => {
    setSessao(salvarSessao(auth));
  }, []);

  const value = useMemo(
    () => ({ sessao, entrar, cadastrarCliente, cadastrarProfissional, atualizarSessao, sair }),
    [sessao, entrar, cadastrarCliente, cadastrarProfissional, atualizarSessao, sair]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return contexto;
}
