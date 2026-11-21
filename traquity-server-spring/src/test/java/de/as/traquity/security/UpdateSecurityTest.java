package de.as.traquity.security;

import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static java.time.Month.DECEMBER;
import static java.time.Month.NOVEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.security.api.model.PriceMetaInfoDto;
import de.as.traquity.security.api.model.SecurityReadDto;
import de.as.traquity.security.api.model.SecurityTypeDto;
import de.as.traquity.security.api.model.SecurityUpdateDto;
import integration.IntegrationTest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@IntegrationTest
class UpdateSecurityTest {

  private static final String ENDPOINT = "/securities/%d";
  private static final String MICROSOFT_PRICES = """
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES ((SELECT ID FROM SECURITY WHERE NAME = 'Microsoft'), NULL, 100, 'EUR', '2023-11-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             ((SELECT ID FROM SECURITY WHERE NAME = 'Microsoft'), NULL, 140, 'EUR', '2023-12-05', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             ((SELECT ID FROM SECURITY WHERE NAME = 'Microsoft'), NULL, 90, 'EUR', '2023-12-07', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             ((SELECT ID FROM SECURITY WHERE NAME = 'Microsoft'), NULL, 126.76, 'EUR', '2023-12-29', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """;

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private SecurityRepository securityRepository;

  @MockitoBean
  private Clock clock;

  private ObjectMapper objectMapper;

  private SecurityUpdateDto requestBody;

  private long securityCount;

  @BeforeEach
  void setUp() {
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
    objectMapper = new ObjectMapper().findAndRegisterModules();
    securityCount = securityRepository.count();
    requestBody = new SecurityUpdateDto();
    requestBody.setIsin("US5949181045");
    requestBody.setSymbols(List.of("MSFT", "MSF.DE"));
    requestBody.setName("Microsoft");
    requestBody.setWkn("870747");
    requestBody.setSector("Technology");
    requestBody.setSecurityType(SecurityTypeDto.STOCK);
    requestBody.setVersion(1L);
  }

