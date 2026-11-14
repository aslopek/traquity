package de.as.traquity.depot.dividend;

import static integration.SecurityIds.O;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.dividend.api.model.DividendDto;
import de.as.traquity.depot.dividend.api.model.DividendsByMonthDto;
import de.as.traquity.depot.dividend.api.model.DividendsByQuarterDto;
import de.as.traquity.depot.dividend.api.model.DividendsByYearDto;
import de.as.traquity.depot.dividend.api.model.DividendsDto;
import integration.IntegrationTest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@IntegrationTest
class DividendNetValueZeroTest {

  private static final String ENDPOINT = "/depot-dividends";
  private static final long NET_VALUE_ZERO_DEPOT = 100;

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  /**
   * GIVEN: A single dividend whose tax takes its whole gross value<br>
   * WHEN: Calling GET dividends endpoint<br>
   * THEN: Its year, quarter and month show a net value of zero
   */
  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DEPOT(ID, NAME, CURRENCY, CREATED_AT, UPDATED_AT, VERSION)
      VALUES (100, 'Net Value Zero', 'EUR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, SECURITY_COUNT_SPLIT_ADJUSTED, GROSS_VALUE, TAX, FEE, CREATED_AT, UPDATED_AT, VERSION)
      VALUES (1001, '2023-05-15', null, 100, (SELECT ID FROM SECURITY WHERE NAME = 'Realty Income'), 'DIVIDEND', '1', null, '1', '1', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void getDividends_yearNetValueZero_ok() throws Exception {
    DividendsDto dividends = getDividends(NET_VALUE_ZERO_DEPOT);

    DividendsByYearDto year2023 = byYear(dividends, 2023);
    assertThat(year2023.getSumGross()).isEqualByComparingTo("1");
    assertThat(year2023.getSumNet()).isEqualByComparingTo("0");
    verifyOnlyRealtyIncomeDividend(year2023.getDividends(), "1", "0", "0");

    DividendsByQuarterDto secondQuarter2023 = byQuarter(dividends, 2023, 2);
    assertThat(secondQuarter2023.getSumGross()).isEqualByComparingTo("1");
    assertThat(secondQuarter2023.getSumNet()).isEqualByComparingTo("0");
    verifyOnlyRealtyIncomeDividend(secondQuarter2023.getDividends(), "1", "0", "0");

    DividendsByMonthDto may2023 = byMonth(dividends, 2023, 5);
    assertThat(may2023.getSumGross()).isEqualByComparingTo("1");
    assertThat(may2023.getSumNet()).isEqualByComparingTo("0");
    verifyOnlyRealtyIncomeDividend(may2023.getDividends(), "1", "0", "0");
  }

  /**
   * GIVEN: A dividend in January whose tax and fee take its whole gross value<br>
   * AND: A dividend in February whose net value is positive<br>
   * WHEN: Calling GET dividends endpoint<br>
   * THEN: January shows a net value of zero<br>
   * AND: February, the quarter and the year show the net value of February
   */
  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DEPOT(ID, NAME, CURRENCY, CREATED_AT, UPDATED_AT, VERSION)
      VALUES (100, 'Net Value Zero', 'EUR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, SECURITY_COUNT_SPLIT_ADJUSTED, GROSS_VALUE, TAX, FEE, CREATED_AT, UPDATED_AT, VERSION)
      VALUES  (1001, '2024-01-15', null, 100, (SELECT ID FROM SECURITY WHERE NAME = 'Realty Income'), 'DIVIDEND', '1', null, '1', '0.75', '0.25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
              (1002, '2024-02-15', null, 100, (SELECT ID FROM SECURITY WHERE NAME = 'Realty Income'), 'DIVIDEND', '1', null, '1', '0.25', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void getDividends_monthNetValueZero_ok() throws Exception {
    DividendsDto dividends = getDividends(NET_VALUE_ZERO_DEPOT);

    DividendsByMonthDto january2024 = byMonth(dividends, 2024, 1);
    assertThat(january2024.getSumGross()).isEqualByComparingTo("1");
    assertThat(january2024.getSumNet()).isEqualByComparingTo("0");
    verifyOnlyRealtyIncomeDividend(january2024.getDividends(), "1", "0", "0");

    DividendsByMonthDto february2024 = byMonth(dividends, 2024, 2);
    assertThat(february2024.getSumGross()).isEqualByComparingTo("1");
    assertThat(february2024.getSumNet()).isEqualByComparingTo("0.75");
    verifyOnlyRealtyIncomeDividend(february2024.getDividends(), "1", "0.75", "1");

    DividendsByQuarterDto firstQuarter2024 = byQuarter(dividends, 2024, 1);
    assertThat(firstQuarter2024.getSumGross()).isEqualByComparingTo("2");
    assertThat(firstQuarter2024.getSumNet()).isEqualByComparingTo("0.75");
    verifyOnlyRealtyIncomeDividend(firstQuarter2024.getDividends(), "2", "0.75", "1");

    DividendsByYearDto year2024 = byYear(dividends, 2024);
    assertThat(year2024.getSumGross()).isEqualByComparingTo("2");
    assertThat(year2024.getSumNet()).isEqualByComparingTo("0.75");
    verifyOnlyRealtyIncomeDividend(year2024.getDividends(), "2", "0.75", "1");
  }

  private DividendsDto getDividends(long depotId) throws Exception {
    String url = String.format("%s?depotIds=%d&includeSpecialDividends=true", ENDPOINT, depotId);
    MvcResult mvcResult = mockMvc.perform(get(url)).andExpect(status().isOk()).andReturn();
    return objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
  }

  private DividendsByYearDto byYear(DividendsDto dividends, int year) {
    return dividends.getByYear().stream().filter(e -> e.getYear() == year).findFirst().orElseThrow();
  }

  private DividendsByQuarterDto byQuarter(DividendsDto dividends, int year, int quarter) {
    return dividends.getByQuarter().stream().filter(e -> e.getYear() == year && e.getQuarter() == quarter).findFirst().orElseThrow();
  }

  private DividendsByMonthDto byMonth(DividendsDto dividends, int year, int month) {
    return dividends.getByMonth().stream().filter(e -> e.getYear() == year && e.getMonth() == month).findFirst().orElseThrow();
  }

  /**
   * Verifies that {@code dividends} consist of a single Realty Income dividend with the given values. Being the only one, its
   * relative gross value is always 1.
   */
  private void verifyOnlyRealtyIncomeDividend(List<DividendDto> dividends, String gross, String net, String relativeValueNet) {
    assertThat(dividends).hasSize(1);
    DividendDto dividend = dividends.getFirst();
    assertThat(dividend.getSecurityIds()).containsExactly(O);
    assertThat(dividend.getDisplayName()).isEqualTo("Realty Income");
    assertThat(dividend.getAbsoluteValueGross()).isEqualByComparingTo(gross);
    assertThat(dividend.getAbsoluteValueNet()).isEqualByComparingTo(net);
    assertThat(dividend.getRelativeValueGross()).isEqualByComparingTo("1");
    assertThat(dividend.getRelativeValueNet()).isEqualByComparingTo(relativeValueNet);
  }
}
