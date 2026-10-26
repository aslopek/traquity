package de.as.traquity.notification.dividendannouncement.config;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.util.SecurityIdKeying;
import de.as.traquity.common.util.ValueFormatService;
import de.as.traquity.notification.dividendannouncement.datasource.DividendAnnouncementDataSource;
import de.as.traquity.notification.dividendannouncement.datasource.DividendAnnouncementDataSourceService;
import de.as.traquity.security.SecurityIsinService;
import de.as.traquity.security.SecurityService;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class DividendAnnouncementConfigServiceImpl implements DividendAnnouncementConfigService {

  private final DividendAnnouncementConfigRepository dividendAnnouncementConfigRepository;
  private final DividendAnnouncementConfigMapper dividendAnnouncementConfigMapper;
  private final SecurityService securityService;
  private final SecurityIsinService securityIsinService;
  private final DividendAnnouncementDataSourceService dividendAnnouncementDataSourceService;
  private final ValueFormatService valueFormatService;

  @Override
  public List<DividendAnnouncementConfig> getDividendAnnouncementConfigs() {
    Map<Long, DividendAnnouncementDataSource> dataSourcesById = dividendAnnouncementDataSourceService.getDataSources()
        .stream().collect(Collectors.toMap(DividendAnnouncementDataSource::getId, Function.identity()));

    return dividendAnnouncementConfigRepository.findAllByOrderBySecurityIdAsc().stream()
        .map(dividendAnnouncementConfigMapper::fromEntity)
        .map(config -> withReportedIdentifier(config, keyingOf(dataSourcesById.get(config.getDataSourceId()))))
        .toList();
  }

  @Override
  public DividendAnnouncementConfig getDividendAnnouncementConfig(long securityId) throws NotFoundException {
    DividendAnnouncementConfigEntity entity =
        dividendAnnouncementConfigRepository.findBySecurityId(securityId).orElseThrow(NotFoundException::new);
    DividendAnnouncementConfig config = dividendAnnouncementConfigMapper.fromEntity(entity);
    DividendAnnouncementDataSource dataSource = dividendAnnouncementDataSourceService.getDataSource(config.getDataSourceId());
    return withReportedIdentifier(config, keyingOf(dataSource));
  }

  @Override
  public DividendAnnouncementConfig createDividendAnnouncementConfig(
      DividendAnnouncementConfig dividendAnnouncementConfig)
      throws BadRequestException, ConflictException, NotFoundException {
    SecurityIdKeying keying = validate(dividendAnnouncementConfig);
    DividendAnnouncementConfigEntity entity = dividendAnnouncementConfigMapper.toEntity(dividendAnnouncementConfig);
    entity = persist(entity);
    return withReportedIdentifier(dividendAnnouncementConfigMapper.fromEntity(entity), keying);
  }

  @Override
  @Transactional
  public DividendAnnouncementConfig updateDividendAnnouncementConfig(
      DividendAnnouncementConfig dividendAnnouncementConfig)
      throws BadRequestException, ConflictException, NotFoundException {
    SecurityIdKeying keying = validate(dividendAnnouncementConfig);
    DividendAnnouncementConfigEntity existing = dividendAnnouncementConfigRepository
        .findBySecurityId(dividendAnnouncementConfig.getSecurityId()).orElseThrow(NotFoundException::new);
    if (!existing.getVersion().equals(dividendAnnouncementConfig.getVersion())) {
      throw new ConflictException();
    }
    DividendAnnouncementConfigEntity entity = dividendAnnouncementConfigMapper.toEntity(dividendAnnouncementConfig);
    entity = persist(entity);
    return withReportedIdentifier(dividendAnnouncementConfigMapper.fromEntity(entity), keying);
  }

  @Override
  @Transactional
  public void deleteDividendAnnouncementConfig(long securityId) throws ConflictException, NotFoundException {
    DividendAnnouncementConfigEntity entity =
        dividendAnnouncementConfigRepository.findBySecurityId(securityId).orElseThrow(NotFoundException::new);
    try {
      dividendAnnouncementConfigRepository.delete(entity);
      dividendAnnouncementConfigRepository.flush();
    } catch (ObjectOptimisticLockingFailureException e) {
      throw new ConflictException();
    }
  }

  private DividendAnnouncementConfigEntity persist(DividendAnnouncementConfigEntity entity) throws ConflictException {
    DividendAnnouncementConfigEntity saved;
    try {
      saved = dividendAnnouncementConfigRepository.saveAndFlush(entity);
    } catch (ObjectOptimisticLockingFailureException | DataIntegrityViolationException e) {
      throw new ConflictException();
    }
    return saved;
  }

  private SecurityIdKeying validate(DividendAnnouncementConfig dividendAnnouncementConfig)
      throws BadRequestException, NotFoundException {
    DividendAnnouncementDataSource dataSource;
    try {
      dataSource = dividendAnnouncementDataSourceService.getDataSource(dividendAnnouncementConfig.getDataSourceId());
    } catch (NotFoundException e) {
      throw new BadRequestException();
    }

    SecurityIdKeying keying = keyingOf(dataSource);
    if (keying == SecurityIdKeying.ISIN) {
      dividendAnnouncementConfig.setExternalSecurityId(null);
    } else if (dividendAnnouncementConfig.getExternalSecurityId() == null
        || dividendAnnouncementConfig.getExternalSecurityId().trim().isBlank()) {
      throw new BadRequestException();
    }

    securityService.getSecurity(dividendAnnouncementConfig.getSecurityId());
    return keying;
  }

  private SecurityIdKeying keyingOf(DividendAnnouncementDataSource dataSource) {
    return valueFormatService.keyingOf(List.of(dataSource.getUrlPattern()), dataSource.getRequestHeaders().values());
  }

  private DividendAnnouncementConfig withReportedIdentifier(DividendAnnouncementConfig config, SecurityIdKeying keying) {
    if (keying == SecurityIdKeying.ISIN) {
      config.setExternalSecurityId(securityIsinService.getIsin(config.getSecurityId()));
    }
    return config;
  }
}
