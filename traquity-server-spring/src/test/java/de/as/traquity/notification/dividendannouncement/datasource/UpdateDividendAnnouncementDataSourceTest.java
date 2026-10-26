package de.as.traquity.notification.dividendannouncement.datasource;

import static de.as.traquity.notification.dividendannouncement.api.model.DateFormatDto.CUSTOM_STRING;
import static java.math.BigDecimal.ONE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.notification.dividendannouncement.api.model.CurrencyMappingDto;
import de.as.traquity.notification.dividendannouncement.api.model.DateConfigurationDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementDataSourceReadDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementDataSourceUpdateDto;
import de.as.traquity.notification.dividendannouncement.api.model.RequestHeaderDto;
import integration.IntegrationTest;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class UpdateDividendAnnouncementDataSourceTest {

  private static final String ENDPOINT = "/notifications/dividend-announcements/data-sources/%d";
  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private DividendAnnouncementDataSourceRepository dataSourceRepository;

  @Autowired
  private EntityManager entityManager;

  @Autowired
  private MockMvc mockMvc;

  private DividendAnnouncementDataSourceUpdateDto requestBody;

  @BeforeEach
  void beforeEach() {
    requestBody = new DividendAnnouncementDataSourceUpdateDto();
    requestBody.setVersion(1L);
    requestBody.setName("Dividend API v1");
    requestBody.setUrlPattern("https://dividend.api/v1/#id()/dividends");

    DateConfigurationDto dateConfig = new DateConfigurationDto(CUSTOM_STRING);
    dateConfig.setCustomPattern("yyyy-MM-dd");
    requestBody.setDateFormat(dateConfig);

    RequestHeaderDto header = new RequestHeaderDto("x-auth", "#mask(#base64(hello:world))");
    List<RequestHeaderDto> headers = new LinkedList<>();
    headers.add(header);
    requestBody.setRequestHeaders(headers);
    requestBody.setJsonPathDate("$.payments[*].date");
    requestBody.setJsonPathValue("$.payments[*].dividendPayment");
    requestBody.setJsonPathCurrency("$.currency");
    requestBody.setCurrencyMappings(new LinkedList<>());
  }

  @Test
  void updateNothing_ok() throws Exception {
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void wrongVersion_conflict() throws Exception {
    requestBody.setVersion(0L);
    runNegativeTestCase(101, HttpStatus.CONFLICT);
  }

  @Test
  void wrongVersion_conflict_headersAreNotAdded() throws Exception {
    RequestHeaderDto header = new RequestHeaderDto("x-api-key", "the-api-key-value");
    requestBody.getRequestHeaders().add(header);
    requestBody.setVersion(0L);
    runNegativeTestCase(101, HttpStatus.CONFLICT);
  }

  @Test
  void missingVersion_badRequest() throws Exception {
    requestBody.setVersion(null);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateName_ok() throws Exception {
    requestBody.setName("Updated Name");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateName_duplicateName_conflict() throws Exception {
    requestBody.setName("Dividend API v2"); // Name of existing ID 102
    runNegativeTestCase(101, HttpStatus.CONFLICT);
  }

  @Test
  void updateName_missingName_badRequest() throws Exception {
    requestBody.setName(null);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateName_emptyName_badRequest() throws Exception {
    requestBody.setName("");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateName_blankName_badRequest() throws Exception {
    requestBody.setName(" ");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateUrlPattern_ok() throws Exception {
    requestBody.setUrlPattern("https://dividend.api/updated/#id()");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateUrlPattern_missingUrlPattern_badRequest() throws Exception {
    requestBody.setUrlPattern(null);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateUrlPattern_hasNoIdPattern_badRequest() throws Exception {
    requestBody.setUrlPattern("https://dividend.api/updated");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateUrlPattern_hasMultipleIdPatterns_ok() throws Exception {
    requestBody.setUrlPattern("https://dividend.api/updated/#id()/#id()");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateUrlPattern_isinKeyed_ok() throws Exception {
    requestBody.setUrlPattern("https://dividend.api/updated/#id(isin)");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateUrlPattern_idSpellingsMixedInOneUrl_badRequest() throws Exception {
    requestBody.setUrlPattern("https://dividend.api/updated/#id()/#id(isin)");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateUrlPattern_unsupportedIdArgument_badRequest() throws Exception {
    requestBody.setUrlPattern("https://dividend.api/updated/#id(wkn)");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateUrlPattern_idArgumentWrongCase_badRequest() throws Exception {
    requestBody.setUrlPattern("https://dividend.api/updated/#id(ISIN)");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateRequestHeaders_headerValueDisagreesWithUrl_badRequest() throws Exception {
    requestBody.getRequestHeaders().add(new RequestHeaderDto("x-isin", "#id(isin)"));
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateRequestHeaders_addHeaders_ok() throws Exception {
    RequestHeaderDto header = new RequestHeaderDto("x-api-key", "the-api-key-value");
    requestBody.getRequestHeaders().add(header);

    header = new RequestHeaderDto("x-some-other-header", "some other value");
    requestBody.getRequestHeaders().add(header);

    runPositiveTestCase(101, 2, 0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_REQUEST_HEADER(DATA_SOURCE_ID, HEADER_NAME, HEADER_VALUE)
      VALUES (101, 'x-header-a', 'valueA'),
             (101, 'x-header-b', 'valueB');
      """)
  void updateRequestHeaders_removeHeaders_ok() throws Exception {
    RequestHeaderDto header = new RequestHeaderDto("x-api-key", "the-api-key-value");
    requestBody.getRequestHeaders().add(header);

    runPositiveTestCase(101, -1, 0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_REQUEST_HEADER(DATA_SOURCE_ID, HEADER_NAME, HEADER_VALUE)
      VALUES (101, 'x-header-a', 'valueA'),
             (101, 'x-header-b', 'valueB');
      """)
  void updateRequestHeaders_modifyExistingHeader_ok() throws Exception {
    RequestHeaderDto header = new RequestHeaderDto("x-header-a", "UPDATED");
    requestBody.getRequestHeaders().add(header);

    header = new RequestHeaderDto("x-some-other-header", "some other value");
    requestBody.getRequestHeaders().add(header);

    runPositiveTestCase(101, 0, 0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_REQUEST_HEADER(DATA_SOURCE_ID, HEADER_NAME, HEADER_VALUE)
      VALUES (101, 'x-header-a', 'valueA'),
             (101, 'x-header-b', 'valueB'),
             (101, 'x-header-c', 'valueC');
      """)
  void updateRequestHeaders_addModifyRemove_ok() throws Exception {
    RequestHeaderDto header = new RequestHeaderDto("x-header-a", "valueA");
    requestBody.getRequestHeaders().add(header);

    header = new RequestHeaderDto("x-header-b", "new value");
    requestBody.getRequestHeaders().add(header);

    header = new RequestHeaderDto("x-header-d", "NEW");
    requestBody.getRequestHeaders().add(header);

    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateRequestHeaders_missingRequestHeaders_badRequest() throws Exception {
    requestBody.setRequestHeaders(null);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateCurrencyMappings_addCurrencyMappings_ok() throws Exception {
    CurrencyMappingDto currencyMapping = new CurrencyMappingDto("GBp", "GBP");
    currencyMapping.setMultiplier(new BigDecimal("0.01"));
    requestBody.getCurrencyMappings().add(currencyMapping);

    currencyMapping = new CurrencyMappingDto("CA-$", "CAD");
    requestBody.getCurrencyMappings().add(currencyMapping);

    runPositiveTestCase(101, 0, requestBody.getCurrencyMappings().size());
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_CURRENCY_MAPPING (DATA_SOURCE_ID, CURRENCY_KEY, MAPPED_CURRENCY_CODE, MULTIPLIER)
      VALUES (101, 'GBp', 'GBP', '0.01'),
             (101, 'CA-$', 'CAD', null);
      """)
  void updateCurrencyMappings_removeCurrencyMappings_ok() throws Exception {
    CurrencyMappingDto currencyMapping = new CurrencyMappingDto("CA-$", "CAD");
    requestBody.getCurrencyMappings().add(currencyMapping);

    runPositiveTestCase(101, 0, -1);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_CURRENCY_MAPPING (DATA_SOURCE_ID, CURRENCY_KEY, MAPPED_CURRENCY_CODE, MULTIPLIER)
      VALUES (101, 'GBp', 'GBP', '0.01'),
             (101, 'CA-$', 'CAD', null);
      """)
  void updateCurrencyMappings_modifyExistingCurrencyMappings_ok() throws Exception {
    CurrencyMappingDto currencyMapping = new CurrencyMappingDto("GBp", "GBP");
    currencyMapping.setMultiplier(new BigDecimal("0.1"));
    requestBody.getCurrencyMappings().add(currencyMapping);

    currencyMapping = new CurrencyMappingDto("CA-$", "CAD");
    requestBody.getCurrencyMappings().add(currencyMapping);

    runPositiveTestCase(101, 0, 0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_CURRENCY_MAPPING (DATA_SOURCE_ID, CURRENCY_KEY, MAPPED_CURRENCY_CODE, MULTIPLIER)
      VALUES (101, 'GBp', 'GBP', '0.01'),
             (101, 'CA-$', 'CAD', null),
             (101, 'ILA', 'ILS', '0.01');
      """)
  void updateCurrencyMappings_addModifyRemove_ok() throws Exception {
    CurrencyMappingDto currencyMapping = new CurrencyMappingDto("GBp", "GBP");
    currencyMapping.setMultiplier(new BigDecimal("0.01"));
    requestBody.getCurrencyMappings().add(currencyMapping);

    currencyMapping = new CurrencyMappingDto("ILA", "ILS");
    currencyMapping.setMultiplier(new BigDecimal("0.1"));
    requestBody.getCurrencyMappings().add(currencyMapping);

    currencyMapping = new CurrencyMappingDto("US-$", "USD");
    currencyMapping.setMultiplier(ONE);
    requestBody.getCurrencyMappings().add(currencyMapping);

    runPositiveTestCase(101, 0, 0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_CURRENCY_MAPPING (DATA_SOURCE_ID, CURRENCY_KEY, MAPPED_CURRENCY_CODE, MULTIPLIER)
      VALUES (101, 'GBp', 'GBP', '0.01'),
             (101, 'CA-$', 'CAD', null);
      """)
  void updateCurrencyMappings_mappedCurrencyCodeNotSupported_badRequest() throws Exception {
    CurrencyMappingDto currencyMapping = new CurrencyMappingDto("DM", "DEM");
    requestBody.getCurrencyMappings().add(currencyMapping);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateCurrencyMappings_missingCurrencyMappings_badRequest() throws Exception {
    requestBody.setCurrencyMappings(null);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateJsonPathDate_ok() throws Exception {
    requestBody.setJsonPathDate("$.payments[*].updated.date");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateJsonPathDate_missingJsonPathDate_badRequest() throws Exception {
    requestBody.setJsonPathDate(null);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateJsonPathDate_invalidJsonPathDate_badRequest() throws Exception {
    requestBody.setJsonPathDate("$.");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateJsonPathValue_ok() throws Exception {
    requestBody.setJsonPathValue("$.payments[*].updated.dividendPayment");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateJsonPathValue_missingJsonPathValue_badRequest() throws Exception {
    requestBody.setJsonPathValue(null);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateJsonPathValue_invalidJsonPathValue_badRequest() throws Exception {
    requestBody.setJsonPathValue("$.");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateJsonPathCurrency_ok() throws Exception {
    requestBody.setJsonPathCurrency("$.updated.currency");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateJsonPathCurrency_missingJsonPathCurrency_ok() throws Exception {
    requestBody.setJsonPathCurrency(null);
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateJsonPathCurrency_invalidJsonPathCurrency_badRequest() throws Exception {
    requestBody.setJsonPathCurrency("$.");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateRegexCurrency_set_ok() throws Exception {
    requestBody.setRegexCurrency("^.");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE DIVIDEND_ANNOUNCEMENT_DATA_SOURCE
      SET REGEX_CURRENCY = '^.'
      WHERE ID = 101;
      """)
  void updateRegexCurrency_change_ok() throws Exception {
    requestBody.setRegexCurrency("^[A-Z]{3}");
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE DIVIDEND_ANNOUNCEMENT_DATA_SOURCE
      SET REGEX_CURRENCY = '^.'
      WHERE ID = 101;
      """)
  void updateRegexCurrency_remove_ok() throws Exception {
    requestBody.setRegexCurrency(null);
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateRegexCurrencyAndGroup_ok() throws Exception {
    requestBody.setRegexCurrency("^.");
    requestBody.setRegexCurrencyGroup(5);
    runPositiveTestCase(101, 0, 0);
  }

  @Test
  void updateRegexCurrencyWithNegativeGroup_badRequest() throws Exception {
    requestBody.setRegexCurrency("^.");
    requestBody.setRegexCurrencyGroup(-1);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateRegexGroupWithoutRegex_badRequest() throws Exception {
    requestBody.setRegexCurrency(null);
    requestBody.setRegexCurrencyGroup(5);
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateRegexCurrency_empty_badRequest() throws Exception {
    requestBody.setRegexCurrency("");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  @Test
  void updateRegexCurrency_blank_badRequest() throws Exception {
    requestBody.setRegexCurrency(" ");
    runNegativeTestCase(101, HttpStatus.BAD_REQUEST);
  }

  private void runNegativeTestCase(long id, HttpStatus expectedStatus) throws Exception {
    long dataSourceCount = dataSourceRepository.count();
    long headerCount = countHeadersByDataSourceId(id);
    long currencyMappingCount = countCurrencyMappingsByDataSourceId(id);

    MvcResult mvcResult = putDataSource(id).andExpect(status().is(expectedStatus.value())).andReturn();

    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount);
    assertThat(countHeadersByDataSourceId(id)).isEqualTo(headerCount);
    assertThat(countCurrencyMappingsByDataSourceId(id)).isEqualTo(currencyMappingCount);
  }

  private void runPositiveTestCase(long id, long expectedHeaderCountChange, long expectedCurrencyMappingCountChange)
      throws Exception {
    long dataSourceCount = dataSourceRepository.count();
    long headerCount = countHeadersByDataSourceId(id);
    long currencyMappingCount = countCurrencyMappingsByDataSourceId(id);

    MvcResult mvcResult = putDataSource(id).andExpect(status().isOk()).andReturn();
    DividendAnnouncementDataSourceReadDto responseBody = objectMapper.readValue(mvcResult.getResponse().getContentAsString(),
        DividendAnnouncementDataSourceReadDto.class);

    verifyResponseBody(responseBody, id);
    verifyDatabase(id);

    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount);
    assertThat(countHeadersByDataSourceId(id)).isEqualTo(headerCount + expectedHeaderCountChange);
    assertThat(countCurrencyMappingsByDataSourceId(id)).isEqualTo(currencyMappingCount + expectedCurrencyMappingCountChange);
  }

  private void verifyDatabase(long id) {
    DividendAnnouncementDataSourceEntity entity = dataSourceRepository.findById(id).orElseThrow();
    assertThat(entity.getVersion()).isEqualTo(requestBody.getVersion() + 1);
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

  private void verifyResponseBody(DividendAnnouncementDataSourceReadDto responseBody, long id) {
    assertThat(responseBody.getId()).isEqualTo(id);
    assertThat(responseBody.getVersion()).isEqualTo(requestBody.getVersion() + 1);
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

  private ResultActions putDataSource(long id) throws Exception {
    String requestBodyAsString = objectMapper.writeValueAsString(requestBody);
    return mockMvc.perform(put(String.format(ENDPOINT, id)).content(requestBodyAsString).contentType(APPLICATION_JSON));
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

  private long countHeadersByDataSourceId(long dataSourceId) {
    return ((Number) entityManager.createNativeQuery(
        "SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_REQUEST_HEADER WHERE DATA_SOURCE_ID = :id").setParameter("id",
        dataSourceId).getSingleResult()).longValue();
  }

  private long countCurrencyMappingsByDataSourceId(long dataSourceId) {
    return ((Number) entityManager.createNativeQuery(
        "SELECT COUNT(*) FROM DIVIDEND_ANNOUNCEMENT_DATA_SOURCE_CURRENCY_MAPPING WHERE DATA_SOURCE_ID = :id").setParameter("id",
        dataSourceId).getSingleResult()).longValue();
  }
}
