import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarBlank, CaretLeft, CaretRight, ListBullets } from '@phosphor-icons/react';
import type { Agendamento, Disponibilidade, StatusAgendamento } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { dataCurta, dataLonga, hora, mesmoDia, moeda } from '../services/formato';
import { deMinutos, faixasDoDia, paraMinutos } from '../services/horarios';

interface AgendaPageProps {
  profissionalId: number;
  agendamentos: Agendamento[];
  disponibilidades: Disponibilidade[];
  onAtualizarStatus: (id: number, status: Exclude<StatusAgendamento, 'AGENDADO'>) => void | Promise<void>;
}

const PX_POR_HORA = 76;

const DIAS_SEMANA_CABECALHO = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

const BORDA_STATUS: Record<StatusAgendamento, string> = {
  AGENDADO: 'border-l-accent bg-surface-soft',
  CONCLUIDO: 'border-l-toy bg-surface-soft',
  CANCELADO: 'border-l-faint bg-plate opacity-70',
  FALTOU: 'border-l-faltou bg-surface-soft',
};

function nomeMesCapitalizado(ano: number, mes: number) {
  const nome = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function chaveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AgendaPage({ profissionalId, agendamentos, disponibilidades, onAtualizarStatus }: AgendaPageProps) {
  const [agora, setAgora] = useState(() => new Date());
  const [visao, setVisao] = useState<'mes' | 'dia'>('mes');
  const [mesAtual, setMesAtual] = useState(() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() };
  });
  const [dia, setDia] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);
  const [visualizacao, setVisualizacao] = useState<'timeline' | 'lista'>('timeline');

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const abrirDia = (alvo: Date) => {
    const d = new Date(alvo);
    d.setHours(0, 0, 0, 0);
    setDia(d);
    setMesAtual({ ano: d.getFullYear(), mes: d.getMonth() });
    setVisao('dia');
  };

  const voltarParaMes = () => {
    setMesAtual({ ano: dia.getFullYear(), mes: dia.getMonth() });
    setVisao('mes');
  };

  const mudarMes = (delta: number) => {
    const proximo = new Date(mesAtual.ano, mesAtual.mes + delta, 1);
    setMesAtual({ ano: proximo.getFullYear(), mes: proximo.getMonth() });
  };

  const mudarDia = (delta: number) => {
    const d = new Date(dia);
    d.setDate(d.getDate() + delta);
    setDia(d);
  };

  // Dados da visão macro mensal
  const diasDoMes = useMemo(() => {
    const total = new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate();
    return Array.from({ length: total }, (_, idx) => {
      const d = new Date(mesAtual.ano, mesAtual.mes, idx + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [mesAtual.ano, mesAtual.mes]);

  const celulasVaziasInicio = useMemo(
    () => new Date(mesAtual.ano, mesAtual.mes, 1).getDay(),
    [mesAtual.ano, mesAtual.mes]
  );

  const agendamentosDoMes = useMemo(
    () =>
      agendamentos
        .filter((a) => {
          if (a.profissionalId !== profissionalId) return false;
          const dt = new Date(a.dataHoraInicio);
          return dt.getFullYear() === mesAtual.ano && dt.getMonth() === mesAtual.mes;
        })
        .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio)),
    [agendamentos, profissionalId, mesAtual.ano, mesAtual.mes]
  );

  const ativosDoMes = useMemo(
    () => agendamentosDoMes.filter((a) => a.status !== 'CANCELADO'),
    [agendamentosDoMes]
  );

  const ativosPorDiaMap = useMemo(() => {
    const mapa = new Map<string, Agendamento[]>();
    for (const a of ativosDoMes) {
      const chave = chaveDia(new Date(a.dataHoraInicio));
      const lista = mapa.get(chave);
      if (lista) lista.push(a);
      else mapa.set(chave, [a]);
    }
    return mapa;
  }, [ativosDoMes]);

  const concluidosNoMes = ativosDoMes.filter((a) => a.status === 'CONCLUIDO').length;
  const previstoNoMes = ativosDoMes.reduce((soma, a) => soma + a.preco, 0);
  const ehMesCorrente = mesAtual.ano === agora.getFullYear() && mesAtual.mes === agora.getMonth();

  const destaquesDoMes = useMemo(() => {
    const inicioHoje = new Date(agora);
    inicioHoje.setHours(0, 0, 0, 0);
    const futuros = ativosDoMes.filter((a) => new Date(a.dataHoraInicio) >= inicioHoje);
    return (futuros.length > 0 ? futuros : ativosDoMes).slice(0, 6);
  }, [ativosDoMes, agora]);

  // =========================================================================
  // VISÃO MACRO MENSAL (referência / — clique em um dia abre a visão diária)
  // =========================================================================
  if (visao === 'mes') {
    return (
      <div className="space-y-8">
        <PageHeader
          titulo="Agenda"
          descricao="Visão mensal dos seus atendimentos. Clique em um dia para abrir a agenda detalhada."
          acoes={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => mudarMes(-1)}
                aria-label="Mês anterior"
              >
                <CaretLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm h-8 px-3.5"
                disabled={ehMesCorrente}
                onClick={() => setMesAtual({ ano: agora.getFullYear(), mes: agora.getMonth() })}
              >
                Mês atual
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => mudarMes(1)}
                aria-label="Próximo mês"
              >
                <CaretRight className="size-4" aria-hidden />
              </button>
            </div>
          }
        />

        <section
          aria-label="Calendário mensal de atendimentos"
          className="cal-window overflow-hidden rounded-2xl border border-rule anim-in"
        >
          <div className="grid lg:grid-cols-[1fr_310px]">
            {/* Coluna principal: calendário macro do mês */}
            <div className="border-b border-rule p-5 sm:p-6 lg:border-r lg:border-b-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold tracking-tight text-ink-heading sm:text-lg">
                  {nomeMesCapitalizado(mesAtual.ano, mesAtual.mes)}{' '}
                  <span className="font-normal text-muted">{mesAtual.ano}</span>
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-toy-soft px-2.5 py-0.5 text-[11px] font-semibold text-toy-ink">
                  <span className="size-1.5 rounded-full bg-toy" aria-hidden />
                  {ativosDoMes.length === 1
                    ? '1 atendimento no mês'
                    : `${ativosDoMes.length} atendimentos no mês`}
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

                {diasDoMes.map((data) => {
                  const faixasDia = faixasDoDia(disponibilidades, profissionalId, data);
                  const doDiaAtivos = ativosPorDiaMap.get(chaveDia(data)) ?? [];
                  const temDisp = faixasDia.length > 0;
                  const qtd = doDiaAtivos.length;
                  const ehHojeDia = mesmoDia(data, agora);

                  return (
                    <button
                      key={chaveDia(data)}
                      type="button"
                      onClick={() => abrirDia(data)}
                      aria-label={`${dataLonga(data)}, ${
                        qtd === 1 ? '1 atendimento' : `${qtd} atendimentos`
                      }${temDisp ? ', com horário de atendimento' : ', sem disponibilidade'}`}
                      className={`font-mono-num relative flex h-14 flex-col items-center justify-between rounded-xl p-1.5 text-[13px] transition-all cursor-pointer sm:h-16 sm:p-2 ${
                        ehHojeDia
                          ? 'bg-ink font-bold text-on-ink ring-2 ring-accent/40'
                          : qtd > 0 || temDisp
                            ? 'bg-slot font-semibold text-ink hover:opacity-85'
                            : 'bg-transparent font-medium text-muted opacity-50 hover:bg-surface-soft hover:opacity-80'
                      }`}
                    >
                      <span className="leading-none">{data.getDate()}</span>

                      <span className="flex items-center gap-1">
                        {temDisp && (
                          <span
                            className="size-1.5 rounded-full bg-toy"
                            title="Com disponibilidade"
                            aria-hidden
                          />
                        )}
                        {qtd > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold ${
                              ehHojeDia
                                ? 'bg-accent text-white'
                                : 'bg-accent-soft text-accent'
                            }`}
                          >
                            {qtd}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coluna lateral: resumo do mês e atalhos para os dias */}
            <aside className="flex flex-col justify-between gap-5 bg-surface-soft p-5 sm:p-6">
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-ink-heading">Resumo do mês</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-rule bg-surface p-3">
                      <dt className="text-[11px] font-medium text-muted">Atendimentos</dt>
                      <dd className="font-mono-num mt-0.5 text-lg font-bold text-ink-heading">{ativosDoMes.length}</dd>
                    </div>
                    <div className="rounded-xl border border-rule bg-surface p-3">
                      <dt className="text-[11px] font-medium text-muted">Concluídos</dt>
                      <dd className="font-mono-num mt-0.5 text-lg font-bold text-toy-ink">{concluidosNoMes}</dd>
                    </div>
                    <div className="col-span-2 rounded-xl border border-rule bg-surface p-3">
                      <dt className="text-[11px] font-medium text-muted">Faturamento previsto</dt>
                      <dd className="font-mono-num mt-0.5 text-lg font-bold text-ink-heading">
                        {moeda(previstoNoMes)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Atendimentos no mês
                  </h3>
                  {destaquesDoMes.length === 0 ? (
                    <p className="mt-2 rounded-xl border border-rule bg-surface p-3.5 text-xs text-muted">
                      Nenhum atendimento marcado para este mês. Clique em qualquer dia para conferir sua disponibilidade.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {destaquesDoMes.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => abrirDia(new Date(a.dataHoraInicio))}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-rule bg-surface px-3 py-2.5 text-left transition-colors hover:border-rule-strong cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-ink-heading">{a.clienteNome}</p>
                              <p className="truncate text-[11px] text-muted">{a.servicoNome}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-mono-num text-[11px] font-bold text-ink-heading">
                                {hora(a.dataHoraInicio)}
                              </p>
                              <p className="font-mono-num text-[10px] text-muted">
                                {dataCurta(a.dataHoraInicio)}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-rule pt-4 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-toy" aria-hidden />
                  <span>Dia com disponibilidade configurada</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-soft px-1 text-[10px] font-bold text-accent">
                    2
                  </span>
                  <span>Quantidade de atendimentos no dia</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-2 w-full"
                  onClick={() => abrirDia(agora)}
                >
                  Abrir agenda de hoje
                </button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // VISÃO DIÁRIA DETALHADA (ao clicar no dia na visão macro)
  // =========================================================================
  const doDia = agendamentos
    .filter((a) => a.profissionalId === profissionalId && mesmoDia(new Date(a.dataHoraInicio), dia))
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
  const faixas = faixasDoDia(disponibilidades, profissionalId, dia);

  const minutosDe = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };

  // Janela visível: da primeira faixa/atendimento até a última, arredondada para horas cheias
  const pontos = [
    ...faixas.flatMap((f) => [paraMinutos(f.horaInicio), paraMinutos(f.horaFim)]),
    ...doDia.flatMap((a) => [minutosDe(a.dataHoraInicio), minutosDe(a.dataHoraFim)]),
  ];
  const inicioJanela = pontos.length ? Math.floor(Math.min(...pontos) / 60) * 60 : 8 * 60;
  const fimJanela = pontos.length ? Math.ceil(Math.max(...pontos) / 60) * 60 : 18 * 60;
  const horas = Array.from({ length: (fimJanela - inicioJanela) / 60 }, (_, i) => inicioJanela + i * 60);
  const y = (min: number) => ((min - inicioJanela) / 60) * PX_POR_HORA;

  const ehHoje = mesmoDia(dia, agora);
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const ativos = doDia.filter((a) => a.status !== 'CANCELADO');
  const previsto = ativos.reduce((s, a) => s + a.preco, 0);

  const renderAcoes = (a: Agendamento, compacto: boolean) => {
    const jaComecou = new Date(a.dataHoraInicio) <= agora;
    if (a.status !== 'AGENDADO') {
      return <StatusBadge status={a.status} compacto={compacto} />;
    }
    return (
      <>
        <button
          type="button"
          className="btn btn-primary btn-sm h-7 rounded-lg"
          onClick={() => void onAtualizarStatus(a.id, 'CONCLUIDO')}
        >
          Concluir
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm h-7 rounded-lg"
          disabled={!jaComecou}
          title={jaComecou ? undefined : 'Disponível depois do horário de início'}
          onClick={() => void onAtualizarStatus(a.id, 'FALTOU')}
        >
          Faltou
        </button>
        {!jaComecou && (
          <button
            type="button"
            className={`btn btn-ghost btn-sm h-7 rounded-lg ${compacto ? 'hidden sm:inline-flex' : ''}`}
            onClick={() => setCancelando(a)}
          >
            Cancelar
          </button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Agenda"
        descricao="Atendimentos do dia em ordem de horário. Conclua ou registre a falta ao fim de cada um."
        acoes={
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-secondary btn-sm h-10 px-3.5" onClick={voltarParaMes}>
              <ArrowLeft className="size-4" aria-hidden />
              Voltar para o mês
            </button>

            <div role="radiogroup" aria-label="Formato da agenda" className="cal-well inline-grid grid-cols-2 rounded-xl p-1">
              {([
                ['timeline', 'Timeline', CalendarBlank],
                ['lista', 'Lista', ListBullets],
              ] as const).map(([valor, rotulo, Icone]) => {
                const ativo = visualizacao === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setVisualizacao(valor)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer ${
                      ativo ? 'cal-raised text-ink-heading' : 'text-muted hover:text-ink-heading'
                    }`}
                  >
                    <Icone className="size-3.5" aria-hidden />
                    {rotulo}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => mudarDia(-1)}
                aria-label="Dia anterior"
              >
                <CaretLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm h-8 px-3.5"
                disabled={ehHoje}
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setDia(d);
                }}
              >
                Hoje
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => mudarDia(1)}
                aria-label="Próximo dia"
              >
                <CaretRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-ink-heading first-letter:uppercase">{dataLonga(dia)}</h2>
        <p className="font-mono-num text-xs text-muted sm:text-sm">
          {ativos.length === 1 ? '1 atendimento' : `${ativos.length} atendimentos`} · {moeda(previsto)} previstos
          {faixas.length > 0 && ` · atende ${faixas.map((f) => `${f.horaInicio}–${f.horaFim}`).join(' e ')}`}
        </p>
      </div>

      {faixas.length === 0 && doDia.length === 0 ? (
        <div className="cal-card p-10 text-center">
          <p className="text-lg font-bold text-ink-heading">Dia sem atendimento</p>
          <p className="mt-1 text-sm text-muted">Você não tem disponibilidade cadastrada para este dia da semana.</p>
        </div>
      ) : visualizacao === 'lista' ? (
        doDia.length === 0 ? (
          <div className="cal-card p-10 text-center">
            <p className="text-base font-bold text-ink-heading">Nenhum atendimento marcado neste dia</p>
            <p className="mt-1 text-sm text-muted">
              Suas faixas de atendimento estão abertas para reservas de clientes.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {doDia.map((a) => (
              <li
                key={a.id}
                className={`cal-card flex flex-col gap-3 border-l-[3px] p-4 sm:flex-row sm:items-center sm:justify-between ${BORDA_STATUS[a.status]}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono-num text-xs font-bold text-ink-heading">
                      {hora(a.dataHoraInicio)}–{hora(a.dataHoraFim)}
                    </span>
                    <span className="font-semibold text-ink-heading">{a.clienteNome}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.servicoNome} · <span className="font-mono-num font-semibold text-ink">{moeda(a.preco)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">{renderAcoes(a, false)}</div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="cal-card overflow-hidden">
          <div className="relative" style={{ height: y(fimJanela) }}>
            {/* Faixas de disponibilidade: fora da faixa fica no tom plate */}
            <div className="absolute inset-y-0 right-0 left-16 bg-plate" aria-hidden />
            {faixas.map((f) => (
              <div
                key={f.id}
                aria-hidden
                className="absolute right-0 left-16 bg-surface"
                style={{
                  top: y(paraMinutos(f.horaInicio)),
                  height: y(paraMinutos(f.horaFim)) - y(paraMinutos(f.horaInicio)),
                }}
              />
            ))}

            {/* Linhas de hora */}
            {horas.map((h) => (
              <div key={h} className="absolute right-0 left-0 flex" style={{ top: y(h) }} aria-hidden>
                <span className="font-mono-num w-16 -translate-y-1/2 pr-3 text-right text-[11px] text-faint">
                  {h > inicioJanela && deMinutos(h)}
                </span>
                <span className="flex-1 border-t border-rule" />
              </div>
            ))}

            {/* Atendimentos */}
            <ol className="absolute inset-y-0 right-3 left-[4.75rem]">
              {doDia.map((a) => {
                const topo = y(minutosDe(a.dataHoraInicio));
                const altura = y(minutosDe(a.dataHoraFim)) - topo;
                const compacto = altura < 82;
                return (
                  <li
                    key={a.id}
                    className={`absolute inset-x-0 overflow-hidden rounded-xl border border-rule border-l-[3px] px-3.5 transition-colors ${
                      BORDA_STATUS[a.status]
                    } ${compacto ? 'flex items-center justify-between gap-3 py-1' : 'flex flex-col justify-between py-2'}`}
                    style={{ top: topo + 2, height: Math.max(42, altura - 4) }}
                  >
                    <div className={`min-w-0 ${compacto ? 'flex flex-1 items-baseline gap-2.5' : ''}`}>
                      <p className="font-mono-num min-w-0 truncate text-xs font-bold text-ink-heading">
                        {hora(a.dataHoraInicio)}–{hora(a.dataHoraFim)}{' '}
                        <span className="font-sans text-sm font-semibold">· {a.clienteNome}</span>
                      </p>
                      <p className={`truncate text-xs text-muted ${compacto ? 'hidden shrink sm:block' : 'mt-0.5'}`}>
                        {a.servicoNome} · <span className="font-mono-num">{moeda(a.preco)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">{renderAcoes(a, compacto)}</div>
                  </li>
                );
              })}
            </ol>

            {/* Agora: indicador Cal.com em #CC4510 */}
            {ehHoje && minAgora >= inicioJanela && minAgora <= fimJanela && (
              <div
                className="pointer-events-none absolute right-0 left-3 flex items-center"
                style={{ top: y(minAgora) }}
              >
                <span className="font-mono-num -translate-y-1/2 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {hora(agora)}
                </span>
                <span className="pulse-dot -ml-0.5 size-2 -translate-y-1/2 rounded-full bg-accent" />
                <span className="h-0.5 flex-1 -translate-y-1/2 bg-accent" />
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        aberto={cancelando !== null}
        titulo="Cancelar este atendimento?"
        rotuloConfirmar="Cancelar atendimento"
        rotuloCancelar="Manter"
        perigo
        onConfirmar={() => (cancelando ? onAtualizarStatus(cancelando.id, 'CANCELADO') : undefined)}
        onFechar={() => setCancelando(null)}
      >
        {cancelando && (
          <p>
            {cancelando.servicoNome} de {cancelando.clienteNome}, às {hora(cancelando.dataHoraInicio)}. O horário volta a
            ficar livre na agenda.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
