package de.as.traquity.notification.dividendannouncement.config;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "dividend_announcement_config")
class DividendAnnouncementConfigEntity {

  @Id
  @Column(nullable = false)
  private long securityId;

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
  private long dataSourceId;

  @Column
  private String externalSecurityId;

  @Column(nullable = false)
  private boolean isActive;
}
