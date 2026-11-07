package de.as.traquity.notification.dividendannouncement.datasource;

import static de.as.traquity.notification.dividendannouncement.api.model.DateFormatDto.CUSTOM_STRING;
import static de.as.traquity.notification.dividendannouncement.api.model.DateFormatDto.TIMESTAMP_SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.notification.dividendannouncement.api.model.CurrencyMappingDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementDataSourceReadDto;
import de.as.traquity.notification.dividendannouncement.api.model.RequestHeaderDto;
import integration.IntegrationTest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@IntegrationTest
class GetDividendAnnouncementDataSourcesTest {

  private static final String ENDPOINT = "/notifications/dividend-announcements/data-sources";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getDataSources_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isOk()).andReturn();
    List<DividendAnnouncementDataSourceReadDto> dataSources =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });

    dataSources = dataSources.stream().filter(ds -> ds.getId() >= 101).toList();

    assertThat(dataSources).hasSize(4);

    // Data Source 101
    DividendAnnouncementDataSourceReadDto config = dataSources.getFirst();
    assertThat(config.getId()).isEqualTo(101);
    assertThat(config.getVersion()).isEqualTo(1);
    assertThat(config.getName()).isEqualTo("Dividend API v1");
    assertThat(config.getUrlPattern()).isEqualTo("https://dividend.api/v1/#id()/dividends");
    assertThat(config.getJsonPathDate()).isEqualTo("$.payments[*].date");
    assertThat(config.getJsonPathValue()).isEqualTo("$.payments[*].dividendPayment");
    assertThat(config.getJsonPathCurrency()).isEqualTo("$.currency");
    assertThat(config.getRegexCurrency()).isNull();
    assertThat(config.getRegexCurrencyGroup()).isNull();
    assertThat(config.getCurrencyMappings()).isEmpty();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(CUSTOM_STRING);
    assertThat(config.getDateFormat().getCustomPattern()).isEqualTo("yyyy-MM-dd");

    // Headers
    List<RequestHeaderDto> headers = config.getRequestHeaders();
    assertThat(headers).hasSize(1);
    assertThat(headers.getFirst().getHeaderName()).isEqualTo("x-auth");
    assertThat(headers.getFirst().getHeaderValue()).isEqualTo("#mask(#base64(hello:world))");

    // Data Source 102
    config = dataSources.get(1);
    assertThat(config.getId()).isEqualTo(102);
    assertThat(config.getVersion()).isEqualTo(0);
    assertThat(config.getName()).isEqualTo("Dividend API v2");
    assertThat(config.getUrlPattern()).isEqualTo("https://dividend.api/v2/#id()/dividends");
    assertThat(config.getJsonPathDate()).isEqualTo("$.dividends.dates[*]");
    assertThat(config.getJsonPathValue()).isEqualTo("$.dividends.amounts[*]");
    assertThat(config.getJsonPathCurrency()).isEqualTo("$.dividends.amounts[*]");
    assertThat(config.getRegexCurrency()).isEqualTo("^\\S+");
    assertThat(config.getRegexCurrencyGroup()).isNull();
    assertThat(config.getCurrencyMappings()).isEmpty();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(TIMESTAMP_SECONDS);
    assertThat(config.getDateFormat().getCustomPattern()).isNull();

    // Headers
    headers = config.getRequestHeaders();
    Map<String, String> expectedHeaders = Map.of("x-header-a", "valueA", "x-header-b", "valueB");
    assertThat(headers).hasSize(2);
    for (RequestHeaderDto header : headers) {
      assertThat(expectedHeaders).containsKey(header.getHeaderName());
      assertThat(header.getHeaderValue()).isEqualTo(expectedHeaders.get(header.getHeaderName()));
    }

    // Data Source 103
    config = dataSources.get(2);
    assertThat(config.getId()).isEqualTo(103);
    assertThat(config.getVersion()).isEqualTo(0);
    assertThat(config.getName()).isEqualTo("Dividend API v3");
    assertThat(config.getUrlPattern()).isEqualTo("https://dividend.api/v3/#id()/dividend-payments");
    assertThat(config.getJsonPathDate()).isEqualTo("$.dividends.dates[*]");
    assertThat(config.getJsonPathValue()).isEqualTo("$.dividends.amounts[*]");
    assertThat(config.getJsonPathCurrency()).isEqualTo("$.dividends.amounts[*]");
    assertThat(config.getRegexCurrency()).isEqualTo("(.*)([A-Z]{2}([A-Za-z]|-?\\$))$");
    assertThat(config.getRegexCurrencyGroup()).isEqualTo(2);
    assertThat(config.getRequestHeaders()).isEmpty();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(CUSTOM_STRING);
    assertThat(config.getDateFormat().getCustomPattern()).isEqualTo("MM/dd/yyyy");

    // Currency Mappings
    List<CurrencyMappingDto> currencyMappings = config.getCurrencyMappings();
    assertThat(currencyMappings).hasSize(3);

    CurrencyMappingDto currencyMapping = currencyMappings.stream()
        .filter(m -> m.getCurrencyKey().equals("GBp")).findFirst().orElseThrow();
    assertThat(currencyMapping.getMappedCurrencyCode()).isEqualTo("GBP");
    assertThat(currencyMapping.getMultiplier()).isEqualByComparingTo("0.01");

    currencyMapping = currencyMappings.stream()
        .filter(m -> m.getCurrencyKey().equals("ILA")).findFirst().orElseThrow();
    assertThat(currencyMapping.getMappedCurrencyCode()).isEqualTo("ILS");
    assertThat(currencyMapping.getMultiplier()).isEqualByComparingTo("0.01");

    currencyMapping = currencyMappings.stream()
        .filter(m -> m.getCurrencyKey().equals("CA-$")).findFirst().orElseThrow();
    assertThat(currencyMapping.getMappedCurrencyCode()).isEqualTo("CAD");
    assertThat(currencyMapping.getMultiplier()).isNull();

    // Data Source 104
    config = dataSources.get(3);
    assertThat(config.getId()).isEqualTo(104);
    assertThat(config.getVersion()).isEqualTo(0);
    assertThat(config.getName()).isEqualTo("Dividend API v4 (ISIN)");
    assertThat(config.getUrlPattern()).isEqualTo("https://dividend.api/v4/#id(isin)/dividends");
    assertThat(config.getJsonPathDate()).isEqualTo("$.payments[*].date");
    assertThat(config.getJsonPathValue()).isEqualTo("$.payments[*].dividendPayment");
    assertThat(config.getJsonPathCurrency()).isEqualTo("$.currency");
    assertThat(config.getRegexCurrency()).isNull();
    assertThat(config.getRegexCurrencyGroup()).isNull();
    assertThat(config.getCurrencyMappings()).isEmpty();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(CUSTOM_STRING);
    assertThat(config.getDateFormat().getCustomPattern()).isEqualTo("yyyy-MM-dd");

    // Headers
    headers = config.getRequestHeaders();
    assertThat(headers).hasSize(1);
    assertThat(headers.getFirst().getHeaderName()).isEqualTo("x-isin");
    assertThat(headers.getFirst().getHeaderValue()).isEqualTo("#id(isin)");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM DIVIDEND_ANNOUNCEMENT_CONFIG;
      DELETE FROM DIVIDEND_ANNOUNCEMENT_DATA_SOURCE;
      """)
  void getDataSources_emptyDatabase_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isOk()).andReturn();
    List<DividendAnnouncementDataSourceReadDto> dataSources =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });
    assertThat(dataSources).isEmpty();
  }
}
