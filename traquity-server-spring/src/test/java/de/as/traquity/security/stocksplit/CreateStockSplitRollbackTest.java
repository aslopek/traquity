package de.as.traquity.security.stocksplit;

import static integration.SecurityIds.NVDA;
import static java.time.Month.DECEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.common.error.InternalServerErrorException;
import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.price.security.historical.HistoricalSecurityPriceService;
import de.as.traquity.security.api.model.StockSplitDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import integration.sql.TestDataQuery;
import java.time.LocalDate;
import java.time.Month;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class CreateStockSplitRollbackTest {

  private static final String ENDPOINT = "/securities/%d/stock-splits";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private StockSplitRepository stockSplitRepository;

  @MockitoSpyBean
  private HistoricalSecurityPriceService historicalSecurityPriceService;

  /**
   * GIVEN: A security {@code S}<br>
   * AND: A transaction {@code T1} of {@code S} dated before a day {@code d}<br>
   * AND: {@code T1} has a split-adjusted count<br>
   * AND: A transaction {@code T2} of {@code S} dated before {@code d}<br>
   * AND: {@code T2} has no split-adjusted count<br>
   * AND: Adjusting the historical prices of {@code S} fails<br>
   * WHEN: Creating a stock split for {@code S} with ex-date {@code d}, updating transactions and historical prices<br>
   * THEN: The response is {@code 500 Internal Server Error}<br>
   * AND: No stock split is added<br>
   * AND: The transactions of {@code S} are unchanged
   */
  @Test
  void createStockSplit_updatingHistoricalPricesFails_nothingPersisted() throws Exception {
    doThrow(new InternalServerErrorException()).when(historicalSecurityPriceService).splitAdjustment(any(), any(), any());
    long stockSplitCount = stockSplitRepository.count();
    Transaction firstTransaction = TestDataQuery.getTransaction(2);
    Transaction secondTransaction = TestDataQuery.getTransaction(15);
    LocalDate exDate = LocalDate.of(2023, DECEMBER, 15);

    // preconditions: both transactions belong to the security and lie before the ex-date, so the split would adjust them
    assertThat(firstTransaction.getSecurityId()).isEqualTo(NVDA);
    assertThat(firstTransaction.getDate()).isBefore(exDate);
    assertThat(firstTransaction.getSecurityCountOriginal()).isEqualByComparingTo("2.16");
    assertThat(firstTransaction.getSecurityCountSplitAdjusted()).isEqualByComparingTo("8.64");
    assertThat(secondTransaction.getSecurityId()).isEqualTo(NVDA);
    assertThat(secondTransaction.getDate()).isBefore(exDate);
    assertThat(secondTransaction.getSecurityCountOriginal()).isEqualByComparingTo("12.96");
    assertThat(secondTransaction.getSecurityCountSplitAdjusted()).isNull();

    StockSplitDto requestBody = new StockSplitDto();
    requestBody.setExDate(exDate);
    requestBody.setQuantityOld(2L);
    requestBody.setQuantityNew(5L);
    mockMvc.perform(post(String.format(ENDPOINT, NVDA)).queryParam("updateTransactions", "true")
            .queryParam("updateHistoricalPrices", "true").contentType(APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
        .andExpect(status().isInternalServerError());

    assertThat(stockSplitRepository.count()).isEqualTo(stockSplitCount);
    assertThat(TestDataQuery.getTransaction(2)).isEqualTo(firstTransaction);
    assertThat(TestDataQuery.getTransaction(15)).isEqualTo(secondTransaction);
  }
}
