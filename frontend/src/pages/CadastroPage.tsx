import { useState, type FormEvent } from 'react';
import { CalendarCheck2 } from 'lucide-react';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function CadastroPage() {
  const { cadastrarCliente, cadastrarProfissional } = useAuth();
  const [papel, setPapel] = useState<'CLIENTE' | 'PROFISSIONAL'>('CLIENTE');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setCampos({});
    setEnviando(true);
    const dados = { nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), senha };
    try {
      if (papel === 'PROFISSIONAL') await cadastrarProfissional({ ...dados, especialidade: especialidade.trim() });
      else await cadastrarCliente(dados);
    } catch (err) {
      if (err instanceof ApiError) {
        setErro(err.message);
        setCampos(err.campos ?? {});
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
        <form className="mt-6 space-y-4" onSubmit={(e) => void enviar(e)}>
          <div>
            <label className="label" htmlFor="papel">Quero me cadastrar como</label>
            <select id="papel" className="input" value={papel} onChange={(e) => setPapel(e.target.value as typeof papel)}>
              <option value="CLIENTE">Cliente</option>
              <option value="PROFISSIONAL">Prestador de serviços</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="nome">Nome</label>
            <input id="nome" className="input" autoComplete="name" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
            {campos.nome && <p className="erro-campo">{campos.nome}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" autoComplete="email" required maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} />
            {campos.email && <p className="erro-campo">{campos.email}</p>}
          </div>
          <div>
            <label className="label" htmlFor="telefone">Telefone</label>
            <input id="telefone" className="input" type="tel" autoComplete="tel" required maxLength={30} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            {campos.telefone && <p className="erro-campo">{campos.telefone}</p>}
          </div>
          {papel === 'PROFISSIONAL' && (
            <div>
              <label className="label" htmlFor="especialidade">Especialidade</label>
              <input id="especialidade" className="input" required maxLength={120} value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} />
              {campos.especialidade && <p className="erro-campo">{campos.especialidade}</p>}
            </div>
          )}
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input id="senha" className="input" type="password" autoComplete="new-password" required minLength={6} maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} />
            {campos.senha && <p className="erro-campo">{campos.senha}</p>}
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
