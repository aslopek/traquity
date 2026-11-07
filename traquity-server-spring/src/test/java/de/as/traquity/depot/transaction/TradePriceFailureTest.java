package de.as.traquity.depot.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.transaction.api.model.TransactionCreateDto;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import de.as.traquity.security.stocksplit.StockSplitService;
import integration.IntegrationTest;
import integration.SecurityIds;
import integration.sql.TestDataQuery;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class TradePriceFailureTest {

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private TransactionRepository transactionRepository;

  @MockitoBean
  private StockSplitService stockSplitService;

  private TransactionCreateDto requestBody;

  @BeforeEach
  void beforeEach() {
    when(stockSplitService.getSplitMultiplierAfter(anyLong(), any())).thenThrow(new IllegalStateException());
    requestBody = new TransactionCreateDto();
    requestBody.setDate(LocalDate.of(2024, Month.JANUARY, 17));
    requestBody.setTime("16:10:38");
    requestBody.setSecurityId(SecurityIds.AAPL);
    requestBody.setTransactionType(TransactionTypeDto.BUY);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(20.0));
    requestBody.setGrossValue(BigDecimal.valueOf(3351.6));
  }

  /**
   * Asserts that failing to add a derived historical security price does not block persisting the transaction itself.
   */
  @Test
  void addTransaction_priceDerivationFails_transactionIsStoredWithoutPrice() throws Exception {
    long transactionCount = transactionRepository.count();
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();

    mockMvc.perform(post("/depots/1/transactions").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(requestBody))).andExpect(status().isCreated());

    assertThat(transactionRepository.count()).isEqualTo(transactionCount + 1);
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }
}
