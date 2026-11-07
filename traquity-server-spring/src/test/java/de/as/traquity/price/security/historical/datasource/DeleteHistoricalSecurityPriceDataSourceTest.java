package de.as.traquity.price.security.historical.datasource;

import static integration.SecurityIds.PINS;
import static java.time.Month.DECEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import integration.IntegrationTest;
import jakarta.persistence.EntityManager;
import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import integration.sql.TestDataQuery;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class DeleteHistoricalSecurityPriceDataSourceTest {

  private static final String ENDPOINT = "/historical-prices/data-sources/%d";

  @Autowired
  private HistoricalSecurityPriceDataSourceRepository dataSourceRepository;

  @Autowired
  private EntityManager entityManager;

  @Autowired
  private MockMvc mockMvc;

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE_CONFIG;
      """)
  void deleteDataSource_noHeadersNoMappings_ok() throws Exception {
    long id = 101; // Existing source from test data with 2 URLs, 0 headers, 0 mappings
    long dataSourceCount = dataSourceRepository.count();

    MvcResult mvcResult = deleteDataSource(id).andExpect(status().isNoContent()).andReturn();

    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount - 1);
    assertThat(dataSourceRepository.existsById(id)).isFalse();

    // Verify cascaded deletion of URLs for Data Source 101
    assertThat(countUrlsByDataSourceId(id)).isZero();
    // Data Source 102 URL must still exist
    assertThat(countUrlsByDataSourceId(102)).isEqualTo(1);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE_CONFIG;
      """)
  void deleteDataSource_withHeaders_ok() throws Exception {
    long id = 102; // Existing source from test data with 1 URL, 2 headers, 0 mappings
    long dataSourceCount = dataSourceRepository.count();

    MvcResult mvcResult = deleteDataSource(id).andExpect(status().isNoContent()).andReturn();

    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount - 1);
    assertThat(dataSourceRepository.existsById(id)).isFalse();

    // Verify cascaded deletion of headers
    assertThat(countHeadersByDataSourceId(id)).isZero();
    assertThat(countUrlsByDataSourceId(id)).isZero();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE_CONFIG;
      """)
  void deleteDataSource_withCurrencyMappings_ok() throws Exception {
    long id = 103; // Existing source from test data with 1 URL, 0 headers, 3 mappings
    long dataSourceCount = dataSourceRepository.count();

    MvcResult mvcResult = deleteDataSource(id).andExpect(status().isNoContent()).andReturn();

    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount - 1);
    assertThat(dataSourceRepository.existsById(id)).isFalse();

    // Verify cascaded deletion of currency mappings
    assertThat(countCurrencyMappingsByDataSourceId(id)).isZero();
    assertThat(countUrlsByDataSourceId(id)).isZero();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE_CONFIG;
      """)
  void deleteDataSource_withPrices_keepsAllPricesAndUnlinksItsOwn() throws Exception {
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    long pinterestPriceCount = TestDataQuery.getHistoricalSecurityPriceCountBySecurityId(PINS);

    deleteDataSource(102).andExpect(status().isNoContent());

    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
    assertThat(TestDataQuery.getHistoricalSecurityPriceCountBySecurityId(PINS)).isEqualTo(pinterestPriceCount);
    HistoricalSecurityPrice price = TestDataQuery.getHistoricalSecurityPrice(PINS, LocalDate.of(2023, DECEMBER, 29));
    assertThat(price.getPrice()).isEqualByComparingTo("37.04");
    assertThat(price.getDataSourceId()).isNull();
  }

  @Test
  void deleteDataSource_hasConfig_badRequest() throws Exception {
    long id = 101;
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = deleteDataSource(id).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount);
    assertThat(dataSourceRepository.existsById(id)).isTrue();
    assertThat(countUrlsByDataSourceId(id)).isEqualTo(2);
    assertThat(countCurrencyMappingsByDataSourceId(id)).isZero();
    assertThat(countHeadersByDataSourceId(id)).isZero();
  }

  @Test
  void deleteDataSource_notFound() throws Exception {
    long id = 999;
    long dataSourceCount = dataSourceRepository.count();

    MvcResult mvcResult = deleteDataSource(id).andExpect(status().isNotFound()).andReturn();

    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount);

    // Verify that the existing entities and their collections were unchanged
    assertThat(countUrlsByDataSourceId(101)).isEqualTo(2);
    assertThat(countHeadersByDataSourceId(102)).isEqualTo(3);
    assertThat(countCurrencyMappingsByDataSourceId(103)).isEqualTo(3);
  }

  @Test
  void deletePreConfiguredDataSource_badRequest() throws Exception {
    long id = 1;
    long dataSourceCount = dataSourceRepository.count();
    MvcResult mvcResult = deleteDataSource(id).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(dataSourceRepository.count()).isEqualTo(dataSourceCount);
    assertThat(dataSourceRepository.existsById(id)).isTrue();
  }

  private ResultActions deleteDataSource(long id) throws Exception {
    return mockMvc.perform(delete(String.format(ENDPOINT, id)));
  }

  private long countUrlsByDataSourceId(long dataSourceId) {
    return ((Number) entityManager.createNativeQuery(
            "SELECT COUNT(*) FROM HISTORICAL_SECURITY_PRICE_DATA_SOURCE_URL WHERE DATA_SOURCE_ID = :id")
        .setParameter("id", dataSourceId)
        .getSingleResult()).longValue();
  }

  private long countHeadersByDataSourceId(long dataSourceId) {
    return ((Number) entityManager.createNativeQuery(
            "SELECT COUNT(*) FROM HISTORICAL_SECURITY_PRICE_DATA_SOURCE_REQUEST_HEADER WHERE DATA_SOURCE_ID = :id")
        .setParameter("id", dataSourceId)
        .getSingleResult()).longValue();
  }

  private long countCurrencyMappingsByDataSourceId(long dataSourceId) {
    return ((Number) entityManager.createNativeQuery(
            "SELECT COUNT(*) FROM HISTORICAL_SECURITY_PRICE_DATA_SOURCE_CURRENCY_MAPPING WHERE DATA_SOURCE_ID = :id")
        .setParameter("id", dataSourceId)
        .getSingleResult()).longValue();
  }
}
