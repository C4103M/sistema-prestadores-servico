package com.agendamento.servico.repository;

import com.agendamento.servico.model.Servico;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByAtivoTrue();
    List<Servico> findByProfissionalId(Long profissionalId);
    List<Servico> findByProfissionalIdAndAtivoTrue(Long profissionalId);
    List<Servico> findByCategoriaEntidadeIsNull();

    @Query("SELECT s FROM Servico s WHERE s.ativo = true " +
           "AND s.profissional.usuario.ativo = true " +
           "AND s.categoriaEntidade.status = com.agendamento.categoria.model.StatusCategoria.APROVADA " +
           "ORDER BY s.nome")
    List<Servico> findPublicosAtivos();

    @Query("SELECT s FROM Servico s WHERE s.profissional.id = :profissionalId " +
           "AND s.ativo = true AND s.profissional.usuario.ativo = true " +
           "AND s.categoriaEntidade.status = com.agendamento.categoria.model.StatusCategoria.APROVADA " +
           "ORDER BY s.nome")
    List<Servico> findPublicosAtivosByProfissionalId(@Param("profissionalId") Long profissionalId);

    @Query("SELECT COUNT(s) FROM Servico s WHERE s.ativo = true " +
           "AND s.profissional.usuario.ativo = true " +
           "AND s.categoriaEntidade.status = com.agendamento.categoria.model.StatusCategoria.APROVADA")
    long countPublicosAtivos();

    @Query("SELECT s.categoriaEntidade.id, COUNT(s) FROM Servico s WHERE s.ativo = true " +
           "AND s.profissional.usuario.ativo = true " +
           "AND s.categoriaEntidade.status = com.agendamento.categoria.model.StatusCategoria.APROVADA " +
           "GROUP BY s.categoriaEntidade.id")
    List<Object[]> countPublicosAtivosPorCategoria();

    @Query("SELECT s.categoriaEntidade.id, COUNT(s) FROM Servico s WHERE s.ativo = true " +
           "AND s.profissional.usuario.ativo = true " +
           "AND s.categoriaEntidade IS NOT NULL " +
           "GROUP BY s.categoriaEntidade.id")
    List<Object[]> countServicosAtivosPorCategoria();

    // Busca do cliente: apenas serviços ativos de profissionais ativos e com categoria aprovada
    @Query("SELECT s FROM Servico s WHERE s.ativo = true " +
           "AND s.profissional.usuario.ativo = true " +
           "AND s.categoriaEntidade.status = com.agendamento.categoria.model.StatusCategoria.APROVADA AND (" +
           "LOWER(s.nome) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(COALESCE(s.descricao, '')) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(s.categoriaEntidade.nome) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(s.profissional.nome) LIKE LOWER(CONCAT('%', :termo, '%'))) " +
           "ORDER BY s.nome")
    List<Servico> buscarAtivos(@Param("termo") String termo);
}
