import { useState, type FormEvent } from 'react';
import { Briefcase, Moon, Sun, User } from '@phosphor-icons/react';
import { MarcaEncaixe } from '../components/MarcaEncaixe';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type CampoCadastro = 'nome' | 'email' | 'telefone' | 'senha' | 'confirmarSenha';
type ErrosCadastro = Partial<Record<CampoCadastro, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCadastro(dados: {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
}): ErrosCadastro {
  const erros: ErrosCadastro = {};
  if (!dados.nome.trim()) erros.nome = 'Informe o nome.';
  if (!dados.email.trim() || !EMAIL_REGEX.test(dados.email.trim())) erros.email = 'Informe um e-mail válido.';
  if (!dados.telefone.trim()) erros.telefone = 'Informe o telefone.';
  if (!dados.senha) erros.senha = 'Informe a senha.';
  else if (dados.senha.length < 6 || dados.senha.length > 72)
    erros.senha = 'A senha deve ter entre 6 e 72 caracteres.';
  if (!dados.confirmarSenha) erros.confirmarSenha = 'Confirme a senha.';
  else if (dados.confirmarSenha !== dados.senha) erros.confirmarSenha = 'As senhas não conferem.';
  return erros;
}

const OPCOES_PAPEL = [
  {
    valor: 'CLIENTE',
    titulo: 'Cliente',
    descricao: 'Buscar serviços e marcar horários livres.',
    Icone: User,
  },
  {
    valor: 'PROFISSIONAL',
    titulo: 'Prestador de serviços',
    descricao: 'Gerenciar catálogo, disponibilidade e agenda.',
    Icone: Briefcase,
  },
] as const;

export function CadastroPage() {
  const { cadastrarCliente, cadastrarProfissional } = useAuth();
  const { escuro, alternarTema } = useTheme();
  const [papel, setPapel] = useState<'CLIENTE' | 'PROFISSIONAL'>('CLIENTE');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState<ErrosCadastro>({});
  const [enviando, setEnviando] = useState(false);

  const trocarPapel = (novoPapel: 'CLIENTE' | 'PROFISSIONAL') => {
    setPapel(novoPapel);
    setCampos({});
    setErro('');
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    const errosLocais = validarCadastro({ nome, email, telefone, senha, confirmarSenha });
    setCampos(errosLocais);
    if (Object.keys(errosLocais).length > 0) return;

    setEnviando(true);
    const dados = { nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), senha };
    try {
      if (papel === 'PROFISSIONAL') await cadastrarProfissional(dados);
      else await cadastrarCliente(dados);
    } catch (err) {
      if (err instanceof ApiError) {
        const camposApi = (err.campos ?? {}) as ErrosCadastro;
        setCampos(camposApi);
        setErro(Object.keys(camposApi).length > 0 ? '' : err.message);
      } else {
        setErro('Não foi possível criar a conta. Tente novamente.');
      }
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
            Comece em menos de um minuto como cliente ou prestador.
          </h2>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-toy" aria-hidden />
              <span>Clientes visualizam apenas horários realmente livres na grade do profissional.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>Prestadores configuram faixas semanais, catálogo e acompanham o faturamento.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
              <span>Preços ficam congelados no comprovante no instante do agendamento.</span>
            </li>
          </ul>
        </div>

        <p className="font-mono-num text-xs text-faint">encaixe.app · cadastro gratuito</p>
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
          <h1 className="text-2xl font-bold tracking-tight text-ink-heading">Criar conta</h1>
          <p className="mt-1 text-sm text-muted">Cadastre-se para agendar ou oferecer serviços.</p>

          <form className="mt-6 space-y-4" noValidate onSubmit={(e) => void enviar(e)}>
            <fieldset>
              <legend className="label">Quero me cadastrar como</legend>
              <div role="radiogroup" aria-label="Tipo de conta" className="grid grid-cols-2 gap-2.5">
                {OPCOES_PAPEL.map(({ valor, titulo, descricao, Icone }) => {
                  const ativo = papel === valor;
                  return (
                    <button
                      key={valor}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => trocarPapel(valor)}
                      className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        ativo
                          ? 'border-ink bg-surface-soft ring-1 ring-ink'
                          : 'border-rule bg-surface hover:border-rule-strong'
                      }`}
                    >
                      <span
                        className={`grid size-8 place-items-center rounded-lg ${
                          ativo ? 'bg-ink text-on-ink' : 'bg-plate text-muted'
                        }`}
                      >
                        <Icone className="size-4" weight="bold" aria-hidden />
                      </span>
                      <div>
                        <span className="block text-xs font-bold text-ink-heading">{titulo}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted">{descricao}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label className="label" htmlFor="nome">
                Nome
              </label>
              <input
                id="nome"
                className="input"
                autoComplete="name"
                maxLength={120}
                value={nome}
                aria-invalid={campos.nome ? true : undefined}
                aria-describedby={campos.nome ? 'erro-nome' : undefined}
                onChange={(e) => setNome(e.target.value)}
              />
              {campos.nome && (
                <p id="erro-nome" className="erro-campo">
                  {campos.nome}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                maxLength={160}
                value={email}
                aria-invalid={campos.email ? true : undefined}
                aria-describedby={campos.email ? 'erro-email' : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
              {campos.email && (
                <p id="erro-email" className="erro-campo">
                  {campos.email}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="telefone">
                Telefone
              </label>
              <input
                id="telefone"
                className="input"
                type="tel"
                autoComplete="tel"
                maxLength={30}
                value={telefone}
                aria-invalid={campos.telefone ? true : undefined}
                aria-describedby={campos.telefone ? 'erro-telefone' : undefined}
                onChange={(e) => setTelefone(e.target.value)}
              />
              {campos.telefone && (
                <p id="erro-telefone" className="erro-campo">
                  {campos.telefone}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="senha">
                  Senha
                </label>
                <input
                  id="senha"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  maxLength={72}
                  value={senha}
                  aria-invalid={campos.senha ? true : undefined}
                  aria-describedby={campos.senha ? 'erro-senha' : undefined}
                  onChange={(e) => setSenha(e.target.value)}
                />
                {campos.senha && (
                  <p id="erro-senha" className="erro-campo">
                    {campos.senha}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="confirmar-senha">
                  Confirmar senha
                </label>
                <input
                  id="confirmar-senha"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  maxLength={72}
                  value={confirmarSenha}
                  aria-invalid={campos.confirmarSenha ? true : undefined}
                  aria-describedby={campos.confirmarSenha ? 'erro-confirmar-senha' : undefined}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
                {campos.confirmarSenha && (
                  <p id="erro-confirmar-senha" className="erro-campo">
                    {campos.confirmarSenha}
                  </p>
                )}
              </div>
            </div>
            {erro && (
              <p className="erro-campo" role="alert">
                {erro}
              </p>
            )}
            <button className="btn btn-primary w-full" type="submit" disabled={enviando}>
              {enviando ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted">
            Já tem uma conta?{' '}
            <a className="font-semibold text-ink-heading underline" href="#/login">
              Entrar
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
