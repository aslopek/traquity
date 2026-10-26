package de.as.traquity.price.security.historical;

import static integration.MockServerUtils.respondWithFixture;
import static integration.SecurityIds.AMZN;
import static integration.SecurityIds.MAIN;
import static java.time.Month.DECEMBER;
import static java.time.Month.JANUARY;
import static java.time.Month.JUNE;
import static java.time.Month.NOVEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;

import de.as.traquity.exchangerates.CurrencyConversionRequest;
import de.as.traquity.exchangerates.ExchangeRateService;
import integration.IntegrationTest;
import integration.SecurityIds;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseActions;
import org.springframework.web.client.RestTemplate;

@IntegrationTest
class HistoricalSecurityPriceUpdaterTest {

  @MockitoBean
  private ExchangeRateService exchangeRateServiceMock;

  @Autowired
  private HistoricalSecurityPriceRepository priceRepository;

  @Autowired
  private HistoricalSecurityPriceServiceImpl historicalSecurityPriceService;

  @Autowired
  private RestTemplate restTemplate;

  @MockitoBean
  private Clock clock;

  private MockRestServiceServer mockServer;

  private HistoricalSecurityPriceUpdater subject;

  @BeforeEach
  void beforeEach() {
    mockServer = MockRestServiceServer.createServer(restTemplate);
    subject = new HistoricalSecurityPriceUpdater(historicalSecurityPriceService);
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
    when(exchangeRateServiceMock.convert(anyList(), any(), any())).thenAnswer(invocation -> {
      List<CurrencyConversionRequest> items = invocation.getArgument(0);
      return items.stream().map(CurrencyConversionRequest::getValue).toList();
    });
  }

  @AfterEach
  void afterEach() {
    mockServer.reset();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = "DELETE FROM HISTORICAL_SECURITY_PRICE WHERE DATE >= '2023-12-13'")
  void updateHistoricalPrices_somePricesExistAlready() {
    respondWithFixture(mockServer,
        "https://stock-price.api/v1/AMZN?range=30d",
        "fixtures/historical-security-prices/data-source-101/amzn-30-days.json");
    respondWithFixture(mockServer, "https://stock-price.api/v2?isin=US72352L1061.XETR",
        "fixtures/historical-security-prices/data-source-102/pins-30-days.json");
    final long historicalPricesCount = priceRepository.count();
    subject.updateHistoricalPrices();

    // verify new AMZN prices
    List<HistoricalSecurityPriceEntity> newPricesAmzn =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(AMZN,
            LocalDate.of(2023, DECEMBER, 13));
    assertThat(newPricesAmzn).hasSize(11);
    verifyAmznPricesDecember2023();

    // verify new PINS prices
    List<HistoricalSecurityPriceEntity> newPricesPins =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.PINS,
            LocalDate.of(2023, DECEMBER, 13));
    assertThat(newPricesPins).hasSize(12);
    for (HistoricalSecurityPriceEntity entity : newPricesPins) {
      assertThat(entity.getCurrency()).isEqualTo("EUR");
    }
    verifyPinsPricesDecember2023();

