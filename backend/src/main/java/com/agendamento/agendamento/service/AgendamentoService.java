package com.agendamento.agendamento.service;

import com.agendamento.admin.dto.response.AdminDashboardResponse;
import com.agendamento.agendamento.dto.request.AgendamentoRequest;
import com.agendamento.agendamento.dto.response.AgendamentoResponse;
import com.agendamento.agendamento.dto.response.DashboardResponse;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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

        Profissional profissional = profissionalRepository.findById(dto.getProfissionalId())
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

    @Transactional(readOnly = true)
    public List<AgendamentoResponse> listarPorProfissional(Long profissionalId) {
        return agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(profissionalId).stream()
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
        agendamento.cancelarPeloProfissional();
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

        agendamento.marcarFalta();
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional(readOnly = true)
    public DashboardResponse obterDashboard(Long profissionalId) {
        return resumo(agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(profissionalId));
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
        List<Agendamento> todos = agendamentoRepository.findAll();
        Map<Profissional, List<Agendamento>> porProfissional = todos.stream()
                .collect(Collectors.groupingBy(Agendamento::getProfissional));

        List<AdminDashboardResponse.FaturamentoProfissional> linhas = porProfissional.entrySet().stream()
                .map(e -> AdminDashboardResponse.FaturamentoProfissional.builder()
                        .profissionalId(e.getKey().getId())
                        .profissionalNome(e.getKey().getNome())
                        .concluidos(contar(e.getValue(), StatusAgendamento.CONCLUIDO))
                        .faltas(contar(e.getValue(), StatusAgendamento.FALTOU))
                        .faturamento(faturamento(e.getValue()))
                        .build())
                .sorted(Comparator.comparing(AdminDashboardResponse.FaturamentoProfissional::getFaturamento).reversed())
                .toList();

        return AdminDashboardResponse.builder()
                .totais(resumo(todos))
                .profissionais(profissionais)
                .servicosAtivos(servicosAtivos)
                .porProfissional(linhas)
                .build();
    }

    private DashboardResponse resumo(List<Agendamento> agendamentos) {
        return DashboardResponse.builder()
                .totalAtendimentos((long) agendamentos.size())
                .concluidos(contar(agendamentos, StatusAgendamento.CONCLUIDO))
                .cancelados(contar(agendamentos, StatusAgendamento.CANCELADO))
                .faltas(contar(agendamentos, StatusAgendamento.FALTOU))
                .agendados(contar(agendamentos, StatusAgendamento.AGENDADO))
                .faturamentoTotal(faturamento(agendamentos))
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
                .build();
    }
}
