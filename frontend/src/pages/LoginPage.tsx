import { useState, type FormEvent } from 'react';
import { CalendarCheck2 } from 'lucide-react';
import { ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
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
        <p className="mt-1 text-sm text-muted">Acesse sua área de cliente ou profissional.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void enviar(e)}>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input id="senha" className="input" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
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
    </main>
  );
}
