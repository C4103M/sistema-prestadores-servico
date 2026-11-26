package com.agendamento.categoria.service;

import com.agendamento.categoria.dto.CategoriaRequest;
import com.agendamento.categoria.dto.CategoriaResponse;
import com.agendamento.categoria.model.Categoria;
import com.agendamento.categoria.model.StatusCategoria;
import com.agendamento.categoria.repository.CategoriaRepository;
import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicoRepository servicoRepository;

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarAprovadas() {
        Map<Long, Long> contagens = mapearContagens(servicoRepository.countPublicosAtivosPorCategoria());
        return categoriaRepository.findByStatusOrderByNomeAsc(StatusCategoria.APROVADA).stream()
                .map(c -> toDTO(c, contagens.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    /** Apenas categorias aprovadas que possuam pelo menos 1 serviço ativo de profissional ativo. */
    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarPublicasComServicosAtivos() {
        Map<Long, Long> contagens = mapearContagens(servicoRepository.countPublicosAtivosPorCategoria());
        return categoriaRepository.findByStatusOrderByNomeAsc(StatusCategoria.APROVADA).stream()
                .filter(c -> contagens.getOrDefault(c.getId(), 0L) > 0)
                .map(c -> toDTO(c, contagens.get(c.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarParaProfissional(Long usuarioId) {
        Map<Long, Long> contagens = mapearContagens(servicoRepository.countServicosAtivosPorCategoria());
        return categoriaRepository.findVisiveisParaProfissional(StatusCategoria.APROVADA, usuarioId).stream()
                .sorted(Comparator.comparingInt((Categoria c) -> ordemProfissional(c.getStatus()))
                        .thenComparing(Categoria::getNome, String.CASE_INSENSITIVE_ORDER))
                .map(c -> toDTO(c, contagens.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarTodasAdmin() {
        Map<Long, Long> contagens = mapearContagens(servicoRepository.countServicosAtivosPorCategoria());
        return categoriaRepository.findAll().stream()
                .sorted(Comparator.comparingInt((Categoria c) -> ordemAdmin(c.getStatus()))
                        .thenComparing(Categoria::getNome, String.CASE_INSENSITIVE_ORDER))
                .map(c -> toDTO(c, contagens.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public CategoriaResponse criarPeloAdmin(Long adminUsuarioId, CategoriaRequest dto) {
        String nome = dto.getNome().trim();
        if (categoriaRepository.existsByNomeIgnoreCase(nome)) {
            throw new IllegalStateException("Já existe uma categoria com este nome.");
        }
        Usuario admin = usuarioRepository.findById(adminUsuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        Categoria salva = categoriaRepository.save(Categoria.builder()
                .nome(nome)
                .shortDescription(dto.getShortDescription().trim())
                .imagemUrl(dto.getImagemUrl().trim())
                .status(StatusCategoria.APROVADA)
                .criadoPor(admin)
                .build());
        return toDTO(salva, 0L);
    }

    @Transactional
    public CategoriaResponse sugerirPeloProfissional(Long profissionalUsuarioId, CategoriaRequest dto) {
        String nome = dto.getNome().trim();
        if (categoriaRepository.existsByNomeIgnoreCase(nome)) {
            throw new IllegalStateException("Já existe uma categoria com este nome.");
        }
        Usuario pro = usuarioRepository.findById(profissionalUsuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
        Categoria salva = categoriaRepository.save(Categoria.builder()
                .nome(nome)
                .shortDescription(dto.getShortDescription().trim())
                .imagemUrl(dto.getImagemUrl().trim())
                .status(StatusCategoria.PENDENTE)
                .criadoPor(pro)
                .build());
        return toDTO(salva, 0L);
    }

    @Transactional
    public CategoriaResponse atualizarPeloAdmin(Long id, CategoriaRequest dto) {
        Categoria categoria = buscar(id);
        String nome = dto.getNome().trim();
        if (categoriaRepository.existsByNomeIgnoreCaseAndIdNot(nome, id)) {
            throw new IllegalStateException("Já existe uma categoria com este nome.");
        }
        categoria.setNome(nome);
        categoria.setShortDescription(dto.getShortDescription().trim());
        categoria.setImagemUrl(dto.getImagemUrl().trim());
        Categoria salva = categoriaRepository.save(categoria);
        long total = mapearContagens(servicoRepository.countServicosAtivosPorCategoria()).getOrDefault(id, 0L);
        return toDTO(salva, total);
    }

    @Transactional
    public CategoriaResponse aprovar(Long id) {
        Categoria categoria = buscar(id);
        categoria.setStatus(StatusCategoria.APROVADA);
        Categoria salva = categoriaRepository.save(categoria);
        long total = mapearContagens(servicoRepository.countServicosAtivosPorCategoria()).getOrDefault(id, 0L);
        return toDTO(salva, total);
    }

    @Transactional
    public CategoriaResponse rejeitar(Long id) {
        Categoria categoria = buscar(id);
        categoria.setStatus(StatusCategoria.REJEITADA);
        Categoria salva = categoriaRepository.save(categoria);
        long total = mapearContagens(servicoRepository.countServicosAtivosPorCategoria()).getOrDefault(id, 0L);
        return toDTO(salva, total);
    }

    @Transactional(readOnly = true)
    public Categoria resolverParaServico(Long profissionalUsuarioId, Long categoriaId) {
        if (categoriaId == null) {
            throw new IllegalArgumentException("Selecione uma categoria para o serviço.");
        }
        Categoria categoria = buscar(categoriaId);

        if (categoria.getStatus() == StatusCategoria.APROVADA) {
            return categoria;
        }
        if (categoria.getStatus() == StatusCategoria.REJEITADA) {
            throw new IllegalStateException("Esta categoria foi rejeitada. Escolha outra categoria disponível.");
        }
        boolean ehDono = categoria.getCriadoPor() != null && categoria.getCriadoPor().getId().equals(profissionalUsuarioId);
        if (!ehDono) {
            throw new IllegalStateException("Esta categoria ainda está pendente de aprovação.");
        }
        return categoria;
    }

    private Categoria buscar(Long id) {
        return categoriaRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Categoria não encontrada: " + id));
    }

    private Map<Long, Long> mapearContagens(List<Object[]> linhas) {
        Map<Long, Long> mapa = new HashMap<>();
        for (Object[] linha : linhas) {
            if (linha[0] != null) {
                mapa.put(((Number) linha[0]).longValue(), ((Number) linha[1]).longValue());
            }
        }
        return mapa;
    }

    private int ordemAdmin(StatusCategoria status) {
        return switch (status) {
            case PENDENTE -> 0;
            case APROVADA -> 1;
            case REJEITADA -> 2;
        };
    }

    private int ordemProfissional(StatusCategoria status) {
        return switch (status) {
            case APROVADA -> 0;
            case PENDENTE -> 1;
            case REJEITADA -> 2;
        };
    }

    private CategoriaResponse toDTO(Categoria c, long totalServicosAtivos) {
        return CategoriaResponse.builder()
                .id(c.getId())
                .nome(c.getNome())
                .shortDescription(c.getShortDescription())
                .imagemUrl(c.getImagemUrl())
                .status(c.getStatus())
                .criadoPorUsuarioId(c.getCriadoPor() != null ? c.getCriadoPor().getId() : null)
                .criadoPorEmail(c.getCriadoPor() != null ? c.getCriadoPor().getEmail() : null)
                .totalServicosAtivos(totalServicosAtivos)
                .criadoEm(c.getCriadoEm())
                .build();
    }
}
