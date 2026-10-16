package de.as.traquity.price.security.historical;

import static de.as.traquity.price.security.historical.api.model.DateFormatDto.TIMESTAMP_MILLISECONDS;
import static de.as.traquity.price.security.historical.api.model.DateFormatDto.TIMESTAMP_SECONDS;
import static java.lang.Double.parseDouble;
import static java.time.temporal.ChronoUnit.DAYS;
import static org.springframework.http.HttpMethod.GET;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import de.as.traquity.common.arithmetic.BigDecimalParser;
import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.InternalServerErrorException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.util.FormattedValue;
import de.as.traquity.common.util.ValueFormatService;
import de.as.traquity.exchangerates.CurrencyConversionRequest;
import de.as.traquity.exchangerates.ExchangeRateService;
import de.as.traquity.exchangerates.OutdatedExchangeRateException;
import de.as.traquity.price.security.historical.datasource.HistoricalSecurityPriceDataSource;
import de.as.traquity.price.security.historical.datasource.HistoricalSecurityPriceDataSourceService;
import de.as.traquity.price.security.historical.datasource.HistoricalSecurityPriceMarketCloseTime;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
class HistoricalSecurityPriceServiceImpl implements HistoricalSecurityPriceService {

  private final HistoricalSecurityPriceMapper priceMapper;
  private final HistoricalSecurityPriceConfigMapper configMapper;
  private final HistoricalSecurityPriceRepository priceRepository;
  private final HistoricalSecurityPriceConfigRepository configRepository;
  private final ExchangeRateService exchangeRateService;
  private final HistoricalSecurityPriceDataSourceService dataSourceService;
  private final ValueFormatService valueFormatService;
  private final RestTemplate restTemplate;
  private final MathContext mathContext;
  private final Clock clock;
  private final BigDecimalParser bigDecimalParser = new BigDecimalParser();

  @Override
  public List<HistoricalSecurityPrice> getPrices(long securityId, LocalDate startDate)
      throws BadRequestException, NotFoundException {
    LocalDate date = startDate != null ? startDate : LocalDate.EPOCH;
    List<HistoricalSecurityPriceEntity> prices =
        priceRepository.findAllBySecurityIdAndDateGreaterThanEqualOrderByDateAsc(securityId, date);
    return prices.stream().map(priceMapper::fromEntity).toList();
  }

  @Override
  public List<HistoricalSecurityPrice> getPrices(long securityId, LocalDate startDate, String currency)
      throws BadRequestException, NotFoundException, OutdatedExchangeRateException {
    List<HistoricalSecurityPrice> prices = getPrices(securityId, startDate);

    // group by source currency and convert each group in one batch call, rather than once per price row
    Map<String, List<HistoricalSecurityPrice>> pricesToConvertByCurrency = prices.stream()
        .filter(price -> !price.getCurrency().equals(currency))
        .collect(Collectors.groupingBy(HistoricalSecurityPrice::getCurrency));

    pricesToConvertByCurrency.forEach((sourceCurrency, pricesToConvert) -> {
      List<CurrencyConversionRequest> conversionRequests = pricesToConvert.stream()
          .map(price -> new CurrencyConversionRequest(price.getPrice(), price.getDate()))
          .toList();
      List<BigDecimal> converted = exchangeRateService.convert(conversionRequests, sourceCurrency, currency);

      IntStream.range(0, pricesToConvert.size()).forEach(i -> {
        pricesToConvert.get(i).setPrice(converted.get(i));
        pricesToConvert.get(i).setCurrency(currency);
      });
    });

    return prices;
  }

  @Override
  public HistoricalSecurityPrice getLatestPrice(long securityId, String currency) throws NotFoundException {
    Optional<HistoricalSecurityPriceEntity> latestPrice =
        priceRepository.findFirstBySecurityIdOrderByDateDesc(securityId);
    if (latestPrice.isEmpty()) {
      throw new NotFoundException();
    }
    HistoricalSecurityPrice price = priceMapper.fromEntity(latestPrice.get());
    if (!price.getCurrency().equals(currency)) {
      CurrencyConversionRequest conversionRequest = new CurrencyConversionRequest(price.getPrice(), price.getDate());
      BigDecimal converted = exchangeRateService.convert(List.of(conversionRequest), price.getCurrency(), currency).getFirst();
      price.setPrice(converted);
      price.setCurrency(currency);
    }
    return price;
  }

