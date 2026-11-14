package de.as.traquity.notification.dividendannouncement;

import static de.as.traquity.notification.dividendannouncement.api.model.DateFormatDto.TIMESTAMP_MILLISECONDS;
import static de.as.traquity.notification.dividendannouncement.api.model.DateFormatDto.TIMESTAMP_SECONDS;
import static java.lang.Double.parseDouble;
import static java.time.ZoneOffset.UTC;
import static org.springframework.http.HttpMethod.GET;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import de.as.traquity.common.arithmetic.BigDecimalParser;
import de.as.traquity.common.error.InternalServerErrorException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.util.FormattedValue;
import de.as.traquity.common.util.ValueFormatService;
import de.as.traquity.notification.dividendannouncement.config.DividendAnnouncementConfig;
import de.as.traquity.notification.dividendannouncement.config.DividendAnnouncementConfigService;
import de.as.traquity.notification.dividendannouncement.datasource.DividendAnnouncementDataSource;
import de.as.traquity.notification.dividendannouncement.datasource.DividendAnnouncementDataSourceService;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
class DividendAnnouncementServiceImpl implements DividendAnnouncementService {

  private final Clock clock;
  private final DividendAnnouncementRepository dividendAnnouncementRepository;
  private final DividendAnnouncementMapper dividendAnnouncementMapper;
  private final DividendAnnouncementDataSourceService dataSourceService;
  private final DividendAnnouncementConfigService configService;
  private final ValueFormatService valueFormatService;
  private final RestTemplate restTemplate;
  private final MathContext mathContext;
  private final BigDecimalParser bigDecimalParser = new BigDecimalParser();

  @Override
  public List<DividendAnnouncement> getDividendAnnouncements(Boolean isNew) {
    List<DividendAnnouncementEntity> entities;

    if (isNew == null) {
      entities = dividendAnnouncementRepository.findAllByOrderByPayDateAsc();
    } else {
      entities = dividendAnnouncementRepository.findAllByIsNewOrderByPayDateAsc(isNew);
    }

    return entities.stream().map(entity -> {
      DividendAnnouncement dividendAnnouncement = dividendAnnouncementMapper.fromEntity(entity);

      try {
        dividendAnnouncement.setDataSource(dataSourceService.getDataSource(entity.getDataSourceId()));
      } catch (NotFoundException e) {
        throw new InternalServerErrorException();
      }

      return dividendAnnouncement;
    }).toList();
  }

  @Override
  public DividendAnnouncement markAsRead(long dividendAnnouncementId) throws NotFoundException {
    DividendAnnouncementEntity entity =
        dividendAnnouncementRepository.findById(dividendAnnouncementId).orElseThrow(NotFoundException::new);
    entity.setNew(false);
    DividendAnnouncementEntity saved = dividendAnnouncementRepository.saveAndFlush(entity);

    DividendAnnouncement dividendAnnouncement = dividendAnnouncementMapper.fromEntity(saved);
    try {
      dividendAnnouncement.setDataSource(dataSourceService.getDataSource(saved.getDataSourceId()));
    } catch (NotFoundException e) {
      throw new InternalServerErrorException();
    }
    return dividendAnnouncement;
  }

  void createDividendAnnouncement(long securityId, long dataSourceId, LocalDate payDate, BigDecimal amountPerShare,
                                  String currency) {
    if (dividendAnnouncementRepository.existsBySecurityIdAndPayDateAndAmountPerShare(securityId, payDate,
        amountPerShare)) {
      return;
    }

    DividendAnnouncementEntity entity = new DividendAnnouncementEntity();
    entity.setNew(true);
    entity.setSecurityId(securityId);
    entity.setDataSourceId(dataSourceId);
    entity.setPayDate(payDate);
    entity.setAmountPerShare(amountPerShare);
    entity.setCurrency(currency);
    dividendAnnouncementRepository.saveAndFlush(entity);
  }

  void removeOldDividendAnnouncements() {
    LocalDate now = LocalDate.now(clock);
    dividendAnnouncementRepository.deleteAllByPayDateBefore(now);
  }

  void updateDividendAnnouncements() {
    List<DividendAnnouncementConfig> configs = configService.getDividendAnnouncementConfigs();
    for (DividendAnnouncementConfig config : configs) {
      if (!config.isActive()) {
        continue;
      }
      try {
        updateDividendAnnouncements(config);
      } catch (RuntimeException e) {
        log.warn("Failed to update dividend announcements for security {}", config.getSecurityId(), e);
      }
    }
  }

  private void updateDividendAnnouncements(DividendAnnouncementConfig config) {
    DividendAnnouncementDataSource dataSource = dataSourceService.getDataSource(config.getDataSourceId());
    List<DividendAnnouncement> announcements =
        loadAnnouncementsFromDataSource(config.getSecurityId(), config.getExternalSecurityId(), dataSource);
    LocalDate today = LocalDate.now(clock);

    for (DividendAnnouncement announcement : announcements) {
      if (announcement.getPayDate().isBefore(today)) {
        continue;
      }
      createDividendAnnouncement(announcement.getSecurityId(), dataSource.getId(), announcement.getPayDate(),
          announcement.getAmountPerShare(), announcement.getCurrency());
    }
  }

