import { useCallback, useEffect, useState } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import type { AdminDashboardResponse, Area, DashboardResponse, HealthStatus } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SkeletonDashboard } from '../components/Skeleton';
import { ApiError, api, formatLocalDateTime } from '../services/api';
import { dataCurta, hora, moeda } from '../services/formato';

interface DashboardPageProps {
  profissionalId?: number;
  /** profissional: só os próprios atendimentos; admin: a plataforma inteira, agrupada por profissional */
  area: Extract<Area, 'profissional' | 'admin'>;
}

type Periodo = 'mes' | '30d';

const dataIso = (d: Date) => formatLocalDateTime(d).slice(0, 10);

function intervaloPeriodo(periodo: Periodo): { de: string; ate: string } {
  const hoje = new Date();
  if (periodo === 'mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return { de: dataIso(inicio), ate: dataIso(fim) };
  }
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29);
  return { de: dataIso(inicio), ate: dataIso(hoje) };
}

const iniciaisDe = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function DashboardPage({ area, profissionalId }: DashboardPageProps) {
  const admin = area === 'admin';
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [profData, setProfData] = useState<DashboardResponse | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboardResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  const [saude, setSaude] = useState<HealthStatus | null>(null);
  const [carregandoSaude, setCarregandoSaude] = useState(admin);
  const [erroSaude, setErroSaude] = useState(false);
  const [tentativaSaude, setTentativaSaude] = useState(0);

  const recarregar = useCallback(() => {
    setTentativa((t) => t + 1);
  }, []);

  const recarregarSaude = useCallback(() => {
    setTentativaSaude((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!admin) return;
    let ativo = true;

    async function carregarSaude() {
      setCarregandoSaude(true);
      setErroSaude(false);
      try {
        const dados = await api.health();
        if (ativo) setSaude(dados);
      } catch {
        if (ativo) {
          setSaude(null);
          setErroSaude(true);
        }
      } finally {
        if (ativo) setCarregandoSaude(false);
      }
    }

    void carregarSaude();
    return () => {
      ativo = false;
    };
  }, [admin, tentativaSaude]);

  useEffect(() => {
    let ativo = true;
    const { de, ate } = intervaloPeriodo(periodo);

    async function carregar() {
      setCarregando(true);
      setErro('');
      try {
        if (admin) {
          const dados = await api.admin.obterDashboard(de, ate);
          if (ativo) {
            setAdminData(dados);
            setProfData(null);
          }
        } else if (profissionalId) {
          const dados = await api.profissional.obterDashboard(profissionalId, de, ate);
          if (ativo) {
            setProfData(dados);
            setAdminData(null);
          }
        } else if (ativo) {
          setErro('Perfil de profissional não identificado.');
        }
      } catch (err) {
        if (ativo) {
          setErro(
            err instanceof ApiError || err instanceof Error
              ? err.message
              : 'Não foi possível gerar os números do dashboard.'
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [admin, profissionalId, periodo, tentativa]);

  const totais: DashboardResponse | null = admin ? (adminData?.totais ?? null) : profData;

  const barras = admin
    ? (adminData?.porProfissional ?? []).map((p) => ({
        chave: String(p.profissionalId),
        nome: p.profissionalNome,
        total: p.faturamento,
        qtd: p.concluidos,
      }))
    : (profData?.porServico ?? []).map((s) => ({
        chave: String(s.servicoId),
        nome: s.servicoNome,
        total: s.faturamento,
        qtd: s.concluidos,
      }));
  const maiorBarra = Math.max(1, ...barras.map((b) => b.total));
  const somaBarras = barras.reduce((s, b) => s + b.total, 0);
  const recentes = totais?.recentes ?? [];
  const periodoVazio = totais !== null && totais.totalAtendimentos === 0;

  const taxaNum = totais?.taxaComparecimento !== null && totais?.taxaComparecimento !== undefined
    ? Math.round(totais.taxaComparecimento)
    : null;
  const circunferencia = 2 * Math.PI * 24;
  const offsetAnel = taxaNum !== null ? circunferencia * (1 - taxaNum / 100) : circunferencia;

  const totalMov = totais
    ? totais.concluidos + totais.agendados + totais.faltas + totais.cancelados
    : 0;
  const pctMov = (qtd: number) => (totalMov > 0 ? Math.round((qtd / totalMov) * 100) : 0);

  return (
    <div className="space-y-8">
      <PageHeader
        titulo={admin ? 'Dashboard da plataforma' : 'Dashboard'}
        descricao={
          admin
            ? 'Faturamento e indicadores operacionais consolidados de toda a plataforma.'
            : 'Faturamento dos atendimentos concluídos e como anda a sua agenda.'
        }
        acoes={
          <div role="radiogroup" aria-label="Período" className="cal-well inline-flex gap-1 rounded-xl p-1">
            {([
              ['mes', 'Este mês'],
              ['30d', 'Últimos 30 dias'],
            ] as const).map(([valor, rotulo]) => {
              const ativo = periodo === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setPeriodo(valor)}
                  className={`h-8 rounded-lg px-3.5 text-xs font-semibold transition-all cursor-pointer ${
                    ativo ? 'cal-raised text-ink-heading' : 'text-muted hover:text-ink-heading'
                  }`}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>
        }
      />

      {admin && (
        <div
          role="status"
          aria-live="polite"
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs font-semibold ${
            carregandoSaude
              ? 'border-rule bg-surface-soft text-muted'
              : saude?.status === 'UP' && saude.database === 'UP'
                ? 'border-rule bg-surface text-ink-heading'
                : 'border-danger/25 bg-danger-soft text-danger'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`size-2 rounded-full ${
                carregandoSaude
                  ? 'bg-faint'
                  : saude?.status === 'UP' && saude.database === 'UP'
                    ? 'bg-toy'
                    : 'bg-danger'
              }`}
            />
            {carregandoSaude && <span>Verificando conexão com a API e PostgreSQL…</span>}
            {!carregandoSaude && saude?.status === 'UP' && saude.database === 'UP' && (
              <span>
                API conectada · PostgreSQL online
                {saude.resumo
                  ? ` (${saude.resumo.servicos} serviços, ${saude.resumo.agendamentos} agendamentos)`
                  : ''}
              </span>
            )}
            {!carregandoSaude && (erroSaude || !(saude?.status === 'UP' && saude?.database === 'UP')) && (
              <span>API offline · Verifique se o backend Spring Boot e o PostgreSQL estão em execução.</span>
            )}
          </div>
          {!carregandoSaude && (erroSaude || !(saude?.status === 'UP' && saude?.database === 'UP')) && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={recarregarSaude}>
              <ArrowsClockwise className="size-3.5" aria-hidden />
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {erro ? (
        <div role="alert" className="cal-card space-y-3 border-danger/25 bg-danger-soft p-6 text-sm text-danger">
          <p className="font-bold">Não foi possível gerar os números do dashboard.</p>
          <p>{erro}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={recarregar}>
            <ArrowsClockwise className="size-3.5" aria-hidden />
            Tentar novamente
          </button>
        </div>
      ) : carregando && !totais ? (
        <SkeletonDashboard />
      ) : (
        totais && (
          <>
            {/* Bento KPIs monocromático estilo Cal.com */}
            <section aria-label="Indicadores" className="grid gap-4 lg:grid-cols-[1.45fr_1.15fr_repeat(3,0.8fr)]">
              <div className="cal-card anim-in flex flex-col justify-between gap-3 p-5" style={{ ['--i' as string]: 0 }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted">Faturamento</span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-toy-soft px-2 py-0.5 text-[11px] font-semibold text-toy-ink">
                    <span className="size-1.5 rounded-full bg-toy" aria-hidden />
                    Concluídos
                  </span>
                </div>
                <div>
                  <p className="font-mono-num text-3xl font-bold tracking-tight text-ink-heading sm:text-4xl">
                    {moeda(totais.faturamentoTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted">Soma exclusiva dos atendimentos concluídos</p>
                </div>
              </div>

              <div
                className="cal-card anim-in flex items-center justify-between gap-3 p-5"
                style={{ ['--i' as string]: 1 }}
              >
                <div>
                  <span className="text-xs font-medium text-muted">Comparecimento</span>
                  <p className="font-mono-num mt-1 text-3xl font-bold tracking-tight text-ink-heading">
                    {taxaNum === null ? '—' : `${taxaNum}%`}
                  </p>
                  <p className="font-mono-num mt-0.5 text-xs text-muted">
                    {totais.faltas} {totais.faltas === 1 ? 'falta' : 'faltas'}
                  </p>
                </div>
                <svg className="size-16 shrink-0 -rotate-90" viewBox="0 0 60 60" aria-hidden>
                  <circle cx="30" cy="30" r="24" fill="none" stroke="var(--color-plate)" strokeWidth="5" />
                  <circle
                    cx="30"
                    cy="30"
                    r="24"
                    fill="none"
                    stroke="var(--color-toy)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circunferencia}
                    strokeDashoffset={offsetAnel}
                  />
                </svg>
              </div>

              {[
                { rotulo: 'Atendimentos concluídos', valor: totais.concluidos, detalhe: 'faturados' },
                { rotulo: 'Agendados a seguir', valor: totais.agendadosFuturos, detalhe: 'na agenda' },
                { rotulo: 'Cancelamentos', valor: totais.cancelados, detalhe: 'sem cobrança' },
              ].map((item, idx) => (
                <div
                  key={item.rotulo}
                  className="cal-card anim-in flex flex-col justify-between p-5"
                  style={{ ['--i' as string]: idx + 2 }}
                >
                  <span className="text-xs font-medium text-muted">{item.rotulo}</span>
                  <div className="mt-2">
                    <p className="font-mono-num text-2xl font-bold text-ink-heading">{item.valor}</p>
                    <p className="font-mono-num mt-0.5 text-xs text-faint">{item.detalhe}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* Barra empilhada de saúde da agenda */}
            {totalMov > 0 && (
              <section aria-label="Saúde da agenda" className="cal-card anim-in space-y-3 p-5" style={{ ['--i' as string]: 3 }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-ink-heading">
                    Saúde da agenda ({totalMov} {totalMov === 1 ? 'registro' : 'registros'})
                  </h2>
                  <div className="font-mono-num flex flex-wrap gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-toy" aria-hidden />
                      Concluídos {pctMov(totais.concluidos)}%
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-accent" aria-hidden />
                      Agendados {pctMov(totais.agendados)}%
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-faltou" aria-hidden />
                      Faltas {pctMov(totais.faltas)}%
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-slot" aria-hidden />
                      Cancelados {pctMov(totais.cancelados)}%
                    </span>
                  </div>
                </div>
                <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-plate" aria-hidden>
                  {totais.concluidos > 0 && (
                    <div
                      className="anim-bar h-full bg-toy"
                      style={{ width: `${(totais.concluidos / totalMov) * 100}%`, ['--i' as string]: 0 }}
                    />
                  )}
                  {totais.agendados > 0 && (
                    <div
                      className="anim-bar h-full bg-accent"
                      style={{ width: `${(totais.agendados / totalMov) * 100}%`, ['--i' as string]: 1 }}
                    />
                  )}
                  {totais.faltas > 0 && (
                    <div
                      className="anim-bar h-full bg-faltou"
                      style={{ width: `${(totais.faltas / totalMov) * 100}%`, ['--i' as string]: 2 }}
                    />
                  )}
                  {totais.cancelados > 0 && (
                    <div
                      className="anim-bar h-full bg-slot"
                      style={{ width: `${(totais.cancelados / totalMov) * 100}%`, ['--i' as string]: 3 }}
                    />
                  )}
                </div>
              </section>
            )}

            {periodoVazio && (
              <p role="status" className="rounded-xl border border-rule bg-surface-soft px-4 py-3 text-sm text-muted">
                Não houve atendimentos registrados neste período.
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-labelledby="titulo-por-item" className="cal-card anim-in p-5" style={{ ['--i' as string]: 4 }}>
                <h2 id="titulo-por-item" className="text-base font-bold text-ink-heading">
                  {admin ? 'Faturamento por profissional' : 'Faturamento por serviço'}
                </h2>
                {barras.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    Os valores aparecem aqui assim que houver atendimentos no período.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {barras.map((item, idx) => {
                      const pctParticipacao = somaBarras > 0 ? Math.round((item.total / somaBarras) * 100) : 0;
                      return (
                        <li
                          key={item.chave}
                          title={`${item.nome}: ${moeda(item.total)} em ${item.qtd} atendimentos`}
                        >
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-ink-heading">{item.nome}</span>
                            <span className="font-mono-num shrink-0 text-xs font-bold text-ink-heading">
                              {moeda(item.total)}{' '}
                              <span className="font-normal text-muted">
                                · {item.qtd} ({pctParticipacao}%)
                              </span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-plate" aria-hidden>
                            <div
                              className={`anim-bar h-full rounded-full ${idx === 0 ? 'bg-accent' : 'bg-ink'}`}
                              style={{ width: `${(item.total / maiorBarra) * 100}%`, ['--i' as string]: idx }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section
                aria-labelledby="titulo-recentes"
                className="cal-card anim-in overflow-hidden"
                style={{ ['--i' as string]: 5 }}
              >
                <h2 id="titulo-recentes" className="p-5 pb-3 text-base font-bold text-ink-heading">
                  Últimos atendimentos faturados
                </h2>
                {recentes.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">Nenhum atendimento concluído no período.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-rule font-mono-num text-[11px] uppercase tracking-wider text-faint">
                        <th scope="col" className="py-2.5 pl-5 font-medium">
                          Data
                        </th>
                        <th scope="col" className="px-3 py-2.5 font-medium">
                          Cliente / Serviço
                        </th>
                        <th scope="col" className="py-2.5 pr-5 text-right font-medium">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      {recentes.map((a) => (
                        <tr key={a.id} className="transition-colors hover:bg-surface-soft/70">
                          <td className="font-mono-num py-3 pl-5 text-xs text-muted">
                            {dataCurta(a.dataHoraInicio)}, {hora(a.dataHoraInicio)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-plate text-[11px] font-bold text-ink-heading">
                                {iniciaisDe(a.clienteNome)}
                              </span>
                              <div className="min-w-0">
                                <span className="block truncate font-medium text-ink-heading">{a.clienteNome}</span>
                                <span className="block truncate text-xs text-muted">
                                  {admin ? `${a.servicoNome} · ${a.profissionalNome}` : a.servicoNome}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="font-mono-num py-3 pr-5 text-right text-xs font-bold text-ink-heading">
                            {moeda(a.preco)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}
