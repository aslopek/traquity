package de.as.traquity.notification.dividendannouncement.datasource;

import com.jayway.jsonpath.InvalidPathException;
import com.jayway.jsonpath.JsonPath;
import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.util.SecurityIdKeying;
import de.as.traquity.common.util.ValueFormatService;
import de.as.traquity.configuration.ServerConfigurationService;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class DividendAnnouncementDataSourceServiceImpl implements DividendAnnouncementDataSourceService {

  private static final long MINIMUM_ID = 101;
  private final DividendAnnouncementDataSourceRepository repository;
  private final DividendAnnouncementDataSourceMapper mapper;
  private final ServerConfigurationService serverConfigurationService;
  private final ValueFormatService valueFormatService;

  @Override
  @Transactional
  public DividendAnnouncementDataSource createDataSource(DividendAnnouncementDataSource dataSource)
      throws BadRequestException, ConflictException {
    validate(dataSource);
    if (dataSource.getId() != null) {
      throw new BadRequestException();
    }

    DividendAnnouncementDataSourceEntity entity = mapper.toEntity(dataSource);
    entity = persist(entity);
    return mapper.fromEntity(entity);
  }

  @Override
  @Transactional
  public DividendAnnouncementDataSource updateDataSource(DividendAnnouncementDataSource dataSource)
      throws BadRequestException, ConflictException, NotFoundException {
    validate(dataSource);
    if (dataSource.getId() == null) {
      throw new NotFoundException();
    }
    DividendAnnouncementDataSourceEntity existing =
        repository.findById(dataSource.getId()).orElseThrow(NotFoundException::new);
    if (!existing.getVersion().equals(dataSource.getVersion())) {
      throw new ConflictException();
    }
    DividendAnnouncementDataSourceEntity entity = mapper.toEntity(dataSource);
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

    DividendAnnouncementDataSourceEntity entity = repository.findById(id).orElseThrow(NotFoundException::new);
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
  public List<DividendAnnouncementDataSource> getDataSources() {
    return repository.findAll().stream()
        .map(mapper::fromEntity)
        .toList();
  }

  @Override
  public DividendAnnouncementDataSource getDataSource(long id) throws NotFoundException {
    DividendAnnouncementDataSourceEntity entity = repository.findById(id).orElseThrow(NotFoundException::new);
    return mapper.fromEntity(entity);
  }

  private DividendAnnouncementDataSourceEntity persist(DividendAnnouncementDataSourceEntity entity)
      throws ConflictException {
    try {
      return repository.saveAndFlush(entity);
    } catch (ObjectOptimisticLockingFailureException | DataIntegrityViolationException e) {
      throw new ConflictException();
    }
  }

  private void validate(DividendAnnouncementDataSource dataSource) throws BadRequestException {
    boolean nameOk = false;
    if (dataSource.getName() != null) {
      dataSource.setName(dataSource.getName().trim());
      nameOk = !dataSource.getName().isBlank();
    }

    boolean urlPatternOk = dataSource.getUrlPattern() != null
        && valueFormatService.keyingOf(List.of(dataSource.getUrlPattern()), dataSource.getRequestHeaders().values())
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

    boolean regexCurrencyGroupOk = dataSource.getRegexCurrencyGroup() == null
        || (dataSource.getRegexCurrency() != null && dataSource.getRegexCurrencyGroup() > 0);

    if (!nameOk || !urlPatternOk || !jsonPathDateOk || !jsonPathValueOk || !jsonPathCurrencyOk
        || !currencyMappingsOk || !regexCurrencyOk || !regexCurrencyGroupOk) {
      throw new BadRequestException();
    }
  }

  private boolean validateCurrencyMappings(Map<String, DividendAnnouncementCurrencyMapping> currencyMappings) {
    boolean ok;
    for (DividendAnnouncementCurrencyMapping currencyMapping : currencyMappings.values()) {
      ok = serverConfigurationService.getSupportedCurrencies().contains(currencyMapping.getMappedCurrencyCode());
      if (!ok) {
        return false;
      }
    }
    return true;
  }
}
