package de.as.traquity.depot.transaction;

import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.DIVIDEND;
import static integration.SecurityIds.AMZN;
import static integration.SecurityIds.HAG;
import static integration.SecurityIds.LVMH;
import static integration.SecurityIds.VNGGF;
import static java.math.BigDecimal.ONE;
import static java.math.BigDecimal.ZERO;
import static java.time.Month.DECEMBER;
import static java.time.Month.JULY;
import static java.time.Month.NOVEMBER;
import static java.time.Month.SEPTEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.transaction.api.model.TransactionReadDto;
import de.as.traquity.depot.transaction.api.model.TransactionUpdateDto;
import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import integration.IntegrationTest;
import integration.sql.TestDataQuery;
import jakarta.persistence.EntityManager;
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
class UpdateTransactionTest {

  private static final String ENDPOINT = "/depots/%d/transactions/%d";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private EntityManager entityManager;

  @Autowired
  private TransactionRepository transactionRepository;

  private TransactionUpdateDto requestBody;

  @BeforeEach
  void beforeEach() {
    requestBody = new TransactionUpdateDto();
    requestBody.setDate(LocalDate.of(2020, JULY, 13));
    requestBody.setTime("21:09:34");
    requestBody.setSecurityId(AMZN);
    requestBody.setTransactionType(BUY);
    requestBody.setSecurityCountOriginal(ONE);
    requestBody.setSecurityCountSplitAdjusted(BigDecimal.valueOf(20.0));
    requestBody.setGrossValue(BigDecimal.valueOf(2807.0));
    requestBody.setTax(null);
    requestBody.setFee(BigDecimal.valueOf(10.0));
    requestBody.setVersion(1L);
  }

