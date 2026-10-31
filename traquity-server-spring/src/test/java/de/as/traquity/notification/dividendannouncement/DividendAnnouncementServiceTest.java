package de.as.traquity.notification.dividendannouncement;

import static integration.api.MockRestRequestMatchers.withoutHeader;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.context.jdbc.SqlMergeMode.MergeMode.MERGE;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import integration.IntegrationTest;
import integration.SecurityIds;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.context.jdbc.SqlMergeMode;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

@IntegrationTest
class DividendAnnouncementServiceTest {

  @MockitoBean
  private Clock clock;

  @Autowired
  private DividendAnnouncementRepository dividendAnnouncementRepository;

  @Autowired
  private RestTemplate restTemplate;

  @Autowired
  private DividendAnnouncementServiceImpl subject;

  private MockRestServiceServer mockServer;

  @BeforeEach
  void beforeEach() {
    mockServer = MockRestServiceServer.createServer(restTemplate);
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
    mockServer.reset();
  }

  @Test
  void removeOldDividendAnnouncements() {
    Set<Long> expectedRemainingAnnouncements = Set.of(3L, 4L, 5L, 6L, 7L, 8L, 9L);
    assertThat(dividendAnnouncementRepository.count()).isGreaterThan(expectedRemainingAnnouncements.size());
    subject.removeOldDividendAnnouncements();

    List<DividendAnnouncementEntity> entities = dividendAnnouncementRepository.findAll();
    assertThat(entities).hasSameSizeAs(expectedRemainingAnnouncements);

    List<Long> ids = entities.stream().map(DividendAnnouncementEntity::getId).toList();
    assertThat(ids).containsExactlyInAnyOrderElementsOf(expectedRemainingAnnouncements);
  }

