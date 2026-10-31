package de.as.traquity.price.security.historical.datasource;

import static de.as.traquity.price.security.historical.api.model.DateFormatDto.CUSTOM_STRING;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.price.security.historical.api.model.CurrencyMappingDto;
import de.as.traquity.price.security.historical.api.model.DateConfigurationDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceDataSourceCreateDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceDataSourceReadDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceUrlPatternDto;
import de.as.traquity.price.security.historical.api.model.RequestHeaderDto;
import de.as.traquity.price.security.historical.api.model.ZonedTimeDto;
import integration.IntegrationTest;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class CreateHistoricalSecurityPriceDataSourceTest {

  private static final String ENDPOINT = "/historical-prices/data-sources";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private HistoricalSecurityPriceDataSourceRepository dataSourceRepository;

  @Autowired
  private MockMvc mockMvc;

  private HistoricalSecurityPriceDataSourceCreateDto requestBody;

  @BeforeEach
  void beforeEach() {
    requestBody = new HistoricalSecurityPriceDataSourceCreateDto();
    requestBody.setName("New Data Source");

    HistoricalSecurityPriceUrlPatternDto urlDto = new HistoricalSecurityPriceUrlPatternDto(30, "https://new-price-api.com/#id()");
    List<HistoricalSecurityPriceUrlPatternDto> urlPatterns = new LinkedList<>();
    urlPatterns.add(urlDto);
    requestBody.setUrlPatterns(urlPatterns);

    DateConfigurationDto dateConfig = new DateConfigurationDto(CUSTOM_STRING);
    dateConfig.setCustomPattern("yyyy-MM-dd");
    requestBody.setDateFormat(dateConfig);

    requestBody.setRequestHeaders(new LinkedList<>());
    requestBody.setJsonPathDate("$.someObj.dates[*].value");
    requestBody.setJsonPathValue("$.someObj.prices[*].value");
    requestBody.setJsonPathCurrency("$.someObj.currency[*].value");
    requestBody.setCurrencyMappings(new LinkedList<>());
    requestBody.setMarketCloseTimes(new LinkedList<>());
  }

  @Test
  void createDataSource_ok() throws Exception {
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_duplicateName_conflict() throws Exception {
    requestBody.setName("Price API v1");
    runNegativeTestCase(HttpStatus.CONFLICT);
  }

  @Test
  void createDataSource_missingName_badRequest() throws Exception {
    requestBody.setName(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_emptyName_badRequest() throws Exception {
    requestBody.setName("");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_blankName_badRequest() throws Exception {
    requestBody.setName(" ");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_missingUrlPatterns_badRequest() throws Exception {
    requestBody.setUrlPatterns(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_emptyUrlPatterns_badRequest() throws Exception {
    requestBody.setUrlPatterns(new LinkedList<>());
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_urlPatternHasNoIdPattern_badRequest() throws Exception {
    requestBody.getUrlPatterns().getFirst().setUrlPattern("https://price.com");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_isinKeyed_ok() throws Exception {
    requestBody.getUrlPatterns().getFirst().setUrlPattern("https://new-price-api.com/#id(isin)");
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_idSpellingsMixedAcrossTwoUrls_badRequest() throws Exception {
    requestBody.getUrlPatterns().add(new HistoricalSecurityPriceUrlPatternDto(365, "https://new-price-api.com/#id(isin)"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_idSpellingsMixedInOneUrl_badRequest() throws Exception {
    requestBody.getUrlPatterns().getFirst().setUrlPattern("https://new-price-api.com/#id()/#id(isin)");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_unsupportedIdArgument_badRequest() throws Exception {
    requestBody.getUrlPatterns().getFirst().setUrlPattern("https://new-price-api.com/#id(wkn)");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_idArgumentWrongCase_badRequest() throws Exception {
    requestBody.getUrlPatterns().getFirst().setUrlPattern("https://new-price-api.com/#id(ISIN)");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_headerValueDisagreesWithUrls_badRequest() throws Exception {
    requestBody.getRequestHeaders().add(new RequestHeaderDto("x-isin", "#id(isin)"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_urlPatternHasMultipleIdPatterns_ok() throws Exception {
    long dataSourceCount = dataSourceRepository.count();
    requestBody.getUrlPatterns().getFirst().setUrlPattern("https://price.com/#id()/#id()");
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_withCurrencyMappings_ok() throws Exception {
    CurrencyMappingDto currencyMapping = new CurrencyMappingDto("GBp", "GBP");
    currencyMapping.setMultiplier(new BigDecimal("0.01"));
    requestBody.getCurrencyMappings().add(currencyMapping);

    currencyMapping = new CurrencyMappingDto("CA-$", "CAD");
    requestBody.getCurrencyMappings().add(currencyMapping);

    currencyMapping = new CurrencyMappingDto("", "USD");
    requestBody.getCurrencyMappings().add(currencyMapping);

    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_mappedCurrencyCodeNotSupported_badRequest() throws Exception {
    CurrencyMappingDto currencyMapping = new CurrencyMappingDto("DM", "DEM");
    requestBody.getCurrencyMappings().add(currencyMapping);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_missingCurrencyMappings_badRequest() throws Exception {
    requestBody.setCurrencyMappings(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withRequestHeaders_ok() throws Exception {
    RequestHeaderDto header = new RequestHeaderDto("x-api-key", "the-api-key-value");
    requestBody.getRequestHeaders().add(header);

    header = new RequestHeaderDto("x-some-other-header", "some other value");
    requestBody.getRequestHeaders().add(header);

    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_missingRequestHeaders_badRequest() throws Exception {
    requestBody.setRequestHeaders(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_missingJsonPathDate_badRequest() throws Exception {
    requestBody.setJsonPathDate(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_invalidJsonPathDate_badRequest() throws Exception {
    requestBody.setJsonPathDate("$.");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_missingJsonPathValue_badRequest() throws Exception {
    requestBody.setJsonPathValue(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_invalidJsonPathValue_badRequest() throws Exception {
    requestBody.setJsonPathValue("$.");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_missingJsonPathCurrency_ok() throws Exception {
    requestBody.setJsonPathCurrency(null);
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_invalidJsonPathCurrency_badRequest() throws Exception {
    requestBody.setJsonPathCurrency("$.");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withRegexCurrency_ok() throws Exception {
    requestBody.setRegexCurrency("^.");
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_withRegexCurrencyAndGroup_ok() throws Exception {
    requestBody.setRegexCurrency("^.");
    requestBody.setRegexCurrencyGroup(5);
    long dataSourceCount = dataSourceRepository.count();

    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();
    verifyLocationHeader(mvcResult);

    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_withRegexCurrencyAndNegativeGroup_badRequest() throws Exception {
    requestBody.setRegexCurrency("^.");
    requestBody.setRegexCurrencyGroup(-1);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_regexCurrencyGroupWithoutRegex_badRequest() throws Exception {
    requestBody.setRegexCurrencyGroup(5);
    requestBody.setRegexCurrency(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_emptyRegexCurrency() throws Exception {
    requestBody.setRegexCurrency("");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_blankRegexCurrency() throws Exception {
    requestBody.setRegexCurrency(" ");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withMarketCloseTimes_ok() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:34:56", "Asia/Singapore"));
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("23:59:59", "Europe/London"));
    long dataSourceCount = dataSourceRepository.count();

    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();
    verifyLocationHeader(mvcResult);

    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    verifyResponseBody(responseBody);
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_withMarketCloseTimes_invalidTime_missingSeconds_badRequest() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:34", "Asia/Singapore"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withMarketCloseTimes_invalidTime_hourOutOfRange_badRequest() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("25:34:56", "Asia/Singapore"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withMarketCloseTimes_invalidTime_minuteOutOfRange_badRequest() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:60:56", "Asia/Singapore"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withMarketCloseTimes_invalidTime_secondOutOfRange_badRequest() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:34:60", "Asia/Singapore"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withMarketCloseTimes_noTime_badRequest() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto(null, "Asia/Singapore"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withMarketCloseTimes_invalidTimeZone() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:34:56", "Frankfurt/Main"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_withMarketCloseTimes_noTimeZone() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:34:56", null));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_noMarketCloseTimesArray_badRequest() throws Exception {
    requestBody.setMarketCloseTimes(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_marketCloseTimesArrayContainsNull_badRequest() throws Exception {
    requestBody.getMarketCloseTimes().add(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_marketCloseTimesArrayContainsDuplicateTimeZones_badRequest() throws Exception {
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:34:56", "Asia/Singapore"));
    requestBody.getMarketCloseTimes().add(new ZonedTimeDto("12:34:57", "Asia/Singapore"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  private void verifyLocationHeader(MvcResult mvcResult) throws Exception {
    String locationHeader = mvcResult.getResponse().getHeader("Location");
    HistoricalSecurityPriceDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        HistoricalSecurityPriceDataSourceReadDto.class);
    assertThat(locationHeader).isEqualTo(ENDPOINT + "/" + responseBody.getId());
  }

  private ResultActions postDataSource() throws Exception {
    String requestBodyAsString = objectMapper.writeValueAsString(requestBody);
    return mockMvc.perform(post(ENDPOINT).content(requestBodyAsString).contentType(APPLICATION_JSON));
  }

  private void runNegativeTestCase(HttpStatus expectedStatus) throws Exception {
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().is(expectedStatus.value())).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(mvcResult.getResponse().getHeader("Location")).isNull();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount);
  }

  private void verifyDatabase(long id) {
    HistoricalSecurityPriceDataSourceEntity entity = dataSourceRepository.findById(id).orElseThrow();
    assertThat(entity.getVersion()).isZero();
    assertThat(entity.getName()).isEqualTo(requestBody.getName());
    assertThat(entity.getJsonPathDate()).isEqualTo(requestBody.getJsonPathDate());
    assertThat(entity.getJsonPathValue()).isEqualTo(requestBody.getJsonPathValue());
    assertThat(entity.getJsonPathCurrency()).isEqualTo(requestBody.getJsonPathCurrency());
    assertThat(entity.getRegexCurrency()).isEqualTo(requestBody.getRegexCurrency());
    assertThat(entity.getRegexCurrencyGroup()).isEqualTo(requestBody.getRegexCurrencyGroup());

    Map<Integer, String> expectedUrls = getExpectedUrlPatterns();
    assertThat(entity.getUrlPatterns().size()).isEqualTo(expectedUrls.size());
    expectedUrls.forEach((timespan, pattern) -> assertThat(entity.getUrlPatterns().get(timespan)).isEqualTo(pattern));

    Map<String, String> expectedHeaders = getExpectedRequestHeaders();
    assertThat(entity.getRequestHeaders().size()).isEqualTo(expectedHeaders.size());
    expectedHeaders.forEach((name, value) -> assertThat(entity.getRequestHeaders().get(name)).isEqualTo(value));

    Map<String, CurrencyMappingDto> expectedCurrencyMappings = getExpectedCurrencyMappings();
    assertThat(entity.getCurrencyMappings().size()).isEqualTo(expectedCurrencyMappings.size());
    entity.getCurrencyMappings().forEach((key, actualMapping) -> {
      assertThat(expectedCurrencyMappings).containsKey(key);
      CurrencyMappingDto expectedMapping = expectedCurrencyMappings.get(key);
      assertThat(actualMapping.getMappedCurrencyCode()).isEqualTo(expectedMapping.getMappedCurrencyCode());
      if (expectedMapping.getMultiplier() == null) {
        assertThat(actualMapping.getMultiplier()).isNull();
      } else {
        assertThat(actualMapping.getMultiplier()).isEqualByComparingTo(expectedMapping.getMultiplier());
      }
    });
  }

  private void verifyResponseBody(HistoricalSecurityPriceDataSourceReadDto responseBody) {
    assertThat(responseBody.getId()).isGreaterThan(0);
    assertThat(responseBody.getVersion()).isZero();
    assertThat(responseBody.getName()).isEqualTo(requestBody.getName());
    assertThat(responseBody.getJsonPathDate()).isEqualTo(requestBody.getJsonPathDate());
    assertThat(responseBody.getJsonPathValue()).isEqualTo(requestBody.getJsonPathValue());
    assertThat(responseBody.getJsonPathCurrency()).isEqualTo(requestBody.getJsonPathCurrency());
    assertThat(responseBody.getRegexCurrency()).isEqualTo(requestBody.getRegexCurrency());
    assertThat(responseBody.getRegexCurrencyGroup()).isEqualTo(requestBody.getRegexCurrencyGroup());

    Map<Integer, String> expectedUrls = getExpectedUrlPatterns();
    assertThat(responseBody.getUrlPatterns().size()).isEqualTo(expectedUrls.size());
    for (HistoricalSecurityPriceUrlPatternDto actualUrl : responseBody.getUrlPatterns()) {
      assertThat(expectedUrls).containsKey(actualUrl.getTimespanInDays());
      assertThat(actualUrl.getUrlPattern()).isEqualTo(expectedUrls.get(actualUrl.getTimespanInDays()));
    }

    Map<String, String> expectedHeaders = getExpectedRequestHeaders();
    assertThat(responseBody.getRequestHeaders().size()).isEqualTo(expectedHeaders.size());
    for (RequestHeaderDto actualHeader : responseBody.getRequestHeaders()) {
      assertThat(expectedHeaders).containsKey(actualHeader.getHeaderName());
      assertThat(actualHeader.getHeaderValue()).isEqualTo(expectedHeaders.get(actualHeader.getHeaderName()));
    }

    Map<String, CurrencyMappingDto> expectedCurrencyMappings = getExpectedCurrencyMappings();
    assertThat(responseBody.getCurrencyMappings().size()).isEqualTo(expectedCurrencyMappings.size());
    CurrencyMappingDto expectedMapping;
    for (CurrencyMappingDto actualMapping : responseBody.getCurrencyMappings()) {
      assertThat(expectedCurrencyMappings).containsKey(actualMapping.getCurrencyKey());
      expectedMapping = expectedCurrencyMappings.get(actualMapping.getCurrencyKey());
      assertThat(actualMapping.getMappedCurrencyCode()).isEqualTo(expectedMapping.getMappedCurrencyCode());
      if (expectedMapping.getMultiplier() == null) {
        assertThat(actualMapping.getMultiplier()).isNull();
      } else {
        assertThat(actualMapping.getMultiplier()).isEqualByComparingTo(expectedMapping.getMultiplier());
      }
    }

    Map<String, String> expectedMarketCloseTimes = getExpectedMarketCloseTimes();
    assertThat(responseBody.getMarketCloseTimes().size()).isEqualTo(expectedMarketCloseTimes.size());
    String expectedTime;
    for (ZonedTimeDto actualTime : responseBody.getMarketCloseTimes()) {
      assertThat(expectedMarketCloseTimes).containsKey(actualTime.getTimeZone());
      expectedTime = expectedMarketCloseTimes.get(actualTime.getTimeZone());
      assertThat(actualTime.getTime()).isEqualTo(expectedTime);
    }
  }

  private Map<Integer, String> getExpectedUrlPatterns() {
    Map<Integer, String> expectedUrls = new HashMap<>();
    requestBody.getUrlPatterns().forEach(url -> expectedUrls.put(url.getTimespanInDays(), url.getUrlPattern()));
    return expectedUrls;
  }

  private Map<String, String> getExpectedRequestHeaders() {
    Map<String, String> expectedHeaders = new HashMap<>();
    requestBody.getRequestHeaders().forEach(header -> expectedHeaders.put(header.getHeaderName(), header.getHeaderValue()));
    return expectedHeaders;
  }

  private Map<String, CurrencyMappingDto> getExpectedCurrencyMappings() {
    Map<String, CurrencyMappingDto> expectedCurrencyMappings = new HashMap<>();
    requestBody.getCurrencyMappings().forEach(mapping -> expectedCurrencyMappings.put(mapping.getCurrencyKey(), mapping));
    return expectedCurrencyMappings;
  }

  private Map<String, String> getExpectedMarketCloseTimes() {
    Map<String, String> expectedMarketCloseTimes = new HashMap<>();
    requestBody.getMarketCloseTimes().forEach(t -> expectedMarketCloseTimes.put(t.getTimeZone(), t.getTime()));
    return expectedMarketCloseTimes;
  }
}