  @Test
  void updateTransaction_updateNothing_ok() throws Exception {
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_updateEverything_ok() throws Exception {
    runPositiveTestCase(1, 3);
  }

  @Test
  void updateTransaction_wrongVersion_conflict() throws Exception {
    requestBody.setVersion(0L);
    runNegativeTestCase(1, 1, HttpStatus.CONFLICT);
  }

  @Test
  void updateTransaction_transactionDoesNotExist_notFound() throws Exception {
    long transactionCount = transactionRepository.count();
    MvcResult mvcResult = putTransaction(1, 999).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
    assertThat(transactionRepository.count()).isEqualTo(transactionCount);
  }

  @Test
  void updateTransaction_depotDoesNotExist_notFound() throws Exception {
    runNegativeTestCase(999, 1, NOT_FOUND);
  }

  @Test
  void updateTransaction_transactionIsAssignedToOtherDepot_notFound() throws Exception {
    runNegativeTestCase(2, 1, NOT_FOUND);
  }

  @Test
  void updateTransaction_updateDate_ok() throws Exception {
    requestBody.setDate(LocalDate.of(2021, SEPTEMBER, 7));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_removeDate_badRequest() throws Exception {
    requestBody.setDate(null);
    runNegativeTestCase(1, 1, BAD_REQUEST);
  }

  @Test
  void updateTransaction_updateTime_ok() throws Exception {
    requestBody.setTime("17:54:01");
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_removeTime_ok() throws Exception {
    requestBody.setTime(null);
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_wrongTime_badRequest() throws Exception {
    requestBody.setTime("25:00:00");
    runNegativeTestCase(1, 1, BAD_REQUEST);
  }

  @Test
  void updateTransaction_updateSecurityId_ok() throws Exception {
    requestBody.setSecurityId(HAG);
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_updateSecurityId_securityIdDoesNotExist_badRequest() throws Exception {
    requestBody.setSecurityId(999L);
    runNegativeTestCase(1, 1, BAD_REQUEST);
  }

  @Test
  void updateTransaction_updateTransactionType_ok() throws Exception {
    requestBody.setTransactionType(DIVIDEND);
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_updateSecurityCountOriginal_ok() throws Exception {
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(2.0));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_updateSecurityCountOriginal_fractionalShares_ok() throws Exception {
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(1.504));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_removeSecurityCountOriginal_badRequest() throws Exception {
    requestBody.setSecurityCountOriginal(null);
    runNegativeTestCase(1, 1, BAD_REQUEST);
  }

  @Test
  void updateTransaction_securityCountOriginalIsZero_badRequest() throws Exception {
    requestBody.setSecurityCountOriginal(ZERO);
    runInvalidCountTestCase();
  }

  @Test
  void updateTransaction_securityCountOriginalIsNegative_badRequest() throws Exception {
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(-2.0));
    runInvalidCountTestCase();
  }

  @Test
  void updateTransaction_securityCountSplitAdjustedIsZero_badRequest() throws Exception {
    requestBody.setSecurityCountSplitAdjusted(ZERO);
    runInvalidCountTestCase();
  }

  @Test
  void updateTransaction_securityCountSplitAdjustedIsNegative_badRequest() throws Exception {
    requestBody.setSecurityCountSplitAdjusted(BigDecimal.valueOf(-40.0));
    runInvalidCountTestCase();
  }

  @Test
  void updateTransaction_updateSecurityCountSplitAdjusted_ok() throws Exception {
    requestBody.setSecurityCountSplitAdjusted(BigDecimal.valueOf(40.0));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_updateSecurityCountSplitAdjusted_fractionalShares_ok() throws Exception {
    requestBody.setSecurityCountSplitAdjusted(BigDecimal.valueOf(30.586));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_removeSecurityCountSplitAdjusted_ok() throws Exception {
    requestBody.setSecurityCountSplitAdjusted(null);
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_updateGrossValue_ok() throws Exception {
    requestBody.setGrossValue(BigDecimal.valueOf(5647.08));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_removeGrossValue_badRequest() throws Exception {
    requestBody.setGrossValue(null);
    runNegativeTestCase(1, 1, BAD_REQUEST);
  }

  @Test
  void updateTransaction_updateTax_ok() throws Exception {
    requestBody.setTax(BigDecimal.valueOf(12.34));
    runPositiveTestCase(1, 3);
  }

  @Test
  void updateTransaction_addTax_ok() throws Exception {
    requestBody.setTax(BigDecimal.valueOf(12.34));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_removeTax_ok() throws Exception {
    requestBody.setTax(null);
    runPositiveTestCase(1, 3);
  }

  @Test
  void updateTransaction_updateFee_ok() throws Exception {
    requestBody.setFee(BigDecimal.valueOf(12.34));
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_addFee_ok() throws Exception {
    requestBody.setFee(BigDecimal.valueOf(12.34));
    runPositiveTestCase(1, 8);
  }

  @Test
  void updateTransaction_removeFee_ok() throws Exception {
    requestBody.setFee(null);
    runPositiveTestCase(1, 1);
  }

  @Test
  void updateTransaction_etfDepot_ok() throws Exception {
    requestBody = new TransactionUpdateDto();
    requestBody.setDate(LocalDate.of(2023, NOVEMBER, 22));
    requestBody.setTime("12:54:05");
    requestBody.setSecurityId(VNGGF);
    requestBody.setTransactionType(BUY);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(9.294));
    requestBody.setSecurityCountSplitAdjusted(null);
    requestBody.setGrossValue(BigDecimal.valueOf(499.97));
    requestBody.setTax(null);
    requestBody.setFee(null);
    requestBody.setVersion(0L);

    runPositiveTestCase(4, 27);
  }

  @Test
  void updateTransaction_grossValueChanged_replacesPrice() throws Exception {
    requestBody.setGrossValue(BigDecimal.valueOf(5647.08));
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 1);
    assertPrice(AMZN, "282.354", "EUR"); // 5647.08 / (1 * 20), AMZN split 1:20 after the trade date
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  @Test
  void updateTransaction_shareCountChanged_replacesPrice() throws Exception {
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(2.0));
    requestBody.setSecurityCountSplitAdjusted(BigDecimal.valueOf(40.0));
    runPositiveTestCase(1, 1);
    assertPrice(AMZN, "70.175", "EUR"); // 2807 / (2 * 20)
  }

  @Test
  void updateTransaction_shareCountChangedWithStaleSplitAdjustedCount_pricesFromOriginalCount() throws Exception {
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(2.0));
    runPositiveTestCase(1, 1);
    assertPrice(AMZN, "70.175", "EUR"); // 2807 / (2 * 20), the stale split-adjusted count of 20 would give 140.35
  }

  @Test
  void updateTransaction_onlyTradeMovedOffDate_removesPriceOnOldDate() throws Exception {
    requestBody.setDate(LocalDate.of(2021, SEPTEMBER, 7));
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 1);
    assertNoPrice(AMZN, LocalDate.of(2020, JULY, 13));
    assertPrice(AMZN, "140.35", "EUR"); // 2807 / (1 * 20)
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount); // one removed, one added
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9001, '2020-07-13', '08:00:00', 5, 13, 'BUY', 2, 400, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void updateTransaction_tradeMovedOffDateWithRemainingTrade_pricesOldDateFromRemainingTrade() throws Exception {
    requestBody.setDate(LocalDate.of(2021, SEPTEMBER, 7));
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 1);
    assertPrice(AMZN, LocalDate.of(2020, JULY, 13), "10", "USD", null); // 400 / (2 * 20), USD from depot 5 of transaction 9001
    assertPrice(AMZN, "140.35", "EUR"); // 2807 / (1 * 20)
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount + 1);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9002, '2023-12-29', '10:00:00', 1, 13, 'BUY', 1, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void updateTransaction_figuresChangedOnDateWithPriceFromDataSource_keepsPrice() throws Exception {
    requestBody.setDate(LocalDate.of(2023, DECEMBER, 29));
    requestBody.setGrossValue(BigDecimal.valueOf(500.0));
    requestBody.setVersion(0L);
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 9002);
    assertPrice(AMZN, "138.58", "EUR", 101L); // seeded by data source 101
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, GROSS_VALUE,
                              CREATED_AT, UPDATED_AT, VERSION)
      VALUES (9002, '2023-12-29', '10:00:00', 1, 13, 'BUY', 1, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void updateTransaction_movedOffDateWithPriceFromDataSource_keepsPrice() throws Exception {
    requestBody.setDate(LocalDate.of(2021, SEPTEMBER, 7));
    requestBody.setVersion(0L);
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 9002);
    assertPrice(AMZN, LocalDate.of(2023, DECEMBER, 29), "138.58", "EUR", 101L); // seeded by data source 101
    assertPrice(AMZN, "140.35", "EUR"); // 2807 / (1 * 20)
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount + 1);
  }

  @Test
  void updateTransaction_movedOntoDateWithPriceFromDataSource_keepsPrice() throws Exception {
    requestBody.setDate(LocalDate.of(2023, DECEMBER, 29));
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 1);
    assertNoPrice(AMZN, LocalDate.of(2020, JULY, 13));
    assertPrice(AMZN, "138.58", "EUR", 101L); // seeded by data source 101
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount - 1);
  }

  @Test
  void updateTransaction_securityChanged_movesPriceToNewSecurity() throws Exception {
    requestBody.setSecurityId(HAG);
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 1);
    assertNoPrice(AMZN, requestBody.getDate());
    assertPrice(HAG, "2807", "EUR"); // 2807 / 1, no HAG splits
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount); // one removed, one added
  }

