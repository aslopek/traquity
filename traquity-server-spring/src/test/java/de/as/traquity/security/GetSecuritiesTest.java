package de.as.traquity.security;

import java.math.BigDecimal;

import static de.as.traquity.security.api.model.SecurityTypeDto.STOCK;
import static integration.Accuracy.ACCURACY_ONE_THOUSANDTH;
import static integration.SecurityIds.ASML;
import static integration.SecurityIds.GOOG;
import static integration.SecurityIds.GOOGL;
import static integration.SecurityIds.MSFT;
import static java.time.Month.APRIL;
import static java.time.Month.DECEMBER;
import static java.time.Month.JULY;
import static java.time.Month.MARCH;
import static java.time.Month.NOVEMBER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.as.traquity.security.api.model.PaginatedSecurityReadDto;
import de.as.traquity.security.api.model.PriceMetaInfoDto;
import de.as.traquity.security.api.model.SecurityLinksDto;
import de.as.traquity.security.api.model.SecurityOrderPropertyDto;
import de.as.traquity.security.api.model.SecurityReadDto;
import de.as.traquity.security.api.model.SortOrderDto;
import integration.IntegrationTest;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@IntegrationTest
class GetSecuritiesTest {

  private static final String ENDPOINT = "/securities";
  private static final long TOTAL_NUMBER_OF_SECURITIES = 47;

  private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private SecurityRepository securityRepository;

  @MockitoBean
  private Clock clock;

  @BeforeEach
  void setUp() {
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = {"DELETE FROM TRANSACTION", "DELETE FROM SECURITY_GROUP", "DELETE FROM HISTORICAL_SECURITY_PRICE",
      "DELETE FROM HISTORICAL_SECURITY_PRICE_CONFIG"})
  void getSecurities_emptyDatabase() throws Exception {
    securityRepository.deleteAll();
    MvcResult result = getSecurities(null, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {
        });

    assertThat(responseBody.getTotal()).isZero();
    assertThat(responseBody.getCurrentPage()).isZero();
    assertThat(responseBody.getLastPage()).isZero();
    assertThat(responseBody.getPageSize()).isEqualTo(10);
    assertThat(responseBody.getItems()).isEmpty();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = {"DELETE FROM TRANSACTION", "DELETE FROM SECURITY_GROUP", "DELETE FROM HISTORICAL_SECURITY_PRICE",
      "DELETE FROM HISTORICAL_SECURITY_PRICE_CONFIG"})
  void getSecurities_someContent() throws Exception {
    Collection<Long> ids = securityRepository.findAll().stream().map(SecurityEntity::getId)
        .filter(e -> e != MSFT && e != ASML).toList();
    securityRepository.deleteAllById(ids);

    MvcResult result = getSecurities(null, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {});

    SecurityReadDto microsoft = new SecurityReadDto();
    microsoft.setId(1L);
    microsoft.setName("Microsoft");
    microsoft.setIsin("US5949181045");
    microsoft.setWkn("870747");
    microsoft.setSymbols(List.of("MSFT", "MSF.DE"));
    microsoft.setSector("Technology");
    microsoft.setSecurityType(STOCK);
    microsoft.setVersion(1L);
    microsoft.setLinks(new SecurityLinksDto());
    microsoft.getLinks().setLogo("/securities/1/logo");

    SecurityReadDto asml = new SecurityReadDto();
    asml.setId(5L);
    asml.setName("ASML");
    asml.setIsin("NL0010273215");
    asml.setSymbols(List.of());
    asml.setSecurityType(STOCK);
    asml.setVersion(0L);
    asml.setLinks(new SecurityLinksDto());
    asml.getLinks().setLogo("/securities/5/logo");

    List<SecurityReadDto> items =
        objectMapper.readValue(objectMapper.writeValueAsString(responseBody.getItems()), new TypeReference<>() {});
    assertThat(items).hasSize(2);
    assertThat(items).contains(microsoft);
    assertThat(items).contains(asml);

    assertThat(responseBody.getTotal()).isEqualTo(2);
    assertThat(responseBody.getCurrentPage()).isZero();
    assertThat(responseBody.getLastPage()).isZero();
    assertThat(responseBody.getPageSize()).isEqualTo(10);
  }

