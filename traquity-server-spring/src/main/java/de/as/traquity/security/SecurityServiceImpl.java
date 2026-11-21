package de.as.traquity.security;

import static de.as.traquity.common.arithmetic.MathFunctions.cagr;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.InternalServerErrorException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.error.UnprocessableEntityException;
import de.as.traquity.common.image.ImageService;
import de.as.traquity.common.pagination.PageContainer;
import de.as.traquity.configuration.ServerConfigurationService;
import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import de.as.traquity.price.security.historical.HistoricalSecurityPriceService;
import de.as.traquity.price.security.historical.HistoricalSecurityPriceSummary;
import de.as.traquity.security.api.model.PriceMetaInfoDto;
import de.as.traquity.security.api.model.SecurityOrderPropertyDto;
import de.as.traquity.security.api.model.SortOrderDto;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
class SecurityServiceImpl implements SecurityService {

  private final Clock clock;
  private final SecurityMapper securityMapper;
  private final SecurityRepository securityRepository;
  private final SecurityLogoRepository securityLogoRepository;
  private final HistoricalSecurityPriceService historicalSecurityPriceService;
  private final ServerConfigurationService serverConfigurationService;
  private final ImageService imageService;
  private final MathContext mathContext;

  @Override
  public Security createSecurity(Security security)
      throws BadRequestException, ConflictException, InternalServerErrorException {
    if (security.getId() != null) {
      throw new BadRequestException();
    }

    processSecurity(security);
    SecurityEntity securityEntity = securityMapper.toEntity(security);
    securityEntity.setVersion(null);
    securityEntity = persist(securityEntity);
    return securityMapper.fromEntity(securityEntity);
  }

  @Override
  @Transactional
  public void deleteSecurity(Long securityId) throws ConflictException, NotFoundException {
    SecurityEntity entity = securityRepository.findById(securityId).orElseThrow(NotFoundException::new);
    try {
      securityRepository.delete(entity);
      securityRepository.flush();
    } catch (ObjectOptimisticLockingFailureException e) {
      throw new ConflictException();
    }
  }

  @Override
  public Map<Long, String> getNamesById() {
    List<SecurityEntity> securities = securityRepository.findAll();
    Map<Long, String> namesById = new HashMap<>(securities.size());
    for (SecurityEntity security : securities) {
      namesById.put(security.getId(), security.getName());
    }
    return namesById;
  }

  @Override
  public Map<Long, String> getNamesById(Set<Long> securityIds) {
    List<SecurityEntity> securities = securityRepository.findAllById(securityIds);
    Map<Long, String> namesById = new HashMap<>(securities.size());
    for (SecurityEntity security : securities) {
      namesById.put(security.getId(), security.getName());
    }
    return namesById;
  }

  @Override
  public PageContainer<Security> getSecurities(int page, int pageSize, String search, SecurityOrderPropertyDto orderBy,
                                               SortOrderDto order, String currency) throws BadRequestException {
    requireSupportedOrAbsent(currency);
    final PageRequest pageRequest;
    if (orderBy != null) {
      Sort.Direction direction = SortOrderDto.DESC.equals(order) ? Sort.Direction.DESC : Sort.Direction.ASC;
      String propertyName = SecurityOrderPropertyDto.NAME.equals(orderBy) ? "name" : "sector";
      pageRequest = PageRequest.of(page, pageSize, direction, propertyName);
    } else {
      pageRequest = PageRequest.of(page, pageSize);
    }

    final Page<SecurityEntity> securities;
    if (search != null && !search.isBlank()) {
      securities =
          securityRepository.findAllByNameContainingIgnoreCaseOrSectorContainingIgnoreCaseOrSymbolsContainingIgnoreCase(
              search, search, search, pageRequest);
    } else {
      securities = securityRepository.findAll(pageRequest);
    }
    PageContainer<Security> result = new PageContainer<>();
    result.setTotal(securities.getTotalElements());
    result.setCurrentPage(page);
    // an empty result has no pages at all, so the last page stays 0 rather than underflowing to -1
    result.setLastPage(Math.max(0, securities.getTotalPages() - 1));
    result.setPageSize(pageSize);
    result.setItems(securities.stream().map(securityMapper::fromEntity).toList());
    Map<Long, PriceMetaInfoDto> priceMetaInfos = computePriceMetaInfos(result.getItems().stream().map(Security::getId).toList(), currency);
    result.getItems().forEach(security -> security.setPriceMetaInfo(priceMetaInfos.get(security.getId())));
    return result;
  }

