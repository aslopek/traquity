package de.as.traquity.security;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.InternalServerErrorException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.error.UnprocessableEntityException;
import de.as.traquity.common.pagination.PageContainer;
import de.as.traquity.security.api.model.PriceMetaInfoDto;
import de.as.traquity.security.api.model.SecurityOrderPropertyDto;
import de.as.traquity.security.api.model.SortOrderDto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import org.springframework.core.io.Resource;

public interface SecurityService {

  Security createSecurity(Security security)
      throws BadRequestException, ConflictException, InternalServerErrorException;

  void deleteSecurity(Long securityId) throws ConflictException, NotFoundException;

  Map<Long, String> getNamesById();

  Map<Long, String> getNamesById(Set<Long> securityIds);

  /**
   * @param page     the page to return, starting at 0
   * @param perPage  the number of securities per page
   * @param search   matched against name, sector and symbols, {@code null} or blank for all securities
   * @param orderBy  the property to order by, {@code null} for no order
   * @param order    the direction of {@code orderBy}, {@code null} for ascending
   * @param currency the currency of every security's price meta information as {@link #getPriceMetaInfo} gives it
   * @return the page of securities, each with its price meta information
   * @throws BadRequestException when {@code currency} is given and not a supported currency
   */
  PageContainer<Security> getSecurities(int page, int perPage, String search, SecurityOrderPropertyDto orderBy, SortOrderDto order,
                                        String currency) throws BadRequestException;

  boolean securityExists(long securityId);

  boolean securitiesExist(Set<Long> securityIds);

  /**
   * @param securityId the security to return
   * @param currency   the currency of the security's price meta information as {@link #getPriceMetaInfo} gives it
   * @return the security with its price meta information
   * @throws BadRequestException when {@code currency} is given and not a supported currency
   * @throws NotFoundException   when no security has the ID {@code securityId}
   */
  Security getSecurity(Long securityId, String currency) throws BadRequestException, NotFoundException;

  /**
   * Gives the price meta information of a security, in {@code currency} or, if {@code null}, in the currency of the security's latest
   * stored price. A price not stored in that currency counts at the exchange rate of its own date or the closest earlier date that has
   * one, and is left out where there is none.
   *
   * @param securityId the security to look up
   * @param currency   the currency of the price meta information, {@code null} for the currency of the latest stored price
   * @return the price meta information; without high and low where no price of the trailing twelve months counts; {@code null} where
   *     no price counts or {@code currency} is not a supported currency
   */
  PriceMetaInfoDto getPriceMetaInfo(long securityId, String currency);

  Security updateSecurity(Security security)
      throws BadRequestException, ConflictException, NotFoundException, InternalServerErrorException;

  boolean hasLogo(Long securityId);

  Resource getLogo(Long securityId) throws NotFoundException;

  void setLogo(Long securityId, Resource logo) throws BadRequestException, NotFoundException;

  void deleteLogo(Long securityId);

  BigDecimal getCagr(long securityId, LocalDate startDate, LocalDate endDate) throws BadRequestException, NotFoundException,
      UnprocessableEntityException;
}