  @Test
  void getSecurities_defaultPage() throws Exception {
    int expectedDefaultPage = 0;
    int expectedDefaultPageSize = 10;
    MvcResult result = getSecurities(null, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(TOTAL_NUMBER_OF_SECURITIES);
    assertThat(responseBody.getCurrentPage()).isEqualTo(expectedDefaultPage);
    assertThat(responseBody.getLastPage()).isEqualTo(4);
    assertThat(responseBody.getPageSize()).isEqualTo(expectedDefaultPageSize);

    List<SecurityReadDto> items = responseBody.getItems();
    assertThat(items).hasSize(10);
    verifySecurityIds(items, 1, 10);
  }

  @Test
  void getSecurities_specificFullPage() throws Exception {
    int page = 2;
    MvcResult result = getSecurities(page, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(TOTAL_NUMBER_OF_SECURITIES);
    assertThat(responseBody.getCurrentPage()).isEqualTo(page);
    assertThat(responseBody.getLastPage()).isEqualTo(4);
    assertThat(responseBody.getPageSize()).isEqualTo(10);

    List<SecurityReadDto> items = responseBody.getItems();
    assertThat(items).hasSize(10);
    verifySecurityIds(items, 21, 30);
  }

  @Test
  void getSecurities_withPriceMetaInfo_ok() throws Exception {
    MvcResult mvcResult = getSecurities(0, 24).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
    assertThat(responseBody.getItems()).hasSize(24);

    SecurityReadDto security = responseBody.getItems().get(12);
    assertThat(security.getId()).isEqualTo(13);
    assertThat(security.getName()).isEqualTo("Amazon");

    PriceMetaInfoDto priceMetaInfo = security.getPriceMetaInfo();
    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(140.94));
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(133.32));
    assertThat(priceMetaInfo.getLatestPrice()).isEqualByComparingTo(BigDecimal.valueOf(138.58));
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("EUR");
    assertThat(priceMetaInfo.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(priceMetaInfo.getOldestPrice()).isEqualByComparingTo("140.35");
    assertThat(priceMetaInfo.getOldestPriceDate()).isEqualTo(LocalDate.of(2020, JULY, 13));

    security = responseBody.getItems().get(23);
    assertThat(security.getId()).isEqualTo(24);
    assertThat(security.getName()).isEqualTo("Pinterest");

    priceMetaInfo = security.getPriceMetaInfo();
    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(38.04));
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isEqualByComparingTo(BigDecimal.valueOf(33.52));
    assertThat(priceMetaInfo.getLatestPrice()).isEqualByComparingTo(BigDecimal.valueOf(37.04));
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("USD");
    assertThat(priceMetaInfo.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));
    assertThat(priceMetaInfo.getOldestPrice()).isEqualByComparingTo("25.49003831417624521072796934865900");
    assertThat(priceMetaInfo.getOldestPriceDate()).isEqualTo(LocalDate.of(2022, MARCH, 25));
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Alphabet A')
      AND DATE < '2023-11-29';
      INSERT INTO HISTORICAL_SECURITY_PRICE(SECURITY_ID, DATA_SOURCE_ID, PRICE, CURRENCY, DATE, CREATED_AT, UPDATED_AT)
      VALUES ((SELECT ID FROM SECURITY WHERE NAME = 'Alphabet A'), NULL, 100, 'EUR', '2023-11-30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             ((SELECT ID FROM SECURITY WHERE NAME = 'Alphabet A'), NULL, 140, 'EUR', '2023-12-05', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
             ((SELECT ID FROM SECURITY WHERE NAME = 'Alphabet A'), NULL, 90, 'EUR', '2023-12-07', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      """)
  void getSecurities_withCurrency_everyPriceHasRate_everyPriceConverted() throws Exception {
    PriceMetaInfoDto priceMetaInfo = getPriceMetaInfo(GOOGL, "USD");
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
  }

  @Test
  void getSecurities_withCurrency_securitiesOfOnePage_eachFromItsOwnPrices() throws Exception {
    PaginatedSecurityReadDto page = getFirstPage("USD");

    PriceMetaInfoDto alphabetA = priceMetaInfoOf(page, GOOGL);
    assertThat(alphabetA.getCurrency()).isEqualTo("USD");

    // 126.76 EUR at the EUR/USD rate of 1.0777 on 2023-12-08, the closest rate before 2023-12-29
    assertThat(alphabetA.getLatestPrice()).isCloseTo(new BigDecimal("136.609252"), ACCURACY_ONE_THOUSANDTH);
    assertThat(alphabetA.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));

    // the older EUR prices predate every EUR/USD rate
    assertThat(alphabetA.getOldestPrice()).isEqualByComparingTo("136.1302564102564102564102564102564");
    assertThat(alphabetA.getOldestPriceDate()).isEqualTo(LocalDate.of(2022, MARCH, 18));

    assertThat(alphabetA.getHighTrailingTwelveMonths()).isCloseTo(new BigDecimal("136.609252"), ACCURACY_ONE_THOUSANDTH);
    assertThat(alphabetA.getLowTrailingTwelveMonths()).isCloseTo(new BigDecimal("136.609252"), ACCURACY_ONE_THOUSANDTH);

    PriceMetaInfoDto alphabetC = priceMetaInfoOf(page, GOOG);
    assertThat(alphabetC.getCurrency()).isEqualTo("USD");

    // 127.68 EUR at the EUR/USD rate of 1.0777 on 2023-12-08, the closest rate before 2023-12-29
    assertThat(alphabetC.getLatestPrice()).isCloseTo(new BigDecimal("137.600736"), ACCURACY_ONE_THOUSANDTH);
    assertThat(alphabetC.getLatestPriceDate()).isEqualTo(LocalDate.of(2023, DECEMBER, 29));

    assertThat(alphabetC.getOldestPrice()).isEqualByComparingTo("133.2898989898989898989898989898990");
    assertThat(alphabetC.getOldestPriceDate()).isEqualTo(LocalDate.of(2022, APRIL, 8));

    assertThat(alphabetC.getHighTrailingTwelveMonths()).isEqualByComparingTo("140.4202020202020202020202020202020");
    assertThat(alphabetC.getLowTrailingTwelveMonths()).isEqualByComparingTo("94.35");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM EXCHANGE_RATE
      WHERE BASE_CURRENCY = 'CHF'
      OR TARGET_CURRENCY = 'CHF';
      """)
  void getSecurities_withCurrency_noPriceHasRate_priceMetaInfoAbsent() throws Exception {
    assertThat(getPriceMetaInfo(GOOGL, "CHF")).isNull();
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      DELETE FROM HISTORICAL_SECURITY_PRICE
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Alphabet A') AND DATE >= '2022-08-01';
      """)
  void getSecurities_withCurrency_noPriceInTrailingTwelveMonths_highAndLowAbsent() throws Exception {
    PriceMetaInfoDto priceMetaInfo = getPriceMetaInfo(GOOGL, "EUR");
    assertThat(priceMetaInfo).isNotNull();
    assertThat(priceMetaInfo.getCurrency()).isEqualTo("EUR");

    // the latest stored price, 136.13 USD of 2022-03-18, predates every EUR/USD rate
    assertThat(priceMetaInfo.getLatestPrice()).isEqualByComparingTo("120");
    assertThat(priceMetaInfo.getLatestPriceDate()).isEqualTo(LocalDate.of(2022, MARCH, 16));

    assertThat(priceMetaInfo.getOldestPrice()).isEqualByComparingTo("1225.2");
    assertThat(priceMetaInfo.getOldestPriceDate()).isEqualTo(LocalDate.of(2019, DECEMBER, 20));

    assertThat(priceMetaInfo.getHighTrailingTwelveMonths()).isNull();
    assertThat(priceMetaInfo.getLowTrailingTwelveMonths()).isNull();
  }

  @Test
  void getSecurities_malformedCurrency_badRequest() throws Exception {
    MvcResult result = getSecurities("eur").andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getSecurities_unsupportedCurrency_badRequest() throws Exception {
    MvcResult result = getSecurities("XYZ").andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getSecurities_lastPage() throws Exception {
    int page = 4;
    MvcResult result = getSecurities(page, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(TOTAL_NUMBER_OF_SECURITIES);
    assertThat(responseBody.getCurrentPage()).isEqualTo(page);
    assertThat(responseBody.getLastPage()).isEqualTo(4);
    assertThat(responseBody.getPageSize()).isEqualTo(10);

    List<SecurityReadDto> items = responseBody.getItems();
    assertThat(items).hasSize(7);
    verifySecurityIds(items, 41, 47);
  }

  @Test
  void getSecurities_pageIsNegative() throws Exception {
    MvcResult result = getSecurities(-1, null).andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getSecurities_pageWithoutContent() throws Exception {
    MvcResult result = getSecurities(100, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {
        });

    assertThat(responseBody.getTotal()).isEqualTo(TOTAL_NUMBER_OF_SECURITIES);
    assertThat(responseBody.getCurrentPage()).isEqualTo(100);
    assertThat(responseBody.getLastPage()).isEqualTo(4);
    assertThat(responseBody.getPageSize()).isEqualTo(10);
    assertThat(responseBody.getItems()).isEmpty();
  }

  @Test
  void getSecurities_specificPageSize() throws Exception {
    MvcResult result = getSecurities(null, 5).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(TOTAL_NUMBER_OF_SECURITIES);
    assertThat(responseBody.getCurrentPage()).isZero();
    assertThat(responseBody.getLastPage()).isEqualTo(9);
    assertThat(responseBody.getPageSize()).isEqualTo(5);

    List<SecurityReadDto> items = responseBody.getItems();
    assertThat(items).hasSize(5);
    verifySecurityIds(items, 1, 5);
  }

  @Test
  void getSecurities_specificPageAndPageSize() throws Exception {
    MvcResult result = getSecurities(4, 5).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(result.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(TOTAL_NUMBER_OF_SECURITIES);
    assertThat(responseBody.getCurrentPage()).isEqualTo(4);
    assertThat(responseBody.getLastPage()).isEqualTo(9);
    assertThat(responseBody.getPageSize()).isEqualTo(5);

    List<SecurityReadDto> items = responseBody.getItems();
    assertThat(items).hasSize(5);
    verifySecurityIds(items, 21, 25);
  }

  @Test
  void getSecurities_pageSizeIsZero() throws Exception {
    MvcResult result = getSecurities(null, 0).andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getSecurities_pageSizeIsNegative() throws Exception {
    MvcResult result = getSecurities(null, -1).andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getSecurities_pageAndPageSizeAreInvalid() throws Exception {
    MvcResult result = getSecurities(-1, -1).andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentLength()).isZero();
  }

  @Test
  void getSecurities_searchBySector() throws Exception {
    MvcResult mvcResult = getSecurities(null, null, "eal est", null, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(8);
    assertThat(responseBody.getCurrentPage()).isEqualTo(0);
    assertThat(responseBody.getLastPage()).isEqualTo(0);
    assertThat(responseBody.getPageSize()).isEqualTo(10);

    List<SecurityReadDto> items = responseBody.getItems();
    assertThat(items).hasSize(8);
    Set<String> names = items.stream().map(SecurityReadDto::getName).collect(Collectors.toSet());
    assertThat(names).contains("Equinix", "American Tower", "Digital Realty", "Gladstone Land", "LTC Properties",
        "Omega Healthcare", "Orion Office", "Realty Income");
  }

  @Test
  void getSecurities_searchByName() throws Exception {
    MvcResult mvcResult = getSecurities(null, null, "alpha", null, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(2);
    assertThat(responseBody.getCurrentPage()).isEqualTo(0);
    assertThat(responseBody.getLastPage()).isEqualTo(0);
    assertThat(responseBody.getPageSize()).isEqualTo(10);

    List<SecurityReadDto> items = responseBody.getItems();
    assertThat(items).hasSize(2);
    Set<String> names = items.stream().map(SecurityReadDto::getName).collect(Collectors.toSet());
    assertThat(names).contains("Alphabet A", "Alphabet C");
  }

  @Test
  void searchBySector_orderByName_implicitAscending_lastPage() throws Exception {
    MvcResult mvcResult =
        getSecurities(1, null, "technology", SecurityOrderPropertyDto.NAME, null).andExpect(status().isOk())
            .andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(14);
    assertThat(responseBody.getCurrentPage()).isEqualTo(1);
    assertThat(responseBody.getLastPage()).isEqualTo(1);
    assertThat(responseBody.getPageSize()).isEqualTo(10);

    List<SecurityReadDto> items = responseBody.getItems();
    List<String> expectedNames = List.of("PTC", "Pinterest", "Qualcomm", "Salesforce");
    assertThat(items).hasSameSizeAs(expectedNames);
    for (int i = 0; i < items.size(); i++) {
      assertThat(items.get(i).getName()).isEqualTo(expectedNames.get(i));
    }
  }

  @Test
  void searchBySector_orderByName_explicitAscending_firstPage() throws Exception {
    MvcResult mvcResult =
        getSecurities(0, 10, "Financials", SecurityOrderPropertyDto.NAME, SortOrderDto.ASC).andExpect(status().isOk())
            .andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(3);
    assertThat(responseBody.getCurrentPage()).isEqualTo(0);
    assertThat(responseBody.getLastPage()).isEqualTo(0);
    assertThat(responseBody.getPageSize()).isEqualTo(10);

    List<SecurityReadDto> items = responseBody.getItems();
    List<String> expectedNames = List.of("Block", "Main Street Capital", "S&P Global");
    assertThat(items).hasSameSizeAs(expectedNames);
    for (int i = 0; i < items.size(); i++) {
      assertThat(items.get(i).getName()).isEqualTo(expectedNames.get(i));
    }
  }

  /**
   * 'Health' matches the health sector and 'Omega Healthcare'.
   */
  @Test
  void searchBySectorAndName_orderByName_explicitDescending_firstPage() throws Exception {
    MvcResult mvcResult =
        getSecurities(0, 3, "Health", SecurityOrderPropertyDto.NAME, SortOrderDto.DESC).andExpect(status().isOk())
            .andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(5);
    assertThat(responseBody.getCurrentPage()).isEqualTo(0);
    assertThat(responseBody.getLastPage()).isEqualTo(1);
    assertThat(responseBody.getPageSize()).isEqualTo(3);

    List<SecurityReadDto> items = responseBody.getItems();
    List<String> expectedNames = List.of("UnitedHealth", "Thermo Fisher", "Pfizer");
    assertThat(items).hasSameSizeAs(expectedNames);
    for (int i = 0; i < items.size(); i++) {
      assertThat(items.get(i).getName()).isEqualTo(expectedNames.get(i));
    }
  }

  @Test
  void searchBySymbol() throws Exception {
    MvcResult mvcResult = getSecurities(null, null, "MSFT", null, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});

    assertThat(responseBody.getTotal()).isEqualTo(1);
    assertThat(responseBody.getCurrentPage()).isEqualTo(0);
    assertThat(responseBody.getLastPage()).isEqualTo(0);
    assertThat(responseBody.getPageSize()).isEqualTo(10);

    assertThat(responseBody.getItems()).hasSize(1);
    assertThat(responseBody.getItems().get(0).getName()).isEqualTo("Microsoft");
  }

  @Test
  void search_noResult() throws Exception {
    MvcResult mvcResult =
        getSecurities(null, null, "thisYieldsNoResults", null, null).andExpect(status().isOk()).andReturn();
    PaginatedSecurityReadDto responseBody =
        objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {
        });

    assertThat(responseBody.getTotal()).isZero();
    assertThat(responseBody.getLastPage()).isZero();
    assertThat(responseBody.getItems()).isEmpty();
  }

  private ResultActions getSecurities(Integer page, Integer pageSize) throws Exception {
    MockHttpServletRequestBuilder requestBuilder = get(ENDPOINT);
    if (page != null) {
      requestBuilder = requestBuilder.queryParam("page", page.toString());
    }
    if (pageSize != null) {
      requestBuilder = requestBuilder.queryParam("pageSize", pageSize.toString());
    }
    return mockMvc.perform(requestBuilder);
  }

  private ResultActions getSecurities(Integer page, Integer pageSize, String search, SecurityOrderPropertyDto orderBy,
                                      SortOrderDto order) throws Exception {
    MockHttpServletRequestBuilder requestBuilder = get(ENDPOINT);
    if (page != null) {
      requestBuilder = requestBuilder.queryParam("page", page.toString());
    }
    if (pageSize != null) {
      requestBuilder = requestBuilder.queryParam("pageSize", pageSize.toString());
    }
    if (search != null) {
      requestBuilder = requestBuilder.queryParam("search", search);
    }
    if (orderBy != null) {
      requestBuilder = requestBuilder.queryParam("orderBy", orderBy.getValue());
    }
    if (order != null) {
      requestBuilder = requestBuilder.queryParam("order", order.getValue());
    }
    return mockMvc.perform(requestBuilder);
  }

  private ResultActions getSecurities(String currency) throws Exception {
    return mockMvc.perform(get(ENDPOINT).queryParam("currency", currency));
  }

  private PriceMetaInfoDto getPriceMetaInfo(long securityId, String currency) throws Exception {
    return priceMetaInfoOf(getFirstPage(currency), securityId);
  }

  private PaginatedSecurityReadDto getFirstPage(String currency) throws Exception {
    MvcResult mvcResult = getSecurities(currency).andExpect(status().isOk()).andReturn();
    return objectMapper.readValue(mvcResult.getResponse().getContentAsString(), new TypeReference<>() {});
  }

  private PriceMetaInfoDto priceMetaInfoOf(PaginatedSecurityReadDto page, long securityId) {
    return page.getItems().stream()
        .filter(security -> security.getId() == securityId)
        .findFirst()
        .orElseThrow()
        .getPriceMetaInfo();
  }

  private void verifySecurityIds(List<SecurityReadDto> securities, long minId, long maxId) {
    Set<Long> ids = securities.stream().map(SecurityReadDto::getId).collect(Collectors.toSet());

    for (long id = minId; id <= maxId; id++) {
      assertThat(ids).contains(id);
    }
  }
}
