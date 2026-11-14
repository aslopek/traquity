package de.as.traquity.depot.position;

import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static integration.DepotIds.BUY_IN_ZERO;
import static integration.DepotIds.FIRST_DEPOT;
import static integration.SecurityIds.AMZN;
import static integration.SecurityIds.GOOGL;
import static integration.SecurityIds.MSFT;
import static java.math.BigDecimal.ZERO;
import static java.time.Month.APRIL;
import static java.time.Month.JANUARY;
import static java.time.Month.MARCH;
import static java.time.Month.NOVEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.position.api.model.LotDto;
import integration.IntegrationTest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class GetLotsTest {

  private static final String ENDPOINT = "/depots/%d/securities/%d/lots";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private Clock clock;

  @BeforeEach
  void beforeEach() {
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
  }

  @Test
  void getLots_latestPriceAvailable_ok() throws Exception {

    MvcResult mvcResult = getLots(FIRST_DEPOT, AMZN).andExpect(status().isOk()).andReturn();
    List<LotDto> lots = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
    });

    assertThat(lots).hasSize(2);

    LotDto lot = lots.getFirst();
    assertThat(lot.getDepotId()).isEqualTo(FIRST_DEPOT);
    assertThat(lot.getSecurityId()).isEqualTo(AMZN);
    assertThat(lot.getCurrency()).isEqualTo("EUR");
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2020, NOVEMBER, 10));
    assertThat(lot.getTime()).isEqualTo("19:59:12");
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(1147);
    assertThat(lot.getCount()).isEqualByComparingTo("27");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("3483.68");
    assertThat(lot.getTax()).isEqualByComparingTo(ZERO);
    assertThat(lot.getFee()).isEqualTo("10");
    // current price 138.58 EUR
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("3741.66");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("257.98");
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("0.07406"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getCagr()).isCloseTo(new BigDecimal("0.02301"), ACCURACY_ONE_THOUSANDTH);

    lot = lots.get(1);
    assertThat(lot.getDepotId()).isEqualTo(FIRST_DEPOT);
    assertThat(lot.getSecurityId()).isEqualTo(AMZN);
    assertThat(lot.getCurrency()).isEqualTo("EUR");
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2021, APRIL, 26));
    assertThat(lot.getTime()).isEqualTo("16:57:56");
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(980);
    assertThat(lot.getCount()).isEqualByComparingTo("27");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("3737.48");
    assertThat(lot.getTax()).isEqualByComparingTo(ZERO);
    assertThat(lot.getFee()).isEqualTo("10");
    // current price 138.58 EUR
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("3741.66");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("4.18");
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("0.00112"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getCagr()).isCloseTo(new BigDecimal("0.00042"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getLots_buyInZero_performanceRelativeAndCagrInfinite() throws Exception {
    MvcResult mvcResult = getLots(BUY_IN_ZERO, GOOGL).andExpect(status().isOk()).andReturn();
    List<LotDto> lots = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
    });

    assertThat(lots).hasSize(1);
    LotDto lot = lots.getFirst();
    assertThat(lot.getDepotId()).isEqualTo(BUY_IN_ZERO);
    assertThat(lot.getSecurityId()).isEqualTo(GOOGL);
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2020, MARCH, 13));
    assertThat(lot.getCount()).isEqualByComparingTo("40");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo(ZERO);
    // current price 126.76 EUR
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("5070.4");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("5070.4");
    assertThat(lot.getPerformanceRelative()).isNull();
    assertThat(lot.getCagr()).isNull();
  }

  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM historical_security_price;
      """)
  @Test
  void getLots_noPriceAvailable_cagrAbsent() throws Exception {
    MvcResult mvcResult = getLots(FIRST_DEPOT, AMZN).andExpect(status().isOk()).andReturn();
    List<LotDto> lots = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
    });

    assertThat(lots).hasSize(2);

    LotDto lot = lots.getFirst();
    assertThat(lot.getDepotId()).isEqualTo(FIRST_DEPOT);
    assertThat(lot.getSecurityId()).isEqualTo(AMZN);
    assertThat(lot.getCurrency()).isEqualTo("EUR");
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2020, NOVEMBER, 10));
    assertThat(lot.getTime()).isEqualTo("19:59:12");
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(1147);
    assertThat(lot.getCount()).isEqualByComparingTo("27");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("3483.68");
    assertThat(lot.getTax()).isEqualByComparingTo(ZERO);
    assertThat(lot.getFee()).isEqualTo("10");
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("3483.68");
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
    assertThat(lot.getCagr()).isNull();

    lot = lots.get(1);
    assertThat(lot.getDepotId()).isEqualTo(FIRST_DEPOT);
    assertThat(lot.getSecurityId()).isEqualTo(AMZN);
    assertThat(lot.getCurrency()).isEqualTo("EUR");
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2021, APRIL, 26));
    assertThat(lot.getTime()).isEqualTo("16:57:56");
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(980);
    assertThat(lot.getCount()).isEqualByComparingTo("27");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("3737.48");
    assertThat(lot.getTax()).isEqualByComparingTo(ZERO);
    assertThat(lot.getFee()).isEqualTo("10");
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("3737.48");
    assertThat(lot.getPerformanceAbsolute()).isZero();
    assertThat(lot.getPerformanceRelative()).isZero();
    assertThat(lot.getCagr()).isNull();
  }

  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE transaction
      SET date = '2024-01-01'
      WHERE id = 12;
      """)
  @Test
  void getLots_lotDatedToday_cagrAbsent() throws Exception {
    verifyLatestLotWithoutCagr(LocalDate.of(2024, JANUARY, 1));
  }

  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE transaction
      SET date = '2024-01-02'
      WHERE id = 12;
      """)
  @Test
  void getLots_lotDatedInTheFuture_cagrAbsent() throws Exception {
    verifyLatestLotWithoutCagr(LocalDate.of(2024, JANUARY, 2));
  }

  private void verifyLatestLotWithoutCagr(LocalDate date) throws Exception {
    MvcResult mvcResult = getLots(FIRST_DEPOT, AMZN).andExpect(status().isOk()).andReturn();
    List<LotDto> lots = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
    });

    assertThat(lots).hasSize(2);
    assertThat(lots.getFirst().getCagr()).isCloseTo(new BigDecimal("0.02301"), ACCURACY_ONE_THOUSANDTH);

    LotDto lot = lots.get(1);
    assertThat(lot.getDate()).isEqualTo(date);
    // current price 138.58 EUR
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("3741.66");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("4.18");
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("0.00112"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getCagr()).isNull();
  }

  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE historical_security_price
      SET currency = 'USD'
      WHERE security_id = 13 AND date = '2023-12-29';
      """)
  @Test
  void getLots_latestPriceOnlyConvertibleWithOutdatedExchangeRate_convertedWithIt() throws Exception {
    MvcResult mvcResult = getLots(FIRST_DEPOT, AMZN).andExpect(status().isOk()).andReturn();
    List<LotDto> lots = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
    });

    assertThat(lots).hasSize(2);
    LotDto lot = lots.getFirst();
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2020, NOVEMBER, 10));
    assertThat(lot.getCurrency()).isEqualTo("EUR");
    // 27 * 138.58 USD / 1.0777 EUR/USD of 2023-12-08, the latest rate and older than 7 days
    assertThat(lot.getCurrentSizeAbsolute()).isCloseTo(new BigDecimal("3471.89385"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getPerformanceAbsolute()).isCloseTo(new BigDecimal("-11.78615"), ACCURACY_ONE_THOUSANDTH);
  }

  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE transaction
      SET tax = '50'
      WHERE id = 5;
      
      UPDATE transaction
      SET security_count_split_adjusted = '31.5',
          date = '2020-11-11' -- transaction must be after transaction 5
      WHERE id = 4;
      """)
  @Test
  void getLots_partialLot_ok() throws Exception {
    MvcResult mvcResult = getLots(FIRST_DEPOT, AMZN).andExpect(status().isOk()).andReturn();
    List<LotDto> lots = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
    });

    assertThat(lots).hasSize(2);

    LotDto lot = lots.getFirst();
    assertThat(lot.getDepotId()).isEqualTo(FIRST_DEPOT);
    assertThat(lot.getSecurityId()).isEqualTo(AMZN);
    assertThat(lot.getCurrency()).isEqualTo("EUR");
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2020, NOVEMBER, 10));
    assertThat(lot.getTime()).isEqualTo("19:59:12");
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(1147);
    assertThat(lot.getCount()).isEqualByComparingTo("22.5");
    assertThat(lot.getBuyInAbsolute()).isCloseTo(new BigDecimal("2903.0667"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getTax()).isCloseTo(new BigDecimal("41.6667"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getFee()).isCloseTo(new BigDecimal("8.3333"), ACCURACY_ONE_THOUSANDTH);
    // current price 138.58 EUR
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("3118.05");
    assertThat(lot.getPerformanceAbsolute()).isCloseTo(new BigDecimal("214.9833"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("0.07406"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getCagr()).isCloseTo(new BigDecimal("0.02301"), ACCURACY_ONE_THOUSANDTH);

    lot = lots.get(1);
    assertThat(lot.getDepotId()).isEqualTo(FIRST_DEPOT);
    assertThat(lot.getSecurityId()).isEqualTo(AMZN);
    assertThat(lot.getCurrency()).isEqualTo("EUR");
    assertThat(lot.getDate()).isEqualTo(LocalDate.of(2021, APRIL, 26));
    assertThat(lot.getTime()).isEqualTo("16:57:56");
    assertThat(lot.getHoldingPeriodInDays()).isEqualTo(980);
    assertThat(lot.getCount()).isEqualByComparingTo("27");
    assertThat(lot.getBuyInAbsolute()).isEqualByComparingTo("3737.48");
    assertThat(lot.getTax()).isEqualByComparingTo(ZERO);
    assertThat(lot.getFee()).isEqualTo("10");
    // current price 138.58 EUR
    assertThat(lot.getCurrentSizeAbsolute()).isEqualByComparingTo("3741.66");
    assertThat(lot.getPerformanceAbsolute()).isEqualByComparingTo("4.18");
    assertThat(lot.getPerformanceRelative()).isCloseTo(new BigDecimal("0.00112"), ACCURACY_ONE_THOUSANDTH);
    assertThat(lot.getCagr()).isCloseTo(new BigDecimal("0.00042"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getLots_securityNotPartOfDepot_ok() throws Exception {
    MvcResult mvcResult = getLots(FIRST_DEPOT, MSFT).andExpect(status().isOk()).andReturn();
    List<LotDto> lots = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
    });
    assertThat(lots).isEmpty();
  }

  @Test
  void getLots_securityIdDoesNotExist_notFound() throws Exception {
    MvcResult mvcResult = getLots(FIRST_DEPOT, 999).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getLots_depotIdDoesNotExist_notFound() throws Exception {
    MvcResult mvcResult = getLots(999, AMZN).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  private ResultActions getLots(long depotId, long securityId) throws Exception {
    return mockMvc.perform(get(String.format(ENDPOINT, depotId, securityId)));
  }
}
