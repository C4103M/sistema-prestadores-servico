import { useState, type FormEvent } from 'react';
import { CalendarCheck2 } from 'lucide-react';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';

type CampoCadastro = 'nome' | 'email' | 'telefone' | 'especialidade' | 'senha';
type ErrosCadastro = Partial<Record<CampoCadastro, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCadastro(
  papel: 'CLIENTE' | 'PROFISSIONAL',
  dados: { nome: string; email: string; telefone: string; especialidade: string; senha: string }
): ErrosCadastro {
  const erros: ErrosCadastro = {};
  if (!dados.nome.trim()) erros.nome = 'Informe o nome.';
  if (!dados.email.trim() || !EMAIL_REGEX.test(dados.email.trim())) erros.email = 'Informe um e-mail válido.';
  if (!dados.telefone.trim()) erros.telefone = 'Informe o telefone.';
  if (papel === 'PROFISSIONAL' && !dados.especialidade.trim()) erros.especialidade = 'Informe a especialidade.';
  if (!dados.senha) erros.senha = 'Informe a senha.';
  else if (dados.senha.length < 6 || dados.senha.length > 72) erros.senha = 'A senha deve ter entre 6 e 72 caracteres.';
  return erros;
}

export function CadastroPage() {
  const { cadastrarCliente, cadastrarProfissional } = useAuth();
  const [papel, setPapel] = useState<'CLIENTE' | 'PROFISSIONAL'>('CLIENTE');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [senha, setSenha] = useState('');
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
    const errosLocais = validarCadastro(papel, { nome, email, telefone, especialidade, senha });
    setCampos(errosLocais);
    if (Object.keys(errosLocais).length > 0) return;

    setEnviando(true);
    const dados = { nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), senha };
    try {
      if (papel === 'PROFISSIONAL') await cadastrarProfissional({ ...dados, especialidade: especialidade.trim() });
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <a href="#/" className="flex items-center gap-2.5 self-start rounded-md">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-marker text-white">
          <CalendarCheck2 className="size-5" strokeWidth={2.25} />
        </span>
        <span className="text-lg font-bold">AgendeFácil</span>
      </a>
      <section className="painel mt-8 p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">Cadastre-se para agendar ou oferecer serviços.</p>
        <form className="mt-6 space-y-4" noValidate onSubmit={(e) => void enviar(e)}>
          <div>
            <label className="label" htmlFor="papel">Quero me cadastrar como</label>
            <select id="papel" className="input" value={papel} onChange={(e) => trocarPapel(e.target.value as typeof papel)}>
              <option value="CLIENTE">Cliente</option>
              <option value="PROFISSIONAL">Prestador de serviços</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nome">Nome</label>
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
            {campos.nome && <p id="erro-nome" className="erro-campo">{campos.nome}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
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
            {campos.email && <p id="erro-email" className="erro-campo">{campos.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="telefone">Telefone</label>
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
            {campos.telefone && <p id="erro-telefone" className="erro-campo">{campos.telefone}</p>}
          </div>
          {papel === 'PROFISSIONAL' && (
            <div>
              <label className="label" htmlFor="especialidade">Especialidade</label>
              <input
                id="especialidade"
                className="input"
                maxLength={120}
                value={especialidade}
                aria-invalid={campos.especialidade ? true : undefined}
                aria-describedby={campos.especialidade ? 'erro-especialidade' : undefined}
                onChange={(e) => setEspecialidade(e.target.value)}
              />
              {campos.especialidade && <p id="erro-especialidade" className="erro-campo">{campos.especialidade}</p>}
            </div>
          )}
          <div>
            <label className="label" htmlFor="senha">Senha</label>
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
            {campos.senha && <p id="erro-senha" className="erro-campo">{campos.senha}</p>}
          </div>
          {erro && <p className="erro-campo" role="alert">{erro}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={enviando}>
            {enviando ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>
        <p className="mt-5 text-sm text-muted">
          Já tem uma conta? <a className="font-semibold text-marker-2" href="#/login">Entrar</a>
        </p>
      </section>
    </main>
  );
}
