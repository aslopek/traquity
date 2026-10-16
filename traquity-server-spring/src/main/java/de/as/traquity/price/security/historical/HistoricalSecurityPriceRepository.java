package de.as.traquity.price.security.historical;

import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
interface HistoricalSecurityPriceRepository extends JpaRepository<HistoricalSecurityPriceEntity, Long> {

  Optional<HistoricalSecurityPriceEntity> findFirstBySecurityIdOrderByDateDesc(Long securityId);

  @Query("""
      SELECT p FROM HistoricalSecurityPriceEntity p
      WHERE p.securityId IN :securityIds
      AND p.date = (
            SELECT MAX(p2.date)
            FROM HistoricalSecurityPriceEntity p2
            WHERE p2.securityId = p.securityId
      )
      """)
  List<HistoricalSecurityPriceEntity> findLatestBySecurityIdIn(@Param("securityIds") Collection<Long> securityIds);

  List<HistoricalSecurityPriceEntity> findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(Long securityId,
                                                                                               LocalDate date);

  List<HistoricalSecurityPriceEntity> findAllBySecurityIdAndDateLessThanOrderByDateDesc(Long security, LocalDate date);

  @Transactional
  void deleteAllBySecurityId(Long securityId);
}