  @Test
  void updateTransaction_typeChangedToDividend_removesPrice() throws Exception {
    requestBody.setTransactionType(DIVIDEND);
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 1);
    assertNoPrice(AMZN, requestBody.getDate());
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount - 1);
  }

  @Test
  void updateTransaction_typeChangedFromDividendToBuy_addsPrice() throws Exception {
    requestBody = new TransactionUpdateDto();
    requestBody.setDate(LocalDate.of(2023, DECEMBER, 6));
    requestBody.setTime(null);
    requestBody.setSecurityId(LVMH);
    requestBody.setTransactionType(BUY);
    requestBody.setSecurityCountOriginal(BigDecimal.valueOf(4.0));
    requestBody.setSecurityCountSplitAdjusted(null);
    requestBody.setGrossValue(BigDecimal.valueOf(22.0));
    requestBody.setTax(null);
    requestBody.setFee(null);
    requestBody.setVersion(0L);
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    runPositiveTestCase(1, 26);
    assertPrice(LVMH, "5.5", "EUR"); // 22 / 4, no LVMH splits
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount + 1);
  }

  private void assertNoPrice(long securityId, LocalDate date) {
    assertThat(TestDataQuery.getHistoricalSecurityPriceCountBySecurityIdAndDate(securityId, date)).isZero();
  }

  private void assertPrice(long securityId, String price, String currency) {
    assertPrice(securityId, price, currency, null);
  }

  private void assertPrice(long securityId, String price, String currency, Long dataSourceId) {
    assertPrice(securityId, requestBody.getDate(), price, currency, dataSourceId);
  }

  private void assertPrice(long securityId, LocalDate date, String price, String currency, Long dataSourceId) {
    HistoricalSecurityPrice stored = TestDataQuery.getHistoricalSecurityPrice(securityId, date);
    assertThat(stored.getPrice()).isEqualByComparingTo(price);
    assertThat(stored.getCurrency()).isEqualTo(currency);
    assertThat(stored.getDataSourceId()).isEqualTo(dataSourceId);
  }

  private void runPositiveTestCase(long depotId, long transactionId) throws Exception {
    MvcResult mvcResult = putTransaction(depotId, transactionId).andExpect(status().isOk()).andReturn();
    TransactionReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), TransactionReadDto.class);
    verifyResponseBody(responseBody, transactionId);
    verifyDatabase(depotId, transactionId);
  }

  private void runNegativeTestCase(long depotId, long transactionId, HttpStatus expectedStatus) throws Exception {
    long transactionCount = transactionRepository.count();
    TransactionEntity beforeUpdate = transactionRepository.findById(transactionId).orElseThrow();
    entityManager.detach(beforeUpdate);
    long version = beforeUpdate.getVersion();

    MvcResult mvcResult =
        putTransaction(depotId, transactionId).andExpect(status().is(expectedStatus.value())).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();

    TransactionEntity afterUpdate = transactionRepository.findById(transactionId).orElseThrow();
    assertThat(afterUpdate.getVersion()).isEqualTo(version);
    assertTransactionUnchanged(beforeUpdate, afterUpdate);

    assertThat(transactionRepository.count()).isEqualTo(transactionCount);
  }

  private void runInvalidCountTestCase() throws Exception {
    LocalDate tradeDate = requestBody.getDate();
    long securityId = requestBody.getSecurityId();
    long priceCount = TestDataQuery.getHistoricalSecurityPriceCount();
    long transactionCountOfDepot = TestDataQuery.getTransactionCountByDepotId(1);
    HistoricalSecurityPrice priceBefore = TestDataQuery.getHistoricalSecurityPrice(securityId, tradeDate);

    runNegativeTestCase(1, 1, BAD_REQUEST);

    assertThat(TestDataQuery.getTransactionCountByDepotId(1)).isEqualTo(transactionCountOfDepot);
    assertThat(TestDataQuery.getHistoricalSecurityPrice(securityId, tradeDate)).isEqualTo(priceBefore);
    assertThat(TestDataQuery.getHistoricalSecurityPriceCount()).isEqualTo(priceCount);
  }

  private void assertTransactionUnchanged(TransactionEntity before, TransactionEntity after) {
    assertThat(after).usingRecursiveComparison().isEqualTo(before);
  }

  private ResultActions putTransaction(long depotId, long transactionId) throws Exception {
    return mockMvc.perform(put(String.format(ENDPOINT, depotId, transactionId)).contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(requestBody)));
  }

  private void verifyDatabase(long depotId, long transactionId) {
    TransactionEntity entity = transactionRepository.findById(transactionId).orElseThrow();
    assertThat(entity.getVersion()).isEqualTo(requestBody.getVersion() + 1);
    assertThat(entity.getDate()).isEqualTo(requestBody.getDate());

    if (requestBody.getTime() == null) {
      assertThat(entity.getTime()).isNull();
    } else {
      assertThat(entity.getTime()).isEqualTo(requestBody.getTime());
    }

    assertThat(entity.getDepotId()).isEqualTo(depotId);
    assertThat(entity.getSecurityId()).isEqualTo(requestBody.getSecurityId());
    assertThat(entity.getTransactionType().name()).isEqualTo(requestBody.getTransactionType().name());
    verifyBigDecimal(entity.getSecurityCountOriginal(), requestBody.getSecurityCountOriginal());
    verifyBigDecimal(entity.getSecurityCountSplitAdjusted(), requestBody.getSecurityCountSplitAdjusted());
    verifyBigDecimal(entity.getGrossValue(), requestBody.getGrossValue());
    verifyBigDecimal(entity.getTax(), requestBody.getTax());
    verifyBigDecimal(entity.getFee(), requestBody.getFee());
  }

  private void verifyResponseBody(TransactionReadDto responseBody, long expectedId) {
    assertThat(responseBody.getId()).isEqualTo(expectedId);
    assertThat(responseBody.getVersion()).isEqualTo(requestBody.getVersion() + 1);
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

  private void verifyBigDecimal(BigDecimal actual, BigDecimal expected) {
    if (expected == null) {
      assertThat(actual).isNull();
    } else {
      assertThat(actual).isEqualByComparingTo(expected);
    }
  }
}
