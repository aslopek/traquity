package de.as.traquity.depot.performance.position;

import static java.math.BigDecimal.ZERO;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PositionPerformance {

  private String currency;
  private BigDecimal buysGross = ZERO;
  private BigDecimal sellsGross = ZERO;
  private BigDecimal dividendsGross = ZERO;
  private BigDecimal taxes = ZERO;
  private BigDecimal fees = ZERO;
  private BigDecimal netCashFlow = ZERO;
  private BigDecimal currentSizeAbsolute = ZERO;
  private BigDecimal costBasis = ZERO;
  private BigDecimal performanceAbsolute = ZERO;
  private BigDecimal performanceRelative;
}
