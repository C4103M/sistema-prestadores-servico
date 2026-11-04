import { useEffect, useState } from 'react';
import { AppShell, NAV } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { MeusAgendamentosPage } from './pages/MeusAgendamentosPage';
import { AgendaPage } from './pages/AgendaPage';
import { ServicosPage } from './pages/ServicosPage';
import { DisponibilidadePage } from './pages/DisponibilidadePage';
import { DashboardPage } from './pages/DashboardPage';
import {
  getAgendamentos,
  getDisponibilidades,
  getServicos,
  restaurarDemonstracao,
  saveAgendamentos,
  saveDisponibilidades,
  saveServicos,
} from './services/storage';
import type { Agendamento, Disponibilidade, PapelUsuario, Servico, StatusAgendamento, Tela } from './types';

const TELAS = Object.values(NAV).flatMap((itens) => itens.map((i) => i.tela));

const telaDoHash = (): Tela => {
  const t = window.location.hash.replace(/^#\/?/, '') as Tela;
  return TELAS.includes(t) ? t : 'inicio';
};

const papelDa = (tela: Tela): PapelUsuario =>
  NAV.CLIENTE.some((i) => i.tela === tela) ? 'CLIENTE' : 'PROFISSIONAL';

export function App() {
  const [tela, setTela] = useState<Tela>(telaDoHash);
  const [servicos, setServicos] = useState<Servico[]>(getServicos);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(getAgendamentos);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>(getDisponibilidades);

  useEffect(() => {
    const aoMudar = () => setTela(telaDoHash());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const navegar = (destino: Tela) => {
    window.location.hash = `/${destino}`;
    window.scrollTo({ top: 0 });
  };

  const atualizarServicos = (novos: Servico[]) => {
    setServicos(novos);
    saveServicos(novos);
  };
  const atualizarAgendamentos = (novos: Agendamento[]) => {
    setAgendamentos(novos);
    saveAgendamentos(novos);
  };
  const atualizarDisponibilidades = (novas: Disponibilidade[]) => {
    setDisponibilidades(novas);
    saveDisponibilidades(novas);
  };

  const salvarServico = (s: Servico) =>
    atualizarServicos(servicos.some((x) => x.id === s.id) ? servicos.map((x) => (x.id === s.id ? s : x)) : [...servicos, s]);

  const salvarFaixa = (f: Disponibilidade) =>
    atualizarDisponibilidades(
      disponibilidades.some((x) => x.id === f.id)
        ? disponibilidades.map((x) => (x.id === f.id ? f : x))
        : [...disponibilidades, f]
    );

  // RN06: só agendamentos AGENDADO mudam de estado
  const mudarStatus = (id: number, status: StatusAgendamento) =>
    atualizarAgendamentos(agendamentos.map((a) => (a.id === id && a.status === 'AGENDADO' ? { ...a, status } : a)));

  const restaurar = () => {
    restaurarDemonstracao();
    setServicos(getServicos());
    setAgendamentos(getAgendamentos());
    setDisponibilidades(getDisponibilidades());
  };

  return (
    <AppShell papel={papelDa(tela)} tela={tela} onNavegar={navegar} onRestaurar={restaurar}>
      {tela === 'inicio' && (
        <HomePage
          servicos={servicos}
          agendamentos={agendamentos}
          disponibilidades={disponibilidades}
          onCriarAgendamento={(novo) => atualizarAgendamentos([...agendamentos, novo])}
          onVerAgendamentos={() => navegar('meus-agendamentos')}
        />
      )}
      {tela === 'meus-agendamentos' && (
        <MeusAgendamentosPage
          agendamentos={agendamentos}
          onCancelar={(id) => mudarStatus(id, 'CANCELADO')}
          onAgendar={() => navegar('inicio')}
        />
      )}
      {tela === 'agenda' && (
        <AgendaPage agendamentos={agendamentos} disponibilidades={disponibilidades} onAtualizarStatus={mudarStatus} />
      )}
      {tela === 'servicos' && (
        <ServicosPage
          servicos={servicos}
          agendamentos={agendamentos}
          onSalvar={salvarServico}
          onExcluir={(id) => atualizarServicos(servicos.filter((s) => s.id !== id))}
          onAlternarAtivo={(id) => atualizarServicos(servicos.map((s) => (s.id === id ? { ...s, ativo: !s.ativo } : s)))}
        />
      )}
      {tela === 'disponibilidade' && (
        <DisponibilidadePage
          disponibilidades={disponibilidades}
          onSalvar={salvarFaixa}
          onExcluir={(id) => atualizarDisponibilidades(disponibilidades.filter((d) => d.id !== id))}
        />
      )}
      {tela === 'dashboard' && <DashboardPage agendamentos={agendamentos} />}
    </AppShell>
  );
}

export default App;
