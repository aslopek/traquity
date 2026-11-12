package de.as.traquity.exchangerates;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.fail;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpStatus.OK;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import integration.IntegrationTest;
import jakarta.transaction.Transactional;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Month;
import java.util.Iterator;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

@IntegrationTest
@RecordApplicationEvents
public class ExchangeRateUpdateTest {

  private static final String EXCHANGE_RATE_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.zip";

  private static byte[] responseBody;

  @Autowired
  private Clock clock;

  @Autowired
  private ApplicationEventPublisher applicationEventPublisher;

  @Autowired
  private ExchangeRateServiceImpl exchangeRateService;

  @Autowired
  private ExchangeRateRepository exchangeRateRepository;

  @Autowired
  private RestTemplate restTemplate;

  @Autowired
  private ApplicationEvents applicationEvents;

  private MockRestServiceServer mockServer;

  private ExchangeRateUpdater subject;

  @BeforeAll
  static void beforeAll() {
    responseBody = new byte[0];
    try (InputStream inputStream = ExchangeRateUpdateTest.class.getClassLoader()
        .getResourceAsStream("fixtures/ecb/eurofxref-hist.zip")) {
      if (inputStream == null) {
        throw new IOException();
      }
      responseBody = inputStream.readAllBytes();
    } catch (IOException e) {
      fail(e.getMessage());
    }
  }

  @BeforeEach
  void beforeEach() {
    mockServer = MockRestServiceServer.createServer(restTemplate);

    subject = new ExchangeRateUpdater(exchangeRateService, applicationEventPublisher, clock);

    mockServer.reset();
    HttpHeaders responseHeaders = new HttpHeaders();
    responseHeaders.add("Content-Type", "application/zip");
    mockServer.expect(ExpectedCount.once(), requestTo(EXCHANGE_RATE_URL)).andExpect(method(GET))
        .andRespond(withStatus(OK).body(responseBody).headers(responseHeaders));
  }

  @AfterEach
  void afterEach() {
    mockServer.reset();
  }

  @Test
  @Transactional
  void updateExchangeRates_someExchangeRatesExistAlready() {
    subject.updateExchangeRates();
    verifyNewExchangeRates();

    Stream<ExchangeRateEntity> exchangeRates =
        exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateDesc("EUR", "USD");
    assertThat(exchangeRates.count()).isEqualTo(18);
    exchangeRates.close();
  }

  @Test
  @Transactional
  void updateExchangeRates_noExchangeRatesExist() {
    exchangeRateRepository.deleteAll();
    subject.updateExchangeRates();
    verifyNewExchangeRates();

    Stream<ExchangeRateEntity> exchangeRates =
        exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateDesc("EUR", "USD");
    assertThat(exchangeRates.count()).isEqualTo(6399);
    exchangeRates.close();
  }

  @Test
  @Transactional
  void updateExchangeRates_downloadFails() {
    mockServer.reset();
    mockServer.expect(ExpectedCount.once(), requestTo(EXCHANGE_RATE_URL)).andExpect(method(GET))
        .andRespond(withException(new IOException("No connection")));
    long count = exchangeRateRepository.count();

    assertThatCode(subject::updateExchangeRates).doesNotThrowAnyException();

    verifyUpdateSkipped(count);
  }

  @Test
  @Transactional
  void updateExchangeRates_unparsableDate() throws IOException {
    mockServer.reset();
    HttpHeaders responseHeaders = new HttpHeaders();
    responseHeaders.add("Content-Type", "application/zip");
    byte[] zip = zipCsv("Date,USD,GBP,\nnot-a-date,1.1,0.8,\n");
    mockServer.expect(ExpectedCount.once(), requestTo(EXCHANGE_RATE_URL)).andExpect(method(GET))
        .andRespond(withStatus(OK).body(zip).headers(responseHeaders));
    long count = exchangeRateRepository.count();

    assertThatCode(subject::updateExchangeRates).doesNotThrowAnyException();

    verifyUpdateSkipped(count);
  }

  private void verifyUpdateSkipped(long expectedExchangeRateCount) {
    assertThat(exchangeRateRepository.count()).isEqualTo(expectedExchangeRateCount);
    assertThat(applicationEvents.stream(ExchangeRateReadyEvent.class)).hasSize(1);
    mockServer.verify();
  }

  private static byte[] zipCsv(String csv) throws IOException {
    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
    try (ZipOutputStream zipOutputStream = new ZipOutputStream(outputStream)) {
      zipOutputStream.putNextEntry(new ZipEntry("eurofxref-hist.csv"));
      zipOutputStream.write(csv.getBytes(UTF_8));
      zipOutputStream.closeEntry();
    }
    return outputStream.toByteArray();
  }

  private void verifyNewExchangeRates() {
    Stream<ExchangeRateEntity> exchangeRates =
        exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateDesc("EUR", "USD");
    Iterator<ExchangeRateEntity> iterator = exchangeRates.iterator();
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 22), "USD", new BigDecimal("1.1023"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 21), "USD", new BigDecimal("1.0983"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 20), "USD", new BigDecimal("1.0944"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 19), "USD", new BigDecimal("1.0962"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 18), "USD", new BigDecimal("1.0918"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 15), "USD", new BigDecimal("1.0946"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 14), "USD", new BigDecimal("1.0919"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 13), "USD", new BigDecimal("1.0787"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 12), "USD", new BigDecimal("1.0804"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 11), "USD", new BigDecimal("1.0757"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 8), "USD", new BigDecimal("1.0777"));
    exchangeRates.close();

    exchangeRates = exchangeRateRepository.findAllByBaseCurrencyAndTargetCurrencyOrderByDateDesc("EUR", "GBP");
    iterator = exchangeRates.iterator();
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 22), "GBP", new BigDecimal("0.8666"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 21), "GBP", new BigDecimal("0.86805"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 20), "GBP", new BigDecimal("0.86555"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 19), "GBP", new BigDecimal("0.86095"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 18), "GBP", new BigDecimal("0.86263"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 15), "GBP", new BigDecimal("0.85833"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 14), "GBP", new BigDecimal("0.85955"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 13), "GBP", new BigDecimal("0.8612"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 12), "GBP", new BigDecimal("0.85928"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 11), "GBP", new BigDecimal("0.8558"));
    verifyExchangeRateEntity(iterator.next(), LocalDate.of(2023, Month.DECEMBER, 8), "GBP", new BigDecimal("0.8569"));
    exchangeRates.close();
  }

  private void verifyExchangeRateEntity(ExchangeRateEntity entity, LocalDate expectedDate,
                                        String expectedTargetCurrency, BigDecimal expectedExchangeRate) {
    assertThat(entity).isNotNull();
    assertThat(entity.getDate()).isEqualTo(expectedDate);
    assertThat(entity.getBaseCurrency()).isEqualTo("EUR");
    assertThat(entity.getTargetCurrency()).isEqualTo(expectedTargetCurrency);
    assertThat(entity.getExchangeRate()).isEqualByComparingTo(expectedExchangeRate);
  }
}
