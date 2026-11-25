package com.agendamento.seguranca;

import com.agendamento.usuario.repository.UsuarioRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Lê "Authorization: Bearer <jwt>". Não é @Component de propósito: é criado no SecurityConfig,
 * para não ser registrado duas vezes (uma pelo Spring Boot e outra na cadeia de segurança).
 */
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(PREFIXO)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            var autenticadoOpt = jwtService.validar(header.substring(PREFIXO.length()).trim());
            if (autenticadoOpt.isPresent()) {
                UsuarioAutenticado usuario = autenticadoOpt.get();
                boolean ativo = usuarioRepository.findById(usuario.getUsuarioId())
                        .map(u -> Boolean.TRUE.equals(u.getAtivo()))
                        .orElse(false);
                if (!ativo) {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType("application/problem+json;charset=UTF-8");
                    response.getWriter().write(
                            "{\"title\":\"Conta desativada\",\"status\":403,"
                            + "\"detail\":\"Sua conta está desativada. Entre em contato com o administrador.\"}");
                    return;
                }
                var auth = new UsernamePasswordAuthenticationToken(
                        usuario, null, List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPapel().name())));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        chain.doFilter(request, response);
    }
}
