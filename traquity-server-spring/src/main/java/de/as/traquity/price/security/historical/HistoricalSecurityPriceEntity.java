package de.as.traquity.price.security.historical;

import de.as.traquity.common.database.converter.BigDecimalConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter
@Setter
@Entity
@Table(name = "historical_security_price")
class HistoricalSecurityPriceEntity {

  @Id
  @Column(nullable = false)
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @CreationTimestamp
  @Column(updatable = false)
  private OffsetDateTime createdAt;

  @UpdateTimestamp
  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  @Column(nullable = false)
  private Long securityId;

  @Column(nullable = false)
  @Convert(converter = BigDecimalConverter.class)
  private BigDecimal price;

  @Column(nullable = false)
  private String currency;

  @Column(nullable = false)
  private LocalDate date;

  @Column
  private Long dataSourceId;
}