    // verify no prices for CRM were loaded, as the configuration is deactivated
    assertThat(priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.CRM,
        LocalDate.EPOCH)).isEmpty();

    // verify nothing else has changed
    assertThat(priceRepository.count()).isEqualTo(historicalPricesCount + newPricesAmzn.size() + newPricesPins.size());
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = "DELETE FROM HISTORICAL_SECURITY_PRICE")
  void updateHistoricalPrices_noPricesExist() {
    respondWithFixture(mockServer,
        "https://stock-price.api/v1/AMZN?range=30d",
        "fixtures/historical-security-prices/data-source-101/amzn-30-days.json");
    respondWithFixture(mockServer,
        "https://stock-price.api/v1/AMZN?range=1y",
        "fixtures/historical-security-prices/data-source-101/amzn-365-days.json");
    ResponseActions pinsRequest = respondWithFixture(mockServer, "https://stock-price.api/v2?isin=US72352L1061.XETR",
        "fixtures/historical-security-prices/data-source-102/pins-30-days.json");

    subject.updateHistoricalPrices();

    // verify headers have been sent correctly
    pinsRequest.andExpect(header("x-header-a", "valueA"))
        .andExpect(header("x-header-b", "valueB"))
        .andExpect(header("x-header-c", "secret-aGVsbG86d29ybGQ="));


    // verify AMZN prices
    List<HistoricalSecurityPriceEntity> allPricesAmzn =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(AMZN,
            LocalDate.of(1970, JANUARY, 1));
    assertThat(allPricesAmzn).hasSize(252);

    HistoricalSecurityPriceEntity price = allPricesAmzn.getFirst();
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2022, DECEMBER, 29));
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("78.6"));

    price = allPricesAmzn.getLast();
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("138.58"));

    verifyAmznPricesDecember2023();

    // verify PINS prices
    List<HistoricalSecurityPriceEntity> allPricesPins =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.PINS, LocalDate.of(1970, JANUARY, 1));
    assertThat(allPricesPins).hasSize(21);

    for (HistoricalSecurityPriceEntity entity : allPricesPins) {
      assertThat(entity.getCurrency()).isEqualTo("EUR");
    }

    price = allPricesPins.getFirst();
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2023, NOVEMBER, 30));
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("34.07"));

    price = allPricesPins.getLast();
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("37.04"));

    verifyPinsPricesDecember2023();

    // verify no prices for CRM were loaded, as the configuration is deactivated
    assertThat(priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.CRM,
        LocalDate.EPOCH)).isEmpty();

    // verify nothing else has changed
    assertThat(priceRepository.count()).isEqualTo(allPricesAmzn.size() + allPricesPins.size());
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE HISTORICAL_SECURITY_PRICE_CONFIG
      SET IS_ACTIVE = TRUE
      WHERE EXTERNAL_SECURITY_ID = 'MAIN';
      UPDATE HISTORICAL_SECURITY_PRICE_CONFIG
      SET IS_ACTIVE = FALSE
      WHERE EXTERNAL_SECURITY_ID != 'MAIN';
      """)
  void updateHistoricalPrices_noCurrencyInfo_ok() {
    when(clock.instant()).thenReturn(Instant.parse("2024-01-26T20:44:38Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
    respondWithFixture(mockServer, "https://stock-price.api/v4/stocks/prices?id=MAIN&range=MAX",
        "fixtures/historical-security-prices/data-source-104/main-5-days.json");

    subject.updateHistoricalPrices();

    List<HistoricalSecurityPriceEntity> mainPrices = priceRepository
        .findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(MAIN, LocalDate.of(2024, JANUARY, 19));
    assertThat(mainPrices).hasSize(5);

    assertThat(mainPrices.getFirst().getDate()).isEqualTo(LocalDate.of(2024, JANUARY, 19));
    assertThat(mainPrices.getFirst().getPrice()).isEqualByComparingTo("43.1");
    assertThat(mainPrices.getFirst().getCurrency()).isEqualTo("USD");

    assertThat(mainPrices.get(1).getDate()).isEqualTo(LocalDate.of(2024, JANUARY, 22));
    assertThat(mainPrices.get(1).getPrice()).isEqualByComparingTo("43.2");
    assertThat(mainPrices.get(1).getCurrency()).isEqualTo("USD");

    assertThat(mainPrices.get(2).getDate()).isEqualTo(LocalDate.of(2024, JANUARY, 23));
    assertThat(mainPrices.get(2).getPrice()).isEqualByComparingTo("43.17");
    assertThat(mainPrices.get(2).getCurrency()).isEqualTo("USD");

    assertThat(mainPrices.get(3).getDate()).isEqualTo(LocalDate.of(2024, JANUARY, 24));
    assertThat(mainPrices.get(3).getPrice()).isEqualByComparingTo("43");
    assertThat(mainPrices.get(3).getCurrency()).isEqualTo("USD");

    assertThat(mainPrices.get(4).getDate()).isEqualTo(LocalDate.of(2024, JANUARY, 25));
    assertThat(mainPrices.get(4).getPrice()).isEqualByComparingTo("43.23");
    assertThat(mainPrices.get(4).getCurrency()).isEqualTo("USD");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE HISTORICAL_SECURITY_PRICE_CONFIG
      SET IS_ACTIVE = TRUE
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Equinix');
      UPDATE HISTORICAL_SECURITY_PRICE_CONFIG
      SET IS_ACTIVE = FALSE
      WHERE SECURITY_ID != (SELECT ID FROM SECURITY WHERE NAME = 'Equinix');
      """)
  void updateHistoricalPrices_isinKeyedSource_ok() {
    ResponseActions thirtyDaysRequest = respondWithFixture(mockServer,
        "https://stock-price.api/v5/US29444U7000?range=30d",
        "fixtures/historical-security-prices/data-source-105/eqix-30-days.json");
    ResponseActions yearRequest = respondWithFixture(mockServer,
        "https://stock-price.api/v5/US29444U7000?range=1y",
        "fixtures/historical-security-prices/data-source-105/eqix-365-days.json");

    subject.updateHistoricalPrices();

    thirtyDaysRequest.andExpect(header("x-isin", "US29444U7000"));
    yearRequest.andExpect(header("x-isin", "US29444U7000"));

    List<HistoricalSecurityPriceEntity> prices = priceRepository
        .findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.EQIX, LocalDate.EPOCH);
    assertThat(prices).hasSize(2);
    assertThat(prices.getFirst().getDate()).isEqualTo(LocalDate.of(2023, JUNE, 1));
    assertThat(prices.getFirst().getPrice()).isEqualByComparingTo(new BigDecimal("78.5"));
    assertThat(prices.getLast().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 15));
    assertThat(prices.getLast().getPrice()).isEqualByComparingTo(new BigDecimal("85.21"));
  }

  private void verifyAmznPricesDecember2023() {
    List<HistoricalSecurityPriceEntity> amznPricesDecember2023 =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(AMZN,
            LocalDate.of(2023, DECEMBER, 1));
    assertThat(amznPricesDecember2023).hasSize(19);

    assertThat(amznPricesDecember2023.getFirst().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 1));
    assertThat(amznPricesDecember2023.get(18).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));

    for (HistoricalSecurityPriceEntity price : amznPricesDecember2023) {
      assertThat(price.getCurrency()).isEqualTo("EUR");
    }

    List<BigDecimal> priceValues =
        amznPricesDecember2023.stream().map(HistoricalSecurityPriceEntity::getPrice).toList();
    assertThat(priceValues).containsExactlyElementsOf(
        List.of(new BigDecimal("134.74"), new BigDecimal("133.32"), new BigDecimal("136.0"), new BigDecimal("134.68"),
            new BigDecimal("136.28"), new BigDecimal("136.5"), new BigDecimal("134.62"), new BigDecimal("135.5"),
            new BigDecimal("136.88"), new BigDecimal("134.54"), new BigDecimal("136.66"), new BigDecimal("140.04"),
            new BigDecimal("140.04"), new BigDecimal("140.94"), new BigDecimal("139.2"), new BigDecimal("139.26"),
            new BigDecimal("138.22"), new BigDecimal("138.34"), new BigDecimal("138.58")));
  }

  private void verifyPinsPricesDecember2023() {
    List<HistoricalSecurityPriceEntity> pinsPricesDecember2023 =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.PINS,
            LocalDate.of(2023, DECEMBER, 1));
    assertThat(pinsPricesDecember2023).hasSize(20);

    assertThat(pinsPricesDecember2023.getFirst().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 1));
    assertThat(pinsPricesDecember2023.get(19).getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));

    List<BigDecimal> priceValues =
        pinsPricesDecember2023.stream().map(HistoricalSecurityPriceEntity::getPrice).toList();
    assertThat(priceValues).containsExactlyElementsOf(
        List.of(new BigDecimal("34.79"), new BigDecimal("34.5"), new BigDecimal("34.11"), new BigDecimal("33.52"),
            new BigDecimal("34.02"), new BigDecimal("34.91"), new BigDecimal("35.36"), new BigDecimal("36.13"),
            new BigDecimal("36.51"), new BigDecimal("37.01"), new BigDecimal("37.37"), new BigDecimal("37.7"),
            new BigDecimal("38.04"), new BigDecimal("37.12"), new BigDecimal("37.36"), new BigDecimal("37.38"),
            new BigDecimal("37.16"), new BigDecimal("37.3"), new BigDecimal("37.27"), new BigDecimal("37.04")));
  }
}
