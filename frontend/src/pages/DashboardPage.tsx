import { useState } from 'react';
import type { Agendamento, Area } from '../types';
import { PageHeader } from '../components/PageHeader';
import { dataCurta, hora, moeda } from '../services/formato';
import { PROFISSIONAL_LOGADO_ID } from '../services/mockData';

interface DashboardPageProps {
  agendamentos: Agendamento[];
  /** profissional: só os próprios atendimentos; admin: a plataforma inteira, agrupada por profissional */
  area: Extract<Area, 'profissional' | 'admin'>;
}

type Periodo = '30d' | 'mes';

export function DashboardPage({ agendamentos, area }: DashboardPageProps) {
  const admin = area === 'admin';
  const doEscopo = (a: Agendamento) => admin || a.profissionalId === PROFISSIONAL_LOGADO_ID;
  const [periodo, setPeriodo] = useState<Periodo>('30d');

  const agora = new Date();
  const inicioPeriodo =
    periodo === 'mes'
      ? new Date(agora.getFullYear(), agora.getMonth(), 1)
      : new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 29);

  const doPeriodo = agendamentos.filter(
    (a) =>
      doEscopo(a) &&
      new Date(a.dataHoraInicio) >= inicioPeriodo &&
      new Date(a.dataHoraInicio) <= agora
  );

  const concluidos = doPeriodo.filter((a) => a.status === 'CONCLUIDO');
  const faltas = doPeriodo.filter((a) => a.status === 'FALTOU').length;
  const cancelados = doPeriodo.filter((a) => a.status === 'CANCELADO').length;
  // RN04: só atendimentos concluídos entram no faturamento
  const faturamento = concluidos.reduce((s, a) => s + a.preco, 0);
  const comparecimento = concluidos.length + faltas > 0 ? concluidos.length / (concluidos.length + faltas) : null;
  const futuros = agendamentos.filter(
    (a) => doEscopo(a) && a.status === 'AGENDADO' && new Date(a.dataHoraInicio) > agora
  ).length;

  const porServico = Object.values(
    concluidos.reduce<Record<string, { nome: string; total: number; qtd: number }>>((acc, a) => {
      const chave = admin ? a.profissionalNome : a.servicoNome;
      acc[chave] ??= { nome: chave, total: 0, qtd: 0 };
      acc[chave].total += a.preco;
      acc[chave].qtd += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);
  const maior = Math.max(1, ...porServico.map((s) => s.total));

  const recentes = [...concluidos].sort((a, b) => b.dataHoraInicio.localeCompare(a.dataHoraInicio)).slice(0, 8);

  const indicadores = [
    { rotulo: 'Atendimentos concluídos', valor: String(concluidos.length) },
    { rotulo: 'Comparecimento', valor: comparecimento === null ? '—' : `${Math.round(comparecimento * 100)}%`, detalhe: `${faltas} ${faltas === 1 ? 'falta' : 'faltas'}` },
    { rotulo: 'Cancelamentos', valor: String(cancelados) },
    { rotulo: 'Agendados a seguir', valor: String(futuros) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        titulo={admin ? 'Dashboard da plataforma' : 'Dashboard'}
        descricao={
          admin
            ? 'Faturamento e atendimentos de todos os profissionais.'
            : 'Faturamento dos atendimentos concluídos e como anda a sua agenda.'
        }
        acoes={
          <div role="radiogroup" aria-label="Período" className="flex rounded-lg border border-rule-strong bg-surface p-0.5">
            {([
              ['30d', 'Últimos 30 dias'],
              ['mes', 'Este mês'],
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

      <section aria-label="Indicadores" className="painel grid overflow-hidden lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="bg-ink p-5 text-white">
          <p className="text-sm font-semibold text-white/85">Faturamento</p>
          <p className="tabular mt-1 text-3xl font-bold tracking-tight">{moeda(faturamento)}</p>
          <p className="mt-1 text-xs text-white/85">Soma dos atendimentos concluídos</p>
        </div>
        <dl className="contents">
          {indicadores.map((i) => (
            <div key={i.rotulo} className="border-t border-rule p-5 first-of-type:border-t-0 lg:border-t-0 lg:border-l lg:first-of-type:border-l-0">
              <dt className="text-sm text-muted">{i.rotulo}</dt>
              <dd className="tabular mt-1 text-2xl font-bold">{i.valor}</dd>
              {i.detalhe && <dd className="text-xs text-muted">{i.detalhe}</dd>}
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="titulo-por-servico" className="painel p-5">
          <h2 id="titulo-por-servico" className="text-lg font-bold">
            {admin ? 'Faturamento por profissional' : 'Faturamento por serviço'}
          </h2>
          {porServico.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Os valores aparecem aqui assim que houver atendimentos concluídos no período.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {porServico.map((s) => (
                <li key={s.nome} title={`${s.nome}: ${moeda(s.total)} em ${s.qtd} atendimentos`}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{s.nome}</span>
                    <span className="tabular shrink-0 text-[0.8125rem] font-bold">
                      {moeda(s.total)} <span className="font-normal text-muted">· {s.qtd}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-soft" aria-hidden>
                    <div className="h-full rounded-full bg-marker" style={{ width: `${(s.total / maior) * 100}%` }} />
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
    </div>
  );
}
