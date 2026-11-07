package de.as.traquity.price.security.historical;


import static integration.MockServerUtils.respondWithFixture;
import static integration.SecurityIds.QCOM;
import static java.time.LocalDate.EPOCH;
import static java.time.Month.DECEMBER;
import static java.time.Month.JANUARY;
import static java.time.Month.JUNE;
import static java.time.Month.OCTOBER;
import static java.time.temporal.ChronoUnit.MILLIS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.exchangerates.CurrencyConversionRequest;
import de.as.traquity.exchangerates.ExchangeRateService;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceConfigCreateDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceConfigReadDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneId;
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
import org.springframework.web.client.RestTemplate;

@IntegrationTest
class CreateHistoricalSecurityPriceConfigTest {

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
   * Initialized with values for QCOM stock, which has no config in the example data.
   */
  private HistoricalSecurityPriceConfigCreateDto qcomDataSource102;

  @BeforeEach
  void beforeEach() {
    mockServer = MockRestServiceServer.createServer(restTemplate);
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));

    when(exchangeRateServiceMock.convert(anyList(), any(), any())).thenAnswer(invocation -> {
      List<CurrencyConversionRequest> items = invocation.getArgument(0);
      return items.stream().map(CurrencyConversionRequest::getValue).toList();
    });

    qcomDataSource102 = new HistoricalSecurityPriceConfigCreateDto();
    qcomDataSource102.setDataSourceId(102L);
    qcomDataSource102.setExternalSecurityId("QCOM.XNAS");
    qcomDataSource102.setIsActive(true);
  }

  @Test
  void createConfig_fetchPrices_ok() throws Exception {
    respondWithFixture(mockServer,
        "https://stock-price.api/v2?isin=QCOM.XNAS",
        "fixtures/historical-security-prices/data-source-102/qcom-73-days.json");

    MvcResult mvcResult =
        postConfig(QCOM, qcomDataSource102).andExpect(status().isCreated()).andReturn();

    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody).isEqualTo(expectedRead(qcomDataSource102, QCOM, 0L));
    assertThat(mvcResult.getResponse().getHeader("location"))
        .isEqualTo(String.format(ENDPOINT, QCOM));

    // verify database: config
    HistoricalSecurityPriceConfigEntity configEntity =
        configRepository.findBySecurityId(QCOM).orElseThrow();
    assertThat(configEntity.getDataSourceId()).isEqualTo(102L);
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("QCOM.XNAS");
    assertThat(configEntity.isActive()).isTrue();
    assertThat(configEntity.getVersion()).isZero();

    // verify database: prices (first, last and date sanity check)
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(QCOM, EPOCH);
    // 52 fetched, one of them replacing the price derived from transaction 409 on 2023-10-23
    // + 2 derived from transactions 410 and 411 before the fetched range
    assertThat(prices).hasSize(54);
    assertThat(prices.subList(0, 2)).extracting(HistoricalSecurityPriceEntity::getDate)
        .containsExactly(LocalDate.of(2023, JANUARY, 10), LocalDate.of(2023, JUNE, 15));
    assertThat(prices.subList(0, 2)).extracting(HistoricalSecurityPriceEntity::getDataSourceId).containsOnlyNulls();

    List<HistoricalSecurityPriceEntity> fetched = prices.subList(2, prices.size());
    assertThat(fetched).extracting(HistoricalSecurityPriceEntity::getDataSourceId).containsOnly(102L);
    assertThat(fetched.getFirst().getPrice()).isEqualTo(new BigDecimal("104.62"));
    assertThat(fetched.getFirst().getDate()).isEqualTo(LocalDate.of(2023, OCTOBER, 17));
    assertThat(fetched.getFirst().getCurrency()).isEqualTo("USD");
    assertThat(fetched.getLast().getPrice()).isEqualTo(new BigDecimal("131.96"));
    assertThat(fetched.getLast().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(fetched.getLast().getCurrency()).isEqualTo("USD");
    dateSanityCheck(prices);
  }

  @Test
  void createConfig_inactive_noPricesFetched() throws Exception {
    qcomDataSource102.setIsActive(false);

    MvcResult mvcResult =
        postConfig(QCOM, qcomDataSource102).andExpect(status().isCreated()).andReturn();

    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody).isEqualTo(expectedRead(qcomDataSource102, QCOM, 0L));

    // verify database: config
    HistoricalSecurityPriceConfigEntity configEntity =
        configRepository.findBySecurityId(QCOM).orElseThrow();
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("QCOM.XNAS");
    assertThat(configEntity.isActive()).isFalse();

    assertOnlyQcomPricesDerivedFromTrades();
  }

  @Test
  void createConfig_fetchPrices_ignoreNulls_ok() throws Exception {
    when(clock.instant()).thenReturn(Instant.parse("2024-01-26T20:44:38Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));

    respondWithFixture(mockServer, "https://stock-price.api/v3/stocks/prices?id=VNGGF&range=MAX",
        "fixtures/historical-security-prices/data-source-103/vnggf-5-days.json");

    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setExternalSecurityId("VNGGF");
    config.setDataSourceId(103L);
    config.setIsActive(true);

    MvcResult mvcResult = postConfig(SecurityIds.VNGGF, config).andExpect(status().isCreated()).andReturn();

    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody).isEqualTo(expectedRead(config, SecurityIds.VNGGF, 0L));

    // verify database: config
    HistoricalSecurityPriceConfigEntity configEntity =
        configRepository.findBySecurityId(SecurityIds.VNGGF).orElseThrow();
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("VNGGF");
    assertThat(configEntity.isActive()).isTrue();

    // verify database: prices - 3 derived from transactions 27, 28 and 29 + 2 fetched, the two null entries of the fixture are skipped
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.VNGGF, EPOCH);
    assertThat(prices).hasSize(5);
    List<HistoricalSecurityPriceEntity> fetched = prices.stream().filter(entity -> entity.getDataSourceId() != null).toList();
    assertThat(fetched).hasSize(2);

    HistoricalSecurityPriceEntity price = fetched.getFirst();
    assertThat(price.getSecurityId()).isEqualTo(SecurityIds.VNGGF);
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("56.469"));
    assertThat(price.getCurrency()).isEqualTo("EUR");
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2024, Month.JANUARY, 19));

    price = fetched.get(1);
    assertThat(price.getSecurityId()).isEqualTo(SecurityIds.VNGGF);
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("57.441"));
    assertThat(price.getCurrency()).isEqualTo("EUR");
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2024, Month.JANUARY, 25));
  }

  @Test
  void createConfig_isinKeyedSource_withExternalSecurityId_ok() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(105L);
    config.setExternalSecurityId("ignored-value");
    config.setIsActive(false);

    assertIsinKeyedConfigCreated(config);
  }

  @Test
  void createConfig_isinKeyedSource_withoutExternalSecurityId_ok() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(105L);
    config.setExternalSecurityId(null);
    config.setIsActive(false);

    assertIsinKeyedConfigCreated(config);
  }

  @Test
  void createConfig_idKeyedSource_missingExternalSecurityId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(102L);
    config.setExternalSecurityId(null);
    config.setIsActive(false);

    assertRejectedWithBadRequest(config);
  }

  @Test
  void createConfig_idKeyedSource_blankExternalSecurityId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(102L);
    config.setExternalSecurityId(" ");
    config.setIsActive(false);

    assertRejectedWithBadRequest(config);
  }

  @Test
  void createConfig_unknownDataSourceId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(999L);
    config.setExternalSecurityId("QCOM");
    config.setIsActive(false);

    assertRejectedWithBadRequest(config);
  }

  @Test
  void createConfig_configExistsAlready_conflict() throws Exception {
    long configCount = configRepository.count();
    HistoricalSecurityPriceConfigEntity before =
        configRepository.findBySecurityId(SecurityIds.AMZN).orElseThrow();
    String externalSecurityIdBefore = before.getExternalSecurityId();

    MvcResult mvcResult =
        postConfig(SecurityIds.AMZN, qcomDataSource102).andExpect(status().isConflict()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();

    assertThat(configRepository.count()).isEqualTo(configCount);
    assertThat(configRepository.findBySecurityId(SecurityIds.AMZN).orElseThrow().getExternalSecurityId())
        .isEqualTo(externalSecurityIdBefore);
  }

  @Test
  void createConfig_securityDoesNotExist_notFound() throws Exception {
    long configCount = configRepository.count();

    MvcResult mvcResult = postConfig(999, qcomDataSource102).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();

    assertThat(configRepository.count()).isEqualTo(configCount);
  }

  private void assertIsinKeyedConfigCreated(HistoricalSecurityPriceConfigCreateDto config) throws Exception {
    long configCount = configRepository.count();
    long priceCount = priceRepository.count();
    Instant before = Instant.now().truncatedTo(MILLIS);

    MvcResult mvcResult = postConfig(QCOM, config).andExpect(status().isCreated()).andReturn();
    Instant after = Instant.now();

    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    HistoricalSecurityPriceConfigReadDto expectedBody = new HistoricalSecurityPriceConfigReadDto();
    expectedBody.setSecurityId(QCOM);
    expectedBody.setDataSourceId(105L);
    expectedBody.setExternalSecurityId("US7475251036");
    expectedBody.setIsActive(false);
    expectedBody.setVersion(0L);
    assertThat(responseBody).isEqualTo(expectedBody);
    assertThat(mvcResult.getResponse().getHeader("location")).isEqualTo(String.format(ENDPOINT, QCOM));

    assertThat(configRepository.count()).isEqualTo(configCount + 1);
    HistoricalSecurityPriceConfigEntity configEntity = configRepository.findBySecurityId(QCOM).orElseThrow();
    assertThat(configEntity.getId()).isNotNull();
    assertThat(configEntity.getSecurityId()).isEqualTo(QCOM);
    assertThat(configEntity.getDataSourceId()).isEqualTo(105L);
    assertThat(configEntity.getExternalSecurityId()).isNull();
    assertThat(configEntity.isActive()).isFalse();
    assertThat(configEntity.getVersion()).isZero();
    assertThat(configEntity.getCreatedAt().toInstant()).isBetween(before, after);
    assertThat(configEntity.getUpdatedAt().toInstant()).isBetween(before, after);

    assertThat(priceRepository.count()).isEqualTo(priceCount);
    assertOnlyQcomPricesDerivedFromTrades();
  }

  private void assertOnlyQcomPricesDerivedFromTrades() {
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(QCOM, EPOCH);
    // derived from transactions 410, 411 and 409
    assertThat(prices).extracting(HistoricalSecurityPriceEntity::getDate).containsExactly(
        LocalDate.of(2023, JANUARY, 10),
        LocalDate.of(2023, JUNE, 15),
        LocalDate.of(2023, OCTOBER, 23));
    assertThat(prices).extracting(HistoricalSecurityPriceEntity::getDataSourceId).containsOnlyNulls();
  }

  private void assertRejectedWithBadRequest(HistoricalSecurityPriceConfigCreateDto config) throws Exception {
    long configCount = configRepository.count();
    long priceCount = priceRepository.count();

    MvcResult mvcResult = postConfig(QCOM, config).andExpect(status().isBadRequest()).andReturn();

    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(mvcResult.getResponse().getContentAsString()).isEmpty();
    assertThat(mvcResult.getResponse().getHeader("location")).isNull();
    assertThat(configRepository.count()).isEqualTo(configCount);
    assertThat(configRepository.findBySecurityId(QCOM)).isEmpty();
    assertThat(priceRepository.count()).isEqualTo(priceCount);
  }

  private ResultActions postConfig(long securityId, HistoricalSecurityPriceConfigCreateDto config) throws Exception {
    String requestBody = objectMapper.writeValueAsString(config);
    String url = String.format(ENDPOINT, securityId);
    return mockMvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(requestBody));
  }

  private HistoricalSecurityPriceConfigReadDto expectedRead(HistoricalSecurityPriceConfigCreateDto request,
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
