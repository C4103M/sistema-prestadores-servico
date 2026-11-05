import { useEffect, useState } from 'react';
import { AppShell, NAV } from './components/AppShell';
import { InicioPage } from './pages/InicioPage';
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
  saveAgendamentos,
  saveDisponibilidades,
  saveServicos,
} from './services/storage';
import type { Agendamento, Area, Disponibilidade, Servico, StatusAgendamento, Tela } from './types';

const TELAS = Object.values(NAV).flatMap((itens) => itens.map((i) => i.tela));

// Rotas por ator: #/cliente/..., #/profissional/..., #/admin/...  (#/ é a escolha da área)
const telaDoHash = (): Tela | null => {
  const t = window.location.hash.replace(/^#\/?/, '');
  if (TELAS.includes(t as Tela)) return t as Tela;
  // #/cliente, #/profissional e #/admin abrem a primeira tela da área
  if (t in NAV) return NAV[t as Area][0].tela;
  return null;
};

const areaDa = (tela: Tela) => tela.split('/')[0] as Area;

export function App() {
  const [tela, setTela] = useState<Tela | null>(telaDoHash);
  const [servicos, setServicos] = useState<Servico[]>(getServicos);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(getAgendamentos);
  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>(getDisponibilidades);

  useEffect(() => {
    const aoMudar = () => {
      setTela(telaDoHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const navegar = (destino: Tela) => {
    window.location.hash = `/${destino}`;
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
  const excluirServico = (id: number) => atualizarServicos(servicos.filter((s) => s.id !== id));
  const alternarServico = (id: number) =>
    atualizarServicos(servicos.map((s) => (s.id === id ? { ...s, ativo: !s.ativo } : s)));

  const salvarFaixa = (f: Disponibilidade) =>
    atualizarDisponibilidades(
      disponibilidades.some((x) => x.id === f.id)
        ? disponibilidades.map((x) => (x.id === f.id ? f : x))
        : [...disponibilidades, f]
    );

  // RN06: só agendamentos AGENDADO mudam de estado
  const mudarStatus = (id: number, status: StatusAgendamento) =>
    atualizarAgendamentos(agendamentos.map((a) => (a.id === id && a.status === 'AGENDADO' ? { ...a, status } : a)));


  if (tela === null) return <InicioPage />;

  return (
    <AppShell area={areaDa(tela)} tela={tela} onNavegar={navegar}>
      {tela === 'cliente/buscar' && (
        <HomePage
          servicos={servicos}
          agendamentos={agendamentos}
          disponibilidades={disponibilidades}
          onCriarAgendamento={(novo) => atualizarAgendamentos([...agendamentos, novo])}
          onVerAgendamentos={() => navegar('cliente/agendamentos')}
        />
      )}
      {tela === 'cliente/agendamentos' && (
        <MeusAgendamentosPage
          agendamentos={agendamentos}
          onCancelar={(id) => mudarStatus(id, 'CANCELADO')}
          onAgendar={() => navegar('cliente/buscar')}
        />
      )}
      {tela === 'profissional/agenda' && (
        <AgendaPage agendamentos={agendamentos} disponibilidades={disponibilidades} onAtualizarStatus={mudarStatus} />
      )}
      {(tela === 'profissional/servicos' || tela === 'admin/servicos') && (
        <ServicosPage
          key={tela}
          area={areaDa(tela) as 'profissional' | 'admin'}
          servicos={servicos}
          agendamentos={agendamentos}
          onSalvar={salvarServico}
          onExcluir={excluirServico}
          onAlternarAtivo={alternarServico}
        />
      )}
      {tela === 'profissional/disponibilidade' && (
        <DisponibilidadePage
          disponibilidades={disponibilidades}
          onSalvar={salvarFaixa}
          onExcluir={(id) => atualizarDisponibilidades(disponibilidades.filter((d) => d.id !== id))}
        />
      )}
      {(tela === 'profissional/dashboard' || tela === 'admin/dashboard') && (
        <DashboardPage key={tela} area={areaDa(tela) as 'profissional' | 'admin'} agendamentos={agendamentos} />
      )}
    </AppShell>
  );
}

export default App;