  @Test
  void updateDividendAnnouncements() {
    // arrange
    String responseMsft = """
        {
          "currency": "USD",
          "payments": [
            {"date": "2024-09-12", "dividendPayment": 0.75},
            {"date": "2024-06-13", "dividendPayment": 0.75},
            {"date": "2024-03-14", "dividendPayment": 0.75},
            {"date": "2024-03-14", "dividendPayment": 0.1},
            {"date": "2023-12-14", "dividendPayment": 0.75},
            {"date": "2023-09-14", "dividendPayment": 0.68},
            {"date": "2023-06-08", "dividendPayment": 0.68},
            {"date": "2023-03-09", "dividendPayment": 0.68},
            {"date": "2022-12-08", "dividendPayment": 0.68},
            {"date": "2022-09-08", "dividendPayment": 0.62}
          ]
        }
        """;
    String requestUrlMsft = "https://dividend.api/v1/MSFT/dividends";
    mockServer.expect(ExpectedCount.once(), requestTo(requestUrlMsft)).andExpect(method(HttpMethod.GET))
        .andExpect(withoutHeader("x-header-a")).andExpect(withoutHeader("x-header-b"))
        .andRespond(withStatus(HttpStatus.OK).body(responseMsft));

    String responseAapl = """
        {
          "currency": "USD",
          "payments": [
            {"date": "2024-08-15", "dividendPayment": 0.25},
            {"date": "2024-05-16", "dividendPayment": 0.25},
            {"date": "2024-02-15", "dividendPayment": 0.24},
            {"date": "2023-11-16", "dividendPayment": 0.24},
            {"date": "2023-08-17", "dividendPayment": 0.24},
            {"date": "2023-05-18", "dividendPayment": 0.24},
            {"date": "2023-02-16", "dividendPayment": 0.23},
            {"date": "2022-11-10", "dividendPayment": 0.23},
            {"date": "2022-08-11", "dividendPayment": 0.23}
          ]
        }
        """;
    String requestUrlAapl = "https://dividend.api/v1/AAPL/dividends";
    mockServer.expect(ExpectedCount.once(), requestTo(requestUrlAapl)).andExpect(method(HttpMethod.GET))
        .andExpect(withoutHeader("x-header-a")).andExpect(withoutHeader("x-header-b"))
        .andRespond(withStatus(HttpStatus.OK).body(responseAapl));

    // dates are epoch seconds: 2024-05-22, 2023-05-17, 2022-05-18, 2021-05-21
    String responseHag = """
        {
          "dividends": {
            "dates": [
              1716336000,
              1684281600,
              1652832000,
              1621555200
            ],
            "amounts": [
              "EUR 0.4",
              "EUR 0.3",
              "EUR 0.25",
              "EUR 0.13"
            ]
          }
        }
        """;
    String requestUrlHag = "https://dividend.api/v2/DE000HAG0005/dividends";
    mockServer.expect(ExpectedCount.once(), requestTo(requestUrlHag)).andExpect(method(HttpMethod.GET))
        .andExpect(header("x-header-a", "valueA")).andExpect(header("x-header-b", "valueB"))
        .andRespond(withStatus(HttpStatus.OK).body(responseHag));

    // dates are epoch seconds: 2024-06-04, 2023-05-15, 2023-01-09
    String responseVow3 = """
        {
          "dividends": {
            "dates": [
              1717459200,
              1684108800,
              1673222400
            ],
            "amounts": [
              "EUR 9.06",
              "EUR 8.76",
              "EUR 19.06"
            ]
          }
        }
        """;
    String requestUrlVow3 = "https://dividend.api/v2/DE0007664039/dividends";
    mockServer.expect(ExpectedCount.once(), requestTo(requestUrlVow3)).andExpect(method(HttpMethod.GET))
        .andExpect(header("x-header-a", "valueA")).andExpect(header("x-header-b", "valueB"))
        .andRespond(withStatus(HttpStatus.OK).body(responseVow3));

    // dates are epoch seconds: 2024-06-04, 2023-05-15, 2023-01-09
    String responseVow = """
        {
          "dividends": {
            "dates": [
              1717459200,
              1684108800,
              1673222400
            ],
            "amounts": [
              "EUR 9",
              "EUR 8.7",
              "EUR 19.06"
            ]
          }
        }
        """;
    String requestUrlVow = "https://dividend.api/v2/DE0007664005/dividends";
    mockServer.expect(ExpectedCount.once(), requestTo(requestUrlVow)).andExpect(method(HttpMethod.GET))
        .andExpect(header("x-header-a", "valueA")).andExpect(header("x-header-b", "valueB"))
        .andRespond(withStatus(HttpStatus.OK).body(responseVow));

    String responseDeo = """
        {
          "dividends": {
            "dates": [
              "10/17/2024",
              "04/17/2024"
            ],
            "amounts": [
              "49,07 GBp",
              "32,05 GBp"
            ]
          }
        }
        """;
    String requestUrlDeo = "https://dividend.api/v3/ext-id-diageo/dividend-payments";
    mockServer.expect(ExpectedCount.once(), requestTo(requestUrlDeo)).andExpect(method(HttpMethod.GET))
        .andRespond(withStatus(HttpStatus.OK).body(responseDeo));

    // act
    subject.updateDividendAnnouncements();

    // assert
    List<DividendAnnouncementEntity> all = dividendAnnouncementRepository.findAllByOrderByPayDateAsc();

    // MSFT
    List<DividendAnnouncementEntity> msft = all.stream().filter(e -> e.getSecurityId() == SecurityIds.MSFT).toList();
    assertThat(msft).hasSize(6);
    verifyEntity(msft.getFirst(), 101, false, LocalDate.of(2023, Month.SEPTEMBER, 14), "0.68", "USD");
    verifyEntity(msft.get(1), 101, false, LocalDate.of(2023, Month.DECEMBER, 14), "0.75", "USD");
    verifyEntity(msft.get(2), 101, false, LocalDate.of(2024, Month.MARCH, 14), "0.75", "USD");
    verifyEntity(msft.get(3), 101, true, LocalDate.of(2024, Month.MARCH, 14), "0.1", "USD");
    verifyEntity(msft.get(4), 101, true, LocalDate.of(2024, Month.JUNE, 13), "0.75", "USD");
    verifyEntity(msft.get(5), 101, true, LocalDate.of(2024, Month.SEPTEMBER, 12), "0.75", "USD");

    // AAPL
    List<DividendAnnouncementEntity> aapl = all.stream().filter(e -> e.getSecurityId() == SecurityIds.AAPL).toList();
    assertThat(aapl).hasSize(3);
    verifyEntity(aapl.getFirst(), 101, true, LocalDate.of(2024, Month.FEBRUARY, 15), "0.24", "USD");
    verifyEntity(aapl.get(1), 101, true, LocalDate.of(2024, Month.MAY, 16), "0.25", "USD");
    verifyEntity(aapl.get(2), 101, true, LocalDate.of(2024, Month.AUGUST, 15), "0.25", "USD");

    // HAG
    List<DividendAnnouncementEntity> hag = all.stream().filter(e -> e.getSecurityId() == SecurityIds.HAG).toList();
    assertThat(hag).hasSize(1);
    verifyEntity(hag.getFirst(), 102, false, LocalDate.of(2024, Month.MAY, 22), "0.40", "EUR");

    // VOW3
    List<DividendAnnouncementEntity> vow3 = all.stream().filter(e -> e.getSecurityId() == SecurityIds.VW_VZ).toList();
    assertThat(vow3).hasSize(1);
    verifyEntity(vow3.getFirst(), 102, true, LocalDate.of(2024, Month.JUNE, 4), "9.06", "EUR");

    // VOW
    List<DividendAnnouncementEntity> vow = all.stream().filter(e -> e.getSecurityId() == SecurityIds.VW_STAMM).toList();
    assertThat(vow).hasSize(1);
    verifyEntity(vow.getFirst(), 102, true, LocalDate.of(2024, Month.JUNE, 4), "9", "EUR");

    // DEO
    List<DividendAnnouncementEntity> deo = all.stream().filter(e -> e.getSecurityId() == SecurityIds.DEO).toList();
    assertThat(deo).hasSize(2);
    verifyEntity(deo.getFirst(), 103, true, LocalDate.of(2024, Month.APRIL, 17), "0.3205", "GBP");
    verifyEntity(deo.get(1), 103, true, LocalDate.of(2024, Month.OCTOBER, 17), "0.4907", "GBP");
  }

