package de.as.traquity.depot.transaction;

import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SPECIAL_DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.TAX;
import static integration.SecurityIds.AAPL;
import static integration.SecurityIds.AMZN;
import static integration.SecurityIds.HAG;
import static integration.SecurityIds.NVDA;
import static java.math.BigDecimal.ZERO;
import static java.time.Month.DECEMBER;
import static java.time.Month.JANUARY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.transaction.api.model.TransactionCreateDto;
import de.as.traquity.depot.transaction.api.model.TransactionReadDto;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import integration.DepotIds;
import integration.IntegrationTest;
import integration.sql.TestDataQuery;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class CreateTransactionTest {

  private static final String ENDPOINT = "/depots/%d/transactions";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private TransactionRepository transactionRepository;

  private TransactionCreateDto requestBody;

  @BeforeEach
  void beforeEach() {
    requestBody = new TransactionCreateDto();
    requestBody.setDate(LocalDate.of(2024, JANUARY, 17));
    requestBody.setTime("16:10:38");
    requestBody.setSecurityId(AAPL);
    requestBody.setTransactionType(TransactionTypeDto.BUY);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(20.0));
    requestBody.setSecurityCountSplitAdjusted(null);
    requestBody.setGrossValue(BigDecimal.valueOf(3351.6));
    requestBody.setTax(null);
    requestBody.setFee(BigDecimal.valueOf(0.99));
  }

  @Test
  void addTransaction_buy_ok() throws Exception {
    runPositiveTestCase(1);
  }

  @Test
  void addTransaction_fractionalShares_ok() throws Exception {
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(19.908));
    runPositiveTestCase(1);
  }

  @Test
  void addTransaction_sell_ok() throws Exception {
    requestBody.setDate(LocalDate.of(2024, JANUARY, 17));
    requestBody.setTime(null);
    requestBody.setSecurityId(HAG);
    requestBody.setTransactionType(SELL);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(150.0));
    requestBody.setSecurityCountSplitAdjusted(null);
    requestBody.setGrossValue(BigDecimal.valueOf(4264.5));
    requestBody.setTax(BigDecimal.valueOf(584.63));
    requestBody.setFee(BigDecimal.valueOf(0.99));
    runPositiveTestCase(2);
  }

  @Test
  void addTransaction_dividend_ok() throws Exception {
    requestBody.setDate(LocalDate.of(2024, JANUARY, 17));
    requestBody.setTime(null);
    requestBody.setSecurityId(NVDA);
    requestBody.setTransactionType(DIVIDEND);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(30.0));
    requestBody.setSecurityCountSplitAdjusted(null);
    requestBody.setGrossValue(BigDecimal.valueOf(1.2));
    requestBody.setTax(BigDecimal.valueOf(0.32));
    requestBody.setFee(null);
    runPositiveTestCase(1);
  }

  @Test
  void addTransaction_specialDividend_ok() throws Exception {
    requestBody.setDate(LocalDate.of(2024, JANUARY, 17));
    requestBody.setTime(null);
    requestBody.setSecurityId(NVDA);
    requestBody.setTransactionType(SPECIAL_DIVIDEND);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(30.0));
    requestBody.setSecurityCountSplitAdjusted(null);
    requestBody.setGrossValue(BigDecimal.valueOf(1.2));
    requestBody.setTax(BigDecimal.valueOf(0.32));
    requestBody.setFee(null);
    runPositiveTestCase(1);
  }

  @Test
  void addTransaction_tax_ok() throws Exception {
    requestBody.setDate(LocalDate.of(2024, JANUARY, 17));
    requestBody.setTime(null);
    requestBody.setSecurityId(AMZN);
    requestBody.setTransactionType(TAX);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(40.0));
    requestBody.setSecurityCountSplitAdjusted(null);
    requestBody.setGrossValue(BigDecimal.valueOf(82.19));
    requestBody.setTax(null);
    requestBody.setFee(null);
    runPositiveTestCase(1);
  }

  @Test
  void addTransaction_depotDoesNotExist_notFound() throws Exception {
    runNegativeTestCase(999, NOT_FOUND);
  }

  @Test
  void addTransaction_dateIsNull_badRequest() throws Exception {
    requestBody.setDate(null);
    runNegativeTestCase(1, BAD_REQUEST);
  }

  @Test
  void addTransaction_securityIdIsNull_badRequest() throws Exception {
    requestBody.setSecurityId(null);
    runNegativeTestCase(1, BAD_REQUEST);
  }

  @Test
  void addTransaction_securityIdDoesNotExist_badRequest() throws Exception {
    requestBody.setSecurityId(999L);
    runNegativeTestCase(1, BAD_REQUEST);
  }

  @Test
  void addTransaction_typeIsNull_badRequest() throws Exception {
    requestBody.setTransactionType(null);
    runNegativeTestCase(1, BAD_REQUEST);
  }

  @Test
  void addTransaction_securityCountOriginalIsNull() throws Exception {
    requestBody.setSecurityCountOriginal(null);
    runNegativeTestCase(1, BAD_REQUEST);
  }

  @Test
  void addTransaction_grossValueIsNull_badRequest() throws Exception {
    requestBody.setGrossValue(null);
    runNegativeTestCase(1, BAD_REQUEST);
  }

  @Test
  void addTransaction_buy_storesPriceFromTrade() throws Exception {
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(AAPL, "167.58", "EUR");
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount + 1);
  }

  @Test
  void addTransaction_sell_storesPriceFromTrade() throws Exception {
    requestBody.setSecurityId(HAG);
    requestBody.setTransactionType(SELL);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(150.0));
    requestBody.setGrossValue(BigDecimal.valueOf(4264.5));
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(HAG, "28.43", "EUR");
  }

  @Test
  void addTransaction_depotInOtherCurrency_storesPriceInDepotCurrency() throws Exception {
    postTransaction(DepotIds.USD_DEPOT_1).andExpect(status().isCreated());
    assertPrice(AAPL, "167.58", "USD");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9001, '2024-01-17', '10:00:00', 1, 3, 'BUY', 10, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (3, NULL, 10, 'EUR', '2024-01-17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_laterTimeThanExistingTrade_replacesPrice() throws Exception {
    useHag();
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(HAG, "22.5", "EUR");
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9001, '2024-01-17', '18:00:00', 1, 3, 'BUY', 10, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (3, NULL, 10, 'EUR', '2024-01-17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_earlierTimeThanExistingTrade_keepsPrice() throws Exception {
    useHag();
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(HAG, "10", "EUR");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (0, '2024-01-17', '16:10:38', 1, 3, 'BUY', 10, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (3, NULL, 10, 'EUR', '2024-01-17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_sameTimeAsExistingTrade_enteredLastWins() throws Exception {
    useHag();
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(HAG, "22.5", "EUR");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9001, '2024-01-17', '10:00:00', 1, 3, 'BUY', 10, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (3, NULL, 10, 'EUR', '2024-01-17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_noTimeAndExistingTradeHasTime_keepsPrice() throws Exception {
    useHag();
    requestBody.setTime(null);
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(HAG, "10", "EUR");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9001, '2024-01-17', NULL, 1, 3, 'BUY', 10, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (3, NULL, 10, 'EUR', '2024-01-17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_existingTradeHasNoTime_replacesPrice() throws Exception {
    useHag();
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(HAG, "22.5", "EUR");
  }

  @Test
  void addTransaction_priceLinkedToDataSource_keepsPrice() throws Exception {
    requestBody.setSecurityId(AMZN);
    requestBody.setDate(LocalDate.of(2023, DECEMBER, 29));
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(AMZN, LocalDate.of(2023, DECEMBER, 29), "138.58", "EUR", 101L);
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO STOCK_SPLIT(SECURITY_ID, EX_DATE, QUANTITY_OLD, QUANTITY_NEW, CREATED_AT, UPDATED_AT)
      VALUES (2, '2024-02-10', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             (2, '2024-03-10', 2, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_stockSplitsAfterDate_storesSplitAdjustedPrice() throws Exception {
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(AAPL, "55.86", "EUR"); // 3351.6 / (20 * (2/1) * (3/2)) = 3351.6 / 60
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO STOCK_SPLIT(SECURITY_ID, EX_DATE, QUANTITY_OLD, QUANTITY_NEW, CREATED_AT, UPDATED_AT)
      VALUES (2, '2024-01-17', 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_stockSplitOnDate_ignoresSplit() throws Exception {
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(AAPL, "167.58", "EUR");
  }

  @Test
  void addTransaction_securityCountOriginalIsZero_badRequest() throws Exception {
    requestBody.setSecurityCountOriginal(ZERO);
    runInvalidCountTestCase();
  }

  @Test
  void addTransaction_securityCountOriginalIsNegative_badRequest() throws Exception {
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(-20.0));
    runInvalidCountTestCase();
  }

  @Test
  void addTransaction_securityCountSplitAdjustedIsZero_badRequest() throws Exception {
    requestBody.setSecurityCountSplitAdjusted(ZERO);
    runInvalidCountTestCase();
  }

  @Test
  void addTransaction_securityCountSplitAdjustedIsNegative_badRequest() throws Exception {
    requestBody.setSecurityCountSplitAdjusted(BigDecimal.valueOf(-40.0));
    runInvalidCountTestCase();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (3, NULL, 10, 'EUR', '2024-01-17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void addTransaction_dividend_leavesPriceUnchanged() throws Exception {
    useHag();
    requestBody.setTransactionType(DIVIDEND);
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    postTransaction(1).andExpect(status().isCreated());
    assertPrice(HAG, "10", "EUR");
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  @Test
  void addTransaction_securityIdDoesNotExist_storesNoPrice() throws Exception {
    requestBody.setSecurityId(999L);
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    postTransaction(1).andExpect(status().isBadRequest());
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  private void useHag() {
    requestBody.setSecurityId(HAG);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(20.0));
    requestBody.setGrossValue(BigDecimal.valueOf(450.0));
  }

  private void assertPrice(long securityId, String price, String currency) {
    assertPrice(securityId, requestBody.getDate(), price, currency, null);
  }

  private void assertPrice(long securityId, LocalDate date, String price, String currency, Long dataSourceId) {
    HistoricalSecurityPrice stored = TestDataQuery.getHistoricalSecurityPrice(securityId, date);
    assertThat(stored.getPrice()).isEqualByComparingTo(price);
    assertThat(stored.getCurrency()).isEqualTo(currency);
    assertThat(stored.getDataSourceId()).isEqualTo(dataSourceId);
  }

  private void runPositiveTestCase(long depotId) throws Exception {
    long numberOfTransactions = transactionRepository.count();
    MvcResult mvcResult = postTransaction(depotId).andExpect(status().isCreated()).andReturn();

    // verify response
    TransactionReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), TransactionReadDto.class);
    verifyResponseBody(responseBody);
    verifyLocationHeader(mvcResult, depotId);

    // verify database
    assertThat(transactionRepository.count()).isEqualTo(numberOfTransactions + 1);
    verifyDatabase(depotId, responseBody.getId());
  }

  private void runNegativeTestCase(long depotId, HttpStatus expectedStatus) throws Exception {
    long numberOfTransactions = transactionRepository.count();
    long numberOfDepots = TestDataQuery.getDepotCount();
    MvcResult mvcResult = postTransaction(depotId).andExpect(status().is(expectedStatus.value())).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(mvcResult.getResponse().getHeader("Location")).isNull();
    assertThat(transactionRepository.count()).isEqualTo(numberOfTransactions);
    assertThat(TestDataQuery.getDepotCount()).isEqualTo(numberOfDepots);
  }

  private void runInvalidCountTestCase() throws Exception {
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    long transactionCountOfDepot = TestDataQuery.getTransactionCountByDepotId(1);
    runNegativeTestCase(1, BAD_REQUEST);
    assertThat(TestDataQuery.getTransactionCountByDepotId(1)).isEqualTo(transactionCountOfDepot);
    assertThat(TestDataQuery.getHistoricalSecurityPriceCountBySecurityIdAndDate(requestBody.getSecurityId(), requestBody.getDate()))
        .isZero();
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  private ResultActions postTransaction(long depotId) throws Exception {
    return mockMvc.perform(post(String.format(ENDPOINT, depotId)).contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(requestBody)));
  }

  private void verifyDatabase(long depotId, long expectedTransactionId) {
    TransactionEntity entity = transactionRepository.findById(expectedTransactionId).orElseThrow();
    assertThat(entity.getVersion()).isZero();
    assertThat(entity.getDate()).isEqualTo(requestBody.getDate());

    if (requestBody.getTime() == null) {
      assertThat(entity.getTime()).isNull();
    } else {
      assertThat(entity.getTime()).isEqualTo(requestBody.getTime());
    }

    assertThat(entity.getDepotId()).isEqualTo(depotId);
    assertThat(entity.getSecurityId()).isEqualTo(requestBody.getSecurityId());
    assertThat(entity.getTransactionType()).isEqualTo(requestBody.getTransactionType());
    verifyBigDecimal(entity.getSecurityCountOriginal(), requestBody.getSecurityCountOriginal());
    verifyBigDecimal(entity.getSecurityCountSplitAdjusted(), requestBody.getSecurityCountSplitAdjusted());
    verifyBigDecimal(entity.getGrossValue(), requestBody.getGrossValue());
    verifyBigDecimal(entity.getTax(), requestBody.getTax());
    verifyBigDecimal(entity.getFee(), requestBody.getFee());
  }

  private void verifyResponseBody(TransactionReadDto responseBody) {
    assertThat(responseBody.getId()).isGreaterThan(0);
    assertThat(responseBody.getVersion()).isZero();
    assertThat(responseBody.getDate()).isEqualTo(requestBody.getDate());
    assertThat(responseBody.getTime()).isEqualTo(requestBody.getTime());
    assertThat(responseBody.getSecurityId()).isEqualTo(requestBody.getSecurityId());
    assertThat(responseBody.getTransactionType()).isEqualTo(requestBody.getTransactionType());
    assertThat(responseBody.getSecurityCountOriginal()).isEqualTo(requestBody.getSecurityCountOriginal());
    assertThat(responseBody.getSecurityCountSplitAdjusted()).isEqualTo(requestBody.getSecurityCountSplitAdjusted());
    assertThat(responseBody.getGrossValue()).isEqualTo(requestBody.getGrossValue());
    assertThat(responseBody.getTax()).isEqualTo(requestBody.getTax());
    assertThat(responseBody.getFee()).isEqualTo(requestBody.getFee());
  }

  private void verifyLocationHeader(MvcResult mvcResult, long depotId) throws Exception {
    String locationHeader = mvcResult.getResponse().getHeader("Location");
    TransactionReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), TransactionReadDto.class);
    assertThat(locationHeader).isEqualTo(String.format(ENDPOINT, depotId) + "/" + responseBody.getId());
  }

  private void verifyBigDecimal(BigDecimal actual, BigDecimal expected) {
    if (expected == null) {
      assertThat(actual).isNull();
    } else {
      assertThat(actual).isEqualByComparingTo(expected);
    }
  }
}
