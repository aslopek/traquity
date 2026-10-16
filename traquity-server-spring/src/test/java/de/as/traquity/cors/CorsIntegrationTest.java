package de.as.traquity.cors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.config.securitygroup.api.model.SecurityGroupCreateDto;
import de.as.traquity.config.securitygroup.api.model.SecurityGroupUpdateDto;
import de.as.traquity.depot.api.model.DepotCreateDto;
import de.as.traquity.depot.api.model.DepotUpdateDto;
import de.as.traquity.depot.transaction.api.model.TransactionCreateDto;
import de.as.traquity.depot.transaction.api.model.TransactionUpdateDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigCreateDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementConfigUpdateDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementDataSourceCreateDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementDataSourceUpdateDto;
import de.as.traquity.notification.dividendannouncement.api.model.DividendAnnouncementUpdateDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceConfigCreateDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceConfigUpdateDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceDataSourceCreateDto;
import de.as.traquity.price.security.historical.api.model.HistoricalSecurityPriceDataSourceUpdateDto;
import de.as.traquity.security.api.model.SecurityCreateDto;
import de.as.traquity.security.api.model.SecurityUpdateDto;
import de.as.traquity.security.api.model.StockSplitDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@DirtiesContext
@AutoConfigureMockMvc
@ExtendWith(SpringExtension.class)
class CorsIntegrationTest {

  private static final String ALLOWED_ORIGIN_1 = "http://localhost:1234";
  private static final String ALLOWED_ORIGIN_2 = "https://localhost:1235";
  private static final String CORS_HEADER = "Access-Control-Allow-Origin";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  // /admin/database

  @Test
  void getDatabaseConfig() throws Exception {
    testEndpoint(HttpMethod.GET, "/admin/database", null);
  }

  // /admin/dev-mode

  @Test
  void getDevModeActive() throws Exception {
    testEndpoint(HttpMethod.GET, "/admin/dev-mode", null);
  }

  @Test
  void setDevModeActive() throws Exception {
    testEndpoint(HttpMethod.PUT, "/admin/dev-mode", true);
  }

  // /admin/pid

  @Test
  void getPid() throws Exception {
    testEndpoint(HttpMethod.GET, "/admin/pid", null);
  }

  // /admin/third-party-licenses

  @Test
  void getThirdPartyLicenses() throws Exception {
    testEndpoint(HttpMethod.GET, "/admin/third-party-licenses", null);
  }

  // /config/clients/{clientId}

  @Test
  void getClientConfig() throws Exception {
    testEndpoint(HttpMethod.GET, "/config/clients/some-client", null);
  }

