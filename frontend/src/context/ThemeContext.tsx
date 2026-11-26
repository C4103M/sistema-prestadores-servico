import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Tema = 'light' | 'dark';

const CHAVE_TEMA = 'encaixe_tema';

interface ThemeContextValue {
  tema: Tema;
  escuro: boolean;
  alternarTema: () => void;
  definirTema: (tema: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function lerTemaInicial(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerTemaInicial);

  useEffect(() => {
    const ehEscuro = tema === 'dark';
    document.documentElement.classList.toggle('dark', ehEscuro);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ehEscuro ? '#0F0F0F' : '#FFFFFF');
    try {
      localStorage.setItem(CHAVE_TEMA, tema);
    } catch {
      // Ignora erro de armazenamento restrito
    }
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((atual) => (atual === 'dark' ? 'light' : 'dark'));
  }, []);

  const definirTema = useCallback((novo: Tema) => {
    setTema(novo);
  }, []);

  const value = useMemo(
    () => ({ tema, escuro: tema === 'dark', alternarTema, definirTema }),
    [tema, alternarTema, definirTema]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error('useTheme precisa ser usado dentro de ThemeProvider.');
  return contexto;
}
