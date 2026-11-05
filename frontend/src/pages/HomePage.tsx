import { useMemo, useState } from 'react';
import { CalendarCheck2, ChevronDown, Clock, Search, X } from 'lucide-react';
import type { Agendamento, Disponibilidade, Servico } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { dataCurta, duracao, hora, moeda } from '../services/formato';
import { faixasDoDia, horariosLivres, temConflito, type Horario } from '../services/horarios';
import { CLIENTE_LOGADO_ID, mockClientes, mockProfissionais } from '../services/mockData';

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
  const [modo, setModo] = useState<'servico' | 'profissional'>('servico');
  const [profissionalAbertoId, setProfissionalAbertoId] = useState<number | null>(null);

  const trocarModo = (m: 'servico' | 'profissional') => {
    setModo(m);
    setBusca('');
    setProfissionalAbertoId(null);
  };

  const ativos = servicos.filter((s) => s.ativo);
  const categorias = ['Todas', ...Array.from(new Set(ativos.map((s) => s.categoria)))];

  const termo = normalizar(busca.trim());
  const naCategoria = (s: Servico) => categoria === 'Todas' || s.categoria === categoria;

  // Busca por serviço: nome, descrição ou categoria do serviço
  const filtrados = ativos.filter(
    (s) => naCategoria(s) && (!termo || [s.nome, s.descricao, s.categoria].some((c) => normalizar(c).includes(termo)))
  );

  // Busca por profissional: nome ou especialidade; mostra só quem tem serviço ativo na categoria
  const profissionais = mockProfissionais
    .filter((p) => !termo || [p.nome, p.especialidade].some((c) => normalizar(c).includes(termo)))
    .map((p) => ({ ...p, servicos: ativos.filter((s) => s.profissionalId === p.id && naCategoria(s)) }))
    .filter((p) => p.servicos.length > 0);

  const selecionado = ativos.find((s) => s.id === selecionadoId) ?? null;

  const linhaServico = (s: Servico, comProfissional: boolean) => {
    const ativo = s.id === selecionadoId;
    return (
                  <li key={s.id} className={`transition-colors duration-150 ${ativo ? 'bg-marker-soft' : ''}`}>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted">
                          {comProfissional ? `${s.categoria} · ${s.profissionalNome}` : s.categoria}
                        </p>
                        <h2 className="mt-0.5 font-semibold text-ink">{s.nome}</h2>
                        <p className="mt-1 line-clamp-1 text-sm text-muted">{s.descricao}</p>
                      </div>
                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="sm:text-right">
                          <p className="tabular text-[0.9375rem] font-bold">{moeda(s.preco)}</p>
                          <p className="flex items-center gap-1 text-xs text-muted sm:justify-end">
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
    .filter((a) => a.clienteId === CLIENTE_LOGADO_ID && a.status === 'AGENDADO' && new Date(a.dataHoraInicio) > new Date())
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))[0];

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Encontre um serviço ou profissional"
        descricao="Os horários mostrados já descontam a agenda do profissional: o que aparece aqui está livre de verdade."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section aria-label="Busca" className="min-w-0 space-y-5">
          <div className="space-y-3">
            <div role="radiogroup" aria-label="Buscar por" className="inline-grid grid-cols-2 rounded-lg bg-ink-soft p-1">
              {([
                ['servico', 'Serviço'],
                ['profissional', 'Profissional'],
              ] as const).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={modo === valor}
                  onClick={() => trocarModo(valor)}
                  className={`h-8 rounded-md px-4 text-[0.8125rem] font-semibold transition-colors duration-150 ${
                    modo === valor ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <label htmlFor="busca" className="sr-only">
              {modo === 'servico' ? 'Buscar serviço' : 'Buscar profissional'}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-faint" aria-hidden />
              <input
                id="busca"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={modo === 'servico' ? 'Nome do serviço, ex.: corte, limpeza de pele' : 'Nome ou especialidade, ex.: Beatriz, elétrica'}
                className="input h-12 pl-11 text-[0.9375rem]"
              />
            </div>
            <div role="tablist" aria-label="Categorias" className="flex gap-2 overflow-x-auto pt-1 pb-1">
              {categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={categoria === c}
                  onClick={() => setCategoria(c)}
                  className={`h-8 shrink-0 rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors duration-150 ${
                    categoria === c ? 'border-ink bg-ink text-white' : 'border-rule-strong bg-surface text-muted hover:border-ink hover:text-ink'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm font-semibold text-muted tabular-nums" aria-live="polite">
            {modo === 'servico'
              ? filtrados.length === 1 ? '1 serviço encontrado' : `${filtrados.length} serviços encontrados`
              : profissionais.length === 1 ? '1 profissional encontrado' : `${profissionais.length} profissionais encontrados`}
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
            <ul className="painel divide-y divide-rule overflow-hidden">
              {filtrados.map((s) => linhaServico(s, true))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {profissionais.map((p) => {
                const aberto = profissionalAbertoId === p.id;
                return (
                  <li key={p.id} className="painel overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={aberto}
                      aria-controls={`servicos-prof-${p.id}`}
                      onClick={() => setProfissionalAbertoId(aberto ? null : p.id)}
                      className="flex w-full items-center gap-4 p-4 text-left transition-colors duration-150 hover:bg-paper sm:p-5"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-marker-soft text-sm font-bold text-marker-2">
                        {p.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{p.nome}</span>
                        <span className="block text-sm text-muted">
                          {p.especialidade} · {p.servicos.length === 1 ? '1 serviço' : `${p.servicos.length} serviços`}
                        </span>
                      </span>
                      <ChevronDown
                        className={`size-5 shrink-0 text-muted transition-transform duration-150 ${aberto ? 'rotate-180' : ''}`}
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

        <aside className="lg:sticky lg:top-12" aria-label="Agendamento">
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
                <div className="comprovante mt-5 p-4">
                  <p className="text-xs font-semibold text-muted">Seu próximo horário</p>
                  <p className="mt-1.5 font-sans font-bold">{proximo.servicoNome}</p>
                  <p className="tabular mt-0.5 text-xs text-muted">
                    {dataCurta(proximo.dataHoraInicio)} às {hora(proximo.dataHoraInicio)} com {proximo.profissionalNome}
                  </p>
                  <button type="button" className="btn btn-ghost btn-sm mt-3 -ml-3 font-sans" onClick={onVerAgendamentos}>
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
      preco: servico.preco, // RN05: preço congelado no agendamento
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
          <CalendarCheck2 className="size-5" strokeWidth={2.25} aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-bold">Horário marcado</h2>
        <div className="comprovante mt-4 text-sm">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 text-xs">
            <span className="font-semibold text-muted">Agendamento #{String(confirmado.id).slice(-4)}</span>
            <span className="font-semibold text-concluido">Confirmado</span>
          </div>
          <dl className="tabular picote grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 py-3">
            <dt className="text-muted">Serviço</dt>
            <dd className="text-right font-semibold">{confirmado.servicoNome}</dd>
            <dt className="text-muted">Com</dt>
            <dd className="text-right font-semibold">{confirmado.profissionalNome}</dd>
            <dt className="text-muted">Quando</dt>
            <dd className="text-right font-semibold">
              {dataCurta(confirmado.dataHoraInicio)}, {hora(confirmado.dataHoraInicio)}–{hora(confirmado.dataHoraFim)}
            </dd>
          </dl>
          <div className="picote flex items-baseline justify-between px-4 py-3">
            <span className="text-xs text-muted">Preço garantido</span>
            <span className="font-bold">Total {moeda(confirmado.preco)}</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5">
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
          <h2 className="text-lg font-bold">{servico.nome}</h2>
          <p className="tabular mt-0.5 text-xs text-muted">
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
                  className={`flex h-14 flex-col items-center justify-center rounded-lg border text-xs transition-colors duration-150 ${
                    ativo
                      ? 'border-ink bg-ink text-white'
                      : sem
                        ? 'border-transparent text-faint line-through decoration-faint/60'
                        : 'border-transparent text-ink hover:bg-ink-soft'
                  }`}
                >
                  <span className={ativo ? 'text-white/80' : 'text-muted'}>
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
                  <p className="mb-1.5 text-xs font-semibold text-muted">{g.rotulo}</p>
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
                          className={`tabular h-9 rounded-md border text-sm font-semibold transition-colors duration-150 ${
                            ativo
                              ? 'border-marker bg-marker text-white'
                              : 'border-rule bg-surface text-ink hover:border-ink'
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
          <dl className="tabular mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <dt className="text-muted">Quando</dt>
            <dd className="text-right font-semibold">
              {dataCurta(escolhido.inicio)}, {hora(escolhido.inicio)}–{hora(escolhido.fim)}
            </dd>
            <dt className="picote col-span-2 mt-2 pt-2 sr-only">Total</dt>
            <dd className="picote col-span-2 mt-2 flex items-baseline justify-between pt-2">
              <span className="text-xs text-muted">Preço garantido</span>
              <span className="font-bold">Total {moeda(servico.preco)}</span>
            </dd>
          </dl>
        ) : (
          <p className="mb-5 text-sm text-muted">Escolha um horário para ver o resumo.</p>
        )}
        <button type="button" className="btn btn-primary w-full" disabled={!escolhido} onClick={confirmar}>
          Confirmar agendamento
        </button>
        <p className="mt-2 text-center text-xs text-muted">O valor fica garantido mesmo se o preço mudar depois.</p>
      </div>
    </div>
  );
}
