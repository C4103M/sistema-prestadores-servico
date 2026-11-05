package com.agendamento.agendamento.repository;

import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {

    List<Agendamento> findByClienteIdOrderByDataHoraInicioDesc(Long clienteId);

    List<Agendamento> findByProfissionalIdOrderByDataHoraInicioAsc(Long profissionalId);

    @Query("SELECT a FROM Agendamento a WHERE a.profissional.id = :profissionalId " +
           "AND a.dataHoraInicio >= :inicio AND a.dataHoraInicio <= :fim " +
           "ORDER BY a.dataHoraInicio ASC")
    List<Agendamento> findByProfissionalAndPeriodo(
            @Param("profissionalId") Long profissionalId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

    @Query("SELECT COUNT(a) > 0 FROM Agendamento a " +
           "WHERE a.profissional.id = :profissionalId " +
           "AND a.status = :status " +
           "AND (:inicio < a.dataHoraFim AND :fim > a.dataHoraInicio)")
    boolean existeConflitoHorario(
            @Param("profissionalId") Long profissionalId,
            @Param("status") StatusAgendamento status,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );

}