  @Override
  public Map<Long, HistoricalSecurityPrice> getLatestPrices(Set<Long> securityIds, String currency) {
    if (securityIds.isEmpty()) {
      return Map.of();
    }

    Map<Long, HistoricalSecurityPrice> latestPriceBySecurityId = new HashMap<>();
    for (HistoricalSecurityPriceEntity entity : priceRepository.findLatestBySecurityIdIn(securityIds)) {
      latestPriceBySecurityId.put(entity.getSecurityId(), priceMapper.fromEntity(entity));
    }

    // group by source currency and convert each group in one batch call
    Map<String, List<HistoricalSecurityPrice>> pricesToConvertByCurrency = latestPriceBySecurityId.values().stream()
        .filter(price -> !price.getCurrency().equals(currency))
        .collect(Collectors.groupingBy(HistoricalSecurityPrice::getCurrency));

    pricesToConvertByCurrency.forEach((sourceCurrency, pricesToConvert) ->
        convertLatestPrices(latestPriceBySecurityId, pricesToConvert, sourceCurrency, currency));

    return latestPriceBySecurityId;
  }

  @Override
  public void splitAdjustment(Long securityId, BigDecimal multiplier, LocalDate exDate) {
    priceRepository.findAllBySecurityIdAndDateLessThanOrderByDateDesc(securityId, exDate).forEach(price -> {
      BigDecimal adjustedPrice = price.getPrice().divide(multiplier, mathContext);
      price.setPrice(adjustedPrice);
      priceRepository.save(price);
    });
    priceRepository.flush();
  }

  @Override
  public HistoricalSecurityPriceConfig getConfig(long securityId) throws NotFoundException {
    HistoricalSecurityPriceConfigEntity config =
        configRepository.findBySecurityId(securityId).orElseThrow(NotFoundException::new);
    return configMapper.fromEntity(config);
  }

  @Override
  public HistoricalSecurityPriceConfig createConfig(HistoricalSecurityPriceConfig config)
      throws BadRequestException, ConflictException, NotFoundException {
    // security_id carries no unique constraint, so a second config for the same security is invisible to JPA
    if (configRepository.findBySecurityId(config.getSecurityId()).isPresent()) {
      throw new ConflictException();
    }

    HistoricalSecurityPriceConfigEntity saved;
    try {
      saved = configRepository.saveAndFlush(configMapper.toEntity(config));
    } catch (DataIntegrityViolationException e) {
      throw new BadRequestException();
    }

    if (config.isActive()) {
      updatePrices(config.getSecurityId());
    }

    return configMapper.fromEntity(saved);
  }

  @Override
  public HistoricalSecurityPriceConfig updateConfig(HistoricalSecurityPriceConfig config)
      throws BadRequestException, ConflictException, NotFoundException {
    HistoricalSecurityPriceConfigEntity fromDb =
        configRepository.findBySecurityId(config.getSecurityId()).orElseThrow(NotFoundException::new);

    HistoricalSecurityPriceConfigEntity updatedValues = configMapper.toEntity(config);
    updatedValues.setId(fromDb.getId());

    try {
      return configMapper.fromEntity(configRepository.saveAndFlush(updatedValues));
    } catch (ObjectOptimisticLockingFailureException e) {
      throw new ConflictException();
    } catch (DataIntegrityViolationException e) {
      throw new BadRequestException();
    }
  }

  List<HistoricalSecurityPriceConfig> getActiveConfigs() {
    return configRepository.findAllByActiveIsTrue().stream().map(configMapper::fromEntity).toList();
  }

  void deletePrices(long securityId) {
    priceRepository.deleteAllBySecurityId(securityId);
  }

