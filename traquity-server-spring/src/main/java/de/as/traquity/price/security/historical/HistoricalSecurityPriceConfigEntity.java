package de.as.traquity.price.security.historical;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Getter
@Setter
@Entity
@Table(name = "historical_security_price_config")
class HistoricalSecurityPriceConfigEntity {

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

  @Version
  @Column(nullable = false)
  private Long version;

  @Column(nullable = false)
  private Long securityId;

  @Column(nullable = false)
  private Long dataSourceId;

  @Column
  private String externalSecurityId;

  @Column(name = "IS_ACTIVE", nullable = false)
  private boolean active;
}
