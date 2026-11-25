import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { AppShell, NAV } from './components/AppShell';
import { InicioPage } from './pages/InicioPage';
import { LoginPage } from './pages/LoginPage';
import { CadastroPage } from './pages/CadastroPage';
import { HomePage } from './pages/HomePage';
import { MeusAgendamentosPage } from './pages/MeusAgendamentosPage';
import { AgendaPage } from './pages/AgendaPage';
import { ServicosPage } from './pages/ServicosPage';
import { DisponibilidadePage } from './pages/DisponibilidadePage';
import { DashboardPage } from './pages/DashboardPage';
import { useAuth } from './context/AuthContext';
import { ApiError, api } from './services/api';
import { areaDoPapel, telaInicial, type Sessao } from './services/sessao';
import type {
  Agendamento,
  Area,
  Disponibilidade,
  Profissional,
  Servico,
  StatusAgendamento,
  Tela,
} from './types';

const TELAS = Object.values(NAV).flatMap((itens) => itens.map((i) => i.tela));

// Rotas: #/ (início), #/login, #/cadastro e, por ator, #/cliente/..., #/profissional/..., #/admin/...
const hashAtual = () => window.location.hash.replace(/^#\/?/, '');

const telaDe = (hash: string): Tela | null => {
  if (TELAS.includes(hash as Tela)) return hash as Tela;
  // #/cliente, #/profissional e #/admin abrem a primeira tela da área
  if (Object.hasOwn(NAV, hash)) return NAV[hash as Area][0].tela;
  return null;
};

const areaDa = (tela: Tela) => tela.split('/')[0] as Area;

const mensagemDeErro = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

export function App() {
  const { sessao } = useAuth();
  const [hash, setHash] = useState(hashAtual);

  useEffect(() => {
    const aoMudar = () => {
      setHash(hashAtual());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const tela = telaDe(hash);

  // Guarda de rota: área restrita exige login e cada perfil só entra na própria área
  let redirecionar: string | null = null;
  if (hash === 'login' || hash === 'cadastro') {
    if (sessao) redirecionar = telaInicial(sessao.papel);
  } else if (tela !== null) {
    if (!sessao) redirecionar = 'login';
    else if (areaDa(tela) !== areaDoPapel(sessao.papel)) redirecionar = telaInicial(sessao.papel);
  }

  useEffect(() => {
    if (redirecionar) window.location.hash = `/${redirecionar}`;
  }, [redirecionar]);

  if (redirecionar) return null;
  if (hash === 'login') return <LoginPage />;
  if (hash === 'cadastro') return <CadastroPage />;
  if (tela === null || !sessao) return <InicioPage />;

  // key: ao trocar de usuário, os dados carregados do anterior são descartados
  return <AreaLogada key={sessao.usuarioId} sessao={sessao} tela={tela} />;
}

function AreaLogada({ sessao, tela }: { sessao: Sessao; tela: Tela }) {
  const area = areaDa(tela);
  const perfilId = sessao.perfilId ?? 0;

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [erroApi, setErroApi] = useState('');

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErroApi('');
    try {
      if (sessao.papel === 'CLIENTE') {
        const [profs, listaServicos, meus] = await Promise.all([
          api.cliente.buscarProfissionais(),
          api.cliente.buscarServicos(),
          api.cliente.listarAgendamentos(perfilId),
        ]);
        const listasDisp = await Promise.all(
          profs.map((p) => api.cliente.listarDisponibilidades(p.id))
        );
        setProfissionais(profs);
        setServicos(listaServicos);
        setAgendamentos(meus);
        setDisponibilidades(listasDisp.flat());
      } else if (sessao.papel === 'PROFISSIONAL') {
        const [meusServicos, agenda, faixas] = await Promise.all([
          api.profissional.listarServicos(perfilId),
          api.profissional.listarAgenda(perfilId),
          api.profissional.listarDisponibilidades(perfilId),
        ]);
        setServicos(meusServicos);
        setAgendamentos(agenda);
        setDisponibilidades(faixas);
      } else {
        const [profs, listaServicos, listaAgendamentos] = await Promise.all([
          api.admin.listarProfissionais(),
          api.admin.listarServicos(),
          api.admin.listarAgendamentos(),
        ]);
        setProfissionais(profs);
        setServicos(listaServicos);
        setAgendamentos(listaAgendamentos);
      }
      setCarregado(true);
    } catch (err) {
      setErroApi(mensagemDeErro(err, 'Não foi possível carregar os dados da API.'));
    } finally {
      setCarregando(false);
    }
  }, [sessao.papel, perfilId]);

  useEffect(() => {
    if (!carregado) {
      void carregarDados();
    }
  }, [carregado, carregarDados]);

  const navegar = (destino: Tela) => {
    window.location.hash = `/${destino}`;
  };

  const salvarServico = async (s: Servico) => {
    setErroApi('');
    const existente = servicos.some((x) => x.id === s.id);
    const payload = {
      nome: s.nome,
      descricao: s.descricao,
      categoria: s.categoria,
      duracaoMinutos: s.duracaoMinutos,
      preco: s.preco,
      ativo: s.ativo,
      profissionalId: s.profissionalId,
    };
    try {
      const salvo = existente
        ? area === 'admin'
          ? await api.admin.atualizarServico(s.id, payload)
          : await api.profissional.atualizarServico(perfilId, s.id, payload)
        : area === 'admin'
          ? await api.admin.criarServico(payload)
          : await api.profissional.criarServico(perfilId, payload);

      setServicos((prev) => (existente ? prev.map((x) => (x.id === salvo.id ? salvo : x)) : [...prev, salvo]));
    } catch (err) {
      setErroApi(mensagemDeErro(err, 'Não foi possível salvar o serviço.'));
      throw err;
    }
  };

  const excluirServico = async (id: number) => {
    setErroApi('');
    try {
      if (area === 'admin') {
        await api.admin.excluirServico(id);
      } else {
        await api.profissional.excluirServico(perfilId, id);
      }
      setServicos((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setErroApi(mensagemDeErro(err, 'Não foi possível excluir o serviço.'));
      throw err;
    }
  };

  const alternarServico = async (id: number) => {
    setErroApi('');
    try {
      if (area === 'admin') {
        await api.admin.alternarStatusServico(id);
      } else {
        await api.profissional.alternarStatusServico(perfilId, id);
      }
      setServicos((prev) => prev.map((s) => (s.id === id ? { ...s, ativo: !s.ativo } : s)));
    } catch (err) {
      setErroApi(mensagemDeErro(err, 'Não foi possível atualizar a situação do serviço.'));
    }
  };

  const salvarFaixa = async (f: Disponibilidade) => {
    setErroApi('');
    const existente = disponibilidades.some((x) => x.id === f.id);
    const payload = {
      diaSemana: f.diaSemana,
      horaInicio: f.horaInicio,
      horaFim: f.horaFim,
      profissionalId: f.profissionalId,
    };
    try {
      const salva = existente
        ? await api.profissional.atualizarDisponibilidade(perfilId, f.id, payload)
        : await api.profissional.criarDisponibilidade(perfilId, payload);
      setDisponibilidades((prev) =>
        existente ? prev.map((x) => (x.id === salva.id ? salva : x)) : [...prev, salva]
      );
    } catch (err) {
      setErroApi(mensagemDeErro(err, 'Não foi possível salvar a faixa de disponibilidade.'));
      throw err;
    }
  };

  const excluirFaixa = async (id: number) => {
    setErroApi('');
    try {
      await api.profissional.excluirDisponibilidade(perfilId, id);
      setDisponibilidades((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setErroApi(mensagemDeErro(err, 'Não foi possível remover a faixa de disponibilidade.'));
      throw err;
    }
  };

  const criarAgendamento = async (novo: Agendamento): Promise<Agendamento> => {
    setErroApi('');
    const salvo = await api.cliente.criarAgendamento(perfilId, {
      profissionalId: novo.profissionalId,
      servicoId: novo.servicoId,
      dataHoraInicio: novo.dataHoraInicio,
    });
    setAgendamentos((prev) => [salvo, ...prev]);
    return salvo;
  };

  // RN06: só agendamentos AGENDADO mudam de estado
  const mudarStatus = async (id: number, status: StatusAgendamento) => {
    const atual = agendamentos.find((a) => a.id === id);
    if (!atual || atual.status !== 'AGENDADO') return;
    setErroApi('');
    try {
      let atualizado: Agendamento;
      if (status === 'CANCELADO') {
        atualizado =
          area === 'cliente'
            ? await api.cliente.cancelarAgendamento(atual.clienteId, id)
            : await api.profissional.cancelarAgendamento(atual.profissionalId, id);
      } else if (status === 'CONCLUIDO') {
        atualizado = await api.profissional.concluirAgendamento(atual.profissionalId, id);
      } else if (status === 'FALTOU') {
        atualizado = await api.profissional.marcarFalta(atual.profissionalId, id);
      } else {
        return;
      }
      setAgendamentos((prev) => prev.map((a) => (a.id === id ? atualizado : a)));
    } catch (err) {
      setErroApi(mensagemDeErro(err, 'Não foi possível atualizar o agendamento.'));
      if (status === 'CANCELADO') throw err;
    }
  };

  return (
    <AppShell area={area} tela={tela} onNavegar={navegar}>
      {erroApi && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/25 bg-faltou-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          <span>{erroApi}</span>
          <div className="flex items-center gap-2">
            {!carregado && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void carregarDados()}>
                <RefreshCw className="size-3.5" aria-hidden />
                Tentar novamente
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-icon -my-1 -mr-2"
              aria-label="Fechar alerta"
              onClick={() => setErroApi('')}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {carregando && !carregado ? (
        <div role="status" className="painel p-8 text-center text-sm font-medium text-muted">
          Carregando dados do servidor…
        </div>
      ) : (
        <>
          {tela === 'cliente/buscar' && (
            <HomePage
              clienteId={perfilId}
              clienteNome={sessao.nome}
              servicos={servicos}
              agendamentos={agendamentos}
              disponibilidades={disponibilidades}
              profissionais={profissionais}
              onCriarAgendamento={criarAgendamento}
              onVerAgendamentos={() => navegar('cliente/agendamentos')}
            />
          )}
          {tela === 'cliente/agendamentos' && (
            <MeusAgendamentosPage
              clienteId={perfilId}
              agendamentos={agendamentos}
              onCancelar={(id) => mudarStatus(id, 'CANCELADO')}
              onAgendar={() => navegar('cliente/buscar')}
            />
          )}
          {tela === 'profissional/agenda' && (
            <AgendaPage
              profissionalId={perfilId}
              agendamentos={agendamentos}
              disponibilidades={disponibilidades}
              onAtualizarStatus={(id, status) => mudarStatus(id, status)}
            />
          )}
          {(tela === 'profissional/servicos' || tela === 'admin/servicos') && (
            <ServicosPage
              key={tela}
              area={area as 'profissional' | 'admin'}
              profissionalId={area === 'profissional' ? perfilId : undefined}
              servicos={servicos}
              agendamentos={agendamentos}
              profissionais={profissionais}
              onSalvar={salvarServico}
              onExcluir={excluirServico}
              onAlternarAtivo={alternarServico}
            />
          )}
          {tela === 'profissional/disponibilidade' && (
            <DisponibilidadePage
              profissionalId={perfilId}
              disponibilidades={disponibilidades}
              onSalvar={salvarFaixa}
              onExcluir={excluirFaixa}
            />
          )}
          {(tela === 'profissional/dashboard' || tela === 'admin/dashboard') && (
            <DashboardPage
              key={tela}
              area={area as 'profissional' | 'admin'}
              profissionalId={area === 'profissional' ? perfilId : undefined}
            />
          )}
        </>
      )}
    </AppShell>
  );
}

export default App;
