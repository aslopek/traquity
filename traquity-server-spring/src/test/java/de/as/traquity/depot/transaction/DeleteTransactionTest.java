package de.as.traquity.depot.transaction;

import static integration.SecurityIds.AMZN;
import static java.time.Month.DECEMBER;
import static java.time.Month.JULY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import integration.IntegrationTest;
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
class DeleteTransactionTest {

  private static final String ENDPOINT = "/depots/%d/transactions";

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private TransactionRepository transactionRepository;

  @Test
  void deleteTransaction_ok() throws Exception {
    long transactionCount = transactionRepository.count();
    long depotId = 2;
    long transactionId = 18;
    MvcResult mvcResult = deleteTransaction(depotId, transactionId).andExpect(status().isNoContent()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(transactionRepository.count()).isEqualTo(transactionCount - 1);
    assertThat(transactionRepository.existsByIdAndDepotId(transactionId, depotId)).isFalse();
  }

  @Test
  void deleteTransaction_transactionDoesNotExist_notFound() throws Exception {
    long transactionCount = transactionRepository.count();
    long depotId = 2;
    long transactionId = 999;
    MvcResult mvcResult = deleteTransaction(depotId, transactionId).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(transactionRepository.count()).isEqualTo(transactionCount);
  }

  @Test
  void deleteTransaction_depotDoesNotExist_notFound() throws Exception {
    long transactionCount = transactionRepository.count();
    long depotId = 999;
    long transactionId = 18;
    MvcResult mvcResult = deleteTransaction(depotId, transactionId).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(transactionRepository.count()).isEqualTo(transactionCount);
  }

  @Test
  void deleteTransaction_transactionIsAssignedToOtherDepot_notFound() throws Exception {
    long transactionCount = transactionRepository.count();
    long depotId = 1;
    long transactionId = 18;
    MvcResult mvcResult = deleteTransaction(depotId, transactionId).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(transactionRepository.count()).isEqualTo(transactionCount);
  }

  @Test
  void deleteTransaction_onlyTradeOfDate_removesPrice() throws Exception {
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    deleteTransaction(1, 1).andExpect(status().isNoContent());
    assertThat(TestDataQuery.getHistoricalSecurityPriceCountBySecurityIdAndDate(AMZN, LocalDate.of(2020, JULY, 13))).isZero();
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount - 1);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9001, '2020-07-13', '08:00:00', 5, 13, 'BUY', 2, 450, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void deleteTransaction_otherTradeOnDateRemains_pricesDateFromRemainingTrade() throws Exception {
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    deleteTransaction(1, 1).andExpect(status().isNoContent());
    HistoricalSecurityPrice stored = TestDataQuery.getHistoricalSecurityPrice(AMZN, LocalDate.of(2020, JULY, 13));
    // 450 / (2 * 20/1) = 450 / 40
    assertThat(stored.getPrice()).isEqualByComparingTo("11.25");
    assertThat(stored.getCurrency()).isEqualTo("USD");
    assertThat(stored.getDataSourceId()).isNull();
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9002, '2023-12-29', '10:00:00', 1, 13, 'BUY', 1, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void deleteTransaction_tradeOnLinkedDate_keepsLinkedPrice() throws Exception {
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    deleteTransaction(1, 9002).andExpect(status().isNoContent());
    HistoricalSecurityPrice stored = TestDataQuery.getHistoricalSecurityPrice(AMZN, LocalDate.of(2023, DECEMBER, 29));
    assertThat(stored.getPrice()).isEqualByComparingTo("138.58");
    assertThat(stored.getCurrency()).isEqualTo("EUR");
    assertThat(stored.getDataSourceId()).isEqualTo(101L);
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  private ResultActions deleteTransaction(long depotId, long transactionId) throws Exception {
    return mockMvc.perform(delete(String.format(ENDPOINT, depotId) + "/" + transactionId));
  }
}
