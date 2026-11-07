package de.as.traquity.depot;

import static integration.SecurityIds.AMZN;
import static java.time.Month.JULY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import integration.IntegrationTest;
import integration.sql.TestDataQuery;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class DeleteDepotTest {

  private static final String ENDPOINT = "/depots/%d";

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private DepotRepository depotRepository;


  @Test
  void deleteDepot_empty_ok() throws Exception {
    long depotCount = depotRepository.count();
    MvcResult mvcResult = deleteDepot(3L).andExpect(status().isNoContent()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(depotRepository.count()).isEqualTo(depotCount - 1);
    assertThat(depotRepository.existsById(3L)).isFalse();
  }

  @Test
  void deleteDepot_transactionsAreRemoved() throws Exception {
    long totalTransactionCount = TestDataQuery.getTransactionCount();
    long transactionCountDepot1 = TestDataQuery.getTransactionCountByDepotId(1);
    deleteDepot(1L).andExpect(status().isNoContent()).andReturn();
    assertThat(TestDataQuery.getTransactionCount()).isEqualTo(totalTransactionCount - transactionCountDepot1);
    assertThat(TestDataQuery.getTransactionCountByDepotId(1)).isZero();
  }

  @Test
  void deleteDepot_pricesStoredFromItsTradesStay() throws Exception {
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    deleteDepot(1L).andExpect(status().isNoContent());
    HistoricalSecurityPrice stored = TestDataQuery.getHistoricalSecurityPrice(AMZN, LocalDate.of(2020, JULY, 13));
    assertThat(stored.getPrice()).isEqualByComparingTo("140.35"); // seeded, derived from transaction 1
    assertThat(stored.getCurrency()).isEqualTo("EUR");
    assertThat(stored.getDataSourceId()).isNull();
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  @Test
  void deleteDepot_notFound() throws Exception {
    long depotCount = depotRepository.count();
    MvcResult mvcResult = deleteDepot(999L).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(depotRepository.count()).isEqualTo(depotCount);
  }

  private ResultActions deleteDepot(long id) throws Exception {
    return mockMvc.perform(delete(String.format(ENDPOINT, id)));
  }
}
