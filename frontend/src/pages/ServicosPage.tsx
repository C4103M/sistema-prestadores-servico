import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import type { Agendamento, Categoria, Servico, StatusCategoria } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CampoImagemCategoria } from '../components/CampoImagemCategoria';
import { duracao, moeda } from '../services/formato';
import { ApiError, type CategoriaPayload } from '../services/api';

interface ServicosPageProps {
  profissionalId: number;
  servicos: Servico[];
  categorias: Categoria[];
  agendamentos: Agendamento[];
  usuarioId: number;
  onSalvar: (servico: Servico) => void | Promise<void>;
  onExcluir: (id: number) => void | Promise<void>;
  onAlternarAtivo: (id: number) => void | Promise<void>;
  onSugerirCategoria: (payload: CategoriaPayload) => Promise<Categoria>;
}

interface Formulario {
  categoriaId: string;
  nome: string;
  descricao: string;
  duracaoMinutos: string;
  preco: string;
}

const VAZIO: Formulario = { categoriaId: '', nome: '', descricao: '', duracaoMinutos: '45', preco: '' };

type Erros = Partial<Record<keyof Formulario, string>>;

const BADGE_CATEGORIA: Record<StatusCategoria, { rotulo: string; classe: string }> = {
  APROVADA: { rotulo: 'Aprovada', classe: 'bg-concluido-soft text-concluido' },
  PENDENTE: { rotulo: 'Aguardando aprovação', classe: 'bg-faltou-soft text-faltou' },
  REJEITADA: { rotulo: 'Rejeitada — troque a categoria', classe: 'bg-danger-soft text-danger' },
};

function validar(f: Formulario, categoriasSelecionaveis: Categoria[]): Erros {
  const erros: Erros = {};
  const catId = Number(f.categoriaId);
  if (!f.categoriaId || !categoriasSelecionaveis.some((c) => c.id === catId)) {
    erros.categoriaId = 'Selecione uma categoria disponível.';
  }
  if (!f.nome.trim()) erros.nome = 'Informe o nome do serviço.';
  const dur = Number(f.duracaoMinutos);
  if (!Number.isInteger(dur) || dur < 5) erros.duracaoMinutos = 'A duração mínima é 5 minutos.';
  const preco = Number(f.preco.replace(',', '.'));
  if (f.preco.trim() === '' || Number.isNaN(preco) || preco < 0) erros.preco = 'Informe um preço igual ou maior que zero.';
  return erros;
}

