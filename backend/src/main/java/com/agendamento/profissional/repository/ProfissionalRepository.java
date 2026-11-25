package com.agendamento.profissional.repository;

import com.agendamento.profissional.model.Profissional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProfissionalRepository extends JpaRepository<Profissional, Long> {

    Optional<Profissional> findByUsuarioId(Long usuarioId);

    List<Profissional> findByUsuarioAtivoTrue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Profissional p WHERE p.id = :id")
    Optional<Profissional> findByIdForUpdate(@Param("id") Long id);

    // Busca do cliente por profissional ativo: nome, especialidade ou categoria aprovada de serviço ativo
    @Query("SELECT DISTINCT p FROM Profissional p WHERE p.usuario.ativo = true AND (" +
           "LOWER(p.nome) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(COALESCE(p.especialidade, '')) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "EXISTS (SELECT s FROM Servico s WHERE s.profissional = p AND s.ativo = true " +
           "AND s.categoriaEntidade.status = com.agendamento.categoria.model.StatusCategoria.APROVADA " +
           "AND LOWER(s.categoriaEntidade.nome) LIKE LOWER(CONCAT('%', :termo, '%')))) " +
           "ORDER BY p.nome")
    List<Profissional> buscar(@Param("termo") String termo);
}
