import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowsClockwise, X } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { SkeletonPerfil } from '../components/Skeleton';
import { ApiError, api } from '../services/api';
import type { PapelUsuario } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CampoPerfil = 'nome' | 'email' | 'telefone' | 'especialidade';
type CampoSenha = 'senhaAtual' | 'novaSenha' | 'confirmarNovaSenha';

export function PerfilPage() {
  const { sessao, atualizarSessao } = useAuth();
  const [papel, setPapel] = useState<PapelUsuario>(sessao?.papel ?? 'CLIENTE');
  const [nome, setNome] = useState(sessao?.nome ?? '');
  const [email, setEmail] = useState(sessao?.email ?? '');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  const [errosPerfil, setErrosPerfil] = useState<Partial<Record<CampoPerfil, string>> & { geral?: string }>({});
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [avisoPerfil, setAvisoPerfil] = useState('');

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [errosSenha, setErrosSenha] = useState<Partial<Record<CampoSenha, string>> & { geral?: string }>({});
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [avisoSenha, setAvisoSenha] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga('');
    try {
      const p = await api.perfil.obter();
      setPapel(p.papel);
      setNome(p.nome);
      setEmail(p.email);
      setTelefone(p.telefone ?? '');
      setEspecialidade(p.especialidade ?? '');
    } catch (err) {
      setErroCarga(
        err instanceof ApiError || err instanceof Error ? err.message : 'Não foi possível carregar seus dados.'
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvarPerfil = async (e: FormEvent) => {
    e.preventDefault();
    setAvisoPerfil('');
    const encontrados: typeof errosPerfil = {};
    if (!nome.trim()) encontrados.nome = 'Informe o nome.';
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) encontrados.email = 'Informe um e-mail válido.';
    if (papel !== 'ADMIN' && !telefone.trim()) encontrados.telefone = 'Informe o telefone.';
    setErrosPerfil(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setSalvandoPerfil(true);
    try {
      const auth = await api.perfil.atualizar({
        nome: nome.trim(),
        email: email.trim(),
        telefone: papel === 'ADMIN' ? undefined : telefone.trim(),
        especialidade: papel === 'PROFISSIONAL' ? especialidade.trim() : undefined,
      });
      atualizarSessao(auth);
      setAvisoPerfil('Seus dados foram atualizados.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrosPerfil({ ...(err.campos as typeof errosPerfil), geral: err.campos ? undefined : err.message });
      } else {
        setErrosPerfil({ geral: 'Não foi possível atualizar os dados.' });
      }
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const alterarSenha = async (e: FormEvent) => {
    e.preventDefault();
    setAvisoSenha('');
    const encontrados: typeof errosSenha = {};
    if (!senhaAtual) encontrados.senhaAtual = 'Informe a senha atual.';
    if (!novaSenha) encontrados.novaSenha = 'Informe a nova senha.';
    else if (novaSenha.length < 6 || novaSenha.length > 72)
      encontrados.novaSenha = 'A nova senha deve ter entre 6 e 72 caracteres.';
    if (!confirmarNovaSenha) encontrados.confirmarNovaSenha = 'Confirme a nova senha.';
    else if (confirmarNovaSenha !== novaSenha) encontrados.confirmarNovaSenha = 'As senhas não conferem.';
    setErrosSenha(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setSalvandoSenha(true);
    try {
      await api.perfil.alterarSenha({ senhaAtual, novaSenha });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setAvisoSenha('Senha alterada com sucesso.');
    } catch (err) {
      if (err instanceof ApiError) {
        setErrosSenha({ ...(err.campos as typeof errosSenha), geral: err.campos ? undefined : err.message });
      } else {
        setErrosSenha({ geral: 'Não foi possível alterar a senha.' });
      }
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader titulo="Meus dados" descricao="Atualize suas informações cadastrais ou altere sua senha de acesso." />

      {carregando ? (
        <SkeletonPerfil />
      ) : erroCarga ? (
        <div role="alert" className="cal-card space-y-3 border-danger/25 bg-danger-soft p-6 text-sm text-danger">
          <p className="font-semibold">{erroCarga}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void carregar()}>
            <ArrowsClockwise className="size-3.5" aria-hidden />
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <form onSubmit={(e) => void salvarPerfil(e)} noValidate className="cal-card space-y-4 p-6">
            <h2 className="text-lg font-bold text-ink-heading">Dados pessoais</h2>

            {avisoPerfil && (
              <p
                role="status"
                className="flex items-center justify-between rounded-xl border border-concluido/25 bg-concluido-soft px-4 py-2.5 text-sm font-semibold text-concluido"
              >
                <span>{avisoPerfil}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon -my-1 -mr-2"
                  aria-label="Fechar aviso"
                  onClick={() => setAvisoPerfil('')}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </p>
            )}

            <div>
              <label className="label" htmlFor="perfil-nome">
                Nome
              </label>
              <input
                id="perfil-nome"
                className="input"
                maxLength={120}
                value={nome}
                aria-invalid={errosPerfil.nome ? true : undefined}
                onChange={(e) => setNome(e.target.value)}
              />
              {errosPerfil.nome && <p className="erro-campo">{errosPerfil.nome}</p>}
            </div>

            <div>
              <label className="label" htmlFor="perfil-email">
                E-mail
              </label>
              <input
                id="perfil-email"
                className="input"
                type="email"
                maxLength={160}
                value={email}
                aria-invalid={errosPerfil.email ? true : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errosPerfil.email && <p className="erro-campo">{errosPerfil.email}</p>}
            </div>

            {papel !== 'ADMIN' && (
              <div>
                <label className="label" htmlFor="perfil-telefone">
                  Telefone
                </label>
                <input
                  id="perfil-telefone"
                  className="input"
                  type="tel"
                  maxLength={30}
                  value={telefone}
                  aria-invalid={errosPerfil.telefone ? true : undefined}
                  onChange={(e) => setTelefone(e.target.value)}
                />
                {errosPerfil.telefone && <p className="erro-campo">{errosPerfil.telefone}</p>}
              </div>
            )}

            {papel === 'PROFISSIONAL' && (
              <div>
                <label className="label" htmlFor="perfil-especialidade">
                  Especialidade <span className="font-normal text-muted">(opcional)</span>
                </label>
                <input
                  id="perfil-especialidade"
                  className="input"
                  maxLength={120}
                  placeholder="Ex.: Barbearia, Estética, Elétrica residencial"
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                />
              </div>
            )}

            {errosPerfil.geral && (
              <p className="erro-campo" role="alert">
                {errosPerfil.geral}
              </p>
            )}

            <div className="pt-2">
              <button type="submit" className="btn btn-primary" disabled={salvandoPerfil}>
                {salvandoPerfil ? 'Salvando…' : 'Salvar dados'}
              </button>
            </div>
          </form>

          <form onSubmit={(e) => void alterarSenha(e)} noValidate className="cal-card space-y-4 p-6">
            <h2 className="text-lg font-bold text-ink-heading">Alterar senha</h2>

            {avisoSenha && (
              <p
                role="status"
                className="flex items-center justify-between rounded-xl border border-concluido/25 bg-concluido-soft px-4 py-2.5 text-sm font-semibold text-concluido"
              >
                <span>{avisoSenha}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon -my-1 -mr-2"
                  aria-label="Fechar aviso"
                  onClick={() => setAvisoSenha('')}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </p>
            )}

            <div>
              <label className="label" htmlFor="perfil-senha-atual">
                Senha atual
              </label>
              <input
                id="perfil-senha-atual"
                className="input"
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                aria-invalid={errosSenha.senhaAtual ? true : undefined}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
              {errosSenha.senhaAtual && <p className="erro-campo">{errosSenha.senhaAtual}</p>}
            </div>

            <div>
              <label className="label" htmlFor="perfil-nova-senha">
                Nova senha
              </label>
              <input
                id="perfil-nova-senha"
                className="input"
                type="password"
                autoComplete="new-password"
                maxLength={72}
                value={novaSenha}
                aria-invalid={errosSenha.novaSenha ? true : undefined}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
              {errosSenha.novaSenha && <p className="erro-campo">{errosSenha.novaSenha}</p>}
            </div>

            <div>
              <label className="label" htmlFor="perfil-confirmar-nova-senha">
                Confirmar nova senha
              </label>
              <input
                id="perfil-confirmar-nova-senha"
                className="input"
                type="password"
                autoComplete="new-password"
                maxLength={72}
                value={confirmarNovaSenha}
                aria-invalid={errosSenha.confirmarNovaSenha ? true : undefined}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
              />
              {errosSenha.confirmarNovaSenha && <p className="erro-campo">{errosSenha.confirmarNovaSenha}</p>}
            </div>

            {errosSenha.geral && (
              <p className="erro-campo" role="alert">
                {errosSenha.geral}
              </p>
            )}

            <div className="pt-2">
              <button type="submit" className="btn btn-primary" disabled={salvandoSenha}>
                {salvandoSenha ? 'Alterando…' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
