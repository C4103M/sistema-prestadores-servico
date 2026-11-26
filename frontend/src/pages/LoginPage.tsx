import { useState, type FormEvent } from 'react';
import { Moon, Scissors, ShieldCheck, Sun, User } from '@phosphor-icons/react';
import { MarcaEncaixe } from '../components/MarcaEncaixe';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type ErrosLogin = Partial<Record<'email' | 'senha', string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContaDemo {
  nivel: string;
  nome: string;
  email: string;
  senha: string;
  Icone: typeof User;
  badgeClasse: string;
}

const CONTAS_DEMO: readonly ContaDemo[] = [
  {
    nivel: 'Cliente',
    nome: 'Lucas Pereira',
    email: 'lucas@email.com',
    senha: '123456',
    Icone: User,
    badgeClasse: 'bg-agendado-soft text-agendado',
  },
  {
    nivel: 'Profissional',
    nome: 'Carlos Silva',
    email: 'carlos@barbearia.com',
    senha: '123456',
    Icone: Scissors,
    badgeClasse: 'bg-concluido-soft text-concluido',
  },
  {
    nivel: 'Administrador',
    nome: 'Administrador',
    email: 'admin@agendefacil.com',
    senha: '123456',
    Icone: ShieldCheck,
    badgeClasse: 'bg-faltou-soft text-faltou',
  },
];

export function LoginPage() {
  const { entrar } = useAuth();
  const { escuro, alternarTema } = useTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [campos, setCampos] = useState<ErrosLogin>({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const preencherConta = (conta: ContaDemo) => {
    setEmail(conta.email);
    setSenha(conta.senha);
    setCampos({});
    setErro('');
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    const errosLocais: ErrosLogin = {};
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) errosLocais.email = 'Informe um e-mail válido.';
    if (!senha) errosLocais.senha = 'Informe a senha.';
    setCampos(errosLocais);
    if (Object.keys(errosLocais).length > 0) return;

    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Coluna editorial esquerda (desktop) */}
      <aside className="hidden flex-col justify-between border-r border-rule bg-surface-soft p-10 lg:flex xl:p-14">
        <MarcaEncaixe size="lg" />

        <div className="max-w-md space-y-6">
          <h2 className="text-3xl leading-tight font-bold tracking-tight text-ink-heading">
            Sua agenda organizada, do primeiro encaixe ao faturamento.
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Horários calculados direto sobre a disponibilidade real do profissional, sem sobreposição nem mensagens
            trocadas para confirmar hora.
          </p>

          <div className="cal-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2.5 border-b border-dashed border-rule-strong">
              <span className="font-mono-num text-muted">ENC #0412</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-toy-soft px-2 py-0.5 font-semibold text-toy-ink">
                <span className="size-1.5 rounded-full bg-toy" aria-hidden />
                Confirmado
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <div>
                <p className="font-semibold text-ink-heading">Corte degradê</p>
                <p className="text-xs text-muted">Carlos Silva · 45 min</p>
              </div>
              <span className="font-mono-num font-bold text-ink-heading">R$ 55,00</span>
            </div>
          </div>
        </div>

        <p className="font-mono-num text-xs text-faint">encaixe.app · acesso unificado</p>
      </aside>

      {/* Coluna do formulário */}
      <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="lg:hidden">
            <MarcaEncaixe size="md" />
          </div>
          <div className="hidden lg:block" />
          <button
            type="button"
            onClick={alternarTema}
            aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="btn btn-secondary btn-sm h-9 rounded-[10px] px-3"
          >
            {escuro ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
            <span>{escuro ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>

        <section className="cal-card mt-6 p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink-heading">Entrar</h1>
          <p className="mt-1 text-sm text-muted">Acesse sua área de cliente, profissional ou administrador.</p>

          <form className="mt-6 space-y-4" noValidate onSubmit={(e) => void enviar(e)}>
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                aria-invalid={campos.email ? true : undefined}
                aria-describedby={campos.email ? 'erro-login-email' : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
              {campos.email && (
                <p id="erro-login-email" className="erro-campo">
                  {campos.email}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="senha">
                Senha
              </label>
              <input
                id="senha"
                className="input"
                type="password"
                autoComplete="current-password"
                value={senha}
                aria-invalid={campos.senha ? true : undefined}
                aria-describedby={campos.senha ? 'erro-login-senha' : undefined}
                onChange={(e) => setSenha(e.target.value)}
              />
              {campos.senha && (
                <p id="erro-login-senha" className="erro-campo">
                  {campos.senha}
                </p>
              )}
            </div>
            {erro && (
              <p className="erro-campo" role="alert">
                {erro}
              </p>
            )}
            <button className="btn btn-primary w-full" type="submit" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted">
            Ainda não tem conta?{' '}
            <a className="font-semibold text-ink-heading underline" href="#/cadastro">
              Criar conta
            </a>
          </p>
        </section>

        <section aria-labelledby="titulo-contas-demo" className="cal-card mt-4 p-5 sm:p-6">
          <h2 id="titulo-contas-demo" className="text-sm font-bold text-ink-heading">
            Acesso rápido (dados de teste)
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Escolha um perfil para preencher e-mail e senha automaticamente.
          </p>
          <div className="mt-4 grid gap-2">
            {CONTAS_DEMO.map((conta) => {
              const { Icone } = conta;
              const selecionado = email.trim().toLowerCase() === conta.email && senha === conta.senha;
              return (
                <button
                  key={conta.email}
                  type="button"
                  disabled={enviando}
                  aria-pressed={selecionado}
                  onClick={() => preencherConta(conta)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    selecionado
                      ? 'border-ink bg-surface-soft ring-1 ring-ink'
                      : 'border-rule hover:border-rule-strong hover:bg-surface-soft'
                  }`}
                >
                  <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${conta.badgeClasse}`}>
                    <Icone className="size-4" weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-heading">{conta.nivel}</span>
                      <span className="text-xs text-muted">· {conta.nome}</span>
                    </span>
                    <span className="font-mono-num mt-0.5 block truncate text-[11px] text-faint">{conta.email}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      selecionado ? 'text-ink-heading' : 'text-muted'
                    }`}
                  >
                    {selecionado ? 'Preenchido' : 'Usar'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
