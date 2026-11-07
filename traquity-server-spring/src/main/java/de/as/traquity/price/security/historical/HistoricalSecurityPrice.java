package de.as.traquity.price.security.historical;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Data;

@Data
public class HistoricalSecurityPrice {

  private Long securityId;
  private BigDecimal price;
  private String currency;
  private LocalDate date;
  private Long dataSourceId;
}
