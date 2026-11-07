package de.as.traquity.security;

import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static integration.SecurityIds.AMZN;
import static integration.SecurityIds.GOOGL;
import static java.math.BigDecimal.ZERO;
import static java.time.Month.DECEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import integration.IntegrationTest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class GetCagrTest {

  private static final String ENDPOINT = "/securities/%d/cagr";

  @MockitoBean
  private Clock clock;

  @Autowired
  private MockMvc mockMvc;

  private LocalDate firstAmznPrice;
  private LocalDate lastAmznPrice;


  @BeforeEach
  void setUp() {
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));

    firstAmznPrice = LocalDate.of(2023, DECEMBER, 1);
    lastAmznPrice = LocalDate.of(2023, DECEMBER, 29);
  }

  @Test
  void getCagr_startDateAndEndDate_ok() throws Exception {
    MvcResult mvcResult = getCagr(AMZN, firstAmznPrice, firstAmznPrice.plusDays(10)).andExpect(status().isOk()).andReturn();
    BigDecimal cagr = new BigDecimal(mvcResult.getResponse().getContentAsString());
    assertThat(cagr).isCloseTo(new BigDecimal("-0.03202"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getCagr_onlyStartDate_ok() throws Exception {
    MvcResult mvcResult = getCagr(AMZN, firstAmznPrice).andExpect(status().isOk()).andReturn();
    BigDecimal cagr = new BigDecimal(mvcResult.getResponse().getContentAsString());
    assertThat(cagr).isCloseTo(new BigDecimal("0.44277"), ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE HISTORICAL_SECURITY_PRICE SET PRICE = 100 WHERE SECURITY_ID = 9 AND DATE = '2023-12-29';
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (9, NULL, 108.68, 'USD', '2023-12-04', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void getCagr_mixedCurrencies_comparesPricesInCurrencyOfNewestPrice() throws Exception {
    MvcResult mvcResult = getCagr(GOOGL, LocalDate.of(2023, DECEMBER, 4)).andExpect(status().isOk()).andReturn();
    BigDecimal cagr = new BigDecimal(mvcResult.getResponse().getContentAsString());
    assertThat(cagr).isCloseTo(ZERO, ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getCagr_startDateEqualsEndDate_badRequest() throws Exception {
    MvcResult mvcResult = getCagr(AMZN, firstAmznPrice, firstAmznPrice).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getCagr_startDateIsAfterEndDate_badRequest() throws Exception {
    MvcResult mvcResult = getCagr(AMZN, firstAmznPrice.plusDays(1), firstAmznPrice).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getCagr_onlyEndDate_badRequest() throws Exception {
    String queryParams = "?endDate=" + lastAmznPrice.toString();
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, AMZN) + queryParams)).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getCagr_noQueryParams_badRequest() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT, AMZN))).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getCagr_notFound() throws Exception {
    MvcResult mvcResult = getCagr(999, firstAmznPrice).andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getCagr_insufficientPriceData_unprocessableEntity() throws Exception {
    MvcResult mvcResult = getCagr(AMZN, firstAmznPrice.minusYears(1), lastAmznPrice.minusYears(1))
        .andExpect(status().isUnprocessableEntity()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  private ResultActions getCagr(long id, LocalDate startDate) throws Exception {
    String queryParams = "?startDate=" + startDate.toString();
    return mockMvc.perform(get(String.format(ENDPOINT, id) + queryParams));
  }

  private ResultActions getCagr(long id, LocalDate startDate, LocalDate endDate) throws Exception {
    String queryParams = "?startDate=" + startDate.toString() + "&endDate=" + endDate.toString();
    return mockMvc.perform(get(String.format(ENDPOINT, id) + queryParams));
  }
}
