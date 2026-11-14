package de.as.traquity.depot.performance;

import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static integration.DepotIds.BUY_IN_ZERO;
import static integration.DepotIds.EMPTY_DEPOT;
import static integration.DepotIds.FIRST_DEPOT;
import static integration.DepotIds.OTHER_DEPOT;
import static integration.DepotIds.USD_DEPOT_1;
import static integration.DepotIds.WEEKEND_FIRST_TRANSACTION_DEPOT;
import static integration.SecurityIds.AAPL;
import static integration.SecurityIds.ASML;
import static integration.SecurityIds.CRM;
import static integration.SecurityIds.DHR;
import static integration.SecurityIds.HAG;
import static integration.SecurityIds.MAIN;
import static integration.SecurityIds.MSFT;
import static integration.SecurityIds.NVDA;
import static integration.SecurityIds.QCOM;
import static integration.SecurityIds.VNGGF;
import static java.math.BigDecimal.ZERO;
import static java.time.DayOfWeek.SATURDAY;
import static java.time.DayOfWeek.SUNDAY;
import static java.time.Month.DECEMBER;
import static java.time.Month.FEBRUARY;
import static java.time.Month.JANUARY;
import static java.time.Month.JULY;
import static java.time.Month.MARCH;
import static java.time.Month.OCTOBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.performance.api.model.DepotPerformanceDto;
import de.as.traquity.depot.performance.api.model.DepotValueDto;
import integration.IntegrationTest;
import integration.sql.TestDataQuery;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Random;
import java.util.Set;
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
class GetDepotPerformanceTest {

