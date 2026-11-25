import { useState, type FormEvent } from 'react';
import { CalendarCheck2, Scissors, ShieldCheck, UserRound } from 'lucide-react';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';

type ErrosLogin = Partial<Record<'email' | 'senha', string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContaDemo {
  nivel: string;
  nome: string;
  email: string;
  senha: string;
  Icone: typeof UserRound;
  badgeClasse: string;
}

const CONTAS_DEMO: readonly ContaDemo[] = [
  {
    nivel: 'Cliente',
    nome: 'Lucas Pereira',
    email: 'lucas@email.com',
    senha: '123456',
    Icone: UserRound,
    badgeClasse: 'bg-agendado-soft text-agendado',
  },
  {
    nivel: 'Profissional',
    nome: 'Carlos Silva',
    email: 'carlos@barbearia.com',
    senha: '123456',
    Icone: Scissors,
    badgeClasse: 'bg-marker-soft text-marker-2',
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <a href="#/" className="flex items-center gap-2.5 self-start rounded-md">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-marker text-white">
          <CalendarCheck2 className="size-5" strokeWidth={2.25} />
        </span>
        <span className="text-lg font-bold">AgendeFácil</span>
      </a>
      <section className="painel mt-8 p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Acesse sua área de cliente, profissional ou administrador.</p>
        <form className="mt-6 space-y-4" noValidate onSubmit={(e) => void enviar(e)}>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
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
            {campos.email && <p id="erro-login-email" className="erro-campo">{campos.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="senha">Senha</label>
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
            {campos.senha && <p id="erro-login-senha" className="erro-campo">{campos.senha}</p>}
          </div>
          {erro && <p className="erro-campo" role="alert">{erro}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="mt-5 text-sm text-muted">
          Ainda não tem conta? <a className="font-semibold text-marker-2" href="#/cadastro">Criar conta</a>
        </p>
      </section>

      <section aria-labelledby="titulo-contas-demo" className="painel mt-4 p-5 sm:p-6">
        <h2 id="titulo-contas-demo" className="text-sm font-bold text-ink">
          Acesso rápido (dados de teste)
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Escolha um nível de usuário para preencher e-mail e senha automaticamente.
        </p>
        <div className="mt-4 grid gap-2.5">
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
                className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                  selecionado
                    ? 'border-marker bg-marker-soft/35 ring-1 ring-marker/25'
                    : 'border-rule hover:border-rule-strong hover:bg-paper/60'
                }`}
              >
                <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-lg ${conta.badgeClasse}`}>
                  <Icone className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">{conta.nivel}</span>
                    <span className="text-xs text-muted">· {conta.nome}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{conta.email}</span>
                </span>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    selecionado ? 'text-marker-2' : 'text-muted'
                  }`}
                >
                  {selecionado ? 'Preenchido' : 'Preencher'}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
