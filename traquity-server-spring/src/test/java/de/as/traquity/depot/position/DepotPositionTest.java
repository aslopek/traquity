package de.as.traquity.depot.position;

import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.depot.position.api.model.DepotCompositionDto;
import de.as.traquity.depot.position.api.model.DepotPositionDto;
import integration.IntegrationTest;
import integration.SecurityIds;
import java.util.List;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class DepotPositionTest {

  private static final String ENDPOINT = "/depot-positions?depotIds=%s";
  private static final Offset<Double> ACCURACY_ONE_THOUSANDTH = Offset.strictOffset(0.001);
  private static final Offset<Double> ACCURACY_ONE_HUNDREDTH = Offset.offset(0.01);
  private static final Offset<Double> PERCENTAGE_ACCURACY_ONE_THOUSANDTH = Offset.strictOffset(0.00001);
  private static final Offset<Double> PERCENTAGE_ACCURACY_ONE_HUNDREDTH = Offset.offset(0.0001);

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Test
  void getDepotPositions_empty_ok() throws Exception {
    MvcResult result = getDepotPositions("3").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
    assertThat(responseBody.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
    assertThat(responseBody.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
    assertThat(responseBody.getPerformanceRelative()).isNull();
    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isEmpty();
  }

  @Test
  void getDepotPositions_doesNotExist_badRequest() throws Exception {
    MvcResult result = getDepotPositions("999").andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDepotPositions_noDepotsSupplied_badRequest() throws Exception {
    MvcResult result = getDepotPositions("").andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getDepotPositions_firstDepot_ok() throws Exception {
    MvcResult result = getDepotPositions("1").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(13633.71));
    // 7483.32 (Amazon) + 3865.536 (Nvidia) + 2985.63333 (LVMH)
    assertThat(responseBody.getCurrentSizeAbsolute().doubleValue()).isCloseTo(14334.48933, ACCURACY_ONE_THOUSANDTH);
    assertThat(responseBody.getPerformanceAbsolute().doubleValue()).isCloseTo(700.77933, ACCURACY_ONE_THOUSANDTH);
    assertThat(responseBody.getPerformanceRelative().doubleValue()).isCloseTo(0.0514, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(3);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.AMZN);
    assertThat(position.getDisplayName()).isEqualTo("Amazon");
    assertThat(position.getSecurityGroupId()).isNull();
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(54.0));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(7221.16));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.5296548, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(7483.32));
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.52205, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(262.16));
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.0363044, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    position = positions.get(1);
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.NVDA);
    assertThat(position.getDisplayName()).isEqualTo("Nvidia");
    assertThat(position.getSecurityGroupId()).isNull();
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(21.6));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3317.44));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.2433263, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    // 21.6 * 178.96, the price derived from the depot 2 buy on 2021-09-28 (transaction 17)
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo("3865.536");
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.2696668, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo("548.096");
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.1652166, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    position = positions.get(2);
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.LVMH);
    assertThat(position.getDisplayName()).isEqualTo("LVMH");
    assertThat(position.getSecurityGroupId()).isNull();
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(4.25));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3095.11));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.2270189, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    // 4.25 * 702.50196, the price derived from the sell on 2023-11-27 (transaction 25)
    assertThat(position.getCurrentSizeAbsolute().doubleValue()).isCloseTo(2985.63333, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.2082832, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute().doubleValue()).isCloseTo(-109.47667, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(-0.0353708, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getDepotPositions_otherDepot_ok() throws Exception {
    MvcResult result = getDepotPositions("2").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(4143.28));
    assertThat(responseBody.getCurrentSizeAbsolute()).isEqualByComparingTo("4134.28"); // 3150 (Hensoldt) + 984.28 (Nvidia)
    assertThat(responseBody.getPerformanceAbsolute()).isEqualByComparingTo("-9");
    assertThat(responseBody.getPerformanceRelative().doubleValue()).isCloseTo(-0.0021722, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(2);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.HAG);
    assertThat(position.getDisplayName()).isEqualTo("Hensoldt");
    assertThat(position.getSecurityGroupId()).isNull();
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(250.0));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3159.0));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.7624394, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    // 250 * 12.6, the price derived from the buy on 2022-01-19 (transaction 20)
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo("3150");
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.7619223, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo("-9");
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(-0.002849, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    position = positions.get(1);
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.NVDA);
    assertThat(position.getDisplayName()).isEqualTo("Nvidia");
    assertThat(position.getSecurityGroupId()).isNull();
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(5.5));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(984.28));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.2375606, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    // 5.5 * 178.96, the price derived from this position's only buy (transaction 17)
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(984.28));
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.2380777, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
    assertThat(position.getPerformanceRelative()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
  }

  @Test
  void getDepotPositions_etf_ok() throws Exception {
    MvcResult result = getDepotPositions("4").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(2849.82));
    // 51.063 * 56.72858, the price derived from the buy on 2024-12-22 (transaction 29)
    assertThat(responseBody.getCurrentSizeAbsolute().doubleValue()).isCloseTo(2896.73126, ACCURACY_ONE_THOUSANDTH);
    assertThat(responseBody.getPerformanceAbsolute().doubleValue()).isCloseTo(46.91126, ACCURACY_ONE_THOUSANDTH);
    assertThat(responseBody.getPerformanceRelative().doubleValue()).isCloseTo(0.0164611, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(1);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VNGGF);
    assertThat(position.getDisplayName()).isEqualTo("Vanguard FTSE All-World High Dividend Yield UCITS DIST");
    assertThat(position.getSecurityGroupId()).isNull();
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(51.063));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(2849.82));
    assertThat(position.getBuyInRelative()).isEqualByComparingTo(BigDecimal.valueOf(1.0));
    assertThat(position.getCurrentSizeAbsolute().doubleValue()).isCloseTo(2896.73126, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeRelative()).isEqualByComparingTo(BigDecimal.valueOf(1.0));
    assertThat(position.getPerformanceAbsolute().doubleValue()).isCloseTo(46.91126, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.0164611, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getDepotPositions_usdDepot_ok() throws Exception {
    MvcResult result = getDepotPositions("5").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("USD");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(4653.72));
    assertThat(responseBody.getCurrentSizeAbsolute().doubleValue()).isCloseTo(6165.66, ACCURACY_ONE_HUNDREDTH);
    assertThat(responseBody.getPerformanceAbsolute().doubleValue()).isCloseTo(1511.94, ACCURACY_ONE_HUNDREDTH);
    assertThat(responseBody.getPerformanceRelative().doubleValue()).isCloseTo(0.3249, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(2);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.PINS);
    assertThat(position.getDisplayName()).isEqualTo("Pinterest");
    assertThat(position.getSecurityGroupId()).isNull();
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(130.5));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3326.45));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.7147938, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(4833.72));
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.7839744, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1507.27));
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.4531167, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    position = positions.get(1);
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.GOOGL);
    assertThat(position.getDisplayName()).isEqualTo("Alphabet A");
    assertThat(position.getSecurityGroupId()).isEqualTo(2);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(9.75));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1327.27));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.2852062, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute().doubleValue()).isCloseTo(1331.94019, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.2160256, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute().doubleValue()).isCloseTo(4.67019, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.0035186, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getDepotPositions_buyInZero_ok() throws Exception {
    MvcResult result = getDepotPositions("9").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
    assertThat(responseBody.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(5070.4));
    assertThat(responseBody.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(5070.4));
    assertThat(responseBody.getPerformanceRelative()).isNull();

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(1);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.GOOGL);
    assertThat(position.getDisplayName()).isEqualTo("Alphabet A");
    assertThat(position.getSecurityGroupId()).isEqualTo(2);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(40.0));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
    assertThat(position.getBuyInRelative()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(5070.4));
    assertThat(position.getCurrentSizeRelative()).isEqualByComparingTo(BigDecimal.valueOf(1.0));
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(5070.4));
    assertThat(position.getPerformanceRelative()).isEqualByComparingTo(BigDecimal.valueOf(0.0));
  }

  @Test
  void getDepotPositions_groupedSecurities_ok() throws Exception {
    MvcResult result = getDepotPositions("7").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(7248.74));
    assertThat(responseBody.getCurrentSizeAbsolute().doubleValue()).isCloseTo(7296.68, ACCURACY_ONE_HUNDREDTH);
    assertThat(responseBody.getPerformanceAbsolute().doubleValue()).isCloseTo(47.94, ACCURACY_ONE_HUNDREDTH);
    assertThat(responseBody.getPerformanceRelative().doubleValue()).isCloseTo(0.0066, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(2);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.GOOGL, SecurityIds.GOOG);
    assertThat(position.getDisplayName()).isEqualTo("Alphabet");
    assertThat(position.getSecurityGroupId()).isEqualTo(2);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(33.266));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(4297.74));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.5928948, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute().doubleValue()).isCloseTo(4228.20616, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.5794698, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute().doubleValue()).isCloseTo(-69.53384, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(-0.0161792, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    position = positions.get(1);
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VW_VZ, SecurityIds.VW_STAMM);
    assertThat(position.getDisplayName()).isEqualTo("Volkswagen");
    assertThat(position.getSecurityGroupId()).isEqualTo(1);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(27.0));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(2951.0));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.4071052, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3068.475));
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.4205302, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(117.475));
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.0398085, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getDepotPositions_ungroupedSecurities_ok() throws Exception {
    MvcResult result = getDepotPositions("8").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3794.74));
    assertThat(responseBody.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(5379.42));
    assertThat(responseBody.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1584.68));
    assertThat(responseBody.getPerformanceRelative().doubleValue()).isCloseTo(0.4176, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(2);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.GOOGL);
    assertThat(position.getDisplayName()).isEqualTo("Alphabet A");
    assertThat(position.getSecurityGroupId()).isEqualTo(2);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(34.5));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(2904.55));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.7654148, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(4373.22));
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.8129538, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1468.67));
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.5056446, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    position = positions.get(1);
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VW_VZ);
    assertThat(position.getDisplayName()).isEqualTo("Volkswagen VZ");
    assertThat(position.getSecurityGroupId()).isEqualTo(1);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(9));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(890.19));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.2345852, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(1006.2));
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.1870462, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(116.01));
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.1303205, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
  }

  @Test
  void getDepotPositions_consolidateGroupsAndDepots_ok() throws Exception {
    MvcResult result = getDepotPositions("7,8").andExpect(status().isOk()).andReturn();
    DepotCompositionDto responseBody = objectMapper.readValue(result.getResponse().getContentAsString(),
        DepotCompositionDto.class);
    assertThat(responseBody.getCurrency()).isEqualTo("EUR");
    assertThat(responseBody.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(11043.48));
    assertThat(responseBody.getCurrentSizeAbsolute().doubleValue()).isCloseTo(12676.10, ACCURACY_ONE_HUNDREDTH);
    assertThat(responseBody.getPerformanceAbsolute().doubleValue()).isCloseTo(1632.62, ACCURACY_ONE_HUNDREDTH);
    assertThat(responseBody.getPerformanceRelative().doubleValue()).isCloseTo(0.1478, PERCENTAGE_ACCURACY_ONE_HUNDREDTH);

    List<DepotPositionDto> positions = responseBody.getPositions();
    assertThat(positions).isNotNull();
    assertThat(positions).hasSize(2);

    DepotPositionDto position = positions.getFirst();
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.GOOGL, SecurityIds.GOOG);
    assertThat(position.getDisplayName()).isEqualTo("Alphabet");
    assertThat(position.getSecurityGroupId()).isEqualTo(2);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(67.766));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(7202.29));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.6521758, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute().doubleValue()).isCloseTo(8601.42616, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.6785546, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute().doubleValue()).isCloseTo(1399.13616, ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.1942627, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);

    position = positions.get(1);
    assertThat(position.getSecurityIds()).containsExactlyInAnyOrder(SecurityIds.VW_VZ, SecurityIds.VW_STAMM);
    assertThat(position.getDisplayName()).isEqualTo("Volkswagen");
    assertThat(position.getSecurityGroupId()).isEqualTo(1);
    assertThat(position.getCount()).isEqualByComparingTo(BigDecimal.valueOf(36));
    assertThat(position.getBuyInAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(3841.19));
    assertThat(position.getBuyInRelative().doubleValue()).isCloseTo(0.3478242, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getCurrentSizeAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(4074.675));
    assertThat(position.getCurrentSizeRelative().doubleValue()).isCloseTo(0.3214454, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
    assertThat(position.getPerformanceAbsolute()).isEqualByComparingTo(BigDecimal.valueOf(233.485));
    assertThat(position.getPerformanceRelative().doubleValue()).isCloseTo(0.0607845, PERCENTAGE_ACCURACY_ONE_THOUSANDTH);
  }

  private ResultActions getDepotPositions(String depotIds) throws Exception {
    return mockMvc.perform(get(String.format(ENDPOINT, depotIds)));
  }
}