export function ServicosPage({
  profissionalId,
  servicos,
  categorias,
  agendamentos,
  usuarioId,
  onSalvar,
  onExcluir,
  onAlternarAtivo,
  onSugerirCategoria,
}: ServicosPageProps) {
  const [editando, setEditando] = useState<'novo' | number | null>(null);
  const [form, setForm] = useState<Formulario>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [excluindo, setExcluindo] = useState<Servico | null>(null);
  const [aviso, setAviso] = useState('');

  // Subpainel de sugestão de nova categoria (nasce PENDENTE para o admin aprovar)
  const [sugerindo, setSugerindo] = useState(false);
  const [catNome, setCatNome] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImg, setCatImg] = useState('');
  const [catErros, setCatErros] = useState<{ nome?: string; shortDescription?: string; imagemUrl?: string; geral?: string }>({});
  const [enviandoCat, setEnviandoCat] = useState(false);

  const meus = servicos.filter((s) => s.profissionalId === profissionalId);
  const categoriasSelecionaveis = categorias.filter((c) => c.status !== 'REJEITADA');
  const minhasSugestoes = categorias.filter((c) => c.criadoPorUsuarioId === usuarioId);

  const abrirNovo = () => {
    setEditando('novo');
    setSugerindo(false);
    setForm({
      ...VAZIO,
      categoriaId: String(categoriasSelecionaveis[0]?.id ?? ''),
    });
    setErros({});
  };

  const abrirEdicao = (s: Servico) => {
    setEditando(s.id);
    setSugerindo(false);
    const catAtual = categorias.find((c) => c.id === s.categoriaId || c.nome === s.categoria);
    const idInicial =
      catAtual && catAtual.status !== 'REJEITADA'
        ? String(catAtual.id)
        : '';
    setForm({
      categoriaId: idInicial,
      nome: s.nome,
      descricao: s.descricao ?? '',
      duracaoMinutos: String(s.duracaoMinutos),
      preco: s.preco.toFixed(2).replace('.', ','),
    });
    setErros({});
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const encontrados = validar(form, categoriasSelecionaveis);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const existente = typeof editando === 'number' ? servicos.find((s) => s.id === editando) : undefined;
    const cat = categoriasSelecionaveis.find((c) => c.id === Number(form.categoriaId));
    try {
      await onSalvar({
        id: existente?.id ?? Date.now(),
        nome: form.nome.trim(),
        categoriaId: cat?.id ?? Number(form.categoriaId),
        categoria: cat?.nome ?? existente?.categoria ?? '',
        categoriaStatus: cat?.status,
        descricao: form.descricao.trim(),
        duracaoMinutos: Number(form.duracaoMinutos),
        preco: Number(form.preco.replace(',', '.')),
        ativo: existente?.ativo ?? true,
        profissionalId,
        profissionalNome: existente?.profissionalNome ?? '',
      });
      setAviso(
        cat?.status === 'PENDENTE'
          ? `“${form.nome.trim()}” foi salvo com a categoria pendente “${cat.nome}”. Ele aparecerá para os clientes assim que o administrador aprovar.`
          : existente
            ? `“${form.nome.trim()}” foi atualizado.`
            : `“${form.nome.trim()}” foi cadastrado.`
      );
      setEditando(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.campos) {
        setErros((atuais) => ({ ...atuais, ...err.campos } as Erros));
      }
    }
  };

  const sugerirNovaCategoria = async () => {
    const eCat: typeof catErros = {};
    if (!catNome.trim()) eCat.nome = 'Informe o nome da categoria.';
    if (!catDesc.trim()) eCat.shortDescription = 'Informe uma descrição curta.';
    if (!catImg.trim()) eCat.imagemUrl = 'Envie ou informe a URL de uma imagem.';
    setCatErros(eCat);
    if (Object.keys(eCat).length > 0) return;

    setEnviandoCat(true);
    try {
      const criada = await onSugerirCategoria({
        nome: catNome.trim(),
        shortDescription: catDesc.trim(),
        imagemUrl: catImg.trim(),
      });
      setForm((prev) => ({ ...prev, categoriaId: String(criada.id) }));
      setErros((prev) => ({ ...prev, categoriaId: undefined }));
      setSugerindo(false);
      setCatNome('');
      setCatDesc('');
      setCatImg('');
      setCatErros({});
      setAviso(`Categoria “${criada.nome}” enviada para aprovação do administrador e selecionada no formulário.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setCatErros({ ...(err.campos as typeof catErros), geral: err.campos ? undefined : err.message });
      } else {
        setCatErros({ geral: 'Não foi possível enviar a categoria.' });
      }
    } finally {
      setEnviandoCat(false);
    }
  };

  const temAgendamentos = (id: number) => agendamentos.some((a) => a.servicoId === id);

  const campo = (chave: keyof Formulario) => ({
    id: `servico-${chave}`,
    value: form[chave],
    'aria-invalid': erros[chave] ? true : undefined,
    'aria-describedby': erros[chave] ? `erro-${chave}` : undefined,
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [chave]: e.target.value }),
  });

  const erro = (chave: keyof Formulario) =>
    erros[chave] && (
      <p id={`erro-${chave}`} className="erro-campo">
        {erros[chave]}
      </p>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Serviços"
        descricao="O que você oferece, quanto tempo leva e quanto custa. Serviços em categorias pendentes aguardam aprovação do administrador para aparecerem aos clientes."
        acoes={
          <button type="button" className="btn btn-primary" onClick={abrirNovo}>
            <Plus className="size-4" aria-hidden />
            Novo serviço
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

      <div className={`grid gap-6 ${editando !== null ? 'xl:grid-cols-[minmax(0,1fr)_400px]' : ''} xl:items-start`}>
        <section aria-label="Lista de serviços" className="min-w-0 space-y-6">
          {meus.length === 0 ? (
            <EmptyState
              titulo="Nenhum serviço cadastrado"
              texto="Cadastre o primeiro serviço para que os clientes possam agendar com você."
              acao={
                <button type="button" className="btn btn-primary" onClick={abrirNovo}>
                  Cadastrar serviço
                </button>
              }
            />
          ) : (
            <div className="painel overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-rule text-xs text-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">Serviço</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Duração</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Preço</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Situação</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {meus.map((s) => {
                    const statusCat = s.categoriaStatus && s.categoriaStatus !== 'APROVADA'
                      ? BADGE_CATEGORIA[s.categoriaStatus]
                      : null;
                    return (
                      <tr key={s.id} className={`transition-colors duration-150 ${editando === s.id ? 'bg-marker-soft' : 'hover:bg-paper'}`}>
                        <td className="px-5 py-3.5">
                          <p className={`font-semibold ${s.ativo ? '' : 'text-muted line-through'}`}>{s.nome}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted">{s.categoria}</span>
                            {statusCat && (
                              <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${statusCat.classe}`}>
                                {statusCat.rotulo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="tabular px-3 py-3.5 text-muted">{duracao(s.duracaoMinutos)}</td>
                        <td className="tabular px-3 py-3.5 text-right font-semibold">{moeda(s.preco)}</td>
                        <td className="px-3 py-3.5">
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              role="switch"
                              checked={s.ativo}
                              onChange={() => void onAlternarAtivo(s.id)}
                              className="peer sr-only"
                            />
                            <span
                              aria-hidden
                              className="relative h-6 w-11 rounded-full bg-rule-strong transition-colors duration-150 peer-checked:bg-concluido peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marker after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-150 peer-checked:after:translate-x-5"
                            />
                            <span className="text-xs font-medium text-muted">{s.ativo ? 'Ativo' : 'Inativo'}</span>
                          </label>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button type="button" className="btn btn-ghost btn-icon" aria-label={`Editar ${s.nome}`} onClick={() => abrirEdicao(s)}>
                              <Pencil className="size-4" aria-hidden />
                            </button>
                            <button type="button" className="btn btn-ghost btn-icon hover:!text-danger" aria-label={`Excluir ${s.nome}`} onClick={() => setExcluindo(s)}>
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {minhasSugestoes.length > 0 && (
            <section aria-labelledby="titulo-minhas-categorias" className="space-y-3">
              <h2 id="titulo-minhas-categorias" className="text-lg font-bold">
                Minhas solicitações de categoria
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {minhasSugestoes.map((cat) => {
                  const badge = BADGE_CATEGORIA[cat.status];
                  return (
                    <li key={cat.id} className="painel flex items-center gap-3 p-3">
                      <img src={cat.imagemUrl} alt={cat.nome} className="size-14 shrink-0 rounded-lg object-cover bg-paper" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{cat.nome}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${badge.classe}`}>
                            {badge.rotulo}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{cat.shortDescription}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </section>

        {editando !== null && (
          <form onSubmit={salvar} noValidate className="painel xl:sticky xl:top-10" aria-labelledby="titulo-form-servico">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 id="titulo-form-servico" className="text-lg font-bold">
                {editando === 'novo' ? 'Novo serviço' : 'Editar serviço'}
              </h2>
              <button type="button" className="btn btn-ghost btn-icon -mr-2" aria-label="Fechar formulário" onClick={() => setEditando(null)}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="label" htmlFor="servico-nome">Nome</label>
                <input className="input" placeholder="Ex.: Corte degradê" autoFocus {...campo('nome')} />
                {erro('nome')}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label className="label !mb-0" htmlFor="servico-categoriaId">Categoria</label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-marker-2 hover:underline"
                    onClick={() => {
                      setSugerindo((s) => !s);
                      setCatErros({});
                    }}
                  >
                    <Sparkles className="size-3.5" aria-hidden />
                    {sugerindo ? 'Fechar sugestão' : 'Sugerir nova categoria'}
                  </button>
                </div>
                <select className="input" {...campo('categoriaId')}>
                  <option value="">Selecione uma categoria</option>
                  {categoriasSelecionaveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}{c.status === 'PENDENTE' ? ' (Pendente de aprovação)' : ''}
                    </option>
                  ))}
                </select>
                {erro('categoriaId')}
                {typeof editando === 'number' &&
                  servicos.find((s) => s.id === editando)?.categoriaStatus === 'REJEITADA' && (
                    <p className="mt-1.5 text-xs font-medium text-danger">
                      A categoria anterior deste serviço foi rejeitada. Escolha uma nova categoria aprovada ou pendente.
                    </p>
                )}
              </div>

              {sugerindo && (
                <div className="space-y-3 rounded-xl border border-marker/25 bg-marker-soft/35 p-4">
                  <p className="text-xs font-bold text-ink">
                    Sugerir categoria (fica pendente até aprovação do administrador)
                  </p>
                  <div>
                    <label className="label" htmlFor="sugestao-cat-nome">Nome da categoria</label>
                    <input
                      id="sugestao-cat-nome"
                      className="input"
                      placeholder="Ex.: Jardinagem"
                      maxLength={80}
                      value={catNome}
                      aria-invalid={catErros.nome ? true : undefined}
                      onChange={(e) => setCatNome(e.target.value)}
                    />
                    {catErros.nome && <p className="erro-campo">{catErros.nome}</p>}
                  </div>
                  <div>
                    <label className="label" htmlFor="sugestao-cat-desc">Descrição curta</label>
                    <input
                      id="sugestao-cat-desc"
                      className="input"
                      placeholder="Ex.: Poda, paisagismo e cuidados com áreas verdes."
                      maxLength={220}
                      value={catDesc}
                      aria-invalid={catErros.shortDescription ? true : undefined}
                      onChange={(e) => setCatDesc(e.target.value)}
                    />
                    {catErros.shortDescription && <p className="erro-campo">{catErros.shortDescription}</p>}
                  </div>
                  <CampoImagemCategoria
                    idPrefixo="sugestao-cat"
                    valor={catImg}
                    erro={catErros.imagemUrl}
                    onChange={setCatImg}
                  />
                  {catErros.geral && <p className="erro-campo" role="alert">{catErros.geral}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSugerindo(false)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={enviandoCat}
                      onClick={() => void sugerirNovaCategoria()}
                    >
                      {enviandoCat ? 'Enviando…' : 'Enviar categoria'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="label" htmlFor="servico-descricao">Descrição <span className="font-normal text-muted">(opcional)</span></label>
                <textarea className="input" rows={3} placeholder="O que está incluso no atendimento" {...campo('descricao')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="servico-duracaoMinutos">Duração (min)</label>
                  <input className="input tabular" type="number" min={5} step={5} inputMode="numeric" {...campo('duracaoMinutos')} />
                  {erro('duracaoMinutos')}
                </div>
                <div>
                  <label className="label" htmlFor="servico-preco">Preço (R$)</label>
                  <input className="input tabular" inputMode="decimal" placeholder="0,00" {...campo('preco')} />
                  {erro('preco')}
                </div>
              </div>
              {typeof editando === 'number' && (
                <p className="text-xs text-muted">Agendamentos já marcados mantêm o preço antigo.</p>
              )}
            </div>
            <div className="flex justify-end gap-2.5 rounded-b-xl border-t border-rule bg-paper px-5 py-4">
              <button type="button" className="btn btn-secondary" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editando === 'novo' ? 'Cadastrar' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </div>

      {excluindo && temAgendamentos(excluindo.id) ? (
        <ConfirmDialog
          aberto
          titulo="Este serviço tem agendamentos"
          rotuloConfirmar={excluindo.ativo ? 'Desativar serviço' : 'Entendi'}
          onConfirmar={async () => {
            if (!excluindo.ativo) {
              setExcluindo(null);
              return;
            }
            await onAlternarAtivo(excluindo.id);
            setExcluindo(null);
          }}
          onFechar={() => setExcluindo(null)}
        >
          <p>
            “{excluindo.nome}” aparece no histórico de atendimentos e não pode ser excluído. Desative-o para que deixe de
            aparecer para os clientes, mantendo o histórico.
          </p>
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          aberto={excluindo !== null}
          titulo="Excluir este serviço?"
          rotuloConfirmar="Excluir"
          perigo
          onConfirmar={async () => {
            if (!excluindo) return;
            try {
              await onExcluir(excluindo.id);
              if (editando === excluindo.id) setEditando(null);
              setAviso(`“${excluindo.nome}” foi excluído.`);
            } catch {
              // erro exibido no banner global
            }
          }}
          onFechar={() => setExcluindo(null)}
        >
          {excluindo && <p>“{excluindo.nome}” será removido do catálogo. Esta ação não pode ser desfeita.</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
