package com.agendamento.seguranca;

import com.agendamento.usuario.model.PapelUsuario;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey chave;
    private final long expiracaoMinutos;

    public JwtService(@Value("${app.jwt.secret}") String segredo,
                      @Value("${app.jwt.expiracao-minutos:120}") long expiracaoMinutos) {
        byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("app.jwt.secret precisa ter pelo menos 32 caracteres (256 bits).");
        }
        this.chave = Keys.hmacShaKeyFor(bytes);
        this.expiracaoMinutos = expiracaoMinutos;
    }

    public long getExpiracaoMinutos() {
        return expiracaoMinutos;
    }

    public String gerar(UsuarioAutenticado u) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(u.getUsuarioId()))
                .claim("email", u.getEmail())
                .claim("papel", u.getPapel().name())
                .claim("perfilId", u.getPerfilId())
                .claim("nome", u.getNome())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusSeconds(expiracaoMinutos * 60)))
                .signWith(chave)
                .compact();
    }

    /** Token inválido, adulterado ou expirado vira Optional vazio (o filtro segue sem autenticar). */
    public Optional<UsuarioAutenticado> validar(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(chave).build().parseSignedClaims(token).getPayload();
            Number perfil = c.get("perfilId", Number.class);
            return Optional.of(new UsuarioAutenticado(
                    Long.valueOf(c.getSubject()),
                    c.get("email", String.class),
                    PapelUsuario.valueOf(c.get("papel", String.class)),
                    perfil != null ? perfil.longValue() : null,
                    c.get("nome", String.class)));
        } catch (JwtException | IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