  void updatePrices(long securityId) throws InternalServerErrorException, NotFoundException {
    HistoricalSecurityPriceConfigEntity config = configRepository.findBySecurityId(securityId).orElseThrow(NotFoundException::new);
    HistoricalSecurityPriceDataSource dataSource = dataSourceService.getDataSource(config.getDataSourceId());
    Optional<HistoricalSecurityPriceEntity> latestPrice = priceRepository.findFirstBySecurityIdOrderByDateDesc(securityId);
    LocalDate today = LocalDate.now(clock);
    Long missingDays = null;
    if (latestPrice.isPresent()) {
      LocalDate latestPriceDate = latestPrice.get().getDate();
      missingDays = DAYS.between(latestPriceDate, today);
      if (missingDays <= 0) {
        return;
      }
    }

    Map<Integer, String> urlPatterns = dataSource.getUrlPatterns();
    List<Integer> sortedKeys = new ArrayList<>(urlPatterns.keySet().stream().toList());
    List<Integer> keysToCall = new ArrayList<>(sortedKeys.size());
    sortedKeys.sort(Integer::compareTo);

    if (missingDays == null) {
      keysToCall = sortedKeys;
    } else {
      for (int key : sortedKeys) {
        keysToCall.add(key);
        if (key >= missingDays) {
          break;
        }
      }
    }

    List<HistoricalSecurityPrice> response;
    Map<LocalDate, HistoricalSecurityPrice> newPrices = new HashMap<>();
    for (int key : keysToCall) {
      response = loadPricesFromDataSource(urlPatterns.get(key), securityId, config.getExternalSecurityId(), dataSource);
      for (HistoricalSecurityPrice price : response) {
        if (!newPrices.containsKey(price.getDate())) {
          newPrices.put(price.getDate(), price);
        }
      }
    }

    List<HistoricalSecurityPriceEntity> entities = newPrices.values().stream()
        .filter(e -> acceptDate(e.getDate(), dataSource))
        .filter(e -> latestPrice.isEmpty() || e.getDate().isAfter(latestPrice.get().getDate()))
        .map(priceMapper::toEntity)
        .toList();
    priceRepository.saveAll(entities);
    priceRepository.flush();
  }

  private List<HistoricalSecurityPrice> loadPricesFromDataSource(String urlPattern, long securityId, String externalSecurityId,
                                                                 HistoricalSecurityPriceDataSource dataSource) {
    HttpHeaders headers = new HttpHeaders();
    for (Map.Entry<String, String> header : dataSource.getRequestHeaders().entrySet()) {
      String formattedValue = valueFormatService.formatValue(header.getValue(), externalSecurityId).getFormattedValue();
      headers.add(header.getKey(), formattedValue);
    }
    HttpEntity<String> httpEntity = new HttpEntity<>(headers);

    FormattedValue url = valueFormatService.formatValue(urlPattern, externalSecurityId);
    ResponseEntity<String> response = restTemplate.exchange(url.getFormattedValue(), GET, httpEntity, String.class);
    log.info("Received {} from {} headers: {}", response.getStatusCode(), url, headers);
    if (!response.getStatusCode().is2xxSuccessful()) {
      log.error("Error while requesting prices for security {} using URL {}: {} {}", securityId, url, response.getStatusCode(), response.getBody());
      return List.of();
    }

    DocumentContext json = JsonPath.parse(response.getBody());
    List<Object> rawDates = json.read(dataSource.getJsonPathDate());
    List<Object> rawPrices = json.read(dataSource.getJsonPathValue());
    List<String> currency = parseCurrency(json, rawDates.size(), externalSecurityId, dataSource);

    if (rawDates.size() != rawPrices.size() || rawPrices.size() != currency.size()) {
      log.error("Received {} dates and {} prices and {} currencies from {} (securityId = {})",
          rawDates.size(), rawPrices.size(), currency.size(), url, securityId);
      return List.of();
    }

    List<HistoricalSecurityPrice> result = new LinkedList<>();
    HistoricalSecurityPrice historicalSecurityPrice;
    String mappedCurrencyCode;
    BigDecimal currencyMultiplier;
    for (int i = 0; i < rawPrices.size(); i++) {
      if (rawDates.get(i) == null || rawPrices.get(i) == null || currency.get(i) == null) {
        continue;
      }
      historicalSecurityPrice = new HistoricalSecurityPrice();
      historicalSecurityPrice.setSecurityId(securityId);
      historicalSecurityPrice.setDate(parseDate(rawDates.get(i).toString(), dataSource.getDateFormat()));
      historicalSecurityPrice.setPrice(bigDecimalParser.apply(rawPrices.get(i)));
      historicalSecurityPrice.setCurrency(currency.get(i));

      mappedCurrencyCode = dataSource.getMappedCurrencyCode(currency.get(i));
      currencyMultiplier = dataSource.getMultiplier(currency.get(i));
      if (mappedCurrencyCode != null) {
        historicalSecurityPrice.setCurrency(mappedCurrencyCode);
      }
      if (currencyMultiplier != null) {
        historicalSecurityPrice.setPrice(historicalSecurityPrice.getPrice().multiply(currencyMultiplier, mathContext));
      }

      result.add(historicalSecurityPrice);
    }
    return result;
  }

