package de.as.traquity.price.security.historical;

import java.math.BigDecimal;

import static integration.SecurityIds.PINS;
import static java.time.Month.DECEMBER;
import static java.time.Month.MARCH;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@IntegrationTest
class GetHistoricalSecurityPricesTest {

  private static final String ENDPOINT = "/securities/%d/historical-prices";
  private static final Offset<Double> ACCURACY_ONE_THOUSANDTH = Offset.strictOffset(0.001);

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getAllPrices_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, PINS))).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
    assertThat(prices).hasSize(21);

    // verify date range and sorting by date
    assertThat(prices.getFirst().getDate()).isEqualTo(LocalDate.of(2022, MARCH, 25));
    assertThat(prices.get(1).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 1));
    assertThat(prices.get(20).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    for (int i = 1; i < prices.size(); i++) {
      assertThat(prices.get(i).getDate()).isAfter(prices.get(i - 1).getDate());
    }

    // verify 'common' properties
    for (HistoricalSecurityPriceDto price : prices) {
      assertThat(price.getSecurityId()).isEqualTo(PINS);
      assertThat(price.getCurrency()).isEqualTo("USD");
    }

    // verify values
    // derived from the buy on 2022-03-25 (transaction 34)
    assertThat(prices.getFirst().getPrice().doubleValue()).isCloseTo(25.49, ACCURACY_ONE_THOUSANDTH);
    List<Double> priceValues = prices.stream().skip(1).map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).containsExactlyElementsOf(
        List.of(34.79, 34.5, 34.11, 33.52, 34.02, 34.91, 35.36, 36.13, 36.51, 37.01, 37.37, 37.7, 38.04, 37.12, 37.36,
            37.38, 37.16, 37.3, 37.27, 37.04));
  }

  @Test
  void getAllPrices_startDate_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.AMZN)).queryParam("startDate", "2023-12-21"))
            .andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
    assertThat(prices).hasSize(5);

    // verify date range and sorting by date
    assertThat(prices.get(0).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 21));
    assertThat(prices.get(4).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    for (int i = 1; i < prices.size(); i++) {
      assertThat(prices.get(i).getDate()).isAfter(prices.get(i - 1).getDate());
    }

    // verify 'common' properties
    for (HistoricalSecurityPriceDto price : prices) {
      assertThat(price.getSecurityId()).isEqualTo(SecurityIds.AMZN);
      assertThat(price.getCurrency()).isEqualTo("EUR");
    }

    // verify values
    List<Double> priceValues = prices.stream().map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).containsExactlyElementsOf(List.of(139.2, 139.26, 138.22, 138.34, 138.58));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      UPDATE HISTORICAL_SECURITY_PRICE SET CURRENCY = 'EUR'
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest') AND DATE < '2023-12-05';
      """)
  void getAllPrices_mixedCurrencies_earlierConvertedToLatestCurrency_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, PINS))).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(
        LocalDate.of(2023, DECEMBER, 1),
        LocalDate.of(2023, DECEMBER, 4),
        LocalDate.of(2023, DECEMBER, 5),
        LocalDate.of(2023, DECEMBER, 6),
        LocalDate.of(2023, DECEMBER, 7),
        LocalDate.of(2023, DECEMBER, 8));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("USD");
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getPrice).usingElementComparator(BigDecimal::compareTo).containsExactly(
        new BigDecimal("37.834125"), // 2023-12-01: 34.79 EUR * 1.0875 EUR/USD
        new BigDecimal("37.4946"),   // 2023-12-04: 34.50 EUR * 1.0868 EUR/USD
        new BigDecimal("34.11"),     // 2023-12-05: 34.11 USD, not converted
        new BigDecimal("33.52"),     // 2023-12-06: 33.52 USD, not converted
        new BigDecimal("34.02"),     // 2023-12-07: 34.02 USD, not converted
        new BigDecimal("34.91"));    // 2023-12-08: 34.91 USD, not converted
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      UPDATE HISTORICAL_SECURITY_PRICE SET CURRENCY = 'EUR'
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest') AND DATE = '2023-12-08';
      """)
  void getAllPrices_mixedCurrencies_onlyLatestDiffers_allConvertedToLatestCurrency_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, PINS))).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(
        LocalDate.of(2023, DECEMBER, 1),
        LocalDate.of(2023, DECEMBER, 4),
        LocalDate.of(2023, DECEMBER, 5),
        LocalDate.of(2023, DECEMBER, 6),
        LocalDate.of(2023, DECEMBER, 7),
        LocalDate.of(2023, DECEMBER, 8));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("EUR");
    List<Double> priceValues = prices.stream().map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).zipSatisfy(List.of(
            31.9908,  // 2023-12-01: 34.79 USD / 1.0875 EUR/USD
            31.74457, // 2023-12-04: 34.50 USD / 1.0868 EUR/USD
            31.5337,  // 2023-12-05: 34.11 USD / 1.0817 EUR/USD
            31.10039, // 2023-12-06: 33.52 USD / 1.0778 EUR/USD
            31.58481, // 2023-12-07: 34.02 USD / 1.0771 EUR/USD
            34.91),   // 2023-12-08: 34.91 EUR, not converted
        (actual, expected) -> assertThat(actual).isCloseTo(expected, ACCURACY_ONE_THOUSANDTH));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      UPDATE HISTORICAL_SECURITY_PRICE SET CURRENCY = 'EUR', DATA_SOURCE_ID = NULL
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest') AND DATE = '2023-12-08';
      """)
  void getAllPrices_mixedCurrencies_latestIsTradePrice_allConvertedToLatestDataSourceCurrency_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, PINS))).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(
        LocalDate.of(2022, MARCH, 25),
        LocalDate.of(2023, DECEMBER, 1),
        LocalDate.of(2023, DECEMBER, 4),
        LocalDate.of(2023, DECEMBER, 5),
        LocalDate.of(2023, DECEMBER, 6),
        LocalDate.of(2023, DECEMBER, 7),
        LocalDate.of(2023, DECEMBER, 8));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("USD");
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getPrice).usingElementComparator(BigDecimal::compareTo).containsExactly(
        new BigDecimal("25.49003831417624521072796934865900"), // 2022-03-25: USD, derived from transaction 34, not converted
        new BigDecimal("34.79"),      // 2023-12-01: 34.79 USD, not converted
        new BigDecimal("34.50"),      // 2023-12-04: 34.50 USD, not converted
        new BigDecimal("34.11"),      // 2023-12-05: 34.11 USD, not converted
        new BigDecimal("33.52"),      // 2023-12-06: 33.52 USD, not converted
        new BigDecimal("34.02"),      // 2023-12-07: 34.02 USD, not converted
        new BigDecimal("37.622507")); // 2023-12-08: 34.91 EUR * 1.0777 EUR/USD
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      UPDATE HISTORICAL_SECURITY_PRICE SET CURRENCY = 'EUR', DATA_SOURCE_ID = NULL
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest') AND DATE = '2023-12-08';
      """)
  void getAllPrices_startDate_latestIsTradePrice_convertedToLatestDataSourceCurrencyBeforeStartDate_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("startDate", "2023-12-08"))
        .andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(LocalDate.of(2023, DECEMBER, 8));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("USD");
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getPrice).usingElementComparator(BigDecimal::compareTo).containsExactly(
        new BigDecimal("37.622507")); // 2023-12-08: 34.91 EUR * 1.0777 EUR/USD
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      UPDATE HISTORICAL_SECURITY_PRICE SET DATA_SOURCE_ID = NULL
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest');
      UPDATE HISTORICAL_SECURITY_PRICE SET CURRENCY = 'EUR'
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest') AND DATE = '2023-12-08';
      """)
  void getAllPrices_mixedCurrencies_onlyTradePrices_allConvertedToLatestCurrency_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, PINS))).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(
        LocalDate.of(2023, DECEMBER, 1),
        LocalDate.of(2023, DECEMBER, 4),
        LocalDate.of(2023, DECEMBER, 5),
        LocalDate.of(2023, DECEMBER, 6),
        LocalDate.of(2023, DECEMBER, 7),
        LocalDate.of(2023, DECEMBER, 8));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("EUR");
    List<Double> priceValues = prices.stream().map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).zipSatisfy(List.of(
            31.9908,  // 2023-12-01: 34.79 USD / 1.0875 EUR/USD
            31.74457, // 2023-12-04: 34.50 USD / 1.0868 EUR/USD
            31.5337,  // 2023-12-05: 34.11 USD / 1.0817 EUR/USD
            31.10039, // 2023-12-06: 33.52 USD / 1.0778 EUR/USD
            31.58481, // 2023-12-07: 34.02 USD / 1.0771 EUR/USD
            34.91),   // 2023-12-08: 34.91 EUR, not converted
        (actual, expected) -> assertThat(actual).isCloseTo(expected, ACCURACY_ONE_THOUSANDTH));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      """)
  void getAllPrices_currencyEurToUsd_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.AMZN)).queryParam("currency", "USD"))
        .andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
    assertThat(prices).hasSize(6);

    // verify date range and sorting by date
    assertThat(prices.get(0).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 1));
    assertThat(prices.get(5).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 8));
    for (int i = 1; i < prices.size(); i++) {
      assertThat(prices.get(i).getDate()).isAfter(prices.get(i - 1).getDate());
    }

    // verify 'common' properties
    for (HistoricalSecurityPriceDto price : prices) {
      assertThat(price.getSecurityId()).isEqualTo(SecurityIds.AMZN);
      assertThat(price.getCurrency()).isEqualTo("USD");
    }

    // verify values
    List<Double> priceValues = prices.stream().map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).zipSatisfy(List.of(146.52975, 144.89218, 147.1112, 145.1581, 146.78719, 147.10605),
        (actual, expected) -> assertThat(actual).isCloseTo(expected, ACCURACY_ONE_THOUSANDTH));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      """)
  void getAllPrices_currencyUsdToEur_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("currency", "EUR"))
        .andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
    assertThat(prices).hasSize(6);

    // verify date range and sorting by date
    assertThat(prices.get(0).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 1));
    assertThat(prices.get(5).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 8));
    for (int i = 1; i < prices.size(); i++) {
      assertThat(prices.get(i).getDate()).isAfter(prices.get(i - 1).getDate());
    }

    // verify 'common' properties
    for (HistoricalSecurityPriceDto price : prices) {
      assertThat(price.getSecurityId()).isEqualTo(PINS);
      assertThat(price.getCurrency()).isEqualTo("EUR");
    }

    // verify values
    List<Double> priceValues = prices.stream().map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).zipSatisfy(List.of(31.9908, 31.74457, 31.5337, 31.10039, 31.58481, 32.39306),
        (actual, expected) -> assertThat(actual).isCloseTo(expected, ACCURACY_ONE_THOUSANDTH));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      """)
  void getAllPrices_currencyUsdToEur_startDate_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("currency", "EUR")
        .queryParam("startDate", "2023-12-08")).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
    assertThat(prices).hasSize(1);
    HistoricalSecurityPriceDto price = prices.getFirst();
    assertThat(price.getSecurityId()).isEqualTo(PINS);
    assertThat(price.getPrice().doubleValue()).isCloseTo(32.39306, ACCURACY_ONE_THOUSANDTH);
    assertThat(price.getCurrency()).isEqualTo("EUR");
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 8));
  }

  @Test
  void getAllPrices_securityDoesNotExist() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, 999))).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getAllPrices_securityHasNoPrices() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, SecurityIds.CRM))).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });

    assertThat(prices).isEmpty();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE <> '2023-12-08' AND DATE <> '2023-12-29';
      """)
  void getAllPrices_currencyUsdToEur_outdatedExchangeRate_convertedWithIt_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("currency", "EUR"))
        .andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(
        LocalDate.of(2023, DECEMBER, 8),
        LocalDate.of(2023, DECEMBER, 29));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("EUR");
    List<Double> priceValues = prices.stream().map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).zipSatisfy(List.of(
            32.39306,  // 2023-12-08: 34.91 USD / 1.0777 EUR/USD
            34.36949), // 2023-12-29: 37.04 USD / 1.0777 EUR/USD of 2023-12-08, the latest rate and older than 7 days
        (actual, expected) -> assertThat(actual).isCloseTo(expected, ACCURACY_ONE_THOUSANDTH));
  }

  @Test
  void getAllPrices_currencyUnknown_noPriceConvertible_empty() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("currency", "ABC"))
        .andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).isEmpty();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      UPDATE HISTORICAL_SECURITY_PRICE SET CURRENCY = 'CHF'
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest') AND DATE = '2023-12-04';
      """)
  void getAllPrices_currencyUsdToEur_unconvertiblePriceLeftOut_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("currency", "EUR"))
        .andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(
        LocalDate.of(2023, DECEMBER, 1),
        LocalDate.of(2023, DECEMBER, 5),
        LocalDate.of(2023, DECEMBER, 6),
        LocalDate.of(2023, DECEMBER, 7),
        LocalDate.of(2023, DECEMBER, 8));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("EUR");
    List<Double> priceValues = prices.stream().map(HistoricalSecurityPriceDto::getPrice).map(BigDecimal::doubleValue).toList();
    assertThat(priceValues).zipSatisfy(List.of(31.9908, 31.5337, 31.10039, 31.58481, 32.39306),
        (actual, expected) -> assertThat(actual).isCloseTo(expected, ACCURACY_ONE_THOUSANDTH));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE > '2023-12-08';
      UPDATE HISTORICAL_SECURITY_PRICE SET CURRENCY = 'CHF'
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pinterest') AND DATE = '2023-12-04';
      """)
  void getAllPrices_mixedCurrencies_unconvertiblePriceLeftOut_ok() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, PINS))).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDto> prices =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(prices).extracting(HistoricalSecurityPriceDto::getDate).containsExactly(
        LocalDate.of(2022, MARCH, 25), LocalDate.of(2023, DECEMBER, 1), LocalDate.of(2023, DECEMBER, 5),
        LocalDate.of(2023, DECEMBER, 6), LocalDate.of(2023, DECEMBER, 7), LocalDate.of(2023, DECEMBER, 8));
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getCurrency).containsOnly("USD");
    assertThat(prices).extracting(HistoricalSecurityPriceDto::getPrice).usingElementComparator(BigDecimal::compareTo).containsExactly(
        new BigDecimal("25.49003831417624521072796934865900"), // 2022-03-25: derived from transaction 34
        new BigDecimal("34.79"), new BigDecimal("34.11"), new BigDecimal("33.52"), new BigDecimal("34.02"), new BigDecimal("34.91"));
  }

  @Test
  void getAllPrices_currencyIsMalformed() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("currency", "US$"))
        .andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getAllPrices_startDateIsMalformed() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format(ENDPOINT, PINS)).queryParam("startDate", "01.12.2021"))
            .andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }
}