  private static final String ENDPOINT = "/depot-performance";

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
  void getDepotPerformance_oneDepot_ok() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of(OTHER_DEPOT)).andExpect(status().isOk()).andReturn();
    DepotPerformanceDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DepotPerformanceDto.class);
    List<DepotValueDto> values = responseBody.getValues();

    assertThat(responseBody.getExtendedInternalRateOfReturn()).isCloseTo(new BigDecimal("0.01497"), ACCURACY_ONE_THOUSANDTH);

    // check length - 2024-01-01 itself is dropped: its value is identical to the day before (no transaction/price update since 2023-05-17),
    // so it's treated as a duplicate "today" with no fresh closing price yet, and 2023-12-29 (Friday) becomes the new last entry
    assertThat(values).hasSize(726);

    // check first entry - no historical price exists yet for Hensoldt, so the BUY's own price (1269 / 100 shares) values the position
    DepotValueDto depotValueDto = values.getFirst();
    assertThat(depotValueDto.getDate()).isEqualTo(LocalDate.of(2021, MARCH, 19));
    assertThat(depotValueDto.getInvestedCapital()).isCloseTo(new BigDecimal("1269"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getCashPosition()).isCloseTo(ZERO, ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getAbsoluteValue()).isCloseTo(new BigDecimal("1269"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceAbsolute()).isCloseTo(ZERO, ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceRelative()).isCloseTo(ZERO, ACCURACY_ONE_THOUSANDTH);

    // check last entry - still no real historical price for Hensoldt/Nvidia, so both positions are valued at their latest BUY's implied price
    depotValueDto = values.getLast();
    assertThat(depotValueDto.getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(depotValueDto.getInvestedCapital()).isCloseTo(new BigDecimal("4130.12"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getCashPosition()).isCloseTo(new BigDecimal("137.67"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getAbsoluteValue()).isCloseTo(new BigDecimal("4134.28"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceAbsolute()).isCloseTo(new BigDecimal("4.16"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceRelative()).isCloseTo(new BigDecimal("0.000813"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
        INSERT INTO HISTORICAL_SECURITY_PRICE (SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
        VALUES ((SELECT ID FROM SECURITY WHERE NAME = 'Hensoldt'), 101, 33.8, 'EUR', '2023-12-31', current_timestamp, current_timestamp),
               ((SELECT ID FROM SECURITY WHERE NAME = 'Amazon'), 101, 151.94, 'USD', '2023-12-31', current_timestamp, current_timestamp),
               ((SELECT ID FROM SECURITY WHERE NAME = 'LVMH'), 101, 614.6, 'EUR', '2023-12-31', current_timestamp, current_timestamp),
               ((SELECT ID FROM SECURITY WHERE NAME = 'Nvidia'), 101, 495.22, 'USD', '2023-12-31', current_timestamp, current_timestamp);
      
        INSERT INTO EXCHANGE_RATE (DATE, BASE_CURRENCY, TARGET_CURRENCY, EXCHANGE_RATE, CREATED_AT, UPDATED_AT, VERSION)
        VALUES ('2023-12-31', 'EUR', 'USD', '1.1056', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void getDepotPerformance_twoDepots_ok() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of(FIRST_DEPOT, OTHER_DEPOT)).andExpect(status().isOk()).andReturn();
    DepotPerformanceDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DepotPerformanceDto.class);
    List<DepotValueDto> values = responseBody.getValues();

    assertThat(responseBody.getExtendedInternalRateOfReturn()).isCloseTo(new BigDecimal("0.25235"), ACCURACY_ONE_THOUSANDTH);

    // check length
    assertThat(values).hasSize(906);

    // check first entry - no historical price exists yet for Amazon, so the BUY's own price (3789.45 / 1.35 shares) values the position;
    // the fee (10) isn't part of that price, but is part of investedCapital, hence the small negative performance on the purchase day itself
    DepotValueDto depotValueDto = values.getFirst();
    assertThat(depotValueDto.getDate()).isEqualTo(LocalDate.of(2020, JULY, 13));
    assertThat(depotValueDto.getInvestedCapital()).isCloseTo(new BigDecimal("3799.45"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getCashPosition()).isCloseTo(new BigDecimal("0"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getAbsoluteValue()).isCloseTo(new BigDecimal("3789.45"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceAbsolute()).isCloseTo(new BigDecimal("-10"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceRelative()).isCloseTo(new BigDecimal("-0.00263"), ACCURACY_ONE_THOUSANDTH);

    // check last entry
    depotValueDto = values.getLast();
    assertThat(depotValueDto.getDate()).isEqualTo(LocalDate.of(2024, JANUARY, 1));
    assertThat(depotValueDto.getInvestedCapital()).isCloseTo(new BigDecimal("17559.28"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getCashPosition()).isCloseTo(new BigDecimal("33.49"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getAbsoluteValue()).isCloseTo(new BigDecimal("30621.76599"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceAbsolute()).isCloseTo(new BigDecimal("13062.48599"), ACCURACY_ONE_THOUSANDTH);
    assertThat(depotValueDto.getPerformanceRelative()).isCloseTo(new BigDecimal("0.74391"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
        INSERT INTO HISTORICAL_SECURITY_PRICE (SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
        VALUES ((SELECT ID FROM SECURITY WHERE NAME = 'Hensoldt'), 101, 33.8, 'EUR', '2024-01-01', current_timestamp, current_timestamp);
      """)
  void getDepotPerformance_lastDayHasFreshPrice_notRemoved() throws Exception {
    // unlike getDepotPerformance_oneDepot_ok, "today" (2024-01-01) now has its own real closing price, so its value differs from the
    // day before and it must be kept as the last entry rather than dropped as a stale duplicate
    MvcResult mvcResult = getDepotPerformance(Set.of(OTHER_DEPOT)).andExpect(status().isOk()).andReturn();
    DepotPerformanceDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DepotPerformanceDto.class);
    List<DepotValueDto> values = responseBody.getValues();

    assertThat(values).hasSize(727);

    DepotValueDto depotValueDto = values.getLast();
    assertThat(depotValueDto.getDate()).isEqualTo(LocalDate.of(2024, JANUARY, 1));
    assertThat(depotValueDto.getAbsoluteValue()).isCloseTo(new BigDecimal("9434.28"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
        INSERT INTO HISTORICAL_SECURITY_PRICE (SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
        VALUES ((SELECT ID FROM SECURITY WHERE NAME = 'Hensoldt'), 101, 13.00, 'EUR', '2021-06-01', current_timestamp, current_timestamp);
        UPDATE HISTORICAL_SECURITY_PRICE SET DATA_SOURCE_ID = 101, PRICE = '200.00'
        WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Nvidia') AND DATE = '2021-09-28';
      """)
  void getDepotPerformance_transactionPricesFillGapsButNeverReplaceARealPrice_ok() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of(OTHER_DEPOT)).andExpect(status().isOk()).andReturn();
    DepotPerformanceDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DepotPerformanceDto.class);
    List<DepotValueDto> values = responseBody.getValues();

    // Hensoldt-only holding; the 2021-06-01 real quote (13.00) is more recent than the 2021-03-19 BUY's implied price (12.69) and wins
    assertThat(findByDate(values, LocalDate.of(2021, JULY, 1)).getAbsoluteValue())
        .isCloseTo(new BigDecimal("1300"), ACCURACY_ONE_THOUSANDTH);

    // Nvidia's real quote (200.00) lands on the same day as its only BUY (implied price 178.96) - the real quote must win the tie:
    // 100 * 13.00 (Hensoldt, unchanged) + 5.5 * 200.00 (Nvidia) = 2400
    assertThat(findByDate(values, LocalDate.of(2021, OCTOBER, 1)).getAbsoluteValue())
        .isCloseTo(new BigDecimal("2400"), ACCURACY_ONE_THOUSANDTH);

    // the 2022-01-19 Hensoldt BUY (150 @ 1890, i.e. 12.6/share) has no real quote of its own, but is more recent than the 2021-06-01
    // real quote, so it now values the whole Hensoldt position: 250 * 12.6 (Hensoldt) + 5.5 * 200.00 (Nvidia, unchanged) = 4250
    assertThat(findByDate(values, LocalDate.of(2022, FEBRUARY, 1)).getAbsoluteValue())
        .isCloseTo(new BigDecimal("4250"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getDepotPerformance_investedCapitalZero_ok() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of(BUY_IN_ZERO)).andExpect(status().isOk()).andReturn();
    DepotPerformanceDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DepotPerformanceDto.class);
    List<DepotValueDto> values = responseBody.getValues();

    // first entry - the free buy of 40 Alphabet A shares sets their price to 0, so value and invested capital are both 0
    DepotValueDto depotValueDto = values.getFirst();
    assertThat(depotValueDto.getDate()).isEqualTo(LocalDate.of(2020, MARCH, 13));
    assertThat(depotValueDto.getInvestedCapital()).isEqualByComparingTo(ZERO);
    assertThat(depotValueDto.getAbsoluteValue()).isEqualByComparingTo(ZERO);
    assertThat(depotValueDto.getPerformanceAbsolute()).isEqualByComparingTo(ZERO);
    assertThat(depotValueDto.getPerformanceRelative()).isEqualByComparingTo(ZERO);

    // last entry - 40 * 126.76 against an invested capital of 0
    depotValueDto = values.getLast();
    assertThat(depotValueDto.getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(depotValueDto.getInvestedCapital()).isEqualByComparingTo(ZERO);
    assertThat(depotValueDto.getAbsoluteValue()).isEqualByComparingTo("5070.4");
    assertThat(depotValueDto.getPerformanceAbsolute()).isEqualByComparingTo("5070.4");
    assertThat(depotValueDto.getPerformanceRelative()).isNull();
  }

  @Test
  void getDepotPerformance_noTransactions_ok() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of(EMPTY_DEPOT)).andExpect(status().isOk()).andReturn();
    DepotPerformanceDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DepotPerformanceDto.class);
    List<DepotValueDto> values = responseBody.getValues();
    assertThat(responseBody.getExtendedInternalRateOfReturn()).isZero();
    assertThat(values).isEmpty();
  }

  @Test
  void getDepotPerformance_allTransactionsInTheFuture_ok() throws Exception {
    // precondition: the depot has at least one transactions AND all transactions are in the future
    assertThat(TestDataQuery.getTransactionCountByDepotId(WEEKEND_FIRST_TRANSACTION_DEPOT)).isPositive();
    assertThat(TestDataQuery.getTransactionCountByDepotIdOnOrBefore(WEEKEND_FIRST_TRANSACTION_DEPOT, LocalDate.of(2024, JANUARY, 1)))
        .isZero();

    MvcResult mvcResult = getDepotPerformance(Set.of(WEEKEND_FIRST_TRANSACTION_DEPOT)).andExpect(status().isOk()).andReturn();
    DepotPerformanceDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DepotPerformanceDto.class);
    assertThat(responseBody.getExtendedInternalRateOfReturn()).isZero();
    assertThat(responseBody.getValues()).isEmpty();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = "DELETE FROM EXCHANGE_RATE;")
  void getDepotPerformance_tenYearsOfForeignCurrencyPrices_respondsWithinAcceptableTime() throws Exception {
    List<Long> securityIds = List.of(MSFT, AAPL, HAG, VNGGF, ASML, NVDA, DHR, CRM, MAIN, QCOM);
    // one distinct, non-EUR currency per security (see ServerConfigurationServiceImpl.SUPPORTED_CURRENCIES) - every
    // single price row now needs its own currency pair's exchange rate, instead of all 10 sharing one
    List<String> currencies = List.of("USD", "JPY", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "AUD", "CAD");
    LocalDate firstDate = LocalDate.of(2014, JANUARY, 1);
    LocalDate lastPriceDate = LocalDate.of(2023, DECEMBER, 29);
    Random random = new Random();

    try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:traquity", "test-user", "test-password")) {
      PreparedStatement priceStatement = connection.prepareStatement("""
          MERGE INTO HISTORICAL_SECURITY_PRICE (SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
          KEY (SECURITY_ID, DATE)
          VALUES (?, 101, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          """);
      PreparedStatement exchangeRateStatement = connection.prepareStatement("""
          INSERT INTO EXCHANGE_RATE (DATE, BASE_CURRENCY, TARGET_CURRENCY, EXCHANGE_RATE, CREATED_AT, UPDATED_AT, VERSION)
          VALUES (?, 'EUR', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
          """);

      for (LocalDate date = firstDate; !date.isAfter(lastPriceDate); date = date.plusDays(1)) {
        if (date.getDayOfWeek() == SATURDAY || date.getDayOfWeek() == SUNDAY) {
          continue;
        }

        for (String currency : currencies) {
          exchangeRateStatement.setDate(1, Date.valueOf(date));
          exchangeRateStatement.setString(2, currency);
          exchangeRateStatement.setBigDecimal(3, BigDecimal.valueOf(1 + random.nextDouble()));
          exchangeRateStatement.addBatch();
        }

        for (int i = 0; i < securityIds.size(); i++) {
          priceStatement.setLong(1, securityIds.get(i));
          priceStatement.setBigDecimal(2, BigDecimal.valueOf(1 + random.nextDouble() * 500));
          priceStatement.setString(3, currencies.get(i));
          priceStatement.setDate(4, Date.valueOf(date));
          priceStatement.addBatch();
        }
      }
      exchangeRateStatement.executeBatch();
      priceStatement.executeBatch();

      PreparedStatement transactionStatement = connection.prepareStatement("""
          INSERT INTO TRANSACTION (DATE, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE, CREATED_AT, UPDATED_AT, VERSION)
          VALUES ('2014-01-01', ?, ?, 'BUY', '10', '1000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
          """);
      for (long securityId : securityIds) {
        transactionStatement.setLong(1, EMPTY_DEPOT);
        transactionStatement.setLong(2, securityId);
        transactionStatement.addBatch();
      }
      transactionStatement.executeBatch();
    }

    long start = System.currentTimeMillis();
    getDepotPerformance(Set.of(EMPTY_DEPOT)).andExpect(status().isOk());
    long elapsed = System.currentTimeMillis() - start;
    assertThat(elapsed).isLessThan(3000);
  }

  /**
   * First and only transaction is on Saturday, June 1st 2024. When calculating performance on Sunday, June 2nd 2024, a valid result shall be
   */
  @Test
  void getDepotPerformance_firstTransactionOnWeekendWithNoTradingDayYet_ok() throws Exception {
    // first (and only) transaction is on Saturday 2024-06-01; "now" is still within the same weekend (Sunday)
    when(clock.instant()).thenReturn(Instant.parse("2024-06-02T10:00:00Z"));
    MvcResult mvcResult = getDepotPerformance(Set.of(WEEKEND_FIRST_TRANSACTION_DEPOT)).andExpect(status().isOk()).andReturn();
  }

  @Test
  void getDepotPerformance_differentCurrencies_badRequest() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of(FIRST_DEPOT, USD_DEPOT_1)).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDepotPerformance_emptyDepotIds_badRequest() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of()).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDepotPerformance_noDepotIdsQueryParam_badRequest() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDepotPerformance_oneDepotIdDoesNotExist_notFound() throws Exception {
    MvcResult mvcResult = getDepotPerformance(Set.of(FIRST_DEPOT, 999L)).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  private ResultActions getDepotPerformance(Set<Long> depotIds) throws Exception {
    StringBuilder urlBuilder = new StringBuilder(ENDPOINT).append("?depotIds=");
    for (Long depotId : depotIds) {
      urlBuilder.append(depotId).append(",");
    }
    urlBuilder.deleteCharAt(urlBuilder.length() - 1); // remove last comma

    String url = urlBuilder.toString();
    return mockMvc.perform(get(url));
  }

  private DepotValueDto findByDate(List<DepotValueDto> values, LocalDate date) {
    return values.stream().filter(value -> value.getDate().equals(date)).findFirst()
        .orElseThrow(() -> new AssertionError("No DepotValue found for date " + date));
  }
}