  @Override
  public boolean securityExists(long securityId) {
    return securityRepository.existsById(securityId);
  }

  @Override
  public boolean securitiesExist(Set<Long> securityIds) {
    return securityRepository.countByIdIn(securityIds) == securityIds.size();
  }

  @Override
  public Security getSecurity(Long securityId, String currency) throws BadRequestException, NotFoundException {
    requireSupportedOrAbsent(currency);
    SecurityEntity fromDatabase = securityRepository.findById(securityId).orElseThrow(NotFoundException::new);
    Security security = securityMapper.fromEntity(fromDatabase);
    security.setPriceMetaInfo(computePriceMetaInfos(List.of(securityId), currency).get(securityId));
    return security;
  }

  @Override
  public PriceMetaInfoDto getPriceMetaInfo(long securityId, String currency) {
    return isSupportedOrAbsent(currency) ? computePriceMetaInfos(List.of(securityId), currency).get(securityId) : null;
  }

  @Override
  @Transactional
  public Security updateSecurity(Security security)
      throws BadRequestException, ConflictException, NotFoundException, InternalServerErrorException {
    SecurityEntity existing = securityRepository.findById(security.getId()).orElseThrow(NotFoundException::new);
    if (!existing.getVersion().equals(security.getVersion())) {
      throw new ConflictException();
    }
    processSecurity(security);
    SecurityEntity securityEntity = securityMapper.toEntity(security);
    securityEntity.setId(security.getId());
    securityEntity = persist(securityEntity);
    return securityMapper.fromEntity(securityEntity);
  }

  @Override
  public boolean hasLogo(Long securityId) {
    return securityLogoRepository.existsById(securityId);
  }

  @Override
  public Resource getLogo(Long securityId) throws NotFoundException {
    Optional<SecurityLogoEntity> optionalLogo = securityLogoRepository.findById(securityId);
    if (optionalLogo.isEmpty()) {
      throw new NotFoundException();
    }
    return new ByteArrayResource(optionalLogo.get().getLogo());
  }

  @Override
  public void setLogo(Long securityId, Resource logo) throws BadRequestException, NotFoundException {
    if (!securityRepository.existsById(securityId)) {
      throw new NotFoundException();
    }

    byte[] pngBytes;

    try {
      pngBytes = logo.getInputStream().readAllBytes();
    } catch (IOException e) {
      throw new BadRequestException();
    }

    if (!imageService.isPng(pngBytes)) {
      throw new BadRequestException();
    }

    pngBytes = imageService.scaleImage(pngBytes);
    SecurityLogoEntity logoEntity = securityLogoRepository.findById(securityId).orElseGet(SecurityLogoEntity::new);
    logoEntity.setId(securityId);
    logoEntity.setLogo(pngBytes);
    securityLogoRepository.saveAndFlush(logoEntity);
  }

  @Override
  public void deleteLogo(Long securityId) {
    try {
      securityLogoRepository.deleteById(securityId);
    } catch (EmptyResultDataAccessException e) {
      // ignore
    }
  }

  @Override
  public BigDecimal getCagr(long securityId, LocalDate startDate, LocalDate endDate) throws BadRequestException, NotFoundException,
      UnprocessableEntityException {
    if (startDate == null) {
      throw new BadRequestException();
    } else if (endDate != null && (endDate.isBefore(startDate) || endDate.isEqual(startDate))) {
      throw new BadRequestException();
    } else if (!securityRepository.existsById(securityId)) {
      throw new NotFoundException();
    }

    final long toleranceInDays = 7;
    LocalDate firstDay = startDate.minusDays(toleranceInDays); // tolerance: accept prices a little older than the requested minDate
    LocalDate lastDay = endDate == null ? LocalDate.now(clock) : endDate;
    List<HistoricalSecurityPrice> prices = historicalSecurityPriceService.getPrices(securityId, firstDay);

    HistoricalSecurityPrice priceAtStart = findPriceClosestTo(prices, startDate);
    HistoricalSecurityPrice priceAtEnd = findPriceClosestTo(prices, lastDay);

    if (priceAtStart == null || priceAtEnd == null) {
      throw new UnprocessableEntityException();
    }

    long priceAtStartDateDifference = Math.abs(ChronoUnit.DAYS.between(priceAtStart.getDate(), startDate));
    long priceAtEndDateDifference = Math.abs(ChronoUnit.DAYS.between(priceAtEnd.getDate(), lastDay));
    if (priceAtStartDateDifference > toleranceInDays
        || priceAtEndDateDifference > toleranceInDays
        || priceAtStart.getDate().isEqual(priceAtEnd.getDate())) {
      throw new UnprocessableEntityException();
    }

    return cagr(priceAtStart.getPrice(), priceAtStart.getDate(), priceAtEnd.getPrice(), priceAtEnd.getDate(), mathContext);
  }

