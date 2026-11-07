package de.as.traquity.price.security.historical;


import static integration.MockServerUtils.respondWithFixture;
import static integration.SecurityIds.AMZN;
import static integration.SecurityIds.CRM;
import static integration.SecurityIds.EQIX;
import static java.time.Month.APRIL;
import static java.time.Month.DECEMBER;
import static java.time.Month.JULY;
import static java.time.Month.NOVEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.exchangerates.CurrencyConversionRequest;
import de.as.traquity.exchangerates.ExchangeRateService;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceConfigReadDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceConfigUpdateDto;
import integration.IntegrationTest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;

@IntegrationTest
class UpdateHistoricalSecurityPriceConfigTest {

  private static final String ENDPOINT = "/securities/%d/historical-prices/config";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @MockitoBean
  private ExchangeRateService exchangeRateServiceMock;

  @Autowired
  private RestTemplate restTemplate;

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private HistoricalSecurityPriceRepository priceRepository;

  @Autowired
  private HistoricalSecurityPriceConfigRepository configRepository;

  @MockitoBean
  private Clock clock;

  private MockRestServiceServer mockServer;

  /**
   * Initialized with values for AMZN stock.
   */
  private HistoricalSecurityPriceConfigUpdateDto amznDataSource101;

  /**
   * Initialized with values for QCOM stock.
   */
  private HistoricalSecurityPriceConfigUpdateDto qcomDataSource102;

