package de.as.traquity.price.security.historical;

import static integration.SecurityIds.AMZN;
import static integration.SecurityIds.GOOGL;
import static integration.SecurityIds.PINS;
import static integration.SecurityIds.QCOM;
import static java.time.Month.DECEMBER;
import static org.assertj.core.api.Assertions.assertThat;

import integration.IntegrationTest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

@IntegrationTest
class HistoricalSecurityPriceRepositoryTest {

  @Autowired
  private HistoricalSecurityPriceRepository historicalSecurityPriceRepository;

  @Test
  void findLatestBySecurityIdIn_securityWithManyRows_returnsOnlyTheLatestDatedOne() {
    List<HistoricalSecurityPriceEntity> result = historicalSecurityPriceRepository.findLatestBySecurityIdIn(Set.of(AMZN, PINS));

    assertThat(result).hasSize(2);
    Map<Long, HistoricalSecurityPriceEntity> bySecurityId = result.stream()
        .collect(Collectors.toMap(HistoricalSecurityPriceEntity::getSecurityId, entity -> entity));

    assertThat(bySecurityId.get(AMZN).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(bySecurityId.get(AMZN).getPrice()).isEqualByComparingTo(BigDecimal.valueOf(138.58));

    assertThat(bySecurityId.get(PINS).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(bySecurityId.get(PINS).getPrice()).isEqualByComparingTo(BigDecimal.valueOf(37.04));
  }

  @Test
  void findLatestBySecurityIdIn_securityWithNoRows_omittedFromResult() {
    List<HistoricalSecurityPriceEntity> result = historicalSecurityPriceRepository.findLatestBySecurityIdIn(Set.of(QCOM));

    assertThat(result).isEmpty();
  }

  @Test
  void findLatestBySecurityIdIn_mixOfSecuritiesWithAndWithoutRows_onlyThoseWithRowsReturned() {
    List<HistoricalSecurityPriceEntity> result = historicalSecurityPriceRepository.findLatestBySecurityIdIn(Set.of(GOOGL, QCOM));

    assertThat(result).hasSize(1);
    assertThat(result.getFirst().getSecurityId()).isEqualTo(GOOGL);
    assertThat(result.getFirst().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(result.getFirst().getPrice()).isEqualByComparingTo(BigDecimal.valueOf(126.76));
  }
}
