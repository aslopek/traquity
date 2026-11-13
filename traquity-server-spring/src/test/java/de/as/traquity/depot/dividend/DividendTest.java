package de.as.traquity.depot.dividend;

import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.dividend.api.model.DividendDto;
import de.as.traquity.depot.dividend.api.model.DividendYieldDto;
import de.as.traquity.depot.dividend.api.model.DividendsByMonthDto;
import de.as.traquity.depot.dividend.api.model.DividendsByQuarterDto;
import de.as.traquity.depot.dividend.api.model.DividendsByYearDto;
import de.as.traquity.depot.dividend.api.model.DividendsDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class DividendTest {

  private static final String ENDPOINT = "/depot-dividends";
  private static final Offset<Double> ACCURACY_ONE_THOUSANDTH = Offset.strictOffset(0.001);
  private static final Offset<Double> ACCURACY_ONE_HUNDREDTH = Offset.offset(0.01);
  private static final Offset<Double> PERCENTAGE_ACCURACY_ONE_THOUSANDTH = Offset.strictOffset(0.00001);
  private static final Offset<Double> PERCENTAGE_ACCURACY_ONE_HUNDREDTH = Offset.offset(0.0001);

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getDividends_noDepots_badRequest() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(ENDPOINT)).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDividends_emptyDepots_badRequest() throws Exception {
    MvcResult mvcResult =
        mockMvc.perform(get(String.format("%s?depotIds=", ENDPOINT))).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDividends_depotsHaveDifferentCurrencies_badRequest() throws Exception {
    MvcResult mvcResult = getDividends("1,5", null).andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDividends_oneDepot_specialDividendParameterNotSet_ok() throws Exception {
    MvcResult mvcResult = getDividends("1", null).andExpect(status().isOk()).andReturn();
    getDividendsForDepot1_noSpecialDividend(mvcResult);
  }

  @Test
  void getDividends_oneDepot_specialDividendParameterFalse_ok() throws Exception {
    MvcResult mvcResult = getDividends("1", false).andExpect(status().isOk()).andReturn();
    getDividendsForDepot1_noSpecialDividend(mvcResult);
  }

  @Test
  void getDividends_oneDepot_specialDividendParameterTrue_ok() throws Exception {
    MvcResult mvcResult = getDividends("1", true).andExpect(status().isOk()).andReturn();
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
    List<Integer> years = dividends.getByYear().stream().map(DividendsByYearDto::getYear).toList();
    assertThat(years).containsExactlyElementsOf(List.of(2020, 2021, 2022, 2023, 2024));
    assertThat(dividends.getByYear().get(0).getSumGross().doubleValue()).isCloseTo(0.28, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(0).getSumNet().doubleValue()).isCloseTo(0.21, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumGross().doubleValue()).isCloseTo(2.09, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumNet().doubleValue()).isCloseTo(1.57, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumGross().doubleValue()).isCloseTo(0.78, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumNet().doubleValue()).isCloseTo(0.59, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumGross().doubleValue()).isCloseTo(45.06, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumNet().doubleValue()).isCloseTo(33.49, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(4).getSumGross().doubleValue()).isCloseTo(8.64, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(4).getSumNet().doubleValue()).isCloseTo(6.36, ACCURACY_ONE_THOUSANDTH);

    for (int year : years) {
      verifyPlausibility(dividends, year);
    }
  }

  @Test
  void getDividends_twoDepots_specialDividendParameterNotSet_ok() throws Exception {
    MvcResult mvcResult = getDividends("1,2", null).andExpect(status().isOk()).andReturn();
    getDividendsForDepot1And2_noSpecialDividend(mvcResult);
  }

  @Test
  void getDividends_twoDepots_specialDividendParameterFalse_ok() throws Exception {
    MvcResult mvcResult = getDividends("1,2", false).andExpect(status().isOk()).andReturn();
    getDividendsForDepot1And2_noSpecialDividend(mvcResult);
  }

  @Test
  void getDividends_twoDepots_specialDividendParameterTrue_ok() throws Exception {
    MvcResult mvcResult = getDividends("1,2", true).andExpect(status().isOk()).andReturn();
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
    List<Integer> years = dividends.getByYear().stream().map(DividendsByYearDto::getYear).toList();
    assertThat(years).containsExactlyElementsOf(List.of(2020, 2021, 2022, 2023, 2024));
    assertThat(dividends.getByYear().get(0).getSumGross().doubleValue()).isCloseTo(0.28, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(0).getSumNet().doubleValue()).isCloseTo(0.21, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumGross().doubleValue()).isCloseTo(15.28, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumNet().doubleValue()).isCloseTo(14.73, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumGross().doubleValue()).isCloseTo(63.48, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumNet().doubleValue()).isCloseTo(63.26, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumGross().doubleValue()).isCloseTo(120.06, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumNet().doubleValue()).isCloseTo(108.49, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(4).getSumGross().doubleValue()).isCloseTo(8.64, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(4).getSumNet().doubleValue()).isCloseTo(6.36, ACCURACY_ONE_THOUSANDTH);

    for (int year : years) {
      verifyPlausibility(dividends, year);
    }
  }

  @Test
  void getDividends_withSecurityGroups_grouped_ok() throws Exception {
    MvcResult mvcResult = getDividends("7", true).andExpect(status().isOk()).andReturn();
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
    List<Integer> years = dividends.getByYear().stream().map(DividendsByYearDto::getYear).toList();
    assertThat(years).containsExactlyElementsOf(List.of(2020, 2021, 2022, 2023));
    assertThat(dividends.getByYear().get(0).getSumGross().doubleValue()).isCloseTo(130.77, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(0).getSumNet().doubleValue()).isCloseTo(98.07, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumGross().doubleValue()).isCloseTo(130.77, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumNet().doubleValue()).isCloseTo(98.07, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumGross().doubleValue()).isCloseTo(203.67, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumNet().doubleValue()).isCloseTo(152.75, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumGross().doubleValue()).isCloseTo(236.07, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumNet().doubleValue()).isCloseTo(177.05, ACCURACY_ONE_THOUSANDTH);

    for (DividendsByYearDto byYear : dividends.getByYear()) {
      assertThat(byYear.getDividends()).hasSize(1);
      assertThat(byYear.getDividends().get(0).getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VW_VZ,
          SecurityIds.VW_STAMM);
      assertThat(byYear.getDividends().get(0).getSecurityGroupId()).isEqualTo(1);
      assertThat(byYear.getDividends().get(0).getDisplayName()).isEqualTo("Volkswagen");
    }

    assertThat(dividends.getDividendYield()).hasSize(1);
    DividendYieldDto dividendYield = dividends.getDividendYield().get(0);
    assertThat(dividendYield.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VW_VZ, SecurityIds.VW_STAMM);
    assertThat(dividendYield.getSecurityGroupId()).isEqualTo(1);
    assertThat(dividendYield.getDisplayName()).isEqualTo("Volkswagen");
    /*
     * Due to the changes in the Volkswagen's dividend payment dates, the automatic detection for regular
     * dividend payments per year wrongly assumes two payments per year. This is accounted for in the following
     * assertions.
     */
    double expectedEstimatedPaymentGross = 236.07;
    double expectedEstimatedPaymentNet = 177.05;
    double expectedCurrentYieldGross = 0.0769;
    double expectedCurrentYieldNet = 0.0577;
    double expectedYieldOnCostGross = 0.0800;
    double expectedYieldOnCostNet = 0.0600;

    assertThat(dividendYield.getRegularDividendPaymentsPerYear()).isEqualTo(2);
    assertThat(dividendYield.getEstimatedPaymentGross().doubleValue()).isCloseTo(2 * expectedEstimatedPaymentGross,
        ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getEstimatedPaymentNet().doubleValue()).isCloseTo(2 * expectedEstimatedPaymentNet,
        ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldGross().doubleValue()).isCloseTo(2 * expectedCurrentYieldGross,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldNet().doubleValue()).isCloseTo(2 * expectedCurrentYieldNet,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostGross().doubleValue()).isCloseTo(2 * expectedYieldOnCostGross,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostNet().doubleValue()).isCloseTo(2 * expectedYieldOnCostNet,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
  }

  @Test
  void getDividends_withSecurityGroups_ungrouped_ok() throws Exception {
    MvcResult mvcResult = getDividends("8", true).andExpect(status().isOk()).andReturn();
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
    List<Integer> years = dividends.getByYear().stream().map(DividendsByYearDto::getYear).toList();
    assertThat(years).containsExactlyElementsOf(List.of(2020, 2021, 2022, 2023));
    assertThat(dividends.getByYear().get(0).getSumGross().doubleValue()).isCloseTo(43.74, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(0).getSumNet().doubleValue()).isCloseTo(32.8, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumGross().doubleValue()).isCloseTo(43.74, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumNet().doubleValue()).isCloseTo(32.8, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumGross().doubleValue()).isCloseTo(68.04, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumNet().doubleValue()).isCloseTo(51.03, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumGross().doubleValue()).isCloseTo(78.84, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumNet().doubleValue()).isCloseTo(59.13, ACCURACY_ONE_THOUSANDTH);

    for (DividendsByYearDto byYear : dividends.getByYear()) {
      assertThat(byYear.getDividends()).hasSize(1);
      assertThat(byYear.getDividends().get(0).getSecurityIds()).isEqualTo(List.of(SecurityIds.VW_VZ));
      assertThat(byYear.getDividends().get(0).getSecurityGroupId()).isEqualTo(1);
      assertThat(byYear.getDividends().get(0).getDisplayName()).isEqualTo("Volkswagen VZ");
    }

    for (int year : years) {
      verifyPlausibility(dividends, year);
    }

    assertThat(dividends.getDividendYield()).hasSize(1);
    DividendYieldDto dividendYield = dividends.getDividendYield().get(0);
    assertThat(dividendYield.getSecurityIds()).isEqualTo(List.of(SecurityIds.VW_VZ));
    assertThat(dividendYield.getSecurityGroupId()).isEqualTo(1);
    assertThat(dividendYield.getDisplayName()).isEqualTo("Volkswagen VZ");
    /*
     * Due to the changes in the Volkswagen's dividend payment dates, the automatic detection for regular
     * dividend payments per year wrongly assumes two payments per year. This is accounted for in the following
     * assertions.
     */
    double expectedEstimatedPaymentGross = 78.84;
    double expectedEstimatedPaymentNet = 59.13;
    double expectedCurrentYieldGross = 0.0784;
    double expectedCurrentYieldNet = 0.0588;
    double expectedYieldOnCostGross = 0.0886;
    double expectedYieldOnCostNet = 0.0664;

    assertThat(dividendYield.getRegularDividendPaymentsPerYear()).isEqualTo(2);
    assertThat(dividendYield.getEstimatedPaymentGross().doubleValue()).isCloseTo(2 * expectedEstimatedPaymentGross,
        ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getEstimatedPaymentNet().doubleValue()).isCloseTo(2 * expectedEstimatedPaymentNet,
        ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldGross().doubleValue()).isCloseTo(2 * expectedCurrentYieldGross,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldNet().doubleValue()).isCloseTo(2 * expectedCurrentYieldNet,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostGross().doubleValue()).isCloseTo(2 * expectedYieldOnCostGross,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostNet().doubleValue()).isCloseTo(2 * expectedYieldOnCostNet,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
  }

  @Test
  void getDividends_withSecurityGroups_consolidateGroupsAndDepots_ok() throws Exception {
    MvcResult mvcResult = getDividends("7,8", true).andExpect(status().isOk()).andReturn();
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
    List<Integer> years = dividends.getByYear().stream().map(DividendsByYearDto::getYear).toList();
    assertThat(years).containsExactlyElementsOf(List.of(2020, 2021, 2022, 2023));
    assertThat(dividends.getByYear().get(0).getSumGross().doubleValue()).isCloseTo(174.51, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(0).getSumNet().doubleValue()).isCloseTo(130.87, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumGross().doubleValue()).isCloseTo(174.51, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumNet().doubleValue()).isCloseTo(130.87, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumGross().doubleValue()).isCloseTo(271.71, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumNet().doubleValue()).isCloseTo(203.78, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumGross().doubleValue()).isCloseTo(314.91, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumNet().doubleValue()).isCloseTo(236.18, ACCURACY_ONE_THOUSANDTH);

    for (DividendsByYearDto byYear : dividends.getByYear()) {
      assertThat(byYear.getDividends()).hasSize(1);
      assertThat(byYear.getDividends().get(0).getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VW_VZ,
          SecurityIds.VW_STAMM);
      assertThat(byYear.getDividends().get(0).getSecurityGroupId()).isEqualTo(1);
      assertThat(byYear.getDividends().get(0).getDisplayName()).isEqualTo("Volkswagen");
    }

    assertThat(dividends.getDividendYield()).hasSize(1);
    DividendYieldDto dividendYield = dividends.getDividendYield().get(0);
    assertThat(dividendYield.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VW_VZ, SecurityIds.VW_STAMM);
    assertThat(dividendYield.getSecurityGroupId()).isEqualTo(1);
    assertThat(dividendYield.getDisplayName()).isEqualTo("Volkswagen");
    /*
     * Due to the changes in the Volkswagen's dividend payment dates, the automatic detection for regular
     * dividend payments per year wrongly assumes two payments per year. This is accounted for in the following
     * assertions.
     */
    double expectedEstimatedPaymentGross = 314.91;
    double expectedEstimatedPaymentNet = 236.18;
    double expectedCurrentYieldGross = 0.0773;
    double expectedCurrentYieldNet = 0.0580;
    double expectedYieldOnCostGross = 0.0820;
    double expectedYieldOnCostNet = 0.0615;

    assertThat(dividendYield.getRegularDividendPaymentsPerYear()).isEqualTo(2);
    assertThat(dividendYield.getEstimatedPaymentGross().doubleValue()).isCloseTo(2 * expectedEstimatedPaymentGross,
        ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getEstimatedPaymentNet().doubleValue()).isCloseTo(2 * expectedEstimatedPaymentNet,
        ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldGross().doubleValue()).isCloseTo(2 * expectedCurrentYieldGross,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldNet().doubleValue()).isCloseTo(2 * expectedCurrentYieldNet,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostGross().doubleValue()).isCloseTo(2 * expectedYieldOnCostGross,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostNet().doubleValue()).isCloseTo(2 * expectedYieldOnCostNet,
        PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
  }

  /**
   * GIVEN: Dividend transactions exist for securities of a security group<br>
   * AND: Dividend transaction exists for security, where {@code security.id == securityGroup.id}<br>
   * WHEN: Calling GET dividends endpoint<br>
   * THEN: Dividends of the grouped securities and the security with {@code security.id == securityGroup.id} are NOT
   * consolidated
   */
  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO DEPOT(ID, NAME, CURRENCY, CREATED_AT, UPDATED_AT, VERSION)
      VALUES (100, 'Bug', 'EUR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      INSERT INTO TRANSACTION(ID, DATE, TIME, DEPOT_ID, SECURITY_ID, TRANSACTION_TYPE, SECURITY_COUNT_ORIGINAL, SECURITY_COUNT_SPLIT_ADJUSTED, GROSS_VALUE, TAX, FEE, CREATED_AT, UPDATED_AT, VERSION)
      VALUES  (1001, '2024-06-17', null, 100, 2, 'DIVIDEND', '1', null, '0.23', '0.03', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
              (1002, '2024-06-18', null, 100, (SELECT ID FROM SECURITY WHERE NAME = 'Alphabet A'), 'DIVIDEND', '1', null, '0.19', '0.03', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
              (1003, '2024-06-18', null, 100, (SELECT ID FROM SECURITY WHERE NAME = 'Alphabet C'), 'DIVIDEND', '2', null, '0.38', '0.06', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0);
      """)
  void dividend_securityGroupIdAndSecurityIdEqual_noConsolidation() throws Exception {
    MvcResult mvcResult = getDividends("100", true).andExpect(status().isOk()).andReturn();
    DividendsDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);

    /* Identifies both the security group and the security for which dividend transactions exist. */
    final long ambiguousId = 2;

    Consumer<List<DividendDto>> verifyDividends = dividends -> {
      assertThat(dividends).hasSize(2);
      assertThat(dividends.get(0).getSecurityGroupId()).isNull();
      assertThat(dividends.get(0).getSecurityIds()).hasSize(1);
      assertThat(dividends.get(0).getSecurityIds().get(0)).isEqualTo(ambiguousId);
      assertThat(dividends.get(1).getSecurityGroupId()).isEqualTo(ambiguousId);
      assertThat(dividends.get(1).getSecurityIds()).hasSize(2);
      assertThat(dividends.get(1).getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.GOOGL, SecurityIds.GOOG);
    };

    List<DividendsByYearDto> byYear = responseBody.getByYear();
    assertThat(byYear).hasSize(1); // only 2024
    assertThat(byYear.get(0).getYear()).isEqualTo(2024);
    assertThat(byYear.get(0).getSumGross()).isEqualByComparingTo(BigDecimal.valueOf(0.8));
    assertThat(byYear.get(0).getSumNet()).isEqualByComparingTo(BigDecimal.valueOf(0.68));
    verifyDividends.accept(byYear.get(0).getDividends());

    List<DividendsByQuarterDto> byQuarter = responseBody.getByQuarter();
    assertThat(byQuarter).hasSize(4); // all four quarters of 2024
    assertThat(byQuarter.get(1).getQuarter()).isEqualTo(2);
    assertThat(byQuarter.get(1).getSumGross()).isEqualByComparingTo(BigDecimal.valueOf(0.8));
    assertThat(byQuarter.get(1).getSumNet()).isEqualByComparingTo(BigDecimal.valueOf(0.68));
    assertThat(byQuarter.get(1).getDividends()).hasSize(2);
    verifyDividends.accept(byQuarter.get(1).getDividends());

    List<DividendsByMonthDto> byMonth = responseBody.getByMonth();
    assertThat(byMonth).hasSize(12); // all twelve months of 2024
    assertThat(byMonth.get(5).getMonth()).isEqualTo(6);
    assertThat(byMonth.get(5).getSumGross()).isEqualByComparingTo(BigDecimal.valueOf(0.8));
    assertThat(byMonth.get(5).getSumNet()).isEqualByComparingTo(BigDecimal.valueOf(0.68));
    assertThat(byMonth.get(5).getDividends()).hasSize(2);
    verifyDividends.accept(byMonth.get(5).getDividends());
  }

  @Test
  void getDividends_positionBuyInAndValueZero_yieldsZero() throws Exception {
    MvcResult mvcResult = getDividends("14", true).andExpect(status().isOk()).andReturn();
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);

    assertThat(dividends.getDividendYield()).hasSize(1);
    DividendYieldDto dividendYield = dividends.getDividendYield().getFirst();
    assertThat(dividendYield.getSecurityIds()).containsExactly(SecurityIds.O);
    assertThat(dividendYield.getSecurityGroupId()).isNull();
    assertThat(dividendYield.getDisplayName()).isEqualTo("Realty Income");
    assertThat(dividendYield.getRegularDividendPaymentsPerYear()).isEqualTo(12);
    assertThat(dividendYield.getEstimatedPaymentGross()).isEqualByComparingTo("12"); // 12 * 1
    assertThat(dividendYield.getEstimatedPaymentNet()).isEqualByComparingTo("9"); // 12 * (1 - 0.25)
    assertThat(dividendYield.getCurrentYieldGross()).isEqualByComparingTo("0");
    assertThat(dividendYield.getCurrentYieldNet()).isEqualByComparingTo("0");
    assertThat(dividendYield.getYieldOnCostGross()).isEqualByComparingTo("0");
    assertThat(dividendYield.getYieldOnCostNet()).isEqualByComparingTo("0");
  }

  private void getDividendsForDepot1_noSpecialDividend(MvcResult mvcResult) throws Exception {
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
    List<Integer> years = dividends.getByYear().stream().map(DividendsByYearDto::getYear).toList();
    assertThat(years).containsExactlyElementsOf(List.of(2020, 2021, 2022, 2023));
    assertThat(dividends.getByYear().get(0).getSumGross().doubleValue()).isCloseTo(0.28, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(0).getSumNet().doubleValue()).isCloseTo(0.21, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumGross().doubleValue()).isCloseTo(2.09, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumNet().doubleValue()).isCloseTo(1.57, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumGross().doubleValue()).isCloseTo(0.78, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumNet().doubleValue()).isCloseTo(0.59, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumGross().doubleValue()).isCloseTo(23.38, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumNet().doubleValue()).isCloseTo(17.53, ACCURACY_ONE_THOUSANDTH);

    for (int year : years) {
      verifyPlausibility(dividends, year);
    }

    List<DividendYieldDto> dividendYields = dividends.getDividendYield();
    assertThat(dividendYields).hasSize(1); // LVMH does not have the minimum required regular payments
    DividendYieldDto dividendYield = dividendYields.get(0);
    assertThat(dividendYield.getSecurityIds()).isEqualTo(List.of(SecurityIds.NVDA));
    assertThat(dividendYield.getSecurityGroupId()).isNull();
    assertThat(dividendYield.getDisplayName()).isEqualTo("Nvidia");
    assertThat(dividendYield.getRegularDividendPaymentsPerYear()).isEqualTo(4);
    assertThat(dividendYield.getEstimatedPaymentGross().doubleValue()).isCloseTo(3.12, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividendYield.getEstimatedPaymentNet().doubleValue()).isCloseTo(2.36, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividendYield.getCurrentYieldGross().doubleValue()).isCloseTo(0.0009, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldNet().doubleValue()).isCloseTo(0.0007, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    // yield on cost are similar, because no historical prices exist for NVDA
    assertThat(dividendYield.getYieldOnCostGross().doubleValue()).isCloseTo(0.0009, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostNet().doubleValue()).isCloseTo(0.0007, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
  }

  private void getDividendsForDepot1And2_noSpecialDividend(MvcResult mvcResult) throws Exception {
    DividendsDto dividends = objectMapper.readValue(mvcResult.getResponse().getContentAsString(), DividendsDto.class);
    List<Integer> years = dividends.getByYear().stream().map(DividendsByYearDto::getYear).toList();
    assertThat(years).containsExactlyElementsOf(List.of(2020, 2021, 2022, 2023));
    assertThat(dividends.getByYear().get(0).getSumGross().doubleValue()).isCloseTo(0.28, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(0).getSumNet().doubleValue()).isCloseTo(0.21, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumGross().doubleValue()).isCloseTo(15.28, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(1).getSumNet().doubleValue()).isCloseTo(14.73, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumGross().doubleValue()).isCloseTo(63.48, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(2).getSumNet().doubleValue()).isCloseTo(63.26, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumGross().doubleValue()).isCloseTo(98.38, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividends.getByYear().get(3).getSumNet().doubleValue()).isCloseTo(92.53, ACCURACY_ONE_THOUSANDTH);

    for (int year : years) {
      verifyPlausibility(dividends, year);
    }

    List<DividendYieldDto> dividendYields = dividends.getDividendYield();
    assertThat(dividendYields).hasSize(2); // LVMH does not have the minimum required regular dividends
    DividendYieldDto dividendYield = dividendYields.get(0);
    assertThat(dividendYield.getSecurityIds()).isEqualTo(List.of(SecurityIds.HAG));
    assertThat(dividendYield.getSecurityGroupId()).isNull();
    assertThat(dividendYield.getDisplayName()).isEqualTo("Hensoldt");
    assertThat(dividendYield.getRegularDividendPaymentsPerYear()).isEqualTo(1);
    assertThat(dividendYield.getEstimatedPaymentGross().doubleValue()).isCloseTo(75, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividendYield.getEstimatedPaymentNet().doubleValue()).isCloseTo(75, ACCURACY_ONE_THOUSANDTH);
    // 75 / (250 * 12.6), valued at the price derived from the latest buy (transaction 20)
    assertThat(dividendYield.getCurrentYieldGross().doubleValue()).isCloseTo(0.0238, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldNet().doubleValue()).isCloseTo(0.0238, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    // 75 / 3159 buy-in
    assertThat(dividendYield.getYieldOnCostGross().doubleValue()).isCloseTo(0.0237, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostNet().doubleValue()).isCloseTo(0.0237, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);

    dividendYield = dividendYields.get(1);
    assertThat(dividendYield.getSecurityIds()).isEqualTo(List.of(SecurityIds.NVDA));
    assertThat(dividendYield.getSecurityGroupId()).isNull();
    assertThat(dividendYield.getDisplayName()).isEqualTo("Nvidia");
    assertThat(dividendYield.getRegularDividendPaymentsPerYear()).isEqualTo(4);
    assertThat(dividendYield.getEstimatedPaymentGross().doubleValue()).isCloseTo(3.92, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividendYield.getEstimatedPaymentNet().doubleValue()).isCloseTo(3.04, ACCURACY_ONE_THOUSANDTH);
    assertThat(dividendYield.getCurrentYieldGross().doubleValue()).isCloseTo(0.0009, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getCurrentYieldNet().doubleValue()).isCloseTo(0.0007, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    // yield on cost are similar, because no historical prices exist for NVDA
    assertThat(dividendYield.getYieldOnCostGross().doubleValue()).isCloseTo(0.0009, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
    assertThat(dividendYield.getYieldOnCostNet().doubleValue()).isCloseTo(0.0007, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);
  }


  private void verifyPlausibility(DividendsDto dividends, int year) {
    DividendsByYearDto byYear = dividends.getByYear().stream().filter(e -> e.getYear() == year).toList().get(0);
    assertThat(byYear.getSumGross()).isGreaterThanOrEqualTo(byYear.getSumNet());
    verifyDividends(byYear.getDividends(), byYear.getSumGross().doubleValue(), byYear.getSumNet().doubleValue());

    List<DividendsByQuarterDto> quarters = dividends.getByQuarter().stream().filter(e -> e.getYear() == year).toList();
    List<DividendsByMonthDto> months = dividends.getByMonth().stream().filter(e -> e.getYear() == year).toList();
    assertThat(quarters.size()).isEqualTo(4);
    assertThat(months.size()).isEqualTo(12);

    double allQuartersGrossSum = 0;
    double allQuartersNetSum = 0;
    double monthsGrossSum = 0;
    double monthsNetsSum = 0;
    DividendsByQuarterDto quarter;
    DividendsByMonthDto month;
    for (int i = 0; i < 4; i++) {
      quarter = quarters.get(i);
      assertThat(quarter.getQuarter()).isEqualTo(i + 1);
      verifyDividends(quarter.getDividends(), quarter.getSumGross().doubleValue(), quarter.getSumNet().doubleValue());
      allQuartersGrossSum += quarter.getSumGross().doubleValue();
      allQuartersNetSum += quarter.getSumNet().doubleValue();

      for (int k = 3 * i; k < (3 * i) + 3; k++) {
        month = months.get(k);
        assertThat(month.getMonth()).isEqualTo(k + 1);
        verifyDividends(month.getDividends(), month.getSumGross().doubleValue(), month.getSumNet().doubleValue());
        monthsGrossSum += month.getSumGross().doubleValue();
        monthsNetsSum += month.getSumNet().doubleValue();
      }
      assertThat(monthsGrossSum).isCloseTo(quarter.getSumGross().doubleValue(), ACCURACY_ONE_THOUSANDTH);
      assertThat(monthsNetsSum).isCloseTo(quarter.getSumNet().doubleValue(), ACCURACY_ONE_THOUSANDTH);
      monthsGrossSum = 0;
      monthsNetsSum = 0;
    }
    assertThat(allQuartersGrossSum).isCloseTo(byYear.getSumGross().doubleValue(), ACCURACY_ONE_THOUSANDTH);
    assertThat(allQuartersNetSum).isCloseTo(byYear.getSumNet().doubleValue(), ACCURACY_ONE_THOUSANDTH);
  }

  private void verifyDividends(List<DividendDto> dividends, double expectedSumGross, double expectedSumNet) {
    Set<Long> securityIds = new HashSet<>();
    double sumGross = 0;
    double sumNet = 0;
    double sumGrossPercentage = 0;
    double sumNetPercentage = 0;
    for (DividendDto dividend : dividends) {
      securityIds.addAll(dividend.getSecurityIds());
      sumGross += dividend.getAbsoluteValueGross().doubleValue();
      sumNet += dividend.getAbsoluteValueNet().doubleValue();
      sumGrossPercentage += dividend.getRelativeValueGross().doubleValue();
      sumNetPercentage += dividend.getRelativeValueNet().doubleValue();
    }
    assertThat(securityIds).hasSameSizeAs(dividends);
    assertThat(sumGross).isCloseTo(expectedSumGross, ACCURACY_ONE_THOUSANDTH);
    assertThat(sumNet).isCloseTo(expectedSumNet, ACCURACY_ONE_THOUSANDTH);

    double expectedPercentage = dividends.isEmpty() ? 0.0 : 1.0;
    assertThat(sumGrossPercentage).isCloseTo(expectedPercentage, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(sumNetPercentage).isCloseTo(expectedPercentage, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
  }

  private ResultActions getDividends(String depotIds, Boolean includeSpecialDividends) throws Exception {
    String url = String.format("%s?depotIds=%s", ENDPOINT, depotIds);
    if (includeSpecialDividends != null) {
      url = String.format("%s&includeSpecialDividends=%b", url, includeSpecialDividends);
    }
    return mockMvc.perform(get(url));
  }
}