  private LocalDate parseDate(String dateStr, String format) {
    if (TIMESTAMP_SECONDS.getValue().equals(format)) {
      long seconds = (long) parseDouble(dateStr);
      return Instant.ofEpochSecond(seconds).atZone(clock.getZone()).toLocalDate();
    } else if (TIMESTAMP_MILLISECONDS.getValue().equals(format)) {
      long milliseconds = (long) parseDouble(dateStr);
      return Instant.ofEpochMilli(milliseconds).atZone(clock.getZone()).toLocalDate();
    } else {
      DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
      return LocalDate.parse(dateStr, formatter);
    }
  }

  private List<String> parseCurrency(DocumentContext json, int requiredSize, String externalSecurityId,
                                     HistoricalSecurityPriceDataSource dataSource) {
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

  private boolean acceptDate(LocalDate localDate, HistoricalSecurityPriceDataSource dataSource) {
    Set<HistoricalSecurityPriceMarketCloseTime> marketCloseTimes = dataSource.getMarketCloseTimes();
    ZonedDateTime now = ZonedDateTime.now(clock);
    LocalDate today = now.toLocalDate();

    if (marketCloseTimes.isEmpty()) {
      return localDate.isBefore(today);
    }

    if (localDate.isAfter(now.toLocalDate())) {
      return false;
    }

    if (localDate.isBefore(today)) {
      return true;
    }

    ZoneId marketZone;
    ZonedDateTime marketCloseToday;
    for (HistoricalSecurityPriceMarketCloseTime marketCloseTime : marketCloseTimes) {
      marketZone = ZoneId.of(marketCloseTime.getTimeZone());
      marketCloseToday = ZonedDateTime.of(today, LocalTime.parse(marketCloseTime.getTime()), marketZone);
      if (now.isBefore(marketCloseToday)) {
        return false;
      }
    }
    return true;
  }

  private void convertLatestPrices(Map<Long, HistoricalSecurityPrice> latestPriceBySecurityId, List<HistoricalSecurityPrice> prices,
                                   String sourceCurrency, String currency) {
    List<CurrencyConversionRequest> conversionRequests = prices.stream()
        .map(price -> new CurrencyConversionRequest(price.getPrice(), price.getDate()))
        .toList();
    List<BigDecimal> converted = exchangeRateService.convertBestEffort(conversionRequests, sourceCurrency, currency);
    for (int i = 0; i < prices.size(); i++) {
      BigDecimal price = converted.get(i);
      if (price == null) {
        latestPriceBySecurityId.remove(prices.get(i).getSecurityId());
      } else {
        prices.get(i).setPrice(price);
        prices.get(i).setCurrency(currency);
      }
    }
  }
}
