import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AdminDashboardResponse, Area, DashboardResponse } from '../types';
import { PageHeader } from '../components/PageHeader';
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

export function DashboardPage({ area, profissionalId }: DashboardPageProps) {
  const admin = area === 'admin';
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [profData, setProfData] = useState<DashboardResponse | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboardResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  const recarregar = useCallback(() => {
    setTentativa((t) => t + 1);
  }, []);

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
  const recentes = totais?.recentes ?? [];

  const indicadores = totais
    ? [
        { rotulo: 'Atendimentos concluídos', valor: String(totais.concluidos) },
        {
          rotulo: 'Comparecimento',
          valor: totais.taxaComparecimento === null ? '—' : `${Math.round(totais.taxaComparecimento)}%`,
          detalhe: `${totais.faltas} ${totais.faltas === 1 ? 'falta' : 'faltas'}`,
        },
        { rotulo: 'Cancelamentos', valor: String(totais.cancelados) },
        { rotulo: 'Agendados a seguir', valor: String(totais.agendadosFuturos) },
      ]
    : [];

  const periodoVazio = totais !== null && totais.totalAtendimentos === 0;

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
          <div role="radiogroup" aria-label="Período" className="flex rounded-lg border border-rule-strong bg-surface p-0.5">
            {([
              ['mes', 'Este mês'],
              ['30d', 'Últimos 30 dias'],
            ] as const).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={periodo === valor}
                onClick={() => setPeriodo(valor)}
                className={`h-8 rounded-md px-3 text-[0.8125rem] font-bold transition-colors duration-150 ${
                  periodo === valor ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        }
      />

      {erro ? (
        <div role="alert" className="painel space-y-3 border-danger/25 bg-faltou-soft p-6 text-sm text-danger">
          <p className="font-bold">Não foi possível gerar os números do dashboard.</p>
          <p>{erro}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={recarregar}>
            <RefreshCw className="size-3.5" aria-hidden />
            Tentar novamente
          </button>
        </div>
      ) : carregando && !totais ? (
        <div role="status" className="painel p-8 text-center text-sm font-medium text-muted">
          Carregando indicadores do período…
        </div>
      ) : (
        totais && (
          <>
            <section aria-label="Indicadores" className="painel grid overflow-hidden lg:grid-cols-[1.4fr_repeat(4,1fr)]">
              <div className="bg-ink p-5 text-white">
                <p className="text-sm font-semibold text-white/85">Faturamento</p>
                <p className="tabular mt-1 text-3xl font-bold tracking-tight">{moeda(totais.faturamentoTotal)}</p>
                <p className="mt-1 text-xs text-white/85">Soma dos atendimentos concluídos</p>
              </div>
              <dl className="contents">
                {indicadores.map((i) => (
                  <div
                    key={i.rotulo}
                    className="border-t border-rule p-5 first-of-type:border-t-0 lg:border-t-0 lg:border-l lg:first-of-type:border-l-0"
                  >
                    <dt className="text-sm text-muted">{i.rotulo}</dt>
                    <dd className="tabular mt-1 text-2xl font-bold">{i.valor}</dd>
                    {i.detalhe && <dd className="text-xs text-muted">{i.detalhe}</dd>}
                  </div>
                ))}
              </dl>
            </section>

            {periodoVazio && (
              <p role="status" className="rounded-lg border border-rule bg-paper px-4 py-3 text-sm text-muted">
                Não houve atendimentos registrados neste período.
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-labelledby="titulo-por-item" className="painel p-5">
                <h2 id="titulo-por-item" className="text-lg font-bold">
                  {admin ? 'Faturamento por profissional' : 'Faturamento por serviço'}
                </h2>
                {barras.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    Os valores aparecem aqui assim que houver atendimentos no período.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {barras.map((item) => (
                      <li key={item.chave} title={`${item.nome}: ${moeda(item.total)} em ${item.qtd} atendimentos`}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{item.nome}</span>
                          <span className="tabular shrink-0 text-[0.8125rem] font-bold">
                            {moeda(item.total)} <span className="font-normal text-muted">· {item.qtd}</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-soft" aria-hidden>
                          <div className="h-full rounded-full bg-marker" style={{ width: `${(item.total / maiorBarra) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="titulo-recentes" className="painel overflow-hidden">
                <h2 id="titulo-recentes" className="p-5 pb-3 text-lg font-bold">
                  Últimos atendimentos faturados
                </h2>
                {recentes.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-muted">Nenhum atendimento concluído no período.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Data</th>
                        <th scope="col">Cliente e serviço</th>
                        <th scope="col">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule border-t border-rule">
                      {recentes.map((a) => (
                        <tr key={a.id}>
                          <td className="tabular py-2.5 pl-5 text-xs text-muted">
                            {dataCurta(a.dataHoraInicio)}, {hora(a.dataHoraInicio)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium">{a.clienteNome}</span>
                            <span className="block text-xs text-muted">
                              {admin ? `${a.servicoNome} · ${a.profissionalNome}` : a.servicoNome}
                            </span>
                          </td>
                          <td className="tabular py-2.5 pr-5 text-right text-[0.8125rem] font-bold">{moeda(a.preco)}</td>
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
