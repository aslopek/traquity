package de.as.traquity.notification.dividendannouncement.datasource;

import static de.as.traquity.notification.dividendannouncement.api.model.DateFormatDto.CUSTOM_STRING;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.notification.dividendannouncement.api.model.CurrencyMappingDto;
import de.as.traquity.notification.dividendannouncement.api.model.DateConfigurationDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementDataSourceCreateDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementDataSourceReadDto;
import de.as.traquity.notification.dividendannouncement.api.model.RequestHeaderDto;
import integration.IntegrationTest;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class CreateDividendAnnouncementDataSourceTest {

  private static final String ENDPOINT = "/notifications/dividend-announcements/data-sources";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private DividendAnnouncementDataSourceRepository dataSourceRepository;

  @Autowired
  private MockMvc mockMvc;

  private DividendAnnouncementDataSourceCreateDto requestBody;

  @BeforeEach
  void beforeEach() {
    requestBody = new DividendAnnouncementDataSourceCreateDto();
    requestBody.setName("New Data Source");
    requestBody.setUrlPattern("https://api.dividend.com/#id()/payments");

    DateConfigurationDto dateConfig = new DateConfigurationDto(CUSTOM_STRING);
    dateConfig.setCustomPattern("yyyy-MM-dd");
    requestBody.setDateFormat(dateConfig);

    requestBody.setRequestHeaders(new LinkedList<>());
    requestBody.setJsonPathDate("$.someObj.dates[*].value");
    requestBody.setJsonPathValue("$.someObj.payments[*].value");
    requestBody.setJsonPathCurrency("$.someObj.currency[*].value");
    requestBody.setCurrencyMappings(new LinkedList<>());
  }

  @Test
  void createDataSource_ok() throws Exception {
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_duplicateName_conflict() throws Exception {
    requestBody.setName("Dividend API v1");
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
  void createDataSource_missingUrlPattern_badRequest() throws Exception {
    requestBody.setUrlPattern(null);
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_urlPatternHasNoIdPattern_badRequest() throws Exception {
    requestBody.setUrlPattern("https://api.dividend.com/payments");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_isinKeyed_ok() throws Exception {
    requestBody.setUrlPattern("https://api.dividend.com/#id(isin)/payments");
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
    verifyResponseBody(responseBody);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount + 1);
    verifyDatabase(responseBody.getId());
  }

  @Test
  void createDataSource_idSpellingsMixedInOneUrl_badRequest() throws Exception {
    requestBody.setUrlPattern("https://api.dividend.com/#id()/#id(isin)/payments");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_unsupportedIdArgument_badRequest() throws Exception {
    requestBody.setUrlPattern("https://api.dividend.com/#id(wkn)/payments");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_idArgumentWrongCase_badRequest() throws Exception {
    requestBody.setUrlPattern("https://api.dividend.com/#id(ISIN)/payments");
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_headerValueDisagreesWithUrl_badRequest() throws Exception {
    requestBody.getRequestHeaders().add(new RequestHeaderDto("x-isin", "#id(isin)"));
    runNegativeTestCase(HttpStatus.BAD_REQUEST);
  }

  @Test
  void createDataSource_urlPatternHasMultipleIdPatterns_ok() throws Exception {
    long dataSourceCount = dataSourceRepository.count();
    requestBody.setUrlPattern("https://api.dividend.com/#id()/payments/#id()");
    MvcResult mvcResult = postDataSource().andExpect(status().isCreated()).andReturn();

    verifyLocationHeader(mvcResult);
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
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
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
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
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
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
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
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
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
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

    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
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

  private void verifyLocationHeader(MvcResult mvcResult) throws Exception {
    String locationHeader = mvcResult.getResponse().getHeader("Location");
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);
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
    DividendAnnouncementDataSourceEntity entity = dataSourceRepository.findById(id).orElseThrow();
    assertThat(entity.getVersion()).isZero();
    assertThat(entity.getName()).isEqualTo(requestBody.getName());
    assertThat(entity.getUrlPattern()).isEqualTo(requestBody.getUrlPattern());
    assertThat(entity.getJsonPathDate()).isEqualTo(requestBody.getJsonPathDate());
    assertThat(entity.getJsonPathValue()).isEqualTo(requestBody.getJsonPathValue());
    assertThat(entity.getJsonPathCurrency()).isEqualTo(requestBody.getJsonPathCurrency());
    assertThat(entity.getRegexCurrency()).isEqualTo(requestBody.getRegexCurrency());
    assertThat(entity.getRegexCurrencyGroup()).isEqualTo(requestBody.getRegexCurrencyGroup());

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

  private void verifyResponseBody(DividendAnnouncementDataSourceReadDto responseBody) {
    assertThat(responseBody.getId()).isGreaterThan(0);
    assertThat(responseBody.getVersion()).isZero();
    assertThat(responseBody.getName()).isEqualTo(requestBody.getName());
    assertThat(responseBody.getUrlPattern()).isEqualTo(requestBody.getUrlPattern());
    assertThat(responseBody.getJsonPathDate()).isEqualTo(requestBody.getJsonPathDate());
    assertThat(responseBody.getJsonPathValue()).isEqualTo(requestBody.getJsonPathValue());
    assertThat(responseBody.getJsonPathCurrency()).isEqualTo(requestBody.getJsonPathCurrency());
    assertThat(responseBody.getRegexCurrency()).isEqualTo(requestBody.getRegexCurrency());
    assertThat(responseBody.getRegexCurrencyGroup()).isEqualTo(requestBody.getRegexCurrencyGroup());

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
}
