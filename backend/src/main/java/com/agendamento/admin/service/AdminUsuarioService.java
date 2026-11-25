package com.agendamento.admin.service;

import com.agendamento.admin.dto.response.UsuarioAdminResponse;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.usuario.model.PapelUsuario;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> listarUsuarios(PapelUsuario papel, Boolean ativo, String busca) {
        Map<Long, Cliente> clientesPorUsuario = clienteRepository.findAll().stream()
                .collect(Collectors.toMap(c -> c.getUsuario().getId(), Function.identity(), (a, b) -> a));
        Map<Long, Profissional> profsPorUsuario = profissionalRepository.findAll().stream()
                .collect(Collectors.toMap(p -> p.getUsuario().getId(), Function.identity(), (a, b) -> a));

        String termo = busca != null ? busca.trim().toLowerCase(Locale.ROOT) : "";

        return usuarioRepository.findAll().stream()
                .filter(u -> papel == null || u.getPapel() == papel)
                .filter(u -> ativo == null || Boolean.TRUE.equals(u.getAtivo()) == ativo)
                .map(u -> toDTO(u, clientesPorUsuario.get(u.getId()), profsPorUsuario.get(u.getId())))
                .filter(dto -> termo.isEmpty()
                        || dto.getNome().toLowerCase(Locale.ROOT).contains(termo)
                        || dto.getEmail().toLowerCase(Locale.ROOT).contains(termo))
                .sorted(Comparator.comparing((UsuarioAdminResponse u) -> u.getPapel().name())
                        .thenComparing(UsuarioAdminResponse::getNome, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public UsuarioAdminResponse alternarStatus(Long adminUsuarioId, Long usuarioId) {
        if (adminUsuarioId.equals(usuarioId)) {
            throw new IllegalStateException("Você não pode desativar a própria conta de administrador.");
        }
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado: " + usuarioId));
        if (usuario.getPapel() == PapelUsuario.ADMIN) {
            throw new IllegalStateException("Não é possível alterar o status de outro administrador.");
        }
        usuario.setAtivo(!Boolean.TRUE.equals(usuario.getAtivo()));
        Usuario salvo = usuarioRepository.save(usuario);
        Cliente cliente = clienteRepository.findByUsuarioId(salvo.getId()).orElse(null);
        Profissional pro = profissionalRepository.findByUsuarioId(salvo.getId()).orElse(null);
        return toDTO(salvo, cliente, pro);
    }

    private UsuarioAdminResponse toDTO(Usuario u, Cliente c, Profissional p) {
        String nome;
        String telefone = null;
        String especialidade = null;
        if (u.getPapel() == PapelUsuario.CLIENTE && c != null) {
            nome = c.getNome();
            telefone = c.getTelefone();
        } else if (u.getPapel() == PapelUsuario.PROFISSIONAL && p != null) {
            nome = p.getNome();
            telefone = p.getTelefone();
            especialidade = p.getEspecialidade();
        } else {
            nome = (u.getNome() != null && !u.getNome().isBlank()) ? u.getNome() : "Administrador";
        }

        return UsuarioAdminResponse.builder()
                .id(u.getId())
                .nome(nome)
                .email(u.getEmail())
                .telefone(telefone)
                .especialidade(especialidade)
                .papel(u.getPapel())
                .ativo(Boolean.TRUE.equals(u.getAtivo()))
                .criadoEm(u.getCriadoEm())
                .build();
    }
}