  @Test
  void deleteClientConfig() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/config/clients/some-client", null);
  }

  // /config/clients/{clientId}/{clientConfigKey}

  @Test
  void getClientConfigValue() throws Exception {
    testEndpoint(HttpMethod.GET, "/config/clients/some-client/some-key", null);
  }

  @Test
  void setClientConfigValue() throws Exception {
    testEndpoint(HttpMethod.PUT, "/config/clients/some-client/some-key", "some-value", MediaType.TEXT_PLAIN);
  }

  @Test
  void deleteClientConfigValue() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/config/clients/some-client/some-key", null);
  }

  // /config/currencies/default

  @Test
  void getDefaultCurrency() throws Exception {
    testEndpoint(HttpMethod.GET, "/config/currencies/default", null);
  }

  // /config/currencies

  @Test
  void getSupportedCurrencies() throws Exception {
    testEndpoint(HttpMethod.GET, "/config/currencies", null);
  }

  // /config/security-groups

  @Test
  void createDepotSecurityGroup() throws Exception {
    testEndpoint(HttpMethod.POST, "/config/security-groups", new SecurityGroupCreateDto());
  }

  @Test
  void getSecurityGroups() throws Exception {
    testEndpoint(HttpMethod.GET, "/config/security-groups", null);
  }

  // /config/security-groups/{groupId}

  @Test
  void updateDepotSecurityGroup() throws Exception {
    testEndpoint(HttpMethod.PUT, "/config/security-groups/1", new SecurityGroupUpdateDto());
  }

  @Test
  void deleteDepotSecurityGroup() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/config/security-groups/1", null);
  }

  // /depot-dividends

  @Test
  void getDividends() throws Exception {
    testEndpoint(HttpMethod.GET, "/depot-dividends?depotIds=[1]", null);
  }

  // /depot-performance

  @Test
  void getDepotPerformance() throws Exception {
    testEndpoint(HttpMethod.GET, "/depot-performance?depotIds=1", null);
  }

  // /depot-performance/income

  @Test
  void getIncome() throws Exception {
    testEndpoint(HttpMethod.GET, "/depot-performance/income", null);
  }

  // /depot-performance/position

  @Test
  void getPositionPerformance() throws Exception {
    testEndpoint(HttpMethod.GET, "/depot-performance/position", null);
  }

  // /depot-positions

  @Test
  void getDepotPositions() throws Exception {
    testEndpoint(HttpMethod.GET, "/depot-positions?depotIds=1", null);
  }

  //  /depots

  @Test
  void createDepot() throws Exception {
    testEndpoint(HttpMethod.POST, "/depots", new DepotCreateDto());
  }

  @Test
  void getDepots() throws Exception {
    testEndpoint(HttpMethod.GET, "/depots", null);
  }

  // /depots/{id}

  @Test
  void getDepot() throws Exception {
    testEndpoint(HttpMethod.GET, "/depots/1", null);
  }

  @Test
  void updateDepot() throws Exception {
    testEndpoint(HttpMethod.PUT, "/depots/1", new DepotUpdateDto());
  }

  @Test
  void deleteDepot() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/depots/1", null);
  }

  // /depots/{depotId}/logo

  @Test
  void getLogo_depot() throws Exception {
    testEndpoint(HttpMethod.GET, "/depots/1/logo", null);
  }

  @Test
  void setLogo_depot() throws Exception {
    testEndpoint(HttpMethod.PUT, "/depots/1/logo", new byte[1], MediaType.IMAGE_PNG);
  }

  @Test
  void deleteLogo_depot() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/depots/1/logo", null);
  }

  // /depots/{depotId}/securities/{securityId}/lots

  @Test
  void getLots() throws Exception {
    testEndpoint(HttpMethod.GET, "/depots/1/securities/1/lots", null);
  }

  // /depots/{depotId}/transactions

  @Test
  void createTransaction() throws Exception {
    testEndpoint(HttpMethod.POST, "/depots/1/transactions", new TransactionCreateDto());
  }

  @Test
  void getTransactions() throws Exception {
    testEndpoint(HttpMethod.GET, "/depots/1/transactions", null);
  }

  // /depots/{depotId}/transactions/{transactionId}

  @Test
  void getTransaction() throws Exception {
    testEndpoint(HttpMethod.GET, "/depots/1/transactions/1", null);
  }

  @Test
  void updateTransaction() throws Exception {
    testEndpoint(HttpMethod.PUT, "/depots/1/transactions/1", new TransactionUpdateDto());
  }

  @Test
  void deleteTransaction() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/depots/1/transactions/1", null);
  }

  // /historical-prices/data-sources

  @Test
  void createHistoricalSecurityPriceDataSource() throws Exception {
    testEndpoint(HttpMethod.POST, "/historical-prices/data-sources", new HistoricalSecurityPriceDataSourceCreateDto());
  }

  @Test
  void getHistoricalSecurityPriceDataSources() throws Exception {
    testEndpoint(HttpMethod.GET, "/historical-prices/data-sources", null);
  }

  // /historical-prices/data-sources/{id}

  @Test
  void updateHistoricalSecurityPriceDataSource() throws Exception {
    testEndpoint(HttpMethod.PUT, "/historical-prices/data-sources/1", new HistoricalSecurityPriceDataSourceUpdateDto());
  }

  @Test
  void deleteHistoricalSecurityPriceDataSource() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/historical-prices/data-sources/1", null);
  }

  // /notifications/dividend-announcements

  @Test
  void getDividendAnnouncements() throws Exception {
    testEndpoint(HttpMethod.GET, "/notifications/dividend-announcements", null);
  }

  // /notifications/dividend-announcements/{id}

  @Test
  void updateDividendAnnouncement() throws Exception {
    DividendAnnouncementUpdateDto requestBody = new DividendAnnouncementUpdateDto();
    testEndpoint(HttpMethod.PUT, "/notifications/dividend-announcements/1", requestBody);
  }

  // /notifications/dividend-announcements/configs

  @Test
  void getDividendAnnouncementConfigs() throws Exception {
    testEndpoint(HttpMethod.GET, "/notifications/dividend-announcements/configs", null);
  }

  // /notifications/dividend-announcements/configs/{securityId}

  @Test
  void getDividendAnnouncementConfig() throws Exception {
    testEndpoint(HttpMethod.GET, "/notifications/dividend-announcements/configs/1", null);
  }

  @Test
  void createDividendAnnouncementConfig() throws Exception {
    DividendAnnouncementConfigCreateDto requestBody = new DividendAnnouncementConfigCreateDto();
    testEndpoint(HttpMethod.POST, "/notifications/dividend-announcements/configs/1", requestBody);
  }

  @Test
  void updateDividendAnnouncementConfig() throws Exception {
    DividendAnnouncementConfigUpdateDto requestBody = new DividendAnnouncementConfigUpdateDto();
    testEndpoint(HttpMethod.PUT, "/notifications/dividend-announcements/configs/1", requestBody);
  }

  @Test
  void deleteDividendAnnouncementConfig() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/notifications/dividend-announcements/configs/1", null);
  }

  // /notifications/dividend-announcements/data-sources

  @Test
  void createDividendAnnouncementDataSource() throws Exception {
    DividendAnnouncementDataSourceCreateDto requestBody = new DividendAnnouncementDataSourceCreateDto();
    testEndpoint(HttpMethod.POST, "/notifications/dividend-announcements/data-sources", requestBody);
  }

  @Test
  void getDividendAnnouncementDataSources() throws Exception {
    testEndpoint(HttpMethod.GET, "/notifications/dividend-announcements/data-sources", null);
  }

  // /notifications/dividend-announcements/data-sources/{id}

  @Test
  void updateDividendAnnouncementDataSource() throws Exception {
    DividendAnnouncementDataSourceUpdateDto requestBody = new DividendAnnouncementDataSourceUpdateDto();
    testEndpoint(HttpMethod.PUT, "/notifications/dividend-announcements/data-sources/1", requestBody);
  }

  @Test
  void deleteDividendAnnouncementDataSource() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/notifications/dividend-announcements/data-sources/1", null);
  }

  // /search/securities

  @Test
  void searchSecurities() throws Exception {
    testEndpoint(HttpMethod.GET, "/search/securities", null);
  }

  // /securities

  @Test
  void createSecurity() throws Exception {
    SecurityCreateDto requestBody = new SecurityCreateDto();
    testEndpoint(HttpMethod.POST, "/securities", requestBody);
  }

  @Test
  void getSecurities() throws Exception {
    testEndpoint(HttpMethod.GET, "/securities", null);
  }

  // /securities/{id}

  @Test
  void deleteSecurity() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/securities/10", null);
  }

  @Test
  void getSecurity() throws Exception {
    testEndpoint(HttpMethod.GET, "/securities/1", null);
  }

  @Test
  void updateSecurity() throws Exception {
    SecurityUpdateDto requestBody = new SecurityUpdateDto();
    testEndpoint(HttpMethod.PUT, "/securities/1", requestBody);
  }

  // /securities/{securityId}/cagr

  @Test
  void getCagr() throws Exception {
    testEndpoint(HttpMethod.GET, "/securities/1/cagr", null);
  }

  // /securities/{securityId}/historical-prices

  @Test
  void getHistoricalPrices() throws Exception {
    testEndpoint(HttpMethod.GET, "/securities/1/historical-prices", null);
  }

  // /securities/{securityId}/historical-prices/config

  @Test
  void getHistoricalSecurityPriceConfig() throws Exception {
    testEndpoint(HttpMethod.GET, "/securities/1/historical-prices/config", null);
  }

  @Test
  void createHistoricalSecurityPriceConfig() throws Exception {
    testEndpoint(HttpMethod.POST, "/securities/1/historical-prices/config",
        new HistoricalSecurityPriceConfigCreateDto());
  }

  @Test
  void updateHistoricalSecurityPriceConfig() throws Exception {
    testEndpoint(HttpMethod.PUT, "/securities/1/historical-prices/config",
        new HistoricalSecurityPriceConfigUpdateDto());
  }

  // /securities/{securityId}/logo

  @Test
  void getLogo_security() throws Exception {
    testEndpoint(HttpMethod.GET, "/securities/1/logo", null);
  }

  @Test
  void setLogo_security() throws Exception {
    testEndpoint(HttpMethod.PUT, "/securities/1/logo", new byte[1], MediaType.IMAGE_PNG);
  }

  @Test
  void deleteLogo_security() throws Exception {
    testEndpoint(HttpMethod.DELETE, "/securities/1/logo", null);
  }

  // /securities/{id}/stock-splits

  @Test
  void getStockSplits() throws Exception {
    testEndpoint(HttpMethod.GET, "/securities/1/stock-splits", null);
  }

  @Test
  void createStockSplit() throws Exception {
    testEndpoint(HttpMethod.POST,
        "/securities/1/stock-splits?updateTransactions=false&updateHistoricalPrices=false", new StockSplitDto());
  }

  private void testEndpoint(HttpMethod method, String url, Object requestBody) throws Exception {
    testEndpoint(method, url, requestBody, MediaType.APPLICATION_JSON);
  }

  private void testEndpoint(HttpMethod method, String url, Object requestBody, MediaType contentType) throws Exception {
    // request with first allowed origin
    MockHttpServletRequestBuilder builder = request(method, url).header("Origin", ALLOWED_ORIGIN_1);
    if (requestBody != null) {
      String content = objectMapper.writeValueAsString(requestBody);
      builder.content(content).contentType(contentType);
    }
    MvcResult result = mockMvc.perform(builder).andReturn();

    // the CORS header is written by a filter, before routing decides whether anything serves this method and path - so
    // without this check a typo'd URL or a wrong verb passes the assertions below while testing nothing. A handler is
    // resolved for every mapped endpoint, including one that answers 404 because the addressed entity does not exist.
    assertThat(result.getHandler())
        .withFailMessage("no handler is mapped for %s %s", method, url)
        .isNotNull();

    assertThat(result.getResponse().getHeader(CORS_HEADER)).isEqualTo(ALLOWED_ORIGIN_1);

    // request with second allowed origin
    builder = request(method, url).header("Origin", ALLOWED_ORIGIN_2);
    if (requestBody != null) {
      String content = objectMapper.writeValueAsString(requestBody);
      builder.content(content).contentType(contentType);
    }
    result = mockMvc.perform(builder).andReturn();
    assertThat(result.getResponse().getHeader(CORS_HEADER)).isEqualTo(ALLOWED_ORIGIN_2);

    // request with some not-allowed origin
    builder = request(method, url).header("Origin", "http://localhost:1236");
    if (requestBody != null) {
      String content = objectMapper.writeValueAsString(requestBody);
      builder.content(content).contentType(contentType);
    }
    result = mockMvc.perform(builder).andReturn();
    assertThat(result.getResponse().getHeaderNames()).doesNotContain(CORS_HEADER);
  }
}
