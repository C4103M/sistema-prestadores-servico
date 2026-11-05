package com.agendamento.profissional.service;

import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.profissional.dto.response.ProfissionalResponse;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.servico.service.ServicoService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfissionalService {

    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;
    private final ServicoService servicoService;

    // Busca do cliente por profissional (nome ou especialidade); só lista quem tem serviço ativo
    @Transactional(readOnly = true)
    public List<ProfissionalResponse> pesquisar(String termo) {
        List<Profissional> encontrados = (termo == null || termo.isBlank())
                ? profissionalRepository.findAll()
                : profissionalRepository.buscar(termo.trim());
        return encontrados.stream()
                .map(this::toDTO)
                .filter(p -> !p.getServicos().isEmpty())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfissionalResponse> listarTodos() {
        return profissionalRepository.findAll().stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public Profissional buscarEntidade(Long id) {
        return profissionalRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Profissional não encontrado: " + id));
    }

    private ProfissionalResponse toDTO(Profissional p) {
        return ProfissionalResponse.builder()
                .id(p.getId())
                .nome(p.getNome())
                .especialidade(p.getEspecialidade())
                .servicos(servicoRepository.findByProfissionalIdAndAtivoTrue(p.getId()).stream()
                        .map(servicoService::toDTO)
                        .toList())
                .build();
    }
}