  private SecurityEntity persist(SecurityEntity security) throws ConflictException, InternalServerErrorException {
    SecurityEntity saved;
    try {
      saved = securityRepository.saveAndFlush(security);
    } catch (ObjectOptimisticLockingFailureException | DataIntegrityViolationException e) {
      throw new ConflictException();
    } catch (Exception e) {
      log.error("{}: {}", e.getClass().getName(), e.getMessage());
      throw new InternalServerErrorException();
    }
    return saved;
  }

  private void processSecurity(Security security) throws BadRequestException {
    if (security.getName() == null || security.getName().isBlank()) {
      throw new BadRequestException();
    }

    security.setName(security.getName().trim());
    security.setSymbols(security.getSymbols().stream().map(String::trim).toList());
    if (security.getSector() != null) {
      if (security.getSector().isBlank()) {
        throw new BadRequestException();
      }
      security.setSector(security.getSector().trim());
    }
  }

  private void requireSupportedOrAbsent(String currency) throws BadRequestException {
    if (!isSupportedOrAbsent(currency)) {
      throw new BadRequestException();
    }
  }

  private boolean isSupportedOrAbsent(String currency) {
    return currency == null || serverConfigurationService.getSupportedCurrencies().contains(currency);
  }

  /**
   * Computes the price meta information the way {@link SecurityService#getPriceMetaInfo} describes it, for a supported or absent
   * {@code currency}.
   *
   * @param securityIds the securities to look up
   * @param currency    the currency of the price meta information, {@code null} for the currency of each security's latest stored price
   * @return the price meta information by security ID; a security where every price is left out has none
   */
  private Map<Long, PriceMetaInfoDto> computePriceMetaInfos(List<Long> securityIds, String currency) {
    Map<Long, HistoricalSecurityPriceSummary> summaries;
    try {
      summaries = historicalSecurityPriceService.getPriceSummaries(securityIds, currency, LocalDate.now(clock).minusYears(1));
    } catch (RuntimeException e) {
      return Map.of();
    }

    Map<Long, PriceMetaInfoDto> priceMetaInfos = new HashMap<>();
    summaries.forEach((securityId, summary) -> priceMetaInfos.put(securityId, toPriceMetaInfo(summary)));
    return priceMetaInfos;
  }

  private PriceMetaInfoDto toPriceMetaInfo(HistoricalSecurityPriceSummary summary) {
    HistoricalSecurityPrice latestPrice = summary.getLatestPrice();
    HistoricalSecurityPrice oldestPrice = summary.getOldestPrice();
    PriceMetaInfoDto priceMetaInfo = new PriceMetaInfoDto();
    priceMetaInfo.setCurrency(latestPrice.getCurrency());
    priceMetaInfo.setLatestPrice(latestPrice.getPrice());
    priceMetaInfo.setLatestPriceDate(latestPrice.getDate());
    priceMetaInfo.setOldestPrice(oldestPrice.getPrice());
    priceMetaInfo.setOldestPriceDate(oldestPrice.getDate());

    List<HistoricalSecurityPrice> trailingTwelveMonths = summary.getRecentPrices();
    if (!trailingTwelveMonths.isEmpty()) {
      List<BigDecimal> priceValues = new ArrayList<>(trailingTwelveMonths.stream().map(HistoricalSecurityPrice::getPrice).toList());
      priceValues.sort(BigDecimal::compareTo);
      priceMetaInfo.setLowTrailingTwelveMonths(priceValues.getFirst());
      priceMetaInfo.setHighTrailingTwelveMonths(priceValues.getLast());
    }
    return priceMetaInfo;
  }

  private HistoricalSecurityPrice findPriceClosestTo(List<HistoricalSecurityPrice> prices, LocalDate date) {
    if (prices.isEmpty()) {
      return null;
    }

    long currentDelta;
    long previousDelta = Long.MAX_VALUE;
    HistoricalSecurityPrice closestPrice = prices.getFirst();

    for (HistoricalSecurityPrice price : prices) {
      currentDelta = Math.abs(ChronoUnit.DAYS.between(date, price.getDate()));

      if (currentDelta < previousDelta) {
        closestPrice = price;
        previousDelta = currentDelta;
      } else if (currentDelta > previousDelta) {
        break;
      }
    }

    return closestPrice;
  }
}
