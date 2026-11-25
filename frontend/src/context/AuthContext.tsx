import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import {
  EVENTO_SESSAO_EXPIRADA,
  limparSessao,
  lerSessao,
  salvarSessao,
} from '../services/sessao';
import type {
  CadastroPayload,
  CadastroProfissionalPayload,
  Sessao,
} from '../services/sessao';

interface AuthContextValue {
  sessao: Sessao | null;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrarCliente: (payload: CadastroPayload) => Promise<void>;
  cadastrarProfissional: (payload: CadastroProfissionalPayload) => Promise<void>;
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
    const atraso = Math.max(0, Math.min(sessao.expiraEm - Date.now(), 2_147_000_000));
    const temporizador = window.setTimeout(() => {
      limparSessao();
      setSessao(null);
      window.location.hash = '/login';
    }, atraso);
    return () => window.clearTimeout(temporizador);
  }, [sessao]);

  const entrar = useCallback(async (email: string, senha: string) => {
    setSessao(salvarSessao(await api.auth.login(email, senha)));
  }, []);

  const cadastrarCliente = useCallback(async (payload: CadastroPayload) => {
    setSessao(salvarSessao(await api.auth.cadastrarCliente(payload)));
  }, []);

  const cadastrarProfissional = useCallback(async (payload: CadastroProfissionalPayload) => {
    setSessao(salvarSessao(await api.auth.cadastrarProfissional(payload)));
  }, []);

  const value = useMemo(
    () => ({ sessao, entrar, cadastrarCliente, cadastrarProfissional, sair }),
    [sessao, entrar, cadastrarCliente, cadastrarProfissional, sair]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return contexto;
}
