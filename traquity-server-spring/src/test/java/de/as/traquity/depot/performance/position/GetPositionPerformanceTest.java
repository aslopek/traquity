package de.as.traquity.depot.performance.position;

import static integration.DepotIds.BUY_IN_ZERO;
import static integration.DepotIds.FIRST_DEPOT;
import static integration.DepotIds.GROUPED_SECURITIES_DEPOT;
import static integration.DepotIds.POSITION_PERFORMANCE_DEPOT;
import static integration.DepotIds.POSITION_PERFORMANCE_LATEST_PRICE_FALLBACK_DEPOT;
import static integration.SecurityIds.GOOG;
import static integration.SecurityIds.GOOGL;
import static integration.SecurityIds.QCOM;
import static integration.SecurityIds.TMO;
import static java.math.BigDecimal.ZERO;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.performance.api.model.PositionPerformanceDto;
import integration.DepotIds;
import integration.IntegrationTest;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@IntegrationTest
class GetPositionPerformanceTest {

  private static final String ENDPOINT = "/depot-performance/position?depotIds=%s&securityIds=%s";
  private static final String ENDPOINT_NO_SECURITY_IDS = "/depot-performance/position?depotIds=%s";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getPositionPerformance_positionPerformanceDepot_googl_ok() throws Exception {
    PositionPerformanceDto body = getPositionPerformance(POSITION_PERFORMANCE_DEPOT, GOOGL);

    assertThat(body.getCurrency()).isEqualTo("EUR");
    assertThat(body.getBuysGross()).isEqualByComparingTo(BigDecimal.valueOf(-3900.0)); // -(1500 + 2400)
    assertThat(body.getSellsGross()).isEqualByComparingTo(BigDecimal.valueOf(1800.0)); // the single SELL
    assertThat(body.getDividendsGross()).isEqualByComparingTo(BigDecimal.valueOf(40.0)); // 32 + 8
    assertThat(body.getTaxes()).isEqualByComparingTo(BigDecimal.valueOf(-60.0)); // -(40 + 8 + 2 + 15 + 5 -10)
    assertThat(body.getFees()).isEqualByComparingTo(BigDecimal.valueOf(-40.0)); // -(20 + 10 + 10)
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(-2160.0)); // sum of lines above
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(2535.2)); // 20 shares still held x 126.76
    assertThat(body.getCostBasis()).isEqualByComparingTo(BigDecimal.valueOf(4000.0)); // -(buys - taxes - fees)
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(375.2)); // net cash flow + current size absolute
    assertThat(body.getPerformanceRelative()).isEqualByComparingTo(BigDecimal.valueOf(0.0938)); // performance absolute / cost basis
  }

  @Test
  void getPositionPerformance_buyInZero_googl_noPerformanceRelative() throws Exception {
    PositionPerformanceDto body = getPositionPerformance(BUY_IN_ZERO, GOOGL);

    assertThat(body.getCurrency()).isEqualTo("EUR");
    assertThat(body.getBuysGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getSellsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getDividendsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getTaxes()).isEqualByComparingTo(ZERO);
    assertThat(body.getFees()).isEqualByComparingTo(ZERO);
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(ZERO);
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(5070.40)); // 40 split-adjusted shares x 126.76
    assertThat(body.getCostBasis()).isEqualByComparingTo(ZERO);
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(5070.40)); // net cash flow + current size absolute
    assertThat(body.getPerformanceRelative()).isNull();
  }

  @Test
  void getPositionPerformance_positionPerformanceDepot_noSecurityIds_includesEverySecurity() throws Exception {
    MvcResult mvcResult = mockMvc
        .perform(get(String.format(ENDPOINT_NO_SECURITY_IDS, POSITION_PERFORMANCE_DEPOT)))
        .andExpect(status().isOk()).andReturn();
    PositionPerformanceDto body =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), PositionPerformanceDto.class);

    assertThat(body.getBuysGross()).isEqualByComparingTo(BigDecimal.valueOf(-12140.0)); // -(1500 + 2400 + 990 + 1250 + 2500 + 3500)
    assertThat(body.getSellsGross()).isEqualByComparingTo(BigDecimal.valueOf(9200.0)); // 1800 + 5550 + 1850
    assertThat(body.getDividendsGross()).isEqualByComparingTo(BigDecimal.valueOf(140.0)); // 32 + 8 + 60 + 40
    assertThat(body.getTaxes()).isEqualByComparingTo(BigDecimal.valueOf(-210.0)); // -(40 + 100 + 20 + 8 + 2 + 20 + 10 + 15 + 5 -10)
    assertThat(body.getFees()).isEqualByComparingTo(BigDecimal.valueOf(-150.0)); // -(20 + 10 + 10 + 25 + 25 + 10 + 30 + 20)
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(-3160.0)); // sum of lines above
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(4934.32)); // 20 x 126.76 (GOOGL) + 9 x 127.68 (GOOG) + 10 x
    // 125.0 (QCOM, derived from latest buy transaction); TMO fully sold
    assertThat(body.getCostBasis()).isEqualByComparingTo(BigDecimal.valueOf(12500.0)); // -(buys - taxes - fees)
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1774.32)); // net cash flow + current size absolute
    assertThat(body.getPerformanceRelative()).isEqualByComparingTo(BigDecimal.valueOf(0.1419456)); // performance absolute / cost basis
  }

  @Test
  void getPositionPerformance_emptyDepot_zeroes() throws Exception {
    PositionPerformanceDto body = getPositionPerformance(DepotIds.EMPTY_DEPOT, GOOGL);

    assertThat(body.getCurrency()).isEqualTo("EUR");
    assertThat(body.getBuysGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getSellsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getDividendsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getTaxes()).isEqualByComparingTo(ZERO);
    assertThat(body.getFees()).isEqualByComparingTo(ZERO);
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(ZERO);
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(ZERO);
    assertThat(body.getCostBasis()).isEqualByComparingTo(ZERO);
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(ZERO);
    assertThat(body.getPerformanceRelative()).isNull();
  }

  @Test
  void getPositionPerformance_qualcomm_noKnownPrice_valuedAtLatestTransactionPrice() throws Exception {
    PositionPerformanceDto body = getPositionPerformance(POSITION_PERFORMANCE_DEPOT, QCOM);

    assertThat(body.getBuysGross()).isEqualByComparingTo(BigDecimal.valueOf(-1250.0)); // the single BUY
    assertThat(body.getSellsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getDividendsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getTaxes()).isEqualByComparingTo(ZERO);
    assertThat(body.getFees()).isEqualByComparingTo(ZERO);
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(-1250.0)); // sum of lines above
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1250.0)); // 10 shares x 125.0, its the latest (and only)
    // BUY's price per share
    assertThat(body.getCostBasis()).isEqualByComparingTo(BigDecimal.valueOf(1250.0)); // -(buys - taxes - fees)
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(ZERO);
    assertThat(body.getPerformanceRelative()).isEqualByComparingTo(ZERO);
  }

  @Test
  void getPositionPerformance_qualcomm_noKnownPrice_multipleLots_valuedAtLatestLotPriceNotAverageCost() throws Exception {
    PositionPerformanceDto body = getPositionPerformance(POSITION_PERFORMANCE_LATEST_PRICE_FALLBACK_DEPOT, QCOM);

    assertThat(body.getBuysGross()).isEqualByComparingTo(BigDecimal.valueOf(-2500.0)); // -(1000 + 1500)
    assertThat(body.getSellsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getDividendsGross()).isEqualByComparingTo(ZERO);
    assertThat(body.getTaxes()).isEqualByComparingTo(ZERO);
    assertThat(body.getFees()).isEqualByComparingTo(ZERO);
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(-2500.0)); // sum of lines above
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3000.0)); // 20 shares x 150.0, the later lot's price per share
    assertThat(body.getCostBasis()).isEqualByComparingTo(BigDecimal.valueOf(2500.0)); // -(buys - taxes - fees)
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(500.0)); // net cash flow + current size absolute
    assertThat(body.getPerformanceRelative()).isEqualByComparingTo(BigDecimal.valueOf(0.2)); // performance absolute / cost basis
  }

  @Test
  void getPositionPerformance_thermoFisher_completelySold_zeroCurrentSize() throws Exception {
    PositionPerformanceDto body = getPositionPerformance(POSITION_PERFORMANCE_DEPOT, TMO);

    assertThat(body.getBuysGross()).isEqualByComparingTo(BigDecimal.valueOf(-6000.0)); // -(2500 + 3500)
    assertThat(body.getSellsGross()).isEqualByComparingTo(BigDecimal.valueOf(7400.0)); // 5550 + 1850
    assertThat(body.getDividendsGross()).isEqualByComparingTo(BigDecimal.valueOf(100.0)); // 60 + 40
    assertThat(body.getTaxes()).isEqualByComparingTo(BigDecimal.valueOf(-150.0)); // -(100 + 20 + 20 +10)
    assertThat(body.getFees()).isEqualByComparingTo(BigDecimal.valueOf(-100.0)); // -(25 + 25 + 30 + 20)
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(1250.0)); // sum of lines above
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(ZERO); // fully sold
    assertThat(body.getCostBasis()).isEqualByComparingTo(BigDecimal.valueOf(6250.0)); // -(buys - taxes - fees)
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1250.0)); // net cash flow + current size absolute
    assertThat(body.getPerformanceRelative()).isEqualByComparingTo(BigDecimal.valueOf(0.2)); // 1250.0 / 6250.0
  }

  @Test
  void getPositionPerformance_severalDepots_combinesThem() throws Exception {
    PositionPerformanceDto body = getPositionPerformance(
        String.format("%d,%d", GROUPED_SECURITIES_DEPOT, POSITION_PERFORMANCE_DEPOT),
        String.format("%d,%d", GOOGL, GOOG));

    assertThat(body.getBuysGross()).isEqualByComparingTo(BigDecimal.valueOf(-10114.20)); // -4890.0 (depot 11) -5224.20 (depot 7)
    assertThat(body.getSellsGross()).isEqualByComparingTo(BigDecimal.valueOf(3905.64)); // 1800.0 (depot 11) + 2105.64 (depot 7)
    assertThat(body.getDividendsGross()).isEqualByComparingTo(BigDecimal.valueOf(40.0)); // 40.0 (depot 11); none in depot 7
    assertThat(body.getTaxes()).isEqualByComparingTo(BigDecimal.valueOf(-354.8)); // -60.0 (depot 11) + -294.8 (depot 7)
    assertThat(body.getFees()).isEqualByComparingTo(BigDecimal.valueOf(-54.95)); // -50.0 (depot 11) + -4.95 (depot 7)
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(-6578.31)); // sum of lines above
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(7912.52616)); // 3684.32 (depot 11: 20 x 126.76 GOOGL + 9 x
    // 127.68 GOOG) + 4228.20616 (depot 7: 20.866 x 126.76 GOOGL + 12.4 x 127.68 GOOG)
    assertThat(body.getCostBasis()).isEqualByComparingTo(BigDecimal.valueOf(10523.95)); // -(buys - taxes - fees)
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1334.21616)); // net cash flow + current size absolute
    assertThat(body.getPerformanceRelative()).isEqualByComparingTo(new BigDecimal("0.1267790287867198152784838392428698")); // 1334.21616 / 10523.95
  }

  @Test
  void getPositionPerformance_severalDepots_noSecurityIds_includesEverySecurityInEachDepot() throws Exception {
    MvcResult mvcResult = mockMvc.perform(get(String.format(ENDPOINT_NO_SECURITY_IDS,
            String.format("%d,%d", GROUPED_SECURITIES_DEPOT, POSITION_PERFORMANCE_DEPOT))))
        .andExpect(status().isOk()).andReturn();
    PositionPerformanceDto body =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), PositionPerformanceDto.class);

    assertThat(body.getBuysGross()).isEqualByComparingTo(BigDecimal.valueOf(-20315.20)); // -12140.0 (depot 11) + -8175.20 (depot 7)
    assertThat(body.getSellsGross()).isEqualByComparingTo(BigDecimal.valueOf(11305.64)); // 9200.0 (depot 11) + 2105.64 (depot 7)
    assertThat(body.getDividendsGross()).isEqualByComparingTo(BigDecimal.valueOf(841.28)); // 140.0 (depot 11) + 701.28 (depot 7)
    assertThat(body.getTaxes()).isEqualByComparingTo(BigDecimal.valueOf(-680.14)); // -210.0 (depot 11) + -470.14 (depot 7)
    assertThat(body.getFees()).isEqualByComparingTo(BigDecimal.valueOf(-156.93)); // -150.0 (depot 11) + -6.93 (depot 7)
    assertThat(body.getNetCashFlow()).isEqualByComparingTo(BigDecimal.valueOf(-9005.35)); // sum of lines above
    assertThat(body.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(12231.00116)); // 4934.32 (depot 11) + 7296.68116 (depot 7)
    assertThat(body.getCostBasis()).isEqualByComparingTo(BigDecimal.valueOf(21152.27)); // -(buys - taxes - fees)
    assertThat(body.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3225.65116)); // net cash flow + current size absolute
    assertThat(body.getPerformanceRelative()).isEqualByComparingTo(new BigDecimal("0.1524966899533714348389085426765071")); // 3225.65116 / 21152.27
  }

  @Test
  void getPositionPerformance_depotsHaveDifferentCurrencies_badRequest() throws Exception {
    MvcResult mvcResult = mockMvc
        .perform(get(String.format(ENDPOINT, "4,5", GOOGL)))
        .andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getPositionPerformance_unknownDepot_notFound() throws Exception {
    MvcResult mvcResult = mockMvc
        .perform(get(String.format(ENDPOINT, "999999", GOOGL)))
        .andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getPositionPerformance_unknownSecurity_notFound() throws Exception {
    MvcResult mvcResult = mockMvc
        .perform(get(String.format(ENDPOINT, FIRST_DEPOT, "999999")))
        .andExpect(status().isNotFound()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getPositionPerformance_securityIdsEmpty_badRequest() throws Exception {
    MvcResult mvcResult = mockMvc
        .perform(get(String.format(ENDPOINT, FIRST_DEPOT, "")))
        .andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  @Test
  void getPositionPerformance_depotIdsNotSet_badRequest() throws Exception {
    MvcResult mvcResult = mockMvc
        .perform(get(String.format("/depot-performance/position?securityIds=%s", GOOGL)))
        .andExpect(status().isBadRequest()).andReturn();
    assertThat(mvcResult.getResponse().getContentLength()).isZero();
  }

  private PositionPerformanceDto getPositionPerformance(long depotId, long securityId) throws Exception {
    return getPositionPerformance(String.valueOf(depotId), String.valueOf(securityId));
  }

  private PositionPerformanceDto getPositionPerformance(String depotIds, String securityIds) throws Exception {
    MvcResult mvcResult = mockMvc
        .perform(get(String.format(ENDPOINT, depotIds, securityIds)))
        .andExpect(status().isOk()).andReturn();
    return objectMapper.readValue(mvcResult.getResponse().getContentAsString(), PositionPerformanceDto.class);
  }
}
