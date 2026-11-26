import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowsClockwise,
  CalendarCheck,
  CaretDown,
  CaretLeft,
  CaretRight,
  Clock,
  ImageSquare,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import type { Agendamento, Categoria, Disponibilidade, Profissional, Servico } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { SkeletonHorarios } from '../components/Skeleton';
import { ApiError, api, formatLocalDateTime } from '../services/api';
import { dataCurta, duracao, hora, moeda } from '../services/formato';
import { faixasDoDia, type Horario } from '../services/horarios';

const dataIso = (d: Date) => formatLocalDateTime(d).slice(0, 10);

const DIAS_SEMANA_CABECALHO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const iniciaisDe = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

function formatarHorario(slot24: string, fmt: '12h' | '24h') {
  if (fmt === '24h') return slot24;
  const [hStr, mStr] = slot24.split(':');
  const hNum = Number(hStr);
  const sufixo = hNum >= 12 ? 'pm' : 'am';
  const h12 = hNum % 12 || 12;
  return `${h12}:${mStr}${sufixo}`;
}

function nomeMesCapitalizado(ano: number, mes: number) {
  const nome = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

interface HomePageProps {
  clienteId: number;
  clienteNome: string;
  categorias: Categoria[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  disponibilidades: Disponibilidade[];
  profissionais?: Profissional[];
  onCriarAgendamento: (novo: Agendamento) => Promise<Agendamento>;
  onVerAgendamentos: () => void;
}

interface ProfissionalComServicos extends Profissional {
  servicosAtivos: Servico[];
  servicosNaCategoria: Servico[];
}

export function HomePage({
  clienteId,
  clienteNome,
  categorias: categoriasPublicas,
  servicos,
  agendamentos,
  disponibilidades,
  profissionais: profissionaisProp,
  onCriarAgendamento,
  onVerAgendamentos,
}: HomePageProps) {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  const [profissionalSelecionadoId, setProfissionalSelecionadoId] = useState<number | null>(null);
  const [servicoExpandidoId, setServicoExpandidoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');

  const ativos = useMemo(() => servicos.filter((s) => s.ativo), [servicos]);

  const categoriasDisponiveis = useMemo<Categoria[]>(() => {
    if (categoriasPublicas.length > 0) return categoriasPublicas;
    const mapa = new Map<string, Categoria>();
    let seq = 1;
    for (const s of ativos) {
      if (!s.categoria) continue;
      const atual = mapa.get(s.categoria);
      if (atual) {
        atual.totalServicosAtivos += 1;
      } else {
        mapa.set(s.categoria, {
          id: s.categoriaId ?? -seq++,
          nome: s.categoria,
          shortDescription: `Profissionais especializados em ${s.categoria.toLowerCase()}.`,
          imagemUrl: '/imagens/categorias/outros.jpg',
          status: 'APROVADA',
          criadoPorUsuarioId: null,
          criadoPorEmail: null,
          totalServicosAtivos: 1,
          criadoEm: '',
        });
      }
    }
    return Array.from(mapa.values());
  }, [categoriasPublicas, ativos]);

  const pertenceACategoria = useCallback((s: Servico, cat: Categoria | null) => {
    if (!cat) return true;
    if (cat.id > 0 && s.categoriaId != null && s.categoriaId === cat.id) return true;
    return s.categoria === cat.nome;
  }, []);

  const bannerDoProfissional = useCallback(
    (p: Profissional, catFallback?: Categoria | null, listaServicos?: Servico[]) => {
      const proprio = p.bannerUrl?.trim();
      if (proprio) return proprio;
      if (catFallback?.imagemUrl) return catFallback.imagemUrl;
      const primeiro = listaServicos?.[0];
      if (primeiro) {
        const cat = categoriasDisponiveis.find((c) => pertenceACategoria(primeiro, c));
        if (cat?.imagemUrl) return cat.imagemUrl;
      }
      return null;
    },
    [categoriasDisponiveis, pertenceACategoria]
  );

  // Profissionais que prestam serviço na categoria selecionada (Etapa 2)
  const profissionaisDaCategoria = useMemo<ProfissionalComServicos[]>(() => {
    if (!categoriaSelecionada) return [];
    const base = profissionaisProp ?? [];
    const porId = new Map<number, Profissional>();
    for (const p of base) porId.set(p.id, p);
    for (const s of ativos) {
      if (!porId.has(s.profissionalId)) {
        porId.set(s.profissionalId, {
          id: s.profissionalId,
          nome: s.profissionalNome,
          especialidade: s.categoria,
        });
      }
    }

    const termo = normalizar(busca.trim());
    return Array.from(porId.values())
      .map((p) => {
        const todos = ativos.filter((s) => s.profissionalId === p.id);
        const naCat = todos.filter((s) => pertenceACategoria(s, categoriaSelecionada));
        return { ...p, servicosAtivos: todos, servicosNaCategoria: naCat };
      })
      .filter((p) => p.servicosNaCategoria.length > 0)
      .filter(
        (p) =>
          !termo ||
          [p.nome, p.especialidade ?? '', ...p.servicosNaCategoria.map((s) => s.nome)].some((campo) =>
            normalizar(campo).includes(termo)
          )
      );
  }, [categoriaSelecionada, profissionaisProp, ativos, busca, pertenceACategoria]);

  // Profissional selecionado (Etapa 3)
  const profissionalSelecionado = useMemo<ProfissionalComServicos | null>(() => {
    if (profissionalSelecionadoId === null) return null;
    const encontrado = (profissionaisProp ?? []).find((p) => p.id === profissionalSelecionadoId);
    const todos = ativos.filter((s) => s.profissionalId === profissionalSelecionadoId);
    if (!encontrado && todos.length === 0) return null;
    const base: Profissional = encontrado ?? {
      id: profissionalSelecionadoId,
      nome: todos[0]?.profissionalNome ?? 'Profissional',
      especialidade: todos[0]?.categoria ?? '',
    };
    const naCat = todos.filter((s) => pertenceACategoria(s, categoriaSelecionada));
    // Prioriza os serviços da categoria selecionada e exibe os demais logo em seguida
    const ordenados = [
      ...naCat,
      ...todos.filter((s) => !naCat.some((x) => x.id === s.id)),
    ];
    return {
      ...base,
      servicosAtivos: ordenados,
      servicosNaCategoria: naCat,
    };
  }, [profissionalSelecionadoId, profissionaisProp, ativos, categoriaSelecionada, pertenceACategoria]);

  const proximo = useMemo(
    () =>
      agendamentos
        .filter((a) => a.clienteId === clienteId && a.status === 'AGENDADO' && new Date(a.dataHoraInicio) > new Date())
        .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))[0],
    [agendamentos, clienteId]
  );

  const selecionarCategoria = (cat: Categoria) => {
    setCategoriaSelecionada(cat);
    setProfissionalSelecionadoId(null);
    setServicoExpandidoId(null);
    setBusca('');
  };

  const voltarParaCategorias = () => {
    setCategoriaSelecionada(null);
    setProfissionalSelecionadoId(null);
    setServicoExpandidoId(null);
    setBusca('');
  };

  const abrirProfissional = (profId: number) => {
    setProfissionalSelecionadoId(profId);
    setServicoExpandidoId(null);
  };

  const voltarParaProfissionais = () => {
    setProfissionalSelecionadoId(null);
    setServicoExpandidoId(null);
  };

  // =========================================================================
  // ETAPA 3: Tela do Profissional (banner + lista de serviços com expansão)
  // =========================================================================
  if (profissionalSelecionado) {
    const banner = bannerDoProfissional(
      profissionalSelecionado,
      categoriaSelecionada,
      profissionalSelecionado.servicosAtivos
    );
    const qtdServicos = profissionalSelecionado.servicosAtivos.length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={categoriaSelecionada ? voltarParaProfissionais : voltarParaCategorias}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para {categoriaSelecionada ? categoriaSelecionada.nome : 'categorias'}
          </button>

          <nav aria-label="Navegação" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <button
              type="button"
              onClick={voltarParaCategorias}
              className="font-medium hover:text-ink-heading cursor-pointer"
            >
              Categorias
            </button>
            {categoriaSelecionada && (
              <>
                <span aria-hidden>/</span>
                <button
                  type="button"
                  onClick={voltarParaProfissionais}
                  className="font-medium hover:text-ink-heading cursor-pointer"
                >
                  {categoriaSelecionada.nome}
                </button>
              </>
            )}
            <span aria-hidden>/</span>
            <span className="font-semibold text-ink-heading">{profissionalSelecionado.nome}</span>
          </nav>
        </div>

        {/* Hero do Profissional com seu banner único */}
        <section className="cal-card overflow-hidden anim-in" aria-label="Perfil do profissional">
          <div className="relative h-44 w-full overflow-hidden bg-plate sm:h-52">
            {banner ? (
              <img
                src={banner}
                alt={`Banner de ${profissionalSelecionado.nome}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-plate text-faint">
                <ImageSquare className="size-10" aria-hidden />
              </div>
            )}
          </div>
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <span className="-mt-8 relative z-10 grid size-16 shrink-0 place-items-center rounded-2xl border-2 border-surface bg-plate text-lg font-bold text-ink-heading shadow-sm">
                  {iniciaisDe(profissionalSelecionado.nome)}
                </span>
                <div className="pt-2">
                  <h1 className="text-2xl font-bold tracking-tight text-ink-heading">
                    {profissionalSelecionado.nome}
                  </h1>
                  <p className="text-sm text-muted">
                    {profissionalSelecionado.especialidade || categoriaSelecionada?.nome || 'Prestador de serviços'}
                  </p>
                </div>
              </div>

              <span className="font-mono-num self-start rounded-lg border border-rule bg-surface-soft px-3 py-1.5 text-xs font-semibold text-ink sm:self-auto">
                {qtdServicos === 1 ? '1 serviço disponível' : `${qtdServicos} serviços disponíveis`}
              </span>
            </div>
          </div>
        </section>

        {/* Lista de serviços do profissional — clique expande para escolher dia e horário */}
        <section aria-labelledby="titulo-servicos-profissional" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 id="titulo-servicos-profissional" className="text-lg font-bold tracking-tight text-ink-heading">
                Serviços de {profissionalSelecionado.nome}
              </h2>
              <p className="text-sm text-muted">
                Clique em um serviço para expandir o calendário e escolher o melhor horário.
              </p>
            </div>
          </div>

          {qtdServicos === 0 ? (
            <EmptyState
              titulo="Nenhum serviço ativo"
              texto="Este profissional não possui serviços ativos no momento."
              acao={
                <button type="button" className="btn btn-secondary" onClick={voltarParaProfissionais}>
                  Escolher outro profissional
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {profissionalSelecionado.servicosAtivos.map((s) => {
                const aberto = servicoExpandidoId === s.id;
                return (
                  <li
                    key={s.id}
                    className={`cal-card overflow-hidden transition-colors ${
                      aberto ? 'ring-1 ring-ink' : 'hover:border-rule-strong'
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={aberto}
                      aria-controls={`horarios-servico-${s.id}`}
                      onClick={() => setServicoExpandidoId(aberto ? null : s.id)}
                      className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-surface-soft/70 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-plate px-2 py-0.5 text-[11px] font-semibold text-muted">
                            {s.categoria}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-ink-heading">{s.nome}</h3>
                        {s.descricao && <p className="mt-1 text-xs leading-relaxed text-muted">{s.descricao}</p>}
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="sm:text-right">
                          <p className="font-mono-num text-base font-bold text-ink-heading">{moeda(s.preco)}</p>
                          <p className="font-mono-num flex items-center gap-1 text-xs text-muted sm:justify-end">
                            <Clock className="size-3.5" aria-hidden />
                            {duracao(s.duracaoMinutos)}
                          </p>
                        </div>

                        <span
                          className={`btn btn-sm pointer-events-none ${aberto ? 'btn-primary' : 'btn-secondary'}`}
                          aria-hidden
                        >
                          {aberto ? 'Fechar' : 'Escolher horário'}
                          <CaretDown
                            className={`size-3.5 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </div>
                    </button>

                    {aberto && (
                      <div id={`horarios-servico-${s.id}`} className="border-t border-rule bg-plate/60 p-3 sm:p-5">
                        <AgendamentoInlineServico
                          key={s.id}
                          servico={s}
                          clienteId={clienteId}
                          clienteNome={clienteNome}
                          disponibilidades={disponibilidades}
                          onFechar={() => setServicoExpandidoId(null)}
                          onConfirmar={onCriarAgendamento}
                          onVerAgendamentos={onVerAgendamentos}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // =========================================================================
  // ETAPA 2: Lista de Profissionais da Categoria (com banner do profissional)
  // =========================================================================
  if (categoriaSelecionada) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn btn-secondary btn-sm" onClick={voltarParaCategorias}>
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para categorias
          </button>

          <nav aria-label="Navegação" className="flex items-center gap-1.5 text-xs text-muted">
            <button
              type="button"
              onClick={voltarParaCategorias}
              className="font-medium hover:text-ink-heading cursor-pointer"
            >
              Categorias
            </button>
            <span aria-hidden>/</span>
            <span className="font-semibold text-ink-heading">{categoriaSelecionada.nome}</span>
          </nav>
        </div>

        <PageHeader
          titulo={`Profissionais em ${categoriaSelecionada.nome}`}
          descricao={categoriaSelecionada.shortDescription}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <MagnifyingGlass
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint"
              aria-hidden
            />
            <label htmlFor="busca-profissional" className="sr-only">
              Filtrar profissional em {categoriaSelecionada.nome}
            </label>
            <input
              id="busca-profissional"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, especialidade ou serviço"
              className="input h-11 pl-10"
            />
          </div>

          <p className="font-mono-num text-xs font-medium text-muted" aria-live="polite">
            {profissionaisDaCategoria.length === 1
              ? '1 profissional disponível'
              : `${profissionaisDaCategoria.length} profissionais disponíveis`}
          </p>
        </div>

        {profissionaisDaCategoria.length === 0 ? (
          <EmptyState
            titulo="Nenhum profissional encontrado nesta categoria"
            texto={
              busca.trim()
                ? 'Tente outro termo de busca ou limpe o filtro.'
                : 'Ainda não há profissionais com serviços ativos nesta categoria.'
            }
            acao={
              busca.trim() ? (
                <button type="button" className="btn btn-secondary" onClick={() => setBusca('')}>
                  Limpar filtro
                </button>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={voltarParaCategorias}>
                  Escolher outra categoria
                </button>
              )
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {profissionaisDaCategoria.map((p, idx) => {
              const banner = bannerDoProfissional(p, categoriaSelecionada, p.servicosNaCategoria);
              const menorPreco = Math.min(...p.servicosNaCategoria.map((s) => s.preco));
              const previews = p.servicosNaCategoria.slice(0, 3);
              const extras = p.servicosNaCategoria.length - previews.length;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => abrirProfissional(p.id)}
                  style={{ ['--i' as string]: idx }}
                  className="group cal-card anim-in flex flex-col overflow-hidden text-left transition-all duration-150 hover:border-rule-strong cursor-pointer"
                >
                  {/* Banner do profissional */}
                  <div className="relative h-44 w-full overflow-hidden bg-plate">
                    {banner ? (
                      <img
                        src={banner}
                        alt={`Banner de ${p.nome}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-faint">
                        <ImageSquare className="size-10" aria-hidden />
                      </div>
                    )}
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent"
                      aria-hidden
                    />
                    <span className="font-mono-num absolute top-3 right-3 rounded-lg bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-ink-heading backdrop-blur-sm">
                      {p.servicosNaCategoria.length === 1
                        ? '1 serviço'
                        : `${p.servicosNaCategoria.length} serviços`}
                    </span>
                  </div>

                  {/* Dados do profissional */}
                  <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                    <div>
                      <div className="flex items-end gap-3">
                        <span className="-mt-10 relative z-10 grid size-12 shrink-0 place-items-center rounded-xl border-2 border-surface bg-plate text-sm font-bold text-ink-heading shadow-sm">
                          {iniciaisDe(p.nome)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-lg font-bold tracking-tight text-ink-heading">{p.nome}</h2>
                          <p className="truncate text-xs font-medium text-muted">
                            {p.especialidade || categoriaSelecionada.nome}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {previews.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-lg border border-rule bg-surface-soft px-2.5 py-1 text-xs font-medium text-ink"
                          >
                            {s.nome}
                          </span>
                        ))}
                        {extras > 0 && (
                          <span className="font-mono-num rounded-lg bg-plate px-2.5 py-1 text-xs font-semibold text-muted">
                            +{extras}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-rule pt-3.5">
                      <div>
                        <span className="block text-[11px] font-medium text-muted">A partir de</span>
                        <span className="font-mono-num text-base font-bold text-ink-heading">{moeda(menorPreco)}</span>
                      </div>

                      <span className="btn btn-secondary btn-sm group-hover:border-ink group-hover:bg-ink group-hover:text-on-ink">
                        Ver serviços
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // ETAPA 1: Categorias
  // =========================================================================
  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Escolha uma categoria"
        descricao="Selecione o tipo de atendimento para explorar os profissionais disponíveis e agendar em horários reais."
      />

      {proximo && (
        <div className="comprovante flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-muted">Seu próximo horário</p>
              <p className="font-bold text-ink-heading">
                {proximo.servicoNome} ·{' '}
                <span className="font-mono-num font-semibold">
                  {dataCurta(proximo.dataHoraInicio)} às {hora(proximo.dataHoraInicio)}
                </span>
              </p>
              <p className="text-xs text-muted">Com {proximo.profissionalNome}</p>
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={onVerAgendamentos}>
            Ver meus agendamentos
          </button>
        </div>
      )}

      {categoriasDisponiveis.length === 0 ? (
        <EmptyState
          titulo="Nenhuma categoria disponível"
          texto="Ainda não há categorias ou serviços ativos cadastrados no momento."
        />
      ) : (
        <section aria-labelledby="titulo-categorias-destaque" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-categorias-destaque" className="text-base font-semibold text-ink-heading">
              Categorias disponíveis
            </h2>
            <p className="text-xs text-muted">Clique em uma categoria para ver os profissionais</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoriasDisponiveis.map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => selecionarCategoria(cat)}
                style={{ ['--i' as string]: idx }}
                className="group cal-card anim-in flex flex-col overflow-hidden text-left transition-all duration-150 hover:border-rule-strong cursor-pointer"
              >
                <div className="relative h-36 w-full overflow-hidden bg-plate">
                  <img
                    src={cat.imagemUrl}
                    alt={cat.nome}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-[0.9375rem] text-ink-heading">{cat.nome}</h3>
                      <span className="font-mono-num shrink-0 rounded-md bg-plate px-2 py-0.5 text-[11px] font-medium text-muted">
                        {cat.totalServicosAtivos === 1 ? '1 serviço' : `${cat.totalServicosAtivos} serviços`}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{cat.shortDescription}</p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-heading">
                    Ver profissionais
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface AgendamentoInlineServicoProps {
  servico: Servico;
  clienteId: number;
  clienteNome: string;
  disponibilidades: Disponibilidade[];
  onFechar: () => void;
  onConfirmar: (novo: Agendamento) => Promise<Agendamento>;
  onVerAgendamentos: () => void;
}

function AgendamentoInlineServico({
  servico,
  clienteId,
  clienteNome,
  disponibilidades,
  onFechar,
  onConfirmar,
  onVerAgendamentos,
}: AgendamentoInlineServicoProps) {
  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [mesRef, setMesRef] = useState(() => ({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
  }));
  const [slotsPorDia, setSlotsPorDia] = useState<Record<string, Horario[]> | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(true);
  const [erroHorarios, setErroHorarios] = useState('');
  const [diaSelecionadoIso, setDiaSelecionadoIso] = useState<string>(() => dataIso(hoje));
  const [escolhido, setEscolhido] = useState<Horario | null>(null);
  const [formatoHora, setFormatoHora] = useState<'12h' | '24h'>('24h');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState<Agendamento | null>(null);

  const diasDoMes = useMemo(() => {
    const totalDias = new Date(mesRef.ano, mesRef.mes + 1, 0).getDate();
    return Array.from({ length: totalDias }, (_, idx) => {
      const d = new Date(mesRef.ano, mesRef.mes, idx + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [mesRef.ano, mesRef.mes]);

  const celulasVaziasInicio = useMemo(
    () => new Date(mesRef.ano, mesRef.mes, 1).getDay(),
    [mesRef.ano, mesRef.mes]
  );

  const ehMesAtual = mesRef.ano === hoje.getFullYear() && mesRef.mes === hoje.getMonth();

  const carregarHorariosMes = useCallback(
    async (autoSelecionarDia: boolean) => {
      setCarregandoHorarios(true);
      setErroHorarios('');
      const primeiroDia = new Date(mesRef.ano, mesRef.mes, 1);
      const ultimoDia = new Date(mesRef.ano, mesRef.mes + 1, 0);
      const de = primeiroDia < hoje ? hoje : primeiroDia;

      if (de > ultimoDia) {
        setSlotsPorDia({});
        setCarregandoHorarios(false);
        return;
      }

      try {
        const lista = await api.cliente.listarHorariosLivres(servico.id, dataIso(de), dataIso(ultimoDia));
        const mapa: Record<string, Horario[]> = {};
        for (const item of lista) {
          const chave = item.dataHoraInicio.slice(0, 10);
          mapa[chave] ??= [];
          mapa[chave].push({
            inicio: new Date(item.dataHoraInicio),
            fim: new Date(item.dataHoraFim),
          });
        }
        setSlotsPorDia(mapa);

        if (autoSelecionarDia) {
          const primeiroComHorario = diasDoMes.find((d) => (mapa[dataIso(d)] ?? []).length > 0);
          const alvo = primeiroComHorario ?? de;
          setDiaSelecionadoIso(dataIso(alvo));
          setEscolhido(null);
        }
      } catch (err) {
        setErroHorarios(
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Não foi possível carregar os horários livres.'
        );
      } finally {
        setCarregandoHorarios(false);
      }
    },
    [mesRef.ano, mesRef.mes, hoje, servico.id, diasDoMes]
  );

  useEffect(() => {
    void carregarHorariosMes(true);
  }, [carregarHorariosMes]);

  const mudarMes = (delta: number) => {
    const proximoMes = new Date(mesRef.ano, mesRef.mes + delta, 1);
    const limiteInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    if (proximoMes < limiteInicio) return;
    setSlotsPorDia(null);
    setEscolhido(null);
    setErro('');
    setMesRef({ ano: proximoMes.getFullYear(), mes: proximoMes.getMonth() });
  };

  const diaSelecionadoDate = useMemo(() => {
    const [ano, mes, dia] = diaSelecionadoIso.split('-').map(Number);
    if (!ano || !mes || !dia) return hoje;
    return new Date(ano, mes - 1, dia);
  }, [diaSelecionadoIso, hoje]);

  const livres = useMemo(
    () => (slotsPorDia ? slotsPorDia[diaSelecionadoIso] ?? [] : []),
    [slotsPorDia, diaSelecionadoIso]
  );

  const totalSlotsNoMes = useMemo(
    () => (slotsPorDia ? Object.values(slotsPorDia).reduce((acc, l) => acc + l.length, 0) : 0),
    [slotsPorDia]
  );

  const atende = faixasDoDia(disponibilidades, servico.profissionalId, diaSelecionadoDate).length > 0;

  const confirmar = async () => {
    if (!escolhido || enviando) return;
    const novo: Agendamento = {
      id: Date.now(),
      clienteId,
      clienteNome,
      profissionalId: servico.profissionalId,
      profissionalNome: servico.profissionalNome,
      servicoId: servico.id,
      servicoNome: servico.nome,
      dataHoraInicio: formatLocalDateTime(escolhido.inicio),
      dataHoraFim: formatLocalDateTime(escolhido.fim),
      preco: servico.preco,
      status: 'AGENDADO',
      criadoEm: formatLocalDateTime(new Date()),
    };
    setEnviando(true);
    setErro('');
    try {
      const salvo = await onConfirmar(novo);
      setConfirmado(salvo);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErro('Este horário acabou de ser ocupado. Escolha outro.');
        setEscolhido(null);
        void carregarHorariosMes(false);
      } else {
        setErro(e instanceof Error ? e.message : 'Não foi possível confirmar o agendamento.');
        setEscolhido(null);
      }
    } finally {
      setEnviando(false);
    }
  };

  if (confirmado) {
    return (
      <div className="cal-window rounded-xl border border-rule p-5 sm:p-6 anim-in" role="status">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-toy-soft text-toy-ink">
              <CalendarCheck className="size-5" weight="bold" aria-hidden />
            </span>
            <div>
              <h4 className="text-lg font-bold text-ink-heading">Horário marcado</h4>
              <p className="text-xs text-muted">Seu atendimento foi reservado com preço congelado.</p>
            </div>
          </div>
          <span className="font-mono-num rounded-md bg-toy-soft px-2.5 py-1 text-xs font-semibold text-toy-ink">
            Confirmado · #{String(confirmado.id).slice(-4)}
          </span>
        </div>

        <div className="comprovante mt-4 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-4 py-3">
            <dt className="text-muted">Serviço</dt>
            <dd className="text-right font-semibold text-ink-heading">{confirmado.servicoNome}</dd>
            <dt className="text-muted">Com</dt>
            <dd className="text-right font-semibold text-ink-heading">{confirmado.profissionalNome}</dd>
            <dt className="text-muted">Quando</dt>
            <dd className="font-mono-num text-right font-semibold text-ink-heading">
              {dataCurta(confirmado.dataHoraInicio)}, {hora(confirmado.dataHoraInicio)}–{hora(confirmado.dataHoraFim)}
            </dd>
          </dl>
          <div className="picote flex items-baseline justify-between px-4 py-3">
            <span className="text-xs text-muted">Preço garantido</span>
            <span className="font-mono-num font-bold text-ink-heading">Total {moeda(confirmado.preco)}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-primary" onClick={onVerAgendamentos}>
            Ver meus agendamentos
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setConfirmado(null);
              setEscolhido(null);
              void carregarHorariosMes(false);
            }}
          >
            Agendar outro horário
          </button>
          <button type="button" className="btn btn-ghost" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-window overflow-hidden rounded-xl border border-rule">
      {slotsPorDia === null && carregandoHorarios ? (
        <div className="p-5 sm:p-6">
          <SkeletonHorarios />
        </div>
      ) : slotsPorDia === null && erroHorarios ? (
        <div className="p-5 sm:p-6">
          <div role="alert" className="space-y-3 rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
            <p className="font-semibold">{erroHorarios}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void carregarHorariosMes(true)}>
              <ArrowsClockwise className="size-3.5" aria-hidden />
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_280px]">
          {/* Coluna esquerda: calendário do mês (referência /) */}
          <div className="border-b border-rule p-4 sm:p-6 lg:border-r lg:border-b-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold tracking-tight text-ink-heading">
                  {nomeMesCapitalizado(mesRef.ano, mesRef.mes)}{' '}
                  <span className="font-normal text-muted">{mesRef.ano}</span>
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon h-7 w-7"
                    disabled={ehMesAtual}
                    onClick={() => mudarMes(-1)}
                    aria-label="Mês anterior"
                  >
                    <CaretLeft className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon h-7 w-7"
                    onClick={() => mudarMes(1)}
                    aria-label="Próximo mês"
                  >
                    <CaretRight className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-md bg-toy-soft px-2 py-0.5 text-[11px] font-semibold text-toy-ink">
                <span className="size-1.5 rounded-full bg-toy" aria-hidden />
                {totalSlotsNoMes > 0 ? 'Agenda livre' : 'Sem vagas no mês'}
              </span>
            </div>

            <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium tracking-wider text-faint">
              {DIAS_SEMANA_CABECALHO.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: celulasVaziasInicio }, (_, i) => (
                <div key={`vazio-${i}`} aria-hidden />
              ))}

              {diasDoMes.map((d) => {
                const iso = dataIso(d);
                const disponivel = (slotsPorDia?.[iso]?.length ?? 0) > 0;
                const selecionado = iso === diaSelecionadoIso;

                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!disponivel}
                    aria-pressed={selecionado}
                    aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}${
                      disponivel ? '' : ', sem horários disponíveis'
                    }`}
                    onClick={() => {
                      setDiaSelecionadoIso(iso);
                      setEscolhido(null);
                      setErro('');
                    }}
                    className={`font-mono-num relative flex h-10 items-center justify-center rounded-lg text-[13px] transition-all sm:h-11 ${
                      selecionado
                        ? 'bg-ink font-bold text-on-ink cursor-pointer'
                        : disponivel
                          ? 'bg-slot font-semibold text-ink hover:opacity-85 cursor-pointer'
                          : 'cursor-not-allowed font-medium text-muted opacity-40'
                    }`}
                  >
                    {d.getDate()}
                    {disponivel && !selecionado && (
                      <span className="absolute bottom-1.5 size-1 rounded-full bg-toy" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna direita: horários livres do dia selecionado */}
          <div className="flex flex-col justify-between gap-4 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink-heading">
                  Dia <span className="font-mono-num text-muted">{diaSelecionadoDate.getDate()}</span>
                </span>
                <div className="cal-well inline-flex gap-0.5 rounded-lg p-0.5">
                  {(['12h', '24h'] as const).map((fmt) => {
                    const ativo = formatoHora === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setFormatoHora(fmt)}
                        className={`font-mono-num rounded-md px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                          ativo ? 'cal-raised text-ink-heading' : 'text-muted'
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {livres.length === 0 ? (
                <p className="rounded-xl bg-plate p-4 text-xs leading-relaxed text-muted">
                  {totalSlotsNoMes === 0
                    ? 'Não há horários disponíveis neste mês. Avance para o próximo mês para conferir outras datas.'
                    : atende
                      ? 'A agenda deste dia já está cheia. Escolha outro dia no calendário.'
                      : `${servico.profissionalNome} não atende neste dia.`}
                </p>
              ) : (
                <div className="max-h-[248px] space-y-2 overflow-y-auto pr-0.5">
                  {livres.map((h) => {
                    const ativo = escolhido?.inicio.getTime() === h.inicio.getTime();
                    const slotStr = hora(h.inicio);
                    return (
                      <button
                        key={h.inicio.toISOString()}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => {
                          setEscolhido(h);
                          setErro('');
                        }}
                        className={`font-mono-num flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-all cursor-pointer ${
                          ativo
                            ? 'bg-ink text-on-ink'
                            : 'border border-rule bg-surface text-ink-heading hover:border-rule-strong'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${ativo ? 'bg-accent' : 'bg-toy'}`}
                          aria-hidden
                        />
                        <span>{formatarHorario(slotStr, formatoHora)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {erroHorarios && (
                <p className="erro-campo" role="alert">
                  {erroHorarios}
                </p>
              )}
              {erro && (
                <p className="erro-campo" role="alert">
                  {erro}
                </p>
              )}
            </div>

            <div className="space-y-2 border-t border-rule pt-3">
              <div className="flex items-baseline justify-between text-xs text-muted">
                <span>{duracao(servico.duracaoMinutos)}</span>
                <span className="font-mono-num font-bold text-ink-heading">{moeda(servico.preco)}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary w-full rounded-[10px]"
                disabled={!escolhido || enviando}
                onClick={() => void confirmar()}
              >
                {enviando
                  ? 'Confirmando…'
                  : escolhido
                    ? `Reservar ${formatarHorario(hora(escolhido.inicio), formatoHora)}`
                    : 'Escolha um horário'}
              </button>

              <p className="text-center text-[11px] text-faint">
                O valor fica congelado na reserva mesmo se houver reajuste depois.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
