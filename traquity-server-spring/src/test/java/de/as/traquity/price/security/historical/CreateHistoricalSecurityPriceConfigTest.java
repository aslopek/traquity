package de.as.traquity.price.security.historical;


import static integration.MockServerUtils.respondWithFixture;
import static java.time.Month.DECEMBER;
import static java.time.Month.OCTOBER;
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
        postConfig(SecurityIds.QCOM, qcomDataSource102).andExpect(status().isCreated()).andReturn();

    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody).isEqualTo(expectedRead(qcomDataSource102, SecurityIds.QCOM, 0L));
    assertThat(mvcResult.getResponse().getHeader("location"))
        .isEqualTo(String.format(ENDPOINT, SecurityIds.QCOM));

    // verify database: config
    HistoricalSecurityPriceConfigEntity configEntity =
        configRepository.findBySecurityId(SecurityIds.QCOM).orElseThrow();
    assertThat(configEntity.getDataSourceId()).isEqualTo(102L);
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("QCOM.XNAS");
    assertThat(configEntity.isActive()).isTrue();
    assertThat(configEntity.getVersion()).isZero();

    // verify database: prices (first, last and date sanity check)
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.QCOM, LocalDate.EPOCH);
    assertThat(prices).hasSize(52);
    assertThat(prices.getFirst().getPrice()).isEqualTo(new BigDecimal("104.62"));
    assertThat(prices.getFirst().getDate()).isEqualTo(LocalDate.of(2023, OCTOBER, 17));
    assertThat(prices.getFirst().getCurrency()).isEqualTo("USD");
    assertThat(prices.getLast().getPrice()).isEqualTo(new BigDecimal("131.96"));
    assertThat(prices.getLast().getDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(prices.getLast().getCurrency()).isEqualTo("USD");
    dateSanityCheck(prices);
  }

  @Test
  void createConfig_inactive_noPricesFetched() throws Exception {
    qcomDataSource102.setIsActive(false);

    MvcResult mvcResult =
        postConfig(SecurityIds.QCOM, qcomDataSource102).andExpect(status().isCreated()).andReturn();

    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody).isEqualTo(expectedRead(qcomDataSource102, SecurityIds.QCOM, 0L));

    // verify database: config
    HistoricalSecurityPriceConfigEntity configEntity =
        configRepository.findBySecurityId(SecurityIds.QCOM).orElseThrow();
    assertThat(configEntity.getExternalSecurityId()).isEqualTo("QCOM.XNAS");
    assertThat(configEntity.isActive()).isFalse();

    // verify database: prices
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.QCOM, LocalDate.EPOCH);
    assertThat(prices).isEmpty();
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

    // verify database: prices - the two null entries of the fixture are skipped
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(SecurityIds.VNGGF, LocalDate.EPOCH);
    assertThat(prices).hasSize(2);

    HistoricalSecurityPriceEntity price = prices.getFirst();
    assertThat(price.getSecurityId()).isEqualTo(SecurityIds.VNGGF);
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("56.469"));
    assertThat(price.getCurrency()).isEqualTo("EUR");
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2024, Month.JANUARY, 19));

    price = prices.get(1);
    assertThat(price.getSecurityId()).isEqualTo(SecurityIds.VNGGF);
    assertThat(price.getPrice()).isEqualByComparingTo(new BigDecimal("57.441"));
    assertThat(price.getCurrency()).isEqualTo("EUR");
    assertThat(price.getDate()).isEqualTo(LocalDate.of(2024, Month.JANUARY, 25));
  }

  @Test
  void createConfig_isinKeyedSource_withExternalSecurityId_storesNoIdentifier_ok() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(105L);
    config.setExternalSecurityId("ignored-value");
    config.setIsActive(false);

    MvcResult mvcResult = postConfig(SecurityIds.QCOM, config).andExpect(status().isCreated()).andReturn();
    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("US7475251036");

    HistoricalSecurityPriceConfigEntity configEntity = configRepository.findBySecurityId(SecurityIds.QCOM).orElseThrow();
    assertThat(configEntity.getExternalSecurityId()).isNull();
  }

  @Test
  void createConfig_isinKeyedSource_withoutExternalSecurityId_storesNoIdentifier_ok() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(105L);
    config.setExternalSecurityId(null);
    config.setIsActive(false);

    MvcResult mvcResult = postConfig(SecurityIds.QCOM, config).andExpect(status().isCreated()).andReturn();
    HistoricalSecurityPriceConfigReadDto responseBody = objectMapper.readValue(
        mvcResult.getResponse().getContentAsString(), HistoricalSecurityPriceConfigReadDto.class);
    assertThat(responseBody.getExternalSecurityId()).isEqualTo("US7475251036");

    HistoricalSecurityPriceConfigEntity configEntity = configRepository.findBySecurityId(SecurityIds.QCOM).orElseThrow();
    assertThat(configEntity.getExternalSecurityId()).isNull();
  }

  @Test
  void createConfig_idKeyedSource_missingExternalSecurityId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(102L);
    config.setExternalSecurityId(null);
    config.setIsActive(false);

    long configCount = configRepository.count();
    MvcResult mvcResult = postConfig(SecurityIds.QCOM, config).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(configRepository.count()).isEqualTo(configCount);
  }

  @Test
  void createConfig_idKeyedSource_blankExternalSecurityId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(102L);
    config.setExternalSecurityId(" ");
    config.setIsActive(false);

    long configCount = configRepository.count();
    MvcResult mvcResult = postConfig(SecurityIds.QCOM, config).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(configRepository.count()).isEqualTo(configCount);
  }

  @Test
  void createConfig_unknownDataSourceId_badRequest() throws Exception {
    HistoricalSecurityPriceConfigCreateDto config = new HistoricalSecurityPriceConfigCreateDto();
    config.setDataSourceId(999L);
    config.setExternalSecurityId("QCOM");
    config.setIsActive(false);

    long configCount = configRepository.count();
    MvcResult mvcResult = postConfig(SecurityIds.QCOM, config).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(configRepository.count()).isEqualTo(configCount);
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
