package com.agendamento.servico.service;

import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.dto.ServicoDTO;
import com.agendamento.servico.model.Servico;
import com.agendamento.servico.repository.ServicoRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final ProfissionalRepository profissionalRepository;

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarTodosAtivos() {
        return servicoRepository.findByAtivoTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarPorProfissional(Long profissionalId) {
        return servicoRepository.findByProfissionalId(profissionalId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> pesquisar(String termo) {
        if (termo == null || termo.isBlank()) {
            return listarTodosAtivos();
        }
        return servicoRepository.buscarAtivos(termo.trim()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarTodos() {
        return servicoRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Garante que o serviço pertence ao profissional da rota /api/profissional/{id}
    @Transactional(readOnly = true)
    public void garantirDoProfissional(Long profissionalId, Long servicoId) {
        Servico servico = servicoRepository.findById(servicoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado: " + servicoId));
        if (!servico.getProfissional().getId().equals(profissionalId)) {
            throw new RecursoNaoEncontradoException("Serviço não encontrado: " + servicoId);
        }
    }

    @Transactional
    public ServicoDTO criar(ServicoDTO dto) {
        Profissional profissional = profissionalRepository.findById(dto.getProfissionalId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Profissional não encontrado: " + dto.getProfissionalId()));

        Servico servico = Servico.builder()
                .nome(dto.getNome())
                .descricao(dto.getDescricao())
                .categoria(dto.getCategoria())
                .duracaoMinutos(dto.getDuracaoMinutos())
                .preco(dto.getPreco())
                .ativo(dto.getAtivo() != null ? dto.getAtivo() : true)
                .profissional(profissional)
                .build();

        return toDTO(servicoRepository.save(servico));
    }

    @Transactional
    public ServicoDTO atualizar(Long id, ServicoDTO dto) {
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado: " + id));

        servico.setNome(dto.getNome());
        servico.setDescricao(dto.getDescricao());
        servico.setCategoria(dto.getCategoria());
        servico.setDuracaoMinutos(dto.getDuracaoMinutos());
        servico.setPreco(dto.getPreco());
        if (dto.getAtivo() != null) {
            servico.setAtivo(dto.getAtivo());
        }

        return toDTO(servicoRepository.save(servico));
    }

    @Transactional
    public void alternarStatus(Long id) {
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado: " + id));
        servico.setAtivo(!servico.getAtivo());
        servicoRepository.save(servico);
    }

    @Transactional
    public void excluir(Long id) {
        if (!servicoRepository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Serviço não encontrado: " + id);
        }
        servicoRepository.deleteById(id);
        servicoRepository.flush(); // dispara aqui a violação de FK de um serviço com agendamentos
    }

    public ServicoDTO toDTO(Servico s) {
        return ServicoDTO.builder()
                .id(s.getId())
                .nome(s.getNome())
                .descricao(s.getDescricao())
                .categoria(s.getCategoria())
                .duracaoMinutos(s.getDuracaoMinutos())
                .preco(s.getPreco())
                .ativo(s.getAtivo())
                .profissionalId(s.getProfissional() != null ? s.getProfissional().getId() : null)
                .profissionalNome(s.getProfissional() != null ? s.getProfissional().getNome() : null)
                .build();
    }
}
