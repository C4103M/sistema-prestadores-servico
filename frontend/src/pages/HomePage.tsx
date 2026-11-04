import { useMemo, useState } from 'react';
import { CalendarCheck2, Clock, Search, X } from 'lucide-react';
import type { Agendamento, Disponibilidade, Servico } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { dataCurta, duracao, hora, moeda } from '../services/formato';
import { faixasDoDia, horariosLivres, temConflito, type Horario } from '../services/horarios';
import { CLIENTE_LOGADO_ID, mockClientes } from '../services/mockData';

interface HomePageProps {
  servicos: Servico[];
  agendamentos: Agendamento[];
  disponibilidades: Disponibilidade[];
  onCriarAgendamento: (novo: Agendamento) => void;
  onVerAgendamentos: () => void;
}

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function HomePage({ servicos, agendamentos, disponibilidades, onCriarAgendamento, onVerAgendamentos }: HomePageProps) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);

  const ativos = servicos.filter((s) => s.ativo);
  const categorias = ['Todas', ...Array.from(new Set(ativos.map((s) => s.categoria)))];

  const filtrados = ativos.filter((s) => {
    const termo = normalizar(busca.trim());
    const casaBusca =
      !termo || [s.nome, s.descricao, s.profissionalNome, s.categoria].some((c) => normalizar(c).includes(termo));
    return casaBusca && (categoria === 'Todas' || s.categoria === categoria);
  });

  const selecionado = ativos.find((s) => s.id === selecionadoId) ?? null;

  const proximo = agendamentos
    .filter((a) => a.clienteId === CLIENTE_LOGADO_ID && a.status === 'AGENDADO' && new Date(a.dataHoraInicio) > new Date())
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))[0];

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Encontre um serviço e marque seu horário"
        descricao="Os horários mostrados já descontam a agenda do profissional: o que aparece aqui está livre de verdade."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section aria-label="Serviços" className="min-w-0 space-y-5">
          <div className="space-y-3">
            <label htmlFor="busca" className="sr-only">
              Buscar serviço ou profissional
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-faint" aria-hidden />
              <input
                id="busca"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por serviço ou profissional, ex.: barba, Beatriz"
                className="input h-12 pl-11 text-[0.9375rem]"
              />
            </div>
            <div role="tablist" aria-label="Categorias" className="flex gap-1.5 overflow-x-auto">
              {categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={categoria === c}
                  onClick={() => setCategoria(c)}
                  className={`h-8 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors duration-150 ${
                    categoria === c
                      ? 'bg-ink text-white'
                      : 'border border-rule-strong bg-surface text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted" aria-live="polite">
            {filtrados.length === 1 ? '1 serviço disponível' : `${filtrados.length} serviços disponíveis`}
          </p>

          {filtrados.length === 0 ? (
            <EmptyState
              titulo="Nenhum serviço encontrado"
              texto="Tente outro termo ou volte para todas as categorias."
              acao={
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setBusca('');
                    setCategoria('Todas');
                  }}
                >
                  Limpar filtros
                </button>
              }
            />
          ) : (
            <ul className="painel divide-y divide-rule overflow-hidden">
              {filtrados.map((s) => {
                const ativo = s.id === selecionadoId;
                return (
                  <li key={s.id} className={`transition-colors duration-150 ${ativo ? 'bg-marker-soft' : ''}`}>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted">
                          {s.categoria} · {s.profissionalNome}
                        </p>
                        <h2 className="mt-0.5 font-semibold text-ink">{s.nome}</h2>
                        <p className="mt-1 line-clamp-1 text-sm text-muted">{s.descricao}</p>
                      </div>
                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <p className="tabular text-[0.9375rem] font-bold">{moeda(s.preco)}</p>
                          <p className="flex items-center justify-end gap-1 text-xs text-muted">
                            <Clock className="size-3.5" aria-hidden />
                            {duracao(s.duracaoMinutos)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelecionadoId(s.id)}
                          aria-pressed={ativo}
                          className={`btn w-32 ${ativo ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {ativo ? 'Selecionado' : 'Ver horários'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="lg:sticky lg:top-10" aria-label="Agendamento">
          {selecionado ? (
            <PainelAgendamento
              key={selecionado.id}
              servico={selecionado}
              agendamentos={agendamentos}
              disponibilidades={disponibilidades}
              onFechar={() => setSelecionadoId(null)}
              onConfirmar={onCriarAgendamento}
              onVerAgendamentos={onVerAgendamentos}
            />
          ) : (
            <div className="painel p-6">
              <h2 className="font-semibold">Escolha um serviço</h2>
              <p className="mt-1 text-sm text-muted">
                Selecione “Ver horários” em um serviço para ver os próximos dias livres do profissional.
              </p>
              {proximo && (
                <div className="mt-5 border-t border-rule pt-5">
                  <p className="text-xs font-semibold text-muted">Seu próximo horário</p>
                  <p className="mt-1 font-semibold">{proximo.servicoNome}</p>
                  <p className="tabular text-sm text-muted">
                    {dataCurta(proximo.dataHoraInicio)} às {hora(proximo.dataHoraInicio)} com {proximo.profissionalNome}
                  </p>
                  <button type="button" className="btn btn-ghost btn-sm mt-3 -ml-3" onClick={onVerAgendamentos}>
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
  agendamentos: Agendamento[];
  disponibilidades: Disponibilidade[];
  onFechar: () => void;
  onConfirmar: (novo: Agendamento) => void;
  onVerAgendamentos: () => void;
}

function PainelAgendamento({
  servico,
  agendamentos,
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

  const livresPorDia = dias.map((d) => horariosLivres(servico, d, disponibilidades, agendamentos));
  const primeiroComHorario = Math.max(0, livresPorDia.findIndex((l) => l.length > 0));

  const [diaIdx, setDiaIdx] = useState(primeiroComHorario);
  const [escolhido, setEscolhido] = useState<Horario | null>(null);
  const [erro, setErro] = useState('');
  const [confirmado, setConfirmado] = useState<Agendamento | null>(null);

  const livres = livresPorDia[diaIdx];
  const atende = faixasDoDia(disponibilidades, servico.profissionalId, dias[diaIdx]).length > 0;

  const grupos = [
    { rotulo: 'Manhã', itens: livres.filter((h) => h.inicio.getHours() < 12) },
    { rotulo: 'Tarde', itens: livres.filter((h) => h.inicio.getHours() >= 12 && h.inicio.getHours() < 18) },
    { rotulo: 'Noite', itens: livres.filter((h) => h.inicio.getHours() >= 18) },
  ].filter((g) => g.itens.length > 0);

  const confirmar = () => {
    if (!escolhido) return;
    // E2: o horário pode ter sido ocupado enquanto o cliente decidia
    if (temConflito(agendamentos, servico.profissionalId, escolhido.inicio, escolhido.fim)) {
      setErro('Este horário acabou de ser ocupado. Escolha outro.');
      setEscolhido(null);
      return;
    }
    const cliente = mockClientes.find((c) => c.id === CLIENTE_LOGADO_ID)!;
    const novo: Agendamento = {
      id: Date.now(),
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      profissionalId: servico.profissionalId,
      profissionalNome: servico.profissionalNome,
      servicoId: servico.id,
      servicoNome: servico.nome,
      dataHoraInicio: escolhido.inicio.toISOString(),
      dataHoraFim: escolhido.fim.toISOString(),
      precoCobrado: servico.preco, // RN05: preço congelado no agendamento
      status: 'AGENDADO',
      criadoEm: new Date().toISOString(),
    };
    onConfirmar(novo);
    setConfirmado(novo);
  };

  if (confirmado) {
    return (
      <div className="painel p-6" role="status">
        <span className="grid size-10 place-items-center rounded-full bg-concluido-soft text-concluido">
          <CalendarCheck2 className="size-5" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-bold">Horário marcado</h2>
        <p className="mt-1 text-sm text-muted">
          {confirmado.servicoNome} com {confirmado.profissionalNome}
        </p>
        <p className="tabular mt-3 font-semibold">
          {dataCurta(confirmado.dataHoraInicio)}, {hora(confirmado.dataHoraInicio)}–{hora(confirmado.dataHoraFim)}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={onVerAgendamentos}>
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
    <div className="painel overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-rule p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">{servico.profissionalNome}</p>
          <h2 className="font-bold">{servico.nome}</h2>
          <p className="tabular text-sm text-muted">
            {duracao(servico.duracaoMinutos)} · {moeda(servico.preco)}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-icon -mt-1 -mr-2" onClick={onFechar} aria-label="Fechar">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <fieldset>
          <legend className="label">Dia</legend>
          <div className="grid grid-cols-7 gap-1">
            {dias.map((d, i) => {
              const sem = livresPorDia[i].length === 0;
              const ativo = i === diaIdx;
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={sem}
                  aria-pressed={ativo}
                  aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}${sem ? ', sem horários' : ''}`}
                  onClick={() => {
                    setDiaIdx(i);
                    setEscolhido(null);
                    setErro('');
                  }}
                  className={`flex h-14 flex-col items-center justify-center rounded-lg text-xs transition-colors duration-150 ${
                    ativo
                      ? 'bg-ink text-white'
                      : sem
                        ? 'text-faint line-through decoration-faint/60'
                        : 'text-ink hover:bg-ink-soft'
                  }`}
                >
                  <span className={ativo ? 'text-white/75' : 'text-muted'}>
                    {i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                  </span>
                  <span className="tabular text-base font-bold">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Horários livres</legend>
          {livres.length === 0 ? (
            <p className="rounded-lg bg-paper p-4 text-sm text-muted">
              {atende
                ? 'A agenda deste dia já está cheia. Escolha outro dia.'
                : `${servico.profissionalNome} não atende neste dia.`}
            </p>
          ) : (
            <div className="space-y-3">
              {grupos.map((g) => (
                <div key={g.rotulo}>
                  <p className="mb-1.5 text-xs text-muted">{g.rotulo}</p>
                  <div className="grid grid-cols-4 gap-1.5">
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
                          className={`tabular h-9 rounded-md text-sm font-semibold transition-colors duration-150 ${
                            ativo
                              ? 'bg-marker text-ink ring-1 ring-ink'
                              : 'border border-rule text-ink hover:border-ink'
                          }`}
                        >
                          {hora(h.inicio)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {erro && (
            <p className="erro-campo" role="alert">
              {erro}
            </p>
          )}
        </fieldset>
      </div>

      <div className="border-t border-rule bg-paper p-5">
        {escolhido ? (
          <dl className="tabular mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Quando</dt>
            <dd className="text-right font-semibold">
              {dataCurta(escolhido.inicio)}, {hora(escolhido.inicio)}–{hora(escolhido.fim)}
            </dd>
            <dt className="text-muted">Valor</dt>
            <dd className="text-right font-semibold">{moeda(servico.preco)}</dd>
          </dl>
        ) : (
          <p className="mb-4 text-sm text-muted">Escolha um horário para ver o resumo.</p>
        )}
        <button type="button" className="btn btn-primary w-full" disabled={!escolhido} onClick={confirmar}>
          Confirmar agendamento
        </button>
        <p className="mt-2 text-center text-xs text-muted">O valor fica garantido mesmo se o preço mudar depois.</p>
      </div>
    </div>
  );
}