  @Test
  void updateAllProperties_success() throws Exception {
    requestBody = new SecurityUpdateDto();
    requestBody.setIsin("US09247X1019");
    requestBody.setSymbols(List.of("BLK", "BLQA"));
    requestBody.setName("Blackrock");
    requestBody.setWkn("928193");
    requestBody.setSector("Financial");
    requestBody.setSecurityType(SecurityTypeDto.STOCK);
    requestBody.setVersion(1L);

    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  void updateNothing_success() throws Exception {
    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  void updateType_toEtf_ok() throws Exception {
    requestBody.setSecurityType(SecurityTypeDto.ETF);

    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  void updateType_toOther_ok() throws Exception {
    requestBody.setSecurityType(SecurityTypeDto.OTHER);

    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  void update_notFound() throws Exception {
    MvcResult result = putSecurity(999).andExpect(status().isNotFound()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  void updateAllProperties_optimisticLockFails_conflict() throws Exception {
    requestBody.setVersion(0L);
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isConflict()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  void updateIsin_conflict() throws Exception {
    requestBody.setIsin("US0378331005");
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isConflict()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  void updateWkn_conflict() throws Exception {
    requestBody.setWkn("HAG000");
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isConflict()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  void updateSymbols_conflict() throws Exception {
    requestBody.setSymbols(List.of("MSFT", "MSF.DE", "AAPL"));
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isConflict()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);

  }

  @Test
  void noRequestBody_badRequest() throws Exception {
    long count = securityRepository.count();
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = mockMvc.perform(put(String.format(ENDPOINT, 2)).contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
    assertThat(securityRepository.count()).isEqualTo(count);
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
  }

  @Test
  void removeSymbols_ok() throws Exception {
    requestBody.setSymbols(List.of());
    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  void setSymbolsToNull_badRequest() throws Exception {
    requestBody.setSymbols(null);
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isBadRequest()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  void removeWkn_ok() throws Exception {
    requestBody.setWkn(null);
    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  void setWknToEmptyString_badRequest() throws Exception {
    requestBody.setWkn("");
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isBadRequest()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  void removeSector_ok() throws Exception {
    requestBody.setSector(null);
    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  void setSectorToEmptyString_badRequest() throws Exception {
    requestBody.setSector("");
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isBadRequest()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  void removeSecurityType_badRequest() throws Exception {
    requestBody.setSecurityType(null);
    SecurityEntity msftBeforeRequest = securityRepository.findById(1L).orElseThrow();
    MvcResult result = putSecurity(1).andExpect(status().isBadRequest()).andReturn();

    // verify response
    assertThat(result.getResponse().getContentLength()).isZero();

    // verify database
    SecurityEntity msftAfterRequest = securityRepository.findById(1L).orElseThrow();
    assertSecurityUnchanged(msftBeforeRequest, msftAfterRequest);
    assertThat(securityRepository.count()).isEqualTo(securityCount);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = MICROSOFT_PRICES)
  void update_withCurrency_priceMetaInfoInCurrency() throws Exception {
    requestBody.setSector("Software");
    MvcResult result = putSecurity(1, "USD").andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);
    PriceMetaInfoDto priceMetaInfo = responseBody.getPriceMetaInfo();
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("USD");
    // 126.76 EUR at the EUR/USD rate of 1.0777 on 2023-12-08, the closest rate before 2023-12-29
    assertThat(priceMetaInfo.getLatestPrice()).isCloseTo(new BigDecimal("136.609252"), ACCURACY_ONE_THOUSANDTH);
    assertThat(priceMetaInfo.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    // 100 EUR at the EUR/USD rate of 1.0931 on 2023-11-30
    assertThat(priceMetaInfo.getOldestPrice()).isCloseTo(new BigDecimal("109.31"), ACCURACY_ONE_THOUSANDTH);
    assertThat(priceMetaInfo.getOldestPriceDate()).isEqualTo(LocalDate.of(2023, NOVEMBER, 30));
    // 140 EUR at the EUR/USD rate of 1.0817 on 2023-12-05
    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isCloseTo(new BigDecimal("151.438"), ACCURACY_ONE_THOUSANDTH);
    // 90 EUR at the EUR/USD rate of 1.0771 on 2023-12-07
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isCloseTo(new BigDecimal("96.939"), ACCURACY_ONE_THOUSANDTH);

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = MICROSOFT_PRICES)
  void update_withoutCurrency_priceMetaInfoInCurrencyOfLatestPrice() throws Exception {
    requestBody.setSector("Software");
    MvcResult result = putSecurity(1).andExpect(status().isOk()).andReturn();

    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);
    PriceMetaInfoDto priceMetaInfo = responseBody.getPriceMetaInfo();
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("EUR");
    assertThat(priceMetaInfo.getLatestPrice()).isEqualByComparingTo("126.76");
    assertThat(priceMetaInfo.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(priceMetaInfo.getOldestPrice()).isEqualByComparingTo("100");
    assertThat(priceMetaInfo.getOldestPriceDate()).isEqualTo(LocalDate.of(2023, NOVEMBER, 30));
    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isEqualByComparingTo("140");
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isEqualByComparingTo("90");

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = MICROSOFT_PRICES)
  void update_unsupportedCurrency_storedWithoutPriceMetaInfo() throws Exception {
    requestBody.setSector("Software");
    MvcResult result = putSecurity(1, "XYZ").andExpect(status().isOk()).andReturn();
    verifyStoredWithoutPriceMetaInfo(result);
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = MICROSOFT_PRICES)
  void update_currencyWithoutRates_storedWithoutPriceMetaInfo() throws Exception {
    requestBody.setSector("Software");
    // no rate into CHF is stored
    MvcResult result = putSecurity(1, "CHF").andExpect(status().isOk()).andReturn();
    verifyStoredWithoutPriceMetaInfo(result);
  }

  private ResultActions putSecurity(long id) throws Exception {
    return mockMvc.perform(put(String.format(ENDPOINT, id)).contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(requestBody)));
  }

  private ResultActions putSecurity(long id, String currency) throws Exception {
    return mockMvc.perform(put(String.format(ENDPOINT, id)).queryParam("currency", currency).contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(requestBody)));
  }

  private void verifyStoredWithoutPriceMetaInfo(MvcResult result) throws Exception {
    // verify response
    SecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), SecurityReadDto.class);
    verifyResponseBody(responseBody);
    assertThat(responseBody.getPriceMetaInfo()).isNull();

    // verify database
    assertThat(securityRepository.count()).isEqualTo(securityCount);
    verifyDatabase(1);
  }

  private void assertSecurityUnchanged(SecurityEntity before, SecurityEntity after) {
    assertThat(after).usingRecursiveComparison().isEqualTo(before);
  }

  private void verifyDatabase(long id) {
    SecurityEntity entity = securityRepository.findById(id).orElseThrow();
    assertThat(entity.getId()).isEqualTo(id);
    assertThat(entity.getVersion()).isEqualTo(2);
    assertThat(entity.getIsin()).isEqualTo(requestBody.getIsin());
    assertThat(entity.getSymbols()).hasSameElementsAs(requestBody.getSymbols());
    assertThat(entity.getWkn()).isEqualTo(requestBody.getWkn());
    assertThat(entity.getSector()).isEqualTo(requestBody.getSector());
    assertThat(entity.getSecurityType()).isEqualTo(requestBody.getSecurityType());
  }

  private void verifyResponseBody(SecurityReadDto responseBody) {
    assertThat(responseBody.getId()).isGreaterThan(0);
    assertThat(responseBody.getVersion()).isEqualTo(2);
    assertThat(responseBody.getIsin()).isEqualTo(requestBody.getIsin());
    assertThat(responseBody.getSymbols()).hasSameElementsAs(requestBody.getSymbols());
    assertThat(responseBody.getWkn()).isEqualTo(requestBody.getWkn());
    assertThat(responseBody.getSector()).isEqualTo(requestBody.getSector());
    assertThat(responseBody.getSecurityType()).isEqualTo(requestBody.getSecurityType());
  }
}
