import { useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, X, XCircle } from 'lucide-react';
import type { Categoria, StatusCategoria } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { CampoImagemCategoria } from '../components/CampoImagemCategoria';
import { ApiError, type CategoriaPayload } from '../services/api';

interface AdminCategoriasPageProps {
  categorias: Categoria[];
  onCriar: (payload: CategoriaPayload) => Promise<void>;
  onAtualizar: (id: number, payload: CategoriaPayload) => Promise<void>;
  onAprovar: (id: number) => Promise<void>;
  onRejeitar: (id: number) => Promise<void>;
}

const BADGE_STATUS: Record<StatusCategoria, { rotulo: string; classe: string }> = {
  PENDENTE: { rotulo: 'Pendente', classe: 'bg-faltou-soft text-faltou' },
  APROVADA: { rotulo: 'Aprovada', classe: 'bg-concluido-soft text-concluido' },
  REJEITADA: { rotulo: 'Rejeitada', classe: 'bg-danger-soft text-danger' },
};

interface FormularioCategoria {
  nome: string;
  shortDescription: string;
  imagemUrl: string;
}

const VAZIO: FormularioCategoria = { nome: '', shortDescription: '', imagemUrl: '' };

export function AdminCategoriasPage({
  categorias,
  onCriar,
  onAtualizar,
  onAprovar,
  onRejeitar,
}: AdminCategoriasPageProps) {
  const [editando, setEditando] = useState<'nova' | number | null>(null);
  const [form, setForm] = useState<FormularioCategoria>(VAZIO);
  const [erros, setErros] = useState<Partial<FormularioCategoria> & { geral?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  const pendentes = categorias.filter((c) => c.status === 'PENDENTE');

  const abrirNova = () => {
    setEditando('nova');
    setForm(VAZIO);
    setErros({});
  };

  const abrirEdicao = (c: Categoria) => {
    setEditando(c.id);
    setForm({ nome: c.nome, shortDescription: c.shortDescription, imagemUrl: c.imagemUrl });
    setErros({});
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const eForm: Partial<FormularioCategoria> = {};
    if (!form.nome.trim()) eForm.nome = 'Informe o nome da categoria.';
    if (!form.shortDescription.trim()) eForm.shortDescription = 'Informe uma descrição curta.';
    if (!form.imagemUrl.trim()) eForm.imagemUrl = 'Envie ou informe a URL de uma imagem.';
    setErros(eForm);
    if (Object.keys(eForm).length > 0) return;

    setSalvando(true);
    const payload = {
      nome: form.nome.trim(),
      shortDescription: form.shortDescription.trim(),
      imagemUrl: form.imagemUrl.trim(),
    };
    try {
      if (editando === 'nova') {
        await onCriar(payload);
        setAviso(`Categoria “${payload.nome}” criada e publicada.`);
      } else if (typeof editando === 'number') {
        await onAtualizar(editando, payload);
        setAviso(`Categoria “${payload.nome}” atualizada.`);
      }
      setEditando(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setErros({ ...(err.campos as Partial<FormularioCategoria>), geral: err.campos ? undefined : err.message });
      } else {
        setErros({ geral: 'Não foi possível salvar a categoria.' });
      }
    } finally {
      setSalvando(false);
    }
  };

  const tratarAcao = async (acao: () => Promise<void>, mensagem: string) => {
    await acao();
    setAviso(mensagem);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Categorias e especialidades"
        descricao="Aprove sugestões enviadas por prestadores de serviço e gerencie o catálogo de categorias com descrição curta e imagem."
        acoes={
          <button type="button" className="btn btn-primary" onClick={abrirNova}>
            <Plus className="size-4" aria-hidden />
            Nova categoria
          </button>
        }
      />

      {aviso && (
        <p role="status" className="flex items-center justify-between rounded-lg bg-concluido-soft px-4 py-3 text-sm font-semibold text-concluido">
          {aviso}
          <button type="button" className="btn btn-ghost btn-icon -my-1 -mr-2" aria-label="Fechar aviso" onClick={() => setAviso('')}>
            <X className="size-4" aria-hidden />
          </button>
        </p>
      )}

      {pendentes.length > 0 && (
        <section aria-labelledby="titulo-pendentes" className="space-y-3">
          <h2 id="titulo-pendentes" className="text-lg font-bold">
            Aguardando aprovação ({pendentes.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendentes.map((cat) => (
              <div key={cat.id} className="painel flex flex-col gap-4 border-faltou/30 bg-faltou-soft/25 p-4 sm:flex-row sm:items-center">
                <img
                  src={cat.imagemUrl}
                  alt={cat.nome}
                  className="h-24 w-full shrink-0 rounded-lg object-cover bg-paper sm:h-20 sm:w-28"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ink">{cat.nome}</h3>
                    <span className="rounded-full bg-faltou-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-faltou">
                      Pendente
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{cat.shortDescription}</p>
                  <p className="mt-1 text-[0.75rem] text-faint">
                    Sugerida por {cat.criadoPorEmail ?? 'profissional'} · {cat.totalServicosAtivos}{' '}
                    {cat.totalServicosAtivos === 1 ? 'serviço vinculado' : 'serviços vinculados'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void tratarAcao(() => onAprovar(cat.id), `Categoria “${cat.nome}” aprovada.`)}
                  >
                    <Check className="size-3.5" aria-hidden />
                    Aprovar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm hover:!text-danger"
                    onClick={() => void tratarAcao(() => onRejeitar(cat.id), `Categoria “${cat.nome}” rejeitada.`)}
                  >
                    <XCircle className="size-3.5" aria-hidden />
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={`grid gap-6 ${editando !== null ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : ''} xl:items-start`}>
        <section aria-label="Todas as categorias" className="min-w-0">
          {categorias.length === 0 ? (
            <EmptyState
              titulo="Nenhuma categoria cadastrada"
              texto="Crie a primeira categoria para organizar os serviços da plataforma."
              acao={
                <button type="button" className="btn btn-primary" onClick={abrirNova}>
                  Nova categoria
                </button>
              }
            />
          ) : (
            <div className="painel overflow-x-auto">
              <table className="w-full min-w-[660px] text-left text-sm">
                <thead>
                  <tr className="border-b border-rule text-xs text-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">Categoria</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Serviços ativos</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {categorias.map((c) => {
                    const badge = BADGE_STATUS[c.status];
                    return (
                      <tr key={c.id} className={`transition-colors duration-150 ${editando === c.id ? 'bg-marker-soft' : 'hover:bg-paper'}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img src={c.imagemUrl} alt={c.nome} className="size-12 shrink-0 rounded-lg object-cover bg-paper" />
                            <div className="min-w-0">
                              <p className="font-semibold">{c.nome}</p>
                              <p className="line-clamp-2 text-xs text-muted">{c.shortDescription}</p>
                            </div>
                          </div>
                        </td>
                        <td className="tabular px-3 py-3.5 text-muted">{c.totalServicosAtivos}</td>
                        <td className="px-3 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.classe}`}>
                            {badge.rotulo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon"
                              aria-label={`Editar ${c.nome}`}
                              onClick={() => abrirEdicao(c)}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </button>
                            {c.status !== 'APROVADA' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => void tratarAcao(() => onAprovar(c.id), `Categoria “${c.nome}” aprovada.`)}
                              >
                                Aprovar
                              </button>
                            )}
                            {c.status !== 'REJEITADA' && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm hover:!text-danger"
                                onClick={() => void tratarAcao(() => onRejeitar(c.id), `Categoria “${c.nome}” rejeitada.`)}
                              >
                                Rejeitar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {editando !== null && (
          <form onSubmit={(e) => void salvar(e)} noValidate className="painel xl:sticky xl:top-10" aria-labelledby="titulo-form-categoria">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 id="titulo-form-categoria" className="text-lg font-bold">
                {editando === 'nova' ? 'Nova categoria' : 'Editar categoria'}
              </h2>
              <button type="button" className="btn btn-ghost btn-icon -mr-2" aria-label="Fechar formulário" onClick={() => setEditando(null)}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="label" htmlFor="cat-nome">Nome</label>
                <input
                  id="cat-nome"
                  className="input"
                  maxLength={80}
                  placeholder="Ex.: Barbearia"
                  value={form.nome}
                  aria-invalid={erros.nome ? true : undefined}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
                {erros.nome && <p className="erro-campo">{erros.nome}</p>}
              </div>
              <div>
                <label className="label" htmlFor="cat-desc">Descrição curta</label>
                <textarea
                  id="cat-desc"
                  className="input"
                  rows={3}
                  maxLength={220}
                  placeholder="Mostrada no card inicial do cliente"
                  value={form.shortDescription}
                  aria-invalid={erros.shortDescription ? true : undefined}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                />
                {erros.shortDescription && <p className="erro-campo">{erros.shortDescription}</p>}
              </div>
              <CampoImagemCategoria
                idPrefixo="admin-cat"
                valor={form.imagemUrl}
                erro={erros.imagemUrl}
                onChange={(url) => setForm({ ...form, imagemUrl: url })}
              />
              {erros.geral && <p className="erro-campo" role="alert">{erros.geral}</p>}
            </div>
            <div className="flex justify-end gap-2.5 rounded-b-xl border-t border-rule bg-paper px-5 py-4">
              <button type="button" className="btn btn-secondary" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? 'Salvando…' : editando === 'nova' ? 'Criar categoria' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
