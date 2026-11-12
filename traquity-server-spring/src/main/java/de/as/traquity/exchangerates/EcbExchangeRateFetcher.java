package de.as.traquity.exchangerates;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import de.as.traquity.configuration.ServerConfigurationService;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.RestTemplate;

@Slf4j
@RequiredArgsConstructor
class EcbExchangeRateFetcher {

  private static final String EXCHANGE_RATE_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist.zip";
  private static final String FILE_NAME = "eurofxref-hist.csv";
  private static final byte[] ZIP_MAGIC_BYTES = {0x50, 0x4B, 0x03, 0x04};
  private static final String BASE_CURRENCY = "EUR";

  private final RestTemplate restTemplate;
  private final ServerConfigurationService serverConfigurationService;

  List<ExchangeRateEntity> fetchExchangeRates(LocalDate minimumDate) {
    String exchangeRatesCsv;
    try {
      exchangeRatesCsv = downloadExchangeRates();
    } catch (IOException | RuntimeException e) {
      log.warn("Could not download exchange rates", e);
      return List.of();
    }

    List<ExchangeRateEntity> exchangeRateEntities = new LinkedList<>();
    try (Reader reader = new StringReader(exchangeRatesCsv)) {
      CSVReader csvReader = new CSVReader(reader);
      String[] line = csvReader.readNext();
      Map<String, Integer> indices = csvHeader(line);
      Map<String, BigDecimal> exchangeRates;
      LocalDate date;

      while ((line = csvReader.readNext()) != null) {
        date = LocalDate.parse(line[0]);
        if (date.isBefore(minimumDate)) {
          break;
        }
        exchangeRates = parseExchangeRates(line, indices);
        exchangeRateEntities.addAll(createEntities(date, exchangeRates));
      }
    } catch (IOException | CsvValidationException | RuntimeException e) {
      log.warn("Could not parse exchange rates", e);
      return List.of();
    }

    Collections.reverse(exchangeRateEntities);
    return exchangeRateEntities;
  }

  private String downloadExchangeRates() throws IOException {
    byte[] zip = restTemplate.getForObject(EXCHANGE_RATE_URL, byte[].class);
    if (zip == null || zip.length < ZIP_MAGIC_BYTES.length) {
      throw new IOException(String.format("Could not download exchange rates from %s", EXCHANGE_RATE_URL));
    }
    for (int i = 0; i < ZIP_MAGIC_BYTES.length; i++) {
      if (zip[i] != ZIP_MAGIC_BYTES[i]) {
        throw new IOException(String.format("%s did not provide a valid zip file", EXCHANGE_RATE_URL));
      }
    }

    byte[] unzipped;
    try (ZipInputStream inputStream = new ZipInputStream(new ByteArrayInputStream(zip))) {
      ZipEntry entry = inputStream.getNextEntry();
      if (entry == null || !FILE_NAME.equals(entry.getName())) {
        throw new IOException(
            String.format("Expected the zip file from %s to contain a file %s", EXCHANGE_RATE_URL, FILE_NAME));
      }

      try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
        int bufferSize = 1024;
        byte[] buffer = new byte[bufferSize];
        int size;
        while ((size = inputStream.read(buffer)) > 0) {
          outputStream.write(buffer, 0, size);
        }
        unzipped = outputStream.toByteArray();
      }
    }
    return new String(unzipped);
  }

  private Map<String, Integer> csvHeader(String[] header) {
    Map<String, Integer> indices = new HashMap<>();
    List<String> headerAsList = List.of(header);
    String defaultCurrency = serverConfigurationService.getDefaultCurrency();
    Set<String> supportedCurrencies = serverConfigurationService.getSupportedCurrencies();
    supportedCurrencies.forEach(currency -> {
      if (headerAsList.contains(currency) && !currency.equals(defaultCurrency)) {
        indices.put(currency, headerAsList.indexOf(currency));
      }
    });
    return indices;
  }

  private Map<String, BigDecimal> parseExchangeRates(String[] line, Map<String, Integer> indices) {
    Map<String, BigDecimal> exchangeRates = new HashMap<>();
    BigDecimal parsedValue;
    for (Map.Entry<String, Integer> entry : indices.entrySet()) {
      try {
        parsedValue = new BigDecimal(line[entry.getValue()]);
      } catch (NullPointerException | NumberFormatException e) {
        continue;
      }
      exchangeRates.put(entry.getKey(), parsedValue);
    }
    return exchangeRates;
  }

  private List<ExchangeRateEntity> createEntities(LocalDate date, Map<String, BigDecimal> exchangeRates) {
    return exchangeRates.entrySet().stream().map(entry -> {
      ExchangeRateEntity entity = new ExchangeRateEntity();
      entity.setDate(date);
      entity.setBaseCurrency(BASE_CURRENCY);
      entity.setTargetCurrency(entry.getKey());
      entity.setExchangeRate(entry.getValue());
      return entity;
    }).toList();
  }
}
