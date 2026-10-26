package de.as.traquity.price.security.historical.datasource;

import static de.as.traquity.price.security.historical.api.model.DateFormatDto.CUSTOM_STRING;
import static de.as.traquity.price.security.historical.api.model.DateFormatDto.TIMESTAMP_MILLISECONDS;
import static de.as.traquity.price.security.historical.api.model.DateFormatDto.TIMESTAMP_SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.price.security.historical.api.model.CurrencyMappingDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceDataSourceReadDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceUrlPatternDto;
import de.as.traquity.price.security.historical.api.model.RequestHeaderDto;
import de.as.traquity.price.security.historical.api.model.ZonedTimeDto;
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
class GetHistoricalSecurityPriceDataSourcesTest {

  private static final String ENDPOINT = "/historical-prices/data-sources";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getDataSources_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDataSourceReadDto> dataSources =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });

    dataSources = dataSources.stream().filter(ds -> ds.getId() >= 101).toList();

    assertThat(dataSources).hasSize(5);

    // Data Source 101
    HistoricalSecurityPriceDataSourceReadDto config = dataSources.getFirst();
    assertThat(config.getId()).isEqualTo(101);
    assertThat(config.getVersion()).isEqualTo(1);
    assertThat(config.getName()).isEqualTo("Price API v1");
    assertThat(config.getJsonPathDate()).isEqualTo("$.prices[*].date");
    assertThat(config.getJsonPathValue()).isEqualTo("$.prices[*].price");
    assertThat(config.getJsonPathCurrency()).isEqualTo("$.currency");
    assertThat(config.getRegexCurrency()).isNull();
    assertThat(config.getRegexCurrencyGroup()).isNull();
    assertThat(config.getRequestHeaders()).isEmpty();
    assertThat(config.getCurrencyMappings()).isEmpty();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(CUSTOM_STRING);
    assertThat(config.getDateFormat().getCustomPattern()).isEqualTo("yyyy-MM-dd");

    // URLs
    List<HistoricalSecurityPriceUrlPatternDto> urlsSource = config.getUrlPatterns();
    assertThat(urlsSource).hasSize(2);
    Map<Integer, String> expectedUrls = Map.of(
        30, "https://stock-price.api/v1/#id()?range=30d",
        365, "https://stock-price.api/v1/#id()?range=1y"
    );
    for (HistoricalSecurityPriceUrlPatternDto url : urlsSource) {
      assertThat(expectedUrls).containsKey(url.getTimespanInDays());
      assertThat(url.getUrlPattern()).isEqualTo(expectedUrls.get(url.getTimespanInDays()));
    }

    // Headers
    assertThat(config.getRequestHeaders()).isEmpty();

    // Market Close Times
    List<ZonedTimeDto> marketCloseTimes = config.getMarketCloseTimes();
    assertThat(marketCloseTimes).hasSize(2);
    Map<String, String> expectedMarketCloseTimes = Map.of(
        "America/New_York", "16:00:00",
        "Europe/Berlin", "22:00:00"
    );
    for (ZonedTimeDto time : marketCloseTimes) {
      assertThat(expectedMarketCloseTimes.containsKey(time.getTimeZone()));
      assertThat(time.getTime()).isEqualTo(expectedMarketCloseTimes.get(time.getTimeZone()));
    }

    // Data Source 102
    config = dataSources.get(1);
    assertThat(config.getId()).isEqualTo(102);
    assertThat(config.getVersion()).isEqualTo(0);
    assertThat(config.getName()).isEqualTo("Price API v2");
    assertThat(config.getJsonPathDate()).isEqualTo("$.chart.timeline.timestamps[*]");
    assertThat(config.getJsonPathValue()).isEqualTo("$.chart.timeline.dataset.values[*]");
    assertThat(config.getJsonPathCurrency()).isNull();
    assertThat(config.getRegexCurrency()).isEqualTo("([A-Z0-9]{4})$");
    assertThat(config.getRegexCurrencyGroup()).isNull();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(TIMESTAMP_MILLISECONDS);
    assertThat(config.getDateFormat().getCustomPattern()).isNull();

    // URLs
    urlsSource = config.getUrlPatterns();
    assertThat(urlsSource).hasSize(1);
    assertThat(urlsSource.getFirst().getTimespanInDays()).isEqualTo(99999);
    assertThat(urlsSource.getFirst().getUrlPattern()).isEqualTo("https://stock-price.api/v2?isin=#id()");

    // Headers
    List<RequestHeaderDto> headers = config.getRequestHeaders();
    Map<String, String> expectedHeaders = Map.of(
        "x-header-a", "valueA",
        "x-header-b", "valueB",
        "x-header-c", "secret-#mask(#base64(hello:world))");
    assertThat(headers).hasSize(3);
    for (RequestHeaderDto header : headers) {
      assertThat(expectedHeaders).containsKey(header.getHeaderName());
      assertThat(header.getHeaderValue()).isEqualTo(expectedHeaders.get(header.getHeaderName()));
    }

    // Currency Mappings
    assertThat(config.getCurrencyMappings()).hasSize(2);
    assertThat(config.getCurrencyMappings().getFirst().getCurrencyKey()).isEqualTo("XNAS");
    assertThat(config.getCurrencyMappings().getFirst().getMappedCurrencyCode()).isEqualTo("USD");
    assertThat(config.getCurrencyMappings().getFirst().getMultiplier()).isNull();
    assertThat(config.getCurrencyMappings().get(1).getCurrencyKey()).isEqualTo("XETR");
    assertThat(config.getCurrencyMappings().get(1).getMappedCurrencyCode()).isEqualTo("EUR");
    assertThat(config.getCurrencyMappings().get(1).getMultiplier()).isNull();

    // Market Close Times
    assertThat(config.getMarketCloseTimes()).isEmpty();

    // Data Source 103
    config = dataSources.get(2);
    assertThat(config.getId()).isEqualTo(103);
    assertThat(config.getVersion()).isEqualTo(0);
    assertThat(config.getName()).isEqualTo("Price API v3");
    assertThat(config.getJsonPathDate()).isEqualTo("$.history.dates[*]");
    assertThat(config.getJsonPathValue()).isEqualTo("$.history.values[*]");
    assertThat(config.getJsonPathCurrency()).isEqualTo("$.history.currencies[*]");
    assertThat(config.getRegexCurrency()).isEqualTo("(.*)([A-Z]{2}([A-Za-z]|-?\\$))$");
    assertThat(config.getRegexCurrencyGroup()).isEqualTo(2);
    assertThat(config.getRequestHeaders()).isEmpty();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(TIMESTAMP_SECONDS);
    assertThat(config.getDateFormat().getCustomPattern()).isNull();

    // URLs
    urlsSource = config.getUrlPatterns();
    assertThat(urlsSource).hasSize(1);
    assertThat(urlsSource.getFirst().getTimespanInDays()).isEqualTo(99999);
    assertThat(urlsSource.getFirst().getUrlPattern()).isEqualTo("https://stock-price.api/v3/stocks/prices?id=#id()&range=MAX");

    // Headers
    assertThat(config.getRequestHeaders()).isEmpty();

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

    // Market Close Times
    assertThat(config.getMarketCloseTimes()).isEmpty();

    // Data Source 104 - only verify currency mappings
    config = dataSources.get(3);
    currencyMappings = config.getCurrencyMappings();
    assertThat(currencyMappings).hasSize(1);
    currencyMapping = currencyMappings.getFirst();
    assertThat(currencyMapping.getCurrencyKey()).isEqualTo("");
    assertThat(currencyMapping.getMappedCurrencyCode()).isEqualTo("USD");
    assertThat(currencyMapping.getMultiplier()).isNull();

    // Data Source 105
    config = dataSources.get(4);
    assertThat(config.getId()).isEqualTo(105);
    assertThat(config.getVersion()).isEqualTo(0);
    assertThat(config.getName()).isEqualTo("Price API v5 (ISIN)");
    assertThat(config.getJsonPathDate()).isEqualTo("$.prices[*].date");
    assertThat(config.getJsonPathValue()).isEqualTo("$.prices[*].price");
    assertThat(config.getJsonPathCurrency()).isEqualTo("$.currency");
    assertThat(config.getRegexCurrency()).isNull();
    assertThat(config.getRegexCurrencyGroup()).isNull();
    assertThat(config.getCurrencyMappings()).isEmpty();

    // Date Format
    assertThat(config.getDateFormat()).isNotNull();
    assertThat(config.getDateFormat().getFormat()).isEqualTo(CUSTOM_STRING);
    assertThat(config.getDateFormat().getCustomPattern()).isEqualTo("yyyy-MM-dd");

    // URLs
    urlsSource = config.getUrlPatterns();
    assertThat(urlsSource).hasSize(2);
    Map<Integer, String> expectedIsinUrls = Map.of(
        30, "https://stock-price.api/v5/#id(isin)?range=30d",
        365, "https://stock-price.api/v5/#id(isin)?range=1y"
    );
    for (HistoricalSecurityPriceUrlPatternDto url : urlsSource) {
      assertThat(expectedIsinUrls).containsKey(url.getTimespanInDays());
      assertThat(url.getUrlPattern()).isEqualTo(expectedIsinUrls.get(url.getTimespanInDays()));
    }

    // Headers
    List<RequestHeaderDto> isinHeaders = config.getRequestHeaders();
    assertThat(isinHeaders).hasSize(1);
    assertThat(isinHeaders.getFirst().getHeaderName()).isEqualTo("x-isin");
    assertThat(isinHeaders.getFirst().getHeaderValue()).isEqualTo("#id(isin)");

    // Market Close Times
    assertThat(config.getMarketCloseTimes()).isEmpty();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE_CONFIG;
      DELETE FROM HISTORICAL_SECURITY_PRICE_DATA_SOURCE;
      """)
  void getDataSources_emptyDatabase_ok() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isOk()).andReturn();
    List<HistoricalSecurityPriceDataSourceReadDto> dataSources =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });
    assertThat(dataSources).isEmpty();
  }
}
