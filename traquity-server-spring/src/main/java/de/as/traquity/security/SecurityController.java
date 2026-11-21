package de.as.traquity.security;

import static de.as.traquity.common.pagination.PaginationUtils.getPageNumber;
import static de.as.traquity.common.pagination.PaginationUtils.getPageSize;

import de.as.traquity.common.pagination.PageContainer;
import de.as.traquity.security.api.controller.SecurityApiDelegate;
import de.as.traquity.security.api.model.PaginatedSecurityReadDto;
import de.as.traquity.security.api.model.PriceMetaInfoDto;
import de.as.traquity.security.api.model.SecurityCreateDto;
import de.as.traquity.security.api.model.SecurityOrderPropertyDto;
import de.as.traquity.security.api.model.SecurityReadDto;
import de.as.traquity.security.api.model.SecurityUpdateDto;
import de.as.traquity.security.api.model.SortOrderDto;
import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
class SecurityController implements SecurityApiDelegate {

  private static final String SECURITY_URI_PATTERN = "/securities/%d";
  private static final String SECURITY_LOGO_URI_PATTERN = "/securities/%d/logo";

  private final SecurityMapper securityMapper;
  private final SecurityService securityService;

  @Override
  public ResponseEntity<SecurityReadDto> createSecurity(SecurityCreateDto securityCreateDto) {
    Security security = securityMapper.fromCreateDto(securityCreateDto);
    security = securityService.createSecurity(security);
    SecurityReadDto responseBody = securityMapper.toDto(security);
    URI locationHeader = URI.create(String.format(SECURITY_URI_PATTERN, security.getId()));
    return ResponseEntity.created(locationHeader).body(responseBody);
  }

  @Override
  public ResponseEntity<Void> deleteSecurity(Long id) {
    securityService.deleteSecurity(id);
    return ResponseEntity.noContent().build();
  }

  @Override
  public ResponseEntity<BigDecimal> getCagr(Long id, LocalDate startDate, LocalDate endDate) {
    BigDecimal cagr = securityService.getCagr(id, startDate, endDate);
    return ResponseEntity.ok(cagr);
  }

  @Override
  public ResponseEntity<PaginatedSecurityReadDto> getSecurities(Integer page, Integer pageSize, SortOrderDto order,
                                                                String search, SecurityOrderPropertyDto orderBy, String currency) {
    PageContainer<Security> securities =
        securityService.getSecurities(getPageNumber(page), getPageSize(pageSize), search, orderBy, order, currency);
    PaginatedSecurityReadDto responseBody = securityMapper.toPageDto(securities);
    for (SecurityReadDto security : responseBody.getItems()) {
      if (securityService.hasLogo(security.getId())) {
        security.getLinks().setLogo(String.format(SECURITY_LOGO_URI_PATTERN, security.getId()));
      }
    }
    return ResponseEntity.ok(responseBody);
  }

  @Override
  public ResponseEntity<SecurityReadDto> getSecurity(Long id, String currency) {
    Security security = securityService.getSecurity(id, currency);
    SecurityReadDto responseBody = securityMapper.toDto(security);
    if (securityService.hasLogo(id)) {
      responseBody.getLinks().setLogo(String.format(SECURITY_LOGO_URI_PATTERN, id));
    }
    return ResponseEntity.ok(responseBody);
  }

  @Override
  public ResponseEntity<SecurityReadDto> updateSecurity(Long id, SecurityUpdateDto securityUpdateDto, String currency) {
    Security security = securityMapper.fromUpdateDto(securityUpdateDto);
    security.setId(id);
    security = securityService.updateSecurity(security);

    // looking up the price information must not hide an otherwise successful update behind a non-200 status code
    try {
      PriceMetaInfoDto info = securityService.getPriceMetaInfo(id, currency);
      security.setPriceMetaInfo(info);
    } catch (RuntimeException e) {
      log.warn(e.getMessage(), e);
    }
    SecurityReadDto responseBody = securityMapper.toDto(security);
    return ResponseEntity.ok(responseBody);
  }
}
