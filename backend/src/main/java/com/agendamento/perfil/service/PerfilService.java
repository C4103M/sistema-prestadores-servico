package com.agendamento.perfil.service;

import com.agendamento.autenticacao.dto.AuthResponse;
import com.agendamento.autenticacao.service.AuthService;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
import com.agendamento.compartilhado.exceptions.EmailJaCadastradoException;
import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.perfil.dto.AlterarSenhaRequest;
import com.agendamento.perfil.dto.AtualizarPerfilRequest;
import com.agendamento.perfil.dto.PerfilResponse;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.usuario.model.PapelUsuario;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PerfilService {

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;

    @Transactional(readOnly = true)
    public PerfilResponse obter(Long usuarioId) {
        Usuario usuario = buscarUsuario(usuarioId);
        return switch (usuario.getPapel()) {
            case CLIENTE -> {
                Cliente c = clienteRepository.findByUsuarioId(usuarioId)
                        .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de cliente não encontrado."));
                yield PerfilResponse.builder()
                        .usuarioId(usuario.getId())
                        .perfilId(c.getId())
                        .papel(usuario.getPapel())
                        .nome(c.getNome())
                        .email(usuario.getEmail())
                        .telefone(c.getTelefone())
                        .build();
            }
            case PROFISSIONAL -> {
                Profissional p = profissionalRepository.findByUsuarioId(usuarioId)
                        .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de profissional não encontrado."));
                yield PerfilResponse.builder()
                        .usuarioId(usuario.getId())
                        .perfilId(p.getId())
                        .papel(usuario.getPapel())
                        .nome(p.getNome())
                        .email(usuario.getEmail())
                        .telefone(p.getTelefone())
                        .especialidade(p.getEspecialidade())
                        .bannerUrl(p.getBannerUrl())
                        .build();
            }
            case ADMIN -> PerfilResponse.builder()
                    .usuarioId(usuario.getId())
                    .perfilId(null)
                    .papel(usuario.getPapel())
                    .nome((usuario.getNome() != null && !usuario.getNome().isBlank()) ? usuario.getNome() : "Administrador")
                    .email(usuario.getEmail())
                    .build();
        };
    }

    @Transactional
    public AuthResponse atualizar(Long usuarioId, AtualizarPerfilRequest dto) {
        Usuario usuario = buscarUsuario(usuarioId);
        String emailNormalizado = dto.getEmail().trim().toLowerCase(Locale.ROOT);
        usuarioRepository.findByEmail(emailNormalizado)
                .filter(outro -> !outro.getId().equals(usuarioId))
                .ifPresent(outro -> {
                    throw new EmailJaCadastradoException();
                });

        if (usuario.getPapel() != PapelUsuario.ADMIN && (dto.getTelefone() == null || dto.getTelefone().isBlank())) {
            throw new IllegalArgumentException("Informe o telefone.");
        }

        String nome = dto.getNome().trim();
        usuario.setEmail(emailNormalizado);
        usuario.setNome(nome);
        usuarioRepository.save(usuario);

        if (usuario.getPapel() == PapelUsuario.CLIENTE) {
            Cliente c = clienteRepository.findByUsuarioId(usuarioId)
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de cliente não encontrado."));
            c.setNome(nome);
            c.setTelefone(dto.getTelefone().trim());
            clienteRepository.save(c);
        } else if (usuario.getPapel() == PapelUsuario.PROFISSIONAL) {
            Profissional p = profissionalRepository.findByUsuarioId(usuarioId)
                    .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de profissional não encontrado."));
            p.setNome(nome);
            p.setTelefone(dto.getTelefone().trim());
            p.setEspecialidade(dto.getEspecialidade() != null && !dto.getEspecialidade().isBlank()
                    ? dto.getEspecialidade().trim()
                    : null);
            p.setBannerUrl(dto.getBannerUrl() != null && !dto.getBannerUrl().isBlank()
                    ? dto.getBannerUrl().trim()
                    : null);
            profissionalRepository.save(p);
        }

        return authService.respostaDoUsuario(usuario);
    }

    @Transactional
    public void alterarSenha(Long usuarioId, AlterarSenhaRequest dto) {
        Usuario usuario = buscarUsuario(usuarioId);
        if (!passwordEncoder.matches(dto.getSenhaAtual(), usuario.getSenha())) {
            throw new IllegalArgumentException("A senha atual está incorreta.");
        }
        usuario.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        usuarioRepository.save(usuario);
    }

    private Usuario buscarUsuario(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado."));
    }
}
