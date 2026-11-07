package de.as.traquity.security;

import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static integration.SecurityIds.GOOGL;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.security.api.model.PriceMetaInfoDto;
import de.as.traquity.security.api.model.SecurityLinksDto;
import de.as.traquity.security.api.model.SecurityReadDto;
import de.as.traquity.security.api.model.SecurityTypeDto;
import integration.IntegrationTest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
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
class GetSecurityTest {

  private static final String ENDPOINT = "/securities/%d";

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private Clock clock;

  @BeforeEach
  void setUp() {
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
  }

  @Test
  void getSecurity_allProperties_success() throws Exception {
    MvcResult result = getSecurity(1).andExpect(status().isOk()).andReturn();
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    assertThat(responseBody.getId()).isEqualTo(1);
    assertThat(responseBody.getIsin()).isEqualTo("US5949181045");
    assertThat(responseBody.getSymbols()).hasSize(2);
    assertThat(responseBody.getSymbols()).containsOnly("MSFT", "MSF.DE");
    assertThat(responseBody.getName()).isEqualTo("Microsoft");
    assertThat(responseBody.getWkn()).isEqualTo("870747");
    assertThat(responseBody.getSector()).isEqualTo("Technology");
    assertThat(responseBody.getSecurityType()).isEqualTo(SecurityTypeDto.STOCK);
    assertThat(responseBody.getVersion()).isEqualTo(1);

    SecurityLinksDto links = responseBody.getLinks();
    assertThat(links).isNotNull();
    assertThat(links.getLogo()).isEqualTo("/securities/1/logo");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM security_logo
      WHERE id = 4;
      """)
  void getSecurity_noSector_noSymbol_noLogo_success() throws Exception {
    MvcResult result = getSecurity(4).andExpect(status().isOk()).andReturn();
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    assertThat(responseBody.getId()).isEqualTo(4);
    assertThat(responseBody.getIsin()).isEqualTo("IE00B8GKDB10");
    assertThat(responseBody.getSymbols()).hasSize(1);
    assertThat(responseBody.getSymbols()).containsOnly("VNGGF");
    assertThat(responseBody.getName()).isEqualTo("Vanguard FTSE All-World High Dividend Yield UCITS DIST");
    assertThat(responseBody.getWkn()).isEqualTo("A1T8FV");
    assertThat(responseBody.getSector()).isNull();
    assertThat(responseBody.getSecurityType()).isEqualTo(SecurityTypeDto.ETF);
    assertThat(responseBody.getVersion()).isEqualTo(0);

    SecurityLinksDto links = responseBody.getLinks();
    assertThat(links).isNotNull();
    assertThat(links.getLogo()).isNull();
  }

  @Test
  void getSecurity_noWkn_success() throws Exception {
    MvcResult result = getSecurity(6).andExpect(status().isOk()).andReturn();
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    assertThat(responseBody.getId()).isEqualTo(6);
    assertThat(responseBody.getIsin()).isEqualTo("US30303M1027");
    assertThat(responseBody.getSymbols()).isEmpty();
    assertThat(responseBody.getName()).isEqualTo("Meta");
    assertThat(responseBody.getWkn()).isNull();
    assertThat(responseBody.getSector()).isEqualTo("Technology");
    assertThat(responseBody.getSecurityType()).isEqualTo(SecurityTypeDto.STOCK);
    assertThat(responseBody.getVersion()).isEqualTo(0);

    SecurityLinksDto links = responseBody.getLinks();
    assertThat(links).isNotNull();
    assertThat(links.getLogo()).isEqualTo("/securities/6/logo");
  }

  @Test
  void getSecurity_withPriceMetaInfo_eur_ok() throws Exception {
    MvcResult mvcResult = getSecurity(13).andExpect(status().isOk()).andReturn();
    SecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), SecurityReadDto.class);
    assertThat(responseBody.getId()).isEqualTo(13);
    assertThat(responseBody.getName()).isEqualTo("Amazon");
    PriceMetaInfoDto priceMetaInfo = responseBody.getPriceMetaInfo();
    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(140.94));
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(133.32));
    assertThat(priceMetaInfo.getLatestPrice()).isEqualByComparingTo(BigDecimal.valueOf(138.58));
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("EUR");
    assertThat(priceMetaInfo.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, Month.DECEMBER, 29));
  }

  @Test
  void getSecurity_withPriceMetaInfo_usd_ok() throws Exception {
    MvcResult mvcResult = getSecurity(24).andExpect(status().isOk()).andReturn();
    SecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), SecurityReadDto.class);
    assertThat(responseBody.getId()).isEqualTo(24);
    assertThat(responseBody.getName()).isEqualTo("Pinterest");
    PriceMetaInfoDto priceMetaInfo = responseBody.getPriceMetaInfo();
    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(38.04));
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(33.52));
    assertThat(priceMetaInfo.getLatestPrice()).isEqualByComparingTo(BigDecimal.valueOf(37.04));
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("USD");
    assertThat(priceMetaInfo.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, Month.DECEMBER, 29));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES (9, NULL, 108.68, 'USD', '2023-12-04', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void getSecurity_withPriceMetaInfo_mixedCurrencies_convertsOlderPricesToCurrencyOfNewestPrice() throws Exception {
    MvcResult mvcResult = getSecurity(GOOGL).andExpect(status().isOk()).andReturn();
    SecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), SecurityReadDto.class);
    PriceMetaInfoDto priceMetaInfo = responseBody.getPriceMetaInfo();
    // derived from the buy on 2023-09-14 (transaction 203)
    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isCloseTo(new BigDecimal("130.04957"), ACCURACY_ONE_THOUSANDTH);
    // 108.68 USD at the EUR/USD rate of 1.0868 on 2023-12-04
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isCloseTo(new BigDecimal("100"), ACCURACY_ONE_THOUSANDTH);
    assertThat(priceMetaInfo.getLatestPrice()).isEqualByComparingTo("126.76");
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("EUR");
  }

  @Test
  void getSecurity_withLinkToLogo_ok() throws Exception {
    MvcResult result = getSecurity(8).andExpect(status().isOk()).andReturn();
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    assertThat(responseBody.getId()).isEqualTo(8);
    assertThat(responseBody.getName()).isEqualTo("Danaher");

    SecurityLinksDto links = responseBody.getLinks();
    assertThat(links).isNotNull();
    assertThat(links.getLogo()).isEqualTo("/securities/8/logo");
  }

  @Test
  void getSecurity_notFound() throws Exception {
    MvcResult result = getSecurity(999).andExpect(status().isNotFound()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  private ResultActions getSecurity(long id) throws Exception {
    return mockMvc.perform(get(String.format(ENDPOINT, id)));
  }
}
