import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowsClockwise, CalendarCheck, CaretDown, Clock, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { Agendamento, Categoria, Disponibilidade, Profissional, Servico } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { SkeletonHorarios } from '../components/Skeleton';
import { ApiError, api, formatLocalDateTime } from '../services/api';
import { dataCurta, duracao, hora, moeda } from '../services/formato';
import { faixasDoDia, type Horario } from '../services/horarios';

const dataIso = (d: Date) => formatLocalDateTime(d).slice(0, 10);

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

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [modo, setModo] = useState<'servico' | 'profissional'>('servico');
  const [profissionalAbertoId, setProfissionalAbertoId] = useState<number | null>(null);

  const trocarModo = (m: 'servico' | 'profissional') => {
    setModo(m);
    setBusca('');
    setProfissionalAbertoId(null);
  };

  const ativos = servicos.filter((s) => s.ativo);
  const categoriasFallback = [
    'Todas',
    ...Array.from(
      new Set([
        ...categoriasPublicas.map((c) => c.nome),
        ...ativos.map((s) => s.categoria).filter(Boolean),
      ])
    ),
  ];

  const termo = normalizar(busca.trim());
  const naCategoria = (s: Servico) => categoria === 'Todas' || s.categoria === categoria;

  // Busca por serviço: nome, descrição ou categoria do serviço
  const filtrados = ativos.filter(
    (s) =>
      naCategoria(s) &&
      (!termo || [s.nome, s.descricao ?? '', s.categoria ?? ''].some((c) => normalizar(c).includes(termo)))
  );

  // Busca por profissional: nome ou especialidade; mostra só quem tem serviço ativo na categoria
  const listaProfissionais = profissionaisProp ?? [];
  const profissionais = listaProfissionais
    .filter((p) => !termo || [p.nome, p.especialidade ?? ''].some((c) => normalizar(c).includes(termo)))
    .map((p) => ({ ...p, servicos: ativos.filter((s) => s.profissionalId === p.id && naCategoria(s)) }))
    .filter((p) => p.servicos.length > 0);

  const selecionado = ativos.find((s) => s.id === selecionadoId) ?? null;

  const linhaServico = (s: Servico, comProfissional: boolean) => {
    const ativo = s.id === selecionadoId;
    return (
      <li
        key={s.id}
        className={`transition-colors duration-150 ${ativo ? 'bg-surface-soft' : 'hover:bg-surface-soft/70'}`}
      >
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted">
              {comProfissional ? `${s.categoria} · ${s.profissionalNome}` : s.categoria}
            </p>
            <h3 className="mt-0.5 text-[0.9375rem] font-semibold text-ink-heading">{s.nome}</h3>
            {s.descricao && <p className="mt-1 line-clamp-1 text-xs text-muted">{s.descricao}</p>}
          </div>
          <div className="flex items-center justify-between gap-5 sm:justify-end">
            <div className="sm:text-right">
              <p className="font-mono-num text-[0.9375rem] font-bold text-ink-heading">{moeda(s.preco)}</p>
              <p className="font-mono-num flex items-center gap-1 text-xs text-muted sm:justify-end">
                <Clock className="size-3.5" aria-hidden />
                {duracao(s.duracaoMinutos)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelecionadoId(s.id)}
              aria-pressed={ativo}
              className={`btn btn-sm w-32 ${ativo ? 'btn-primary' : 'btn-secondary'}`}
            >
              {ativo ? 'Selecionado' : 'Ver horários'}
            </button>
          </div>
        </div>
      </li>
    );
  };

  const proximo = agendamentos
    .filter((a) => a.clienteId === clienteId && a.status === 'AGENDADO' && new Date(a.dataHoraInicio) > new Date())
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))[0];

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Encontre um serviço ou profissional"
        descricao="Os horários mostrados já descontam a agenda do profissional em tempo real."
        acoes={
          categoria !== 'Todas' ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCategoria('Todas')}>
              Mostrar todas as categorias
            </button>
          ) : undefined
        }
      />

      {categoriasPublicas.length > 0 && (
        <section aria-labelledby="titulo-categorias-destaque" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-categorias-destaque" className="text-base font-semibold text-ink-heading">
              Categorias disponíveis
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoriasPublicas.map((cat, idx) => {
              const ativa = categoria === cat.nome;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => setCategoria(ativa ? 'Todas' : cat.nome)}
                  style={{ ['--i' as string]: idx }}
                  className={`group cal-card anim-in flex flex-col overflow-hidden text-left transition-all duration-150 cursor-pointer ${
                    ativa ? 'ring-2 ring-ink' : 'hover:border-rule-strong'
                  }`}
                >
                  <div className="relative h-32 w-full overflow-hidden bg-plate">
                    <img
                      src={cat.imagemUrl}
                      alt={cat.nome}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {ativa && (
                      <span className="absolute top-2.5 right-2.5 rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                        Ativa
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-[0.9375rem] text-ink-heading">{cat.nome}</h3>
                      <span className="font-mono-num shrink-0 rounded-md bg-plate px-2 py-0.5 text-[11px] font-medium text-muted">
                        {cat.totalServicosAtivos === 1 ? '1 serviço' : `${cat.totalServicosAtivos} serviços`}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{cat.shortDescription}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section aria-label="Busca" className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <MagnifyingGlass
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <label htmlFor="busca" className="sr-only">
                {modo === 'servico' ? 'Buscar serviço' : 'Buscar profissional'}
              </label>
              <input
                id="busca"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={
                  modo === 'servico'
                    ? 'Nome do serviço, ex.: corte, limpeza de pele'
                    : 'Nome ou especialidade, ex.: Beatriz, elétrica'
                }
                className="input h-11 pl-10"
              />
            </div>

            <div role="radiogroup" aria-label="Buscar por" className="cal-well inline-grid shrink-0 grid-cols-2 rounded-xl p-1">
              {([
                ['servico', 'Serviço'],
                ['profissional', 'Profissional'],
              ] as const).map(([valor, rotulo]) => {
                const ativo = modo === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => trocarModo(valor)}
                    className={`h-9 rounded-lg px-4 text-xs font-semibold transition-all cursor-pointer ${
                      ativo ? 'cal-raised text-ink-heading' : 'text-muted hover:text-ink-heading'
                    }`}
                  >
                    {rotulo}
                  </button>
                );
              })}
            </div>
          </div>

          {categoriasPublicas.length === 0 && categoriasFallback.length > 1 && (
            <div role="tablist" aria-label="Categorias" className="flex gap-2 overflow-x-auto pt-1 pb-1">
              {categoriasFallback.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={categoria === c}
                  onClick={() => setCategoria(c)}
                  className={`h-8 shrink-0 rounded-lg border px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                    categoria === c
                      ? 'border-ink bg-ink text-on-ink'
                      : 'border-rule bg-surface text-muted hover:border-rule-strong hover:text-ink-heading'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <p className="font-mono-num text-xs font-medium text-muted" aria-live="polite">
            {modo === 'servico'
              ? filtrados.length === 1
                ? '1 serviço encontrado'
                : `${filtrados.length} serviços encontrados`
              : profissionais.length === 1
                ? '1 profissional encontrado'
                : `${profissionais.length} profissionais encontrados`}
          </p>

          {(modo === 'servico' ? filtrados.length : profissionais.length) === 0 ? (
            <EmptyState
              titulo={modo === 'servico' ? 'Nenhum serviço encontrado' : 'Nenhum profissional encontrado'}
              texto={
                modo === 'servico'
                  ? 'Tente outro termo, troque a categoria ou busque pelo profissional.'
                  : 'Tente outro nome ou especialidade, ou busque pelo serviço.'
              }
              acao={
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setBusca('');
                    setCategoria('Todas');
                  }}
                >
                  Limpar busca
                </button>
              }
            />
          ) : modo === 'servico' ? (
            <ul className="cal-card divide-y divide-rule overflow-hidden">
              {filtrados.map((s) => linhaServico(s, true))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {profissionais.map((p) => {
                const aberto = profissionalAbertoId === p.id;
                return (
                  <li key={p.id} className="cal-card overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={aberto}
                      aria-controls={`servicos-prof-${p.id}`}
                      onClick={() => setProfissionalAbertoId(aberto ? null : p.id)}
                      className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-soft sm:p-5 cursor-pointer"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-plate text-xs font-bold text-ink-heading">
                        {p.nome
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink-heading">{p.nome}</span>
                        <span className="block text-xs text-muted">
                          {p.especialidade} · {p.servicos.length === 1 ? '1 serviço' : `${p.servicos.length} serviços`}
                        </span>
                      </span>
                      <CaretDown
                        className={`size-4 shrink-0 text-muted transition-transform duration-150 ${aberto ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {aberto && (
                      <ul id={`servicos-prof-${p.id}`} className="divide-y divide-rule border-t border-rule">
                        {p.servicos.map((s) => linhaServico(s, false))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="lg:sticky lg:top-24" aria-label="Agendamento">
          {selecionado ? (
            <PainelAgendamento
              key={selecionado.id}
              servico={selecionado}
              clienteId={clienteId}
              clienteNome={clienteNome}
              disponibilidades={disponibilidades}
              onFechar={() => setSelecionadoId(null)}
              onConfirmar={onCriarAgendamento}
              onVerAgendamentos={onVerAgendamentos}
            />
          ) : (
            <div className="cal-card p-6">
              <h2 className="text-base font-bold text-ink-heading">Escolha um serviço</h2>
              <p className="mt-1 text-sm text-muted">
                Selecione “Ver horários” em qualquer serviço para visualizar os dias e horários disponíveis.
              </p>
              {proximo && (
                <div className="comprovante mt-5 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted">Seu próximo horário</span>
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  </div>
                  <p className="mt-1.5 font-bold text-ink-heading">{proximo.servicoNome}</p>
                  <p className="font-mono-num mt-0.5 text-xs text-muted">
                    {dataCurta(proximo.dataHoraInicio)} às {hora(proximo.dataHoraInicio)} · {proximo.profissionalNome}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm mt-3 w-full"
                    onClick={onVerAgendamentos}
                  >
                    Ver meus agendamentos
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

interface PainelAgendamentoProps {
  servico: Servico;
  clienteId: number;
  clienteNome: string;
  disponibilidades: Disponibilidade[];
  onFechar: () => void;
  onConfirmar: (novo: Agendamento) => Promise<Agendamento>;
  onVerAgendamentos: () => void;
}

function PainelAgendamento({
  servico,
  clienteId,
  clienteNome,
  disponibilidades,
  onFechar,
  onConfirmar,
  onVerAgendamentos,
}: PainelAgendamentoProps) {
  const dias = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + i);
        return d;
      }),
    []
  );

  const [slotsPorDia, setSlotsPorDia] = useState<Record<string, Horario[]> | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(true);
  const [erroHorarios, setErroHorarios] = useState('');
  const [diaIdx, setDiaIdx] = useState(0);
  const [escolhido, setEscolhido] = useState<Horario | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState<Agendamento | null>(null);

  const carregarHorarios = useCallback(
    async (autoSelecionarDia: boolean) => {
      setCarregandoHorarios(true);
      setErroHorarios('');
      try {
        const lista = await api.cliente.listarHorariosLivres(
          servico.id,
          dataIso(dias[0]),
          dataIso(dias[dias.length - 1])
        );
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
          const primeiroComHorario = Math.max(
            0,
            dias.findIndex((d) => (mapa[dataIso(d)] ?? []).length > 0)
          );
          setDiaIdx(primeiroComHorario);
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
    [servico.id, dias]
  );

  useEffect(() => {
    void carregarHorarios(true);
  }, [carregarHorarios]);

  const livresPorDia = useMemo(
    () => dias.map((d) => (slotsPorDia ? slotsPorDia[dataIso(d)] ?? [] : [])),
    [dias, slotsPorDia]
  );

  const livres = livresPorDia[diaIdx] ?? [];
  const atende = faixasDoDia(disponibilidades, servico.profissionalId, dias[diaIdx]).length > 0;

  const grupos = [
    { rotulo: 'Manhã', itens: livres.filter((h) => h.inicio.getHours() < 12) },
    { rotulo: 'Tarde', itens: livres.filter((h) => h.inicio.getHours() >= 12 && h.inicio.getHours() < 18) },
    { rotulo: 'Noite', itens: livres.filter((h) => h.inicio.getHours() >= 18) },
  ].filter((g) => g.itens.length > 0);

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
      preco: servico.preco, // RN05: preço congelado no agendamento
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
        void carregarHorarios(false);
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
      <div className="cal-card p-6 anim-in" role="status">
        <span className="grid size-10 place-items-center rounded-full bg-toy-soft text-toy-ink">
          <CalendarCheck className="size-5" weight="bold" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink-heading">Horário marcado</h2>
        <div className="comprovante mt-4 text-sm">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 text-xs">
            <span className="font-mono-num font-semibold text-muted">
              Agendamento #{String(confirmado.id).slice(-4)}
            </span>
            <span className="font-semibold text-toy-ink">Confirmado</span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-4 py-3 picote">
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
        <div className="mt-5 flex flex-wrap gap-2.5">
          <button type="button" className="btn btn-primary flex-1" onClick={onVerAgendamentos}>
            Ver meus agendamentos
          </button>
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Agendar outro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cal-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-rule p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{servico.profissionalNome}</p>
          <h2 className="mt-0.5 text-lg font-bold text-ink-heading">{servico.nome}</h2>
          <p className="font-mono-num mt-0.5 text-xs text-muted">
            {duracao(servico.duracaoMinutos)} · {moeda(servico.preco)}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-icon -mt-1 -mr-2" onClick={onFechar} aria-label="Fechar">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="space-y-5 p-5">
        {slotsPorDia === null && carregandoHorarios ? (
          <SkeletonHorarios />
        ) : slotsPorDia === null && erroHorarios ? (
          <div role="alert" className="space-y-3 rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
            <p className="font-semibold">{erroHorarios}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void carregarHorarios(true)}>
              <ArrowsClockwise className="size-3.5" aria-hidden />
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="label">Dia</legend>
              <div className="grid grid-cols-7 gap-1">
                {dias.map((d, i) => {
                  const sem = livresPorDia[i].length === 0;
                  const ativo = i === diaIdx;
                  return (
                    <button
                      key={dataIso(d)}
                      type="button"
                      disabled={sem}
                      aria-pressed={ativo}
                      aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}${sem ? ', sem horários' : ''}`}
                      onClick={() => {
                        setDiaIdx(i);
                        setEscolhido(null);
                        setErro('');
                      }}
                      className={`relative flex h-14 flex-col items-center justify-center rounded-lg text-xs transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        ativo
                          ? 'bg-ink font-semibold text-on-ink'
                          : sem
                            ? 'bg-transparent text-faint'
                            : 'bg-slot text-ink hover:opacity-85'
                      }`}
                    >
                      <span className="text-[10px] opacity-80">
                        {i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                      <span className="font-mono-num text-sm font-bold">{d.getDate()}</span>
                      {!sem && !ativo && (
                        <span className="absolute bottom-1 size-1 rounded-full bg-toy" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="label">Horários livres</legend>
              {livres.length === 0 ? (
                <p className="rounded-xl bg-plate p-4 text-sm text-muted">
                  {atende
                    ? 'A agenda deste dia já está cheia. Escolha outro dia.'
                    : `${servico.profissionalNome} não atende neste dia.`}
                </p>
              ) : (
                <div className="space-y-3">
                  {grupos.map((g) => (
                    <div key={g.rotulo}>
                      <p className="mb-1.5 text-xs font-semibold text-muted">{g.rotulo}</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {g.itens.map((h) => {
                          const ativo = escolhido?.inicio.getTime() === h.inicio.getTime();
                          return (
                            <button
                              key={h.inicio.toISOString()}
                              type="button"
                              aria-pressed={ativo}
                              onClick={() => {
                                setEscolhido(h);
                                setErro('');
                              }}
                              className={`font-mono-num flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                ativo
                                  ? 'border-ink bg-ink text-on-ink'
                                  : 'border-rule bg-surface text-ink-heading hover:border-rule-strong'
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${ativo ? 'bg-accent' : 'bg-toy'}`}
                                aria-hidden
                              />
                              {hora(h.inicio)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
            </fieldset>
          </>
        )}
      </div>

      <div className="border-t border-rule bg-surface-soft p-5">
        {escolhido ? (
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted">Quando</dt>
            <dd className="font-mono-num text-right font-semibold text-ink-heading">
              {dataCurta(escolhido.inicio)}, {hora(escolhido.inicio)}–{hora(escolhido.fim)}
            </dd>
            <dt className="sr-only">Total</dt>
            <dd className="picote col-span-2 mt-2 flex items-baseline justify-between pt-2">
              <span className="text-xs text-muted">Preço garantido</span>
              <span className="font-mono-num font-bold text-ink-heading">Total {moeda(servico.preco)}</span>
            </dd>
          </dl>
        ) : (
          <p className="mb-4 text-sm text-muted">Escolha um horário para ver o resumo.</p>
        )}
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={!escolhido || enviando}
          onClick={() => void confirmar()}
        >
          {enviando ? 'Confirmando…' : 'Confirmar agendamento'}
        </button>
        <p className="mt-2.5 text-center text-xs text-faint">O valor fica garantido mesmo se o preço mudar depois.</p>
      </div>
    </div>
  );
}