  @BeforeEach
  void beforeEach() {
    mockServer = MockRestServiceServer.createServer(restTemplate);
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));

    when(exchangeRateServiceMock.convert(anyList(), any(), any())).thenAnswer(invocation -> {
      List<CurrencyConversionRequest> items = invocation.getArgument(0);
      return items.stream().map(CurrencyConversionRequest::getValue).toList();
    });

    amznDataSource101 = new HistoricalSecurityPriceConfigUpdateDto();
    amznDataSource101.setDataSourceId(101L);
    amznDataSource101.setExternalSecurityId("AMZ.DE");
    amznDataSource101.setIsActive(true);
    amznDataSource101.setVersion(0L);

    qcomDataSource102 = new HistoricalSecurityPriceConfigUpdateDto();
    qcomDataSource102.setDataSourceId(102L);
    qcomDataSource102.setExternalSecurityId("QCOM.XNAS");
    qcomDataSource102.setIsActive(true);
    qcomDataSource102.setVersion(0L);
  }

  @Test
  void changeDatasource_keepExistingPrices_ok() throws Exception {
    MvcResult mvcResult = putConfig(AMZN, amznDataSource101, null).andExpect(status().isOk()).andReturn();
    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody).isEqualTo(expectedRead(amznDataSource101, AMZN, 1L));

    // verify database: config
    HistoricalSecurityPriceConfigEntity configEntity =
        configRepository.findBySecurityId(AMZN).orElseThrow();
    assertThat(configEntity.getVersion()).isOne();
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("AMZ.DE");
    assertThat(configEntity.isActive()).isTrue();

    // verify database: prices (first, last and date sanity check)
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(AMZN, LocalDate.EPOCH);
    // derived from transaction 1
    assertThat(prices.getFirst().getPrice()).isEqualByComparingTo("140.35");
    assertThat(prices.getFirst().getDate()).isEqualTo(LocalDate.of(2020, JULY, 13));
    assertThat(prices.getFirst().getCurrency()).isEqualTo("EUR");
    assertThat(prices.getLast().getPrice()).isEqualTo(new BigDecimal("138.58"));
    assertThat(prices.getLast().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(prices.getLast().getCurrency()).isEqualTo("EUR");
    dateSanityCheck(prices);
  }

  @Test
  void changeDatasource_removeExistingPrices_ok() throws Exception {
    respondWithFixture(mockServer, "https://stock-price.api/v1/AMZ.DE?range=30d",
        "fixtures/historical-security-prices/data-source-101/amzn-30-days.json");
    respondWithFixture(mockServer, "https://stock-price.api/v1/AMZ.DE?range=1y",
        "fixtures/historical-security-prices/data-source-101/amzn-365-days.json");

    MvcResult mvcResult = putConfig(AMZN, amznDataSource101, true).andExpect(status().isOk()).andReturn();
    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody).isEqualTo(expectedRead(amznDataSource101, AMZN, 1L));

    // verify database: config
    HistoricalSecurityPriceConfigEntity configEntity =
        configRepository.findBySecurityId(AMZN).orElseThrow();
    assertThat(configEntity.getVersion()).isOne();
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("AMZ.DE");
    assertThat(configEntity.isActive()).isTrue();

    // verify database: prices (first, last and date sanity check)
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(AMZN, LocalDate.EPOCH);
    HistoricalSecurityPriceEntity firstFetched = prices.get(4); // after the 4 prices derived from transactions 1, 4, 5 and 12
    assertThat(firstFetched.getPrice()).isEqualTo(new BigDecimal("78.6"));
    assertThat(firstFetched.getDate()).isEqualTo(LocalDate.of(2022, DECEMBER, 29));
    assertThat(firstFetched.getCurrency()).isEqualTo("EUR");
    assertThat(prices.getLast().getPrice()).isEqualTo(new BigDecimal("138.58"));
    assertThat(prices.getLast().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(prices.getLast().getCurrency()).isEqualTo("EUR");
    dateSanityCheck(prices);
  }

  @Test
  void changeDatasource_removeExistingPrices_keepsPricesFromTrades() throws Exception {
    respondWithFixture(mockServer, "https://stock-price.api/v1/AMZ.DE?range=30d",
        "fixtures/historical-security-prices/data-source-101/amzn-30-days.json");
    respondWithFixture(mockServer, "https://stock-price.api/v1/AMZ.DE?range=1y",
        "fixtures/historical-security-prices/data-source-101/amzn-365-days.json");

    putConfig(AMZN, amznDataSource101, true).andExpect(status().isOk());

    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(AMZN, LocalDate.EPOCH);
    assertThat(prices).hasSize(256); // 4 derived from transactions 1, 4, 5 and 12 + 252 fetched
    List<HistoricalSecurityPriceEntity> tradePrices = prices.subList(0, 4);
    assertThat(tradePrices).extracting(HistoricalSecurityPriceEntity::getDate).containsExactly(
        LocalDate.of(2020, JULY, 13),
        LocalDate.of(2020, NOVEMBER, 9),
        LocalDate.of(2020, NOVEMBER, 10),
        LocalDate.of(2021, APRIL, 26));
    assertThat(tradePrices).extracting(HistoricalSecurityPriceEntity::getDataSourceId).containsOnlyNulls();
    assertThat(prices.stream().skip(4).map(HistoricalSecurityPriceEntity::getDataSourceId)).containsOnly(101L);
  }

  @Test
  void updateDatasource_conflict() throws Exception {
    HistoricalSecurityPriceConfigUpdateDto requestBody = new HistoricalSecurityPriceConfigUpdateDto();
    requestBody.setExternalSecurityId("CRM");
    requestBody.setDataSourceId(103L);
    requestBody.setIsActive(true);
    requestBody.setVersion(0L);

    MvcResult mvcResult = putConfig(CRM, requestBody, null).andExpect(status().isConflict()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();

    // verify database: config (no changes)
    HistoricalSecurityPriceConfigEntity configEntity = configRepository.findBySecurityId(CRM).orElseThrow();
    assertThat(configEntity.getVersion()).isOne();
    assertThat(configEntity.isActive()).isFalse();
  }

  @Test
  void updateDatasource_isinKeyedSource_withExternalSecurityId_ok() throws Exception {
    HistoricalSecurityPriceConfigUpdateDto requestBody = new HistoricalSecurityPriceConfigUpdateDto();
    requestBody.setDataSourceId(105L);
    requestBody.setExternalSecurityId("ignored-value");
    requestBody.setIsActive(false);
    requestBody.setVersion(0L);

    assertIsinKeyedUpdateOk(requestBody);
  }

  @Test
  void updateDatasource_isinKeyedSource_withoutExternalSecurityId_ok() throws Exception {
    HistoricalSecurityPriceConfigUpdateDto requestBody = new HistoricalSecurityPriceConfigUpdateDto();
    requestBody.setDataSourceId(105L);
    requestBody.setExternalSecurityId(null);
    requestBody.setIsActive(false);
    requestBody.setVersion(0L);

    assertIsinKeyedUpdateOk(requestBody);
  }

  @Test
  void updateDatasource_idKeyedSource_missingExternalSecurityId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigUpdateDto requestBody = new HistoricalSecurityPriceConfigUpdateDto();
    requestBody.setDataSourceId(103L);
    requestBody.setExternalSecurityId(null);
    requestBody.setIsActive(false);
    requestBody.setVersion(1L);

    MvcResult mvcResult = putConfig(CRM, requestBody, null).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();

    HistoricalSecurityPriceConfigEntity configEntity = configRepository.findBySecurityId(CRM).orElseThrow();
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("CRM");
    assertThat(configEntity.getVersion()).isOne();
  }

  @Test
  void updateDatasource_idKeyedSource_blankExternalSecurityId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigUpdateDto requestBody = new HistoricalSecurityPriceConfigUpdateDto();
    requestBody.setDataSourceId(103L);
    requestBody.setExternalSecurityId(" ");
    requestBody.setIsActive(false);
    requestBody.setVersion(1L);

    MvcResult mvcResult = putConfig(CRM, requestBody, null).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();

    HistoricalSecurityPriceConfigEntity configEntity = configRepository.findBySecurityId(CRM).orElseThrow();
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("CRM");
    assertThat(configEntity.getVersion()).isOne();
  }

  @Test
  void updateDatasource_unknownDataSourceId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigUpdateDto requestBody = new HistoricalSecurityPriceConfigUpdateDto();
    requestBody.setDataSourceId(999L);
    requestBody.setExternalSecurityId("CRM");
    requestBody.setIsActive(false);
    requestBody.setVersion(1L);

    MvcResult mvcResult = putConfig(CRM, requestBody, null).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();

    HistoricalSecurityPriceConfigEntity configEntity = configRepository.findBySecurityId(CRM).orElseThrow();
    assertThat(configEntity.getDataSourceId()).isEqualTo(103L);
    assertThat(configEntity.getVersion()).isOne();
  }

  @Test
  void updateDatasource_securityDoesNotExist_notFound() throws Exception {
    long configCount = configRepository.count();
    MvcResult mvcResult = putConfig(999, amznDataSource101, null).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(configRepository.count()).isEqualTo(configCount);
  }

  private void assertIsinKeyedUpdateOk(HistoricalSecurityPriceConfigUpdateDto requestBody) throws Exception {
    long configCount = configRepository.count();
    long priceCount = priceRepository.count();
    HistoricalSecurityPriceConfigEntity configBefore = configRepository.findBySecurityId(EQIX).orElseThrow();
    List<HistoricalSecurityPriceConfigEntity> othersBefore = otherConfigs(EQIX);

    MvcResult mvcResult = putConfig(EQIX, requestBody, null).andExpect(status().isOk()).andReturn();

    // verify response: every property; the ISIN is reported, not the submitted identifier
    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    HistoricalSecurityPriceConfigReadDto expected = new HistoricalSecurityPriceConfigReadDto();
    expected.setSecurityId(EQIX);
    expected.setDataSourceId(105L);
    expected.setExternalSecurityId("US29444U7000");
    expected.setIsActive(false);
    expected.setVersion(1L);
    assertThat(responseBody).isEqualTo(expected);

    // verify database: config, every property
    HistoricalSecurityPriceConfigEntity configAfter = configRepository.findBySecurityId(EQIX).orElseThrow();
    assertThat(configAfter.getId()).isEqualTo(configBefore.getId());
    assertThat(configAfter.getSecurityId()).isEqualTo(EQIX);
    assertThat(configAfter.getDataSourceId()).isEqualTo(105L);
    assertThat(configAfter.getExternalSecurityId()).isNull();
    assertThat(configAfter.isActive()).isFalse();
    assertThat(configAfter.getVersion()).isOne();
    assertThat(configAfter.getCreatedAt().toInstant()).isEqualTo(configBefore.getCreatedAt().toInstant());

    // verify database: no rows added or removed, other configs untouched, no prices loaded
    assertThat(configRepository.count()).isEqualTo(configCount);
    assertThat(otherConfigs(EQIX)).usingRecursiveComparison().isEqualTo(othersBefore);
    assertThat(priceRepository.count()).isEqualTo(priceCount);
  }

  private List<HistoricalSecurityPriceConfigEntity> otherConfigs(long securityId) {
    return configRepository.findAll().stream()
        .filter(config -> config.getSecurityId() != securityId)
        .sorted(Comparator.comparing(HistoricalSecurityPriceConfigEntity::getId))
        .toList();
  }

  private ResultActions putConfig(long securityId, HistoricalSecurityPriceConfigUpdateDto config,
                                  Boolean removeExistingPrices) throws Exception {
    String requestBody = objectMapper.writeValueAsString(config);
    String url = String.format(ENDPOINT, securityId);
    MockHttpServletRequestBuilder requestBuilder = put(url);
    if (removeExistingPrices != null) {
      requestBuilder = requestBuilder.queryParam("removeExistingPrices", Boolean.toString(removeExistingPrices));
    }
    return mockMvc.perform(requestBuilder.contentType(MediaType.APPLICATION_JSON).content(requestBody));
  }

  private HistoricalSecurityPriceConfigReadDto expectedRead(HistoricalSecurityPriceConfigUpdateDto request,
                                                            long securityId, long version) {
    HistoricalSecurityPriceConfigReadDto expected = new HistoricalSecurityPriceConfigReadDto();
    expected.setSecurityId(securityId);
    expected.setDataSourceId(request.getDataSourceId());
    expected.setExternalSecurityId(request.getExternalSecurityId());
    expected.setIsActive(request.getIsActive());
    expected.setVersion(version);
    return expected;
  }

  private void dateSanityCheck(List<HistoricalSecurityPriceEntity> prices) {
    for (int i = 1; i < prices.size(); i++) {
      assertThat(prices.get(i - 1).getDate()).isBefore(prices.get(i).getDate());
    }
  }
}