  private List<DividendAnnouncement> loadAnnouncementsFromDataSource(long securityId, String externalSecurityId,
                                                                     DividendAnnouncementDataSource dataSource) {
    HttpHeaders headers = new HttpHeaders();
    for (Map.Entry<String, String> header : dataSource.getRequestHeaders().entrySet()) {
      String formattedValue = valueFormatService.formatValue(header.getValue(), externalSecurityId).getFormattedValue();
      headers.add(header.getKey(), formattedValue);
    }
    HttpEntity<String> httpEntity = new HttpEntity<>(headers);

    FormattedValue url = valueFormatService.formatValue(dataSource.getUrlPattern(), externalSecurityId);
    ResponseEntity<String> response = restTemplate.exchange(url.getFormattedValue(), GET, httpEntity, String.class);
    log.info("Received {} from {} headers: {}", response.getStatusCode(), url, headers);
    if (!response.getStatusCode().is2xxSuccessful()) {
      log.error("Error while requesting dividend announcements for security {} using URL {}: {} {}", securityId, url,
          response.getStatusCode(), response.getBody());
      return List.of();
    }

    DocumentContext json = JsonPath.parse(response.getBody());
    List<Object> rawDates = json.read(dataSource.getJsonPathDate());
    List<Object> rawAmounts = json.read(dataSource.getJsonPathValue());
    List<String> currency = parseCurrency(json, rawDates.size(), externalSecurityId, dataSource);

    if (rawDates.size() != rawAmounts.size() || rawAmounts.size() != currency.size()) {
      log.error("Received {} dates and {} amounts and {} currencies from {} (securityId = {})",
          rawDates.size(), rawAmounts.size(), currency.size(), url, securityId);
      return List.of();
    }

    List<DividendAnnouncement> result = new LinkedList<>();
    DividendAnnouncement dividendAnnouncement;
    String mappedCurrencyCode;
    BigDecimal currencyMultiplier;
    for (int i = 0; i < rawAmounts.size(); i++) {
      if (rawDates.get(i) == null || rawAmounts.get(i) == null || currency.get(i) == null) {
        continue;
      }
      dividendAnnouncement = new DividendAnnouncement();
      dividendAnnouncement.setSecurityId(securityId);
      dividendAnnouncement.setPayDate(parseDate(rawDates.get(i).toString(), dataSource.getDateFormat()));
      dividendAnnouncement.setAmountPerShare(bigDecimalParser.apply(rawAmounts.get(i)));
      dividendAnnouncement.setCurrency(currency.get(i));

      mappedCurrencyCode = dataSource.getMappedCurrencyCode(currency.get(i));
      currencyMultiplier = dataSource.getMultiplier(currency.get(i));
      if (mappedCurrencyCode != null) {
        dividendAnnouncement.setCurrency(mappedCurrencyCode);
      }
      if (currencyMultiplier != null) {
        dividendAnnouncement.setAmountPerShare(
            dividendAnnouncement.getAmountPerShare().multiply(currencyMultiplier, mathContext));
      }

      result.add(dividendAnnouncement);
    }
    return result;
  }

  private LocalDate parseDate(String dateStr, String format) {
    if (TIMESTAMP_SECONDS.getValue().equals(format)) {
      long seconds = (long) parseDouble(dateStr);
      return LocalDate.ofInstant(Instant.ofEpochSecond(seconds), UTC);
    } else if (TIMESTAMP_MILLISECONDS.getValue().equals(format)) {
      long milliseconds = (long) parseDouble(dateStr);
      return LocalDate.ofInstant(Instant.ofEpochMilli(milliseconds), UTC);
    } else {
      DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
      return LocalDate.parse(dateStr, formatter);
    }
  }

  private List<String> parseCurrency(DocumentContext json, int requiredSize, String externalSecurityId,
                                     DividendAnnouncementDataSource dataSource) {
    String regex = dataSource.getRegexCurrency();
    Integer group = dataSource.getRegexCurrencyGroup();
    Object rawCurrency;
    List<String> result;

    if (dataSource.getJsonPathCurrency() == null) {
      rawCurrency = externalSecurityId;
    } else {
      rawCurrency = json.read(dataSource.getJsonPathCurrency());
    }

    if (rawCurrency instanceof List) {
      result = new ArrayList<>(((List<?>) rawCurrency).stream().map(Object::toString).toList());
    } else {
      result = new ArrayList<>(requiredSize);
      for (int i = 0; i < requiredSize; i++) {
        result.add(rawCurrency.toString());
      }
    }

    if (regex == null) {
      return result;
    }

    Pattern pattern = Pattern.compile(regex);
    Matcher matcher;
    String matchedGroup;

    for (int i = 0; i < result.size(); i++) {
      matcher = pattern.matcher(result.get(i));
      if (matcher.find()) {
        matchedGroup = matcher.group(group == null ? 0 : group);
        result.set(i, matchedGroup == null ? "" : matchedGroup);
      }
    }

    return result;
  }
}
