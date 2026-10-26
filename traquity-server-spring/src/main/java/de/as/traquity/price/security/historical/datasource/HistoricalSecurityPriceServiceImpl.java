package de.as.traquity.price.security.historical.datasource;

import com.jayway.jsonpath.InvalidPathException;
import com.jayway.jsonpath.JsonPath;
import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.util.SecurityIdKeying;
import de.as.traquity.common.util.ValueFormatService;
import de.as.traquity.configuration.ServerConfigurationService;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class HistoricalSecurityPriceDataSourceServiceImpl implements HistoricalSecurityPriceDataSourceService {

  private static final long MINIMUM_ID = 101;
  private final HistoricalSecurityPriceDataSourceRepository repository;
  private final HistoricalSecurityPriceDataSourceMapper mapper;
  private final ServerConfigurationService serverConfigurationService;
  private final ValueFormatService valueFormatService;

  @Override
  @Transactional
  public HistoricalSecurityPriceDataSource createDataSource(HistoricalSecurityPriceDataSource dataSource)
      throws BadRequestException, ConflictException {
    validate(dataSource);
    if (dataSource.getId() != null) {
      throw new BadRequestException();
    }

    HistoricalSecurityPriceDataSourceEntity entity = mapper.toEntity(dataSource);
    entity = persist(entity);
    return mapper.fromEntity(entity);
  }

  @Override
  @Transactional
  public HistoricalSecurityPriceDataSource updateDataSource(HistoricalSecurityPriceDataSource dataSource)
      throws BadRequestException, ConflictException, NotFoundException {
    validate(dataSource);
    if (dataSource.getId() == null) {
      throw new NotFoundException();
    }
    HistoricalSecurityPriceDataSourceEntity existing =
        repository.findById(dataSource.getId()).orElseThrow(NotFoundException::new);
    if (!existing.getVersion().equals(dataSource.getVersion())) {
      throw new ConflictException();
    }
    HistoricalSecurityPriceDataSourceEntity entity = mapper.toEntity(dataSource);
    entity = persist(entity);
    return mapper.fromEntity(entity);
  }

  @Override
  @Transactional
  public void deleteDataSource(long id) throws BadRequestException, ConflictException, NotFoundException {
    if (id < MINIMUM_ID) {
      // do not allow pre-configured data sources to be deleted
      throw new BadRequestException();
    }

    HistoricalSecurityPriceDataSourceEntity entity = repository.findById(id).orElseThrow(NotFoundException::new);
    try {
      repository.delete(entity);
      repository.flush();
    } catch (ObjectOptimisticLockingFailureException e) {
      throw new ConflictException();
    } catch (DataIntegrityViolationException e) {
      throw new BadRequestException();
    }
  }

  @Override
  @Transactional(readOnly = true)
  public List<HistoricalSecurityPriceDataSource> getDataSources() {
    return repository.findAll().stream()
        .map(mapper::fromEntity)
        .toList();
  }

  @Override
  public HistoricalSecurityPriceDataSource getDataSource(long id) throws NotFoundException {
    HistoricalSecurityPriceDataSourceEntity entity = repository.findById(id).orElseThrow(NotFoundException::new);
    return mapper.fromEntity(entity);
  }

  private HistoricalSecurityPriceDataSourceEntity persist(HistoricalSecurityPriceDataSourceEntity entity)
      throws ConflictException {
    try {
      return repository.saveAndFlush(entity);
    } catch (ObjectOptimisticLockingFailureException | DataIntegrityViolationException e) {
      throw new ConflictException();
    }
  }

  private void validate(HistoricalSecurityPriceDataSource dataSource) throws BadRequestException {
    boolean nameOk = false;
    if (dataSource.getName() != null) {
      dataSource.setName(dataSource.getName().trim());
      nameOk = !dataSource.getName().isBlank();
    }

    boolean urlPatternsOk = dataSource.getUrlPatterns() != null && !dataSource.getUrlPatterns().isEmpty()
        && valueFormatService.keyingOf(dataSource.getUrlPatterns().values(), dataSource.getRequestHeaders().values())
        != SecurityIdKeying.INVALID;

    boolean jsonPathDateOk = true;
    try {
      JsonPath.compile(dataSource.getJsonPathDate());
    } catch (InvalidPathException | IllegalArgumentException e) {
      jsonPathDateOk = false;
    }

    boolean jsonPathValueOk = true;
    try {
      JsonPath.compile(dataSource.getJsonPathValue());
    } catch (InvalidPathException | IllegalArgumentException e) {
      jsonPathValueOk = false;
    }

    boolean jsonPathCurrencyOk = true;
    try {
      if (dataSource.getJsonPathCurrency() != null) {
        JsonPath.compile(dataSource.getJsonPathCurrency());
      }
    } catch (InvalidPathException | IllegalArgumentException e) {
      jsonPathCurrencyOk = false;
    }

    boolean currencyMappingsOk = dataSource.getCurrencyMappings() != null
        && validateCurrencyMappings(dataSource.getCurrencyMappings());

    boolean regexCurrencyOk = dataSource.getRegexCurrency() == null || !dataSource.getRegexCurrency().isBlank();

    boolean marketCloseTimesOk = dataSource.getMarketCloseTimes() != null;
    if (marketCloseTimesOk) {
      Set<String> timeZones = new HashSet<>();
      for (HistoricalSecurityPriceMarketCloseTime t : dataSource.getMarketCloseTimes()) {
        if (t == null || t.getTime() == null || t.getTimeZone() == null) {
          marketCloseTimesOk = false;
          break;
        }
        if (!t.getTime().matches("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$")) {
          marketCloseTimesOk = false;
          break;
        }
        try {
          ZoneId.of(t.getTimeZone());
        } catch (Exception e) {
          marketCloseTimesOk = false;
          break;
        }
        if (timeZones.contains(t.getTimeZone())) {
          marketCloseTimesOk = false;
          break;
        }
        timeZones.add(t.getTimeZone());
      }
    }

    boolean regexCurrencyGroupOk = dataSource.getRegexCurrencyGroup() == null
        || (dataSource.getRegexCurrency() != null && dataSource.getRegexCurrencyGroup() > 0);

    if (!nameOk || !urlPatternsOk || !jsonPathDateOk || !jsonPathValueOk || !jsonPathCurrencyOk
        || !currencyMappingsOk || !regexCurrencyOk || !regexCurrencyGroupOk || !marketCloseTimesOk) {
      throw new BadRequestException();
    }
  }

  private boolean validateCurrencyMappings(Map<String, HistoricalSecurityPriceCurrencyMapping> currencyMappings) {
    boolean ok;
    for (HistoricalSecurityPriceCurrencyMapping currencyMapping : currencyMappings.values()) {
      ok = serverConfigurationService.getSupportedCurrencies().contains(currencyMapping.getMappedCurrencyCode());
      if (!ok) {
        return false;
      }
    }
    return true;
  }
}