  @Test
  @SqlMergeMode(MERGE)
  @Sql(statements = """
      UPDATE DIVIDEND_ANNOUNCEMENT_CONFIG
      SET IS_ACTIVE = TRUE
      WHERE SECURITY_ID = (SELECT ID FROM SECURITY WHERE NAME = 'Pfizer');
      UPDATE DIVIDEND_ANNOUNCEMENT_CONFIG
      SET IS_ACTIVE = FALSE
      WHERE SECURITY_ID != (SELECT ID FROM SECURITY WHERE NAME = 'Pfizer');
      """)
  void updateDividendAnnouncements_isinKeyedSource_ok() {
    String responsePfe = """
        {
          "currency": "USD",
          "payments": [
            {"date": "2024-09-12", "dividendPayment": 0.42}
          ]
        }
        """;
    String requestUrlPfe = "https://dividend.api/v4/US7170811035/dividends";
    mockServer.expect(ExpectedCount.once(), requestTo(requestUrlPfe)).andExpect(method(HttpMethod.GET))
        .andExpect(header("x-isin", "US7170811035"))
        .andRespond(withStatus(HttpStatus.OK).body(responsePfe));

    subject.updateDividendAnnouncements();

    List<DividendAnnouncementEntity> pfe = dividendAnnouncementRepository.findAllByOrderByPayDateAsc().stream()
        .filter(e -> e.getSecurityId() == SecurityIds.PFE).toList();
    assertThat(pfe).hasSize(1);
    verifyEntity(pfe.getFirst(), 104, true, LocalDate.of(2024, Month.SEPTEMBER, 12), "0.42", "USD");
  }

  void verifyEntity(DividendAnnouncementEntity entity, long expectedDataSourceId, boolean expectedIsNew,
                    LocalDate expectedPayDate, String expectedAmountPerShare, String expectedCurrency) {
    assertThat(entity.getDataSourceId()).isEqualTo(expectedDataSourceId);
    assertThat(entity.isNew()).isEqualTo(expectedIsNew);
    assertThat(entity.getPayDate()).isEqualTo(expectedPayDate);
    assertThat(entity.getAmountPerShare()).isEqualByComparingTo(expectedAmountPerShare);
    assertThat(entity.getCurrency()).isEqualTo(expectedCurrency);
  }
}
