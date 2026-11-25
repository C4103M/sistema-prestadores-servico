package com.agendamento.agendamento.service;

import com.agendamento.admin.dto.response.AdminDashboardResponse;
import com.agendamento.agendamento.dto.request.AgendamentoRequest;
import com.agendamento.agendamento.dto.response.AgendamentoResponse;
import com.agendamento.agendamento.dto.response.DashboardResponse;
import com.agendamento.agendamento.dto.response.HorarioOcupadoResponse;
import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;
import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.disponibilidade.model.DiaSemana;
import com.agendamento.disponibilidade.repository.DisponibilidadeRepository;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.model.Servico;
import com.agendamento.servico.repository.ServicoRepository;

import java.util.Map;
import java.util.Comparator;
import java.time.LocalTime;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgendamentoService {

    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;
    private final DisponibilidadeRepository disponibilidadeRepository;

    @Transactional
    public AgendamentoResponse criar(Long clienteId, AgendamentoRequest dto) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Cliente não encontrado: " + clienteId));

        Profissional profissional = profissionalRepository.findByIdForUpdate(dto.getProfissionalId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Profissional não encontrado: " + dto.getProfissionalId()));

        Servico servico = servicoRepository.findById(dto.getServicoId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado: " + dto.getServicoId()));

        if (!servico.getProfissional().getId().equals(profissional.getId()) || !Boolean.TRUE.equals(servico.getAtivo())) {
            throw new IllegalArgumentException("O serviço escolhido não é oferecido por este profissional.");
        }

        LocalDateTime inicio = dto.getDataHoraInicio();
        LocalDateTime fim = inicio.plusMinutes(servico.getDuracaoMinutos());

        // RN01: o horário precisa caber numa faixa de disponibilidade do profissional naquele dia
        DiaSemana dia = DiaSemana.values()[inicio.getDayOfWeek().getValue() % 7];
        boolean dentroDaDisponibilidade = fim.toLocalDate().equals(inicio.toLocalDate())
                && disponibilidadeRepository.findByProfissionalIdAndDiaSemana(profissional.getId(), dia).stream()
                        .anyMatch(d -> !inicio.toLocalTime().isBefore(d.getHoraInicio())
                                && !fim.toLocalTime().isAfter(d.getHoraFim()));
        if (!dentroDaDisponibilidade) {
            throw new IllegalStateException("O horário escolhido está fora da disponibilidade do profissional.");
        }

        // Regra: Não pode haver sobreposição com outro agendamento ativo
        boolean conflito = agendamentoRepository.existeConflitoHorario(
                profissional.getId(),
                StatusAgendamento.AGENDADO,
                inicio,
                fim
        );

        if (conflito) {
            throw new IllegalStateException("O profissional já possui um agendamento conflitante neste horário.");
        }

        // Regra: Congelamento do preço no momento do agendamento
        Agendamento agendamento = Agendamento.builder()
                .cliente(cliente)
                .profissional(profissional)
                .servico(servico)
                .dataHoraInicio(inicio)
                .dataHoraFim(fim)
                .preco(servico.getPreco())
                .status(StatusAgendamento.AGENDADO)
                .build();

        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarPorCliente(Long clienteId) {
        return agendamentoRepository.findByClienteIdOrderByDataHoraInicioDesc(clienteId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /** Lista apenas os intervalos ocupados; não expõe dados dos clientes a quem busca horários. */
    @Transactional(readOnly = true)
    public List<HorarioOcupadoResponse> listarHorariosOcupados(Long profissionalId, LocalDate de, LocalDate ate) {
        if (ate.isBefore(de)) {
            throw new IllegalArgumentException("A data final deve ser igual ou posterior à data inicial.");
        }
        if (ChronoUnit.DAYS.between(de, ate) > 62) {
            throw new IllegalArgumentException("O período máximo é de 62 dias.");
        }
        return agendamentoRepository.findByProfissionalAndPeriodo(
                        profissionalId, de.atStartOfDay(), ate.atTime(LocalTime.MAX)).stream()
                .filter(a -> a.getStatus() == StatusAgendamento.AGENDADO)
                .map(a -> new HorarioOcupadoResponse(a.getDataHoraInicio(), a.getDataHoraFim()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarPorProfissional(Long profissionalId) {
        return agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(profissionalId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarTodos() {
        return agendamentoRepository.findAll(Sort.by(Sort.Direction.DESC, "dataHoraInicio")).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Cliente cancela só os próprios agendamentos e com 2h de antecedência (RN03)
    @Transactional
    public AgendamentoResponse cancelarPeloCliente(Long clienteId, Long id) {
        Agendamento agendamento = buscar(id);
        if (!agendamento.getCliente().getId().equals(clienteId)) {
            throw new RecursoNaoEncontradoException("Agendamento não encontrado: " + id);
        }
        agendamento.cancelar(LocalDateTime.now());
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional
    public AgendamentoResponse cancelarPeloProfissional(Long profissionalId, Long id) {
        Agendamento agendamento = doProfissional(profissionalId, id);
        agendamento.cancelarPeloProfissional(LocalDateTime.now());
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional
    public AgendamentoResponse marcarConcluido(Long profissionalId, Long id) {
        Agendamento agendamento = doProfissional(profissionalId, id);

        agendamento.marcarConcluido();
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional
    public AgendamentoResponse marcarFalta(Long profissionalId, Long id) {
        Agendamento agendamento = doProfissional(profissionalId, id);

        agendamento.marcarFalta(LocalDateTime.now());
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional(readOnly = true)
    public DashboardResponse obterDashboard(Long profissionalId) {
        return obterDashboard(profissionalId, null, null);
    }

    @Transactional(readOnly = true)
    public DashboardResponse obterDashboard(Long profissionalId, LocalDate de, LocalDate ate) {
        validarPeriodo(de, ate);
        List<Agendamento> lista = (de == null && ate == null)
                ? agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(profissionalId)
                : agendamentoRepository.findByProfissionalAndPeriodo(profissionalId, inicioDoPeriodo(de), fimDoPeriodo(ate));
        return resumo(lista, true);
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarDoDia(Long profissionalId, LocalDate dia) {
        return agendamentoRepository.findByProfissionalAndPeriodo(
                        profissionalId, dia.atStartOfDay(), dia.atTime(LocalTime.MAX)).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Dashboard do Admin: todos os profissionais
    @Transactional(readOnly = true)
    public AdminDashboardResponse obterDashboardGeral(long profissionais, long servicosAtivos) {
        return obterDashboardGeral(profissionais, servicosAtivos, null, null);
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse obterDashboardGeral(long profissionais, long servicosAtivos, LocalDate de, LocalDate ate) {
        validarPeriodo(de, ate);
        List<Agendamento> todos = (de == null && ate == null)
                ? agendamentoRepository.findAll()
                : agendamentoRepository.findByPeriodo(inicioDoPeriodo(de), fimDoPeriodo(ate));

        Map<Long, List<Agendamento>> porProfissional = todos.stream()
                .collect(Collectors.groupingBy(a -> a.getProfissional().getId()));

        List<AdminDashboardResponse.FaturamentoProfissional> linhas = porProfissional.entrySet().stream()
                .map(e -> {
                    List<Agendamento> grupo = e.getValue();
                    return AdminDashboardResponse.FaturamentoProfissional.builder()
                            .profissionalId(e.getKey())
                            .profissionalNome(grupo.get(0).getProfissional().getNome())
                            .concluidos(contar(grupo, StatusAgendamento.CONCLUIDO))
                            .faltas(contar(grupo, StatusAgendamento.FALTOU))
                            .faturamento(faturamento(grupo))
                            .build();
                })
                .sorted(Comparator.comparing(AdminDashboardResponse.FaturamentoProfissional::getFaturamento).reversed()
                        .thenComparing(AdminDashboardResponse.FaturamentoProfissional::getProfissionalNome))
                .toList();

        return AdminDashboardResponse.builder()
                .totais(resumo(todos, false))
                .profissionais(profissionais)
                .servicosAtivos(servicosAtivos)
                .porProfissional(linhas)
                .build();
    }

    private void validarPeriodo(LocalDate de, LocalDate ate) {
        if (de != null && ate != null && ate.isBefore(de)) {
            throw new IllegalArgumentException("A data final deve ser igual ou posterior à data inicial.");
        }
    }

    private LocalDateTime inicioDoPeriodo(LocalDate de) {
        return de != null ? de.atStartOfDay() : LocalDateTime.of(1970, 1, 1, 0, 0);
    }

    private LocalDateTime fimDoPeriodo(LocalDate ate) {
        return ate != null ? ate.atTime(LocalTime.MAX) : LocalDateTime.of(9999, 12, 31, 23, 59, 59);
    }

    private DashboardResponse resumo(List<Agendamento> agendamentos, boolean incluirPorServico) {
        LocalDateTime agora = LocalDateTime.now();
        long concluidos = contar(agendamentos, StatusAgendamento.CONCLUIDO);
        long cancelados = contar(agendamentos, StatusAgendamento.CANCELADO);
        long faltas = contar(agendamentos, StatusAgendamento.FALTOU);
        long agendados = contar(agendamentos, StatusAgendamento.AGENDADO);
        long agendadosFuturos = agendamentos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.AGENDADO && a.getDataHoraInicio().isAfter(agora))
                .count();
        long avaliados = concluidos + faltas;
        Double taxaComparecimento = avaliados == 0
                ? null
                : Math.round((concluidos * 1000.0) / avaliados) / 10.0;

        List<Agendamento> concluidosLista = agendamentos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .toList();

        List<DashboardResponse.FaturamentoServico> porServico = !incluirPorServico
                ? List.of()
                : concluidosLista.stream()
                        .collect(Collectors.groupingBy(a -> a.getServico().getId()))
                        .entrySet().stream()
                        .map(e -> {
                            List<Agendamento> grupo = e.getValue();
                            return DashboardResponse.FaturamentoServico.builder()
                                    .servicoId(e.getKey())
                                    .servicoNome(grupo.get(0).getServico().getNome())
                                    .concluidos((long) grupo.size())
                                    .faturamento(faturamento(grupo))
                                    .build();
                        })
                        .sorted(Comparator.comparing(DashboardResponse.FaturamentoServico::getFaturamento).reversed()
                                .thenComparing(DashboardResponse.FaturamentoServico::getServicoNome))
                        .toList();

        List<DashboardResponse.AtendimentoRecente> recentes = concluidosLista.stream()
                .sorted(Comparator.comparing(Agendamento::getDataHoraInicio).reversed())
                .limit(8)
                .map(a -> DashboardResponse.AtendimentoRecente.builder()
                        .id(a.getId())
                        .clienteNome(a.getCliente().getNome())
                        .servicoNome(a.getServico().getNome())
                        .profissionalNome(a.getProfissional().getNome())
                        .dataHoraInicio(a.getDataHoraInicio())
                        .preco(a.getPreco())
                        .build())
                .toList();

        return DashboardResponse.builder()
                .totalAtendimentos((long) agendamentos.size())
                .concluidos(concluidos)
                .cancelados(cancelados)
                .faltas(faltas)
                .agendados(agendados)
                .agendadosFuturos(agendadosFuturos)
                .taxaComparecimento(taxaComparecimento)
                .faturamentoTotal(faturamento(agendamentos))
                .porServico(porServico)
                .recentes(recentes)
                .build();
    }

    private long contar(List<Agendamento> lista, StatusAgendamento status) {
        return lista.stream().filter(a -> a.getStatus() == status).count();
    }

    // RN04: só atendimentos concluídos entram no faturamento
    private BigDecimal faturamento(List<Agendamento> lista) {
        return lista.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .map(Agendamento::getPreco)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Agendamento buscar(Long id) {
        return agendamentoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Agendamento não encontrado: " + id));
    }

    private Agendamento doProfissional(Long profissionalId, Long id) {
        Agendamento agendamento = buscar(id);
        if (!agendamento.getProfissional().getId().equals(profissionalId)) {
            throw new RecursoNaoEncontradoException("Agendamento não encontrado: " + id);
        }
        return agendamento;
    }

    private AgendamentoResponse toDTO(Agendamento a) {
        LocalDateTime agora = LocalDateTime.now();
        return AgendamentoResponse.builder()
                .id(a.getId())
                .clienteId(a.getCliente().getId())
                .clienteNome(a.getCliente().getNome())
                .profissionalId(a.getProfissional().getId())
                .profissionalNome(a.getProfissional().getNome())
                .servicoId(a.getServico().getId())
                .servicoNome(a.getServico().getNome())
                .dataHoraInicio(a.getDataHoraInicio())
                .dataHoraFim(a.getDataHoraFim())
                .preco(a.getPreco())
                .status(a.getStatus())
                .podeCancelar(a.podeCancelar(agora))
                .criadoEm(a.getCriadoEm())
                .build();
    }
}
