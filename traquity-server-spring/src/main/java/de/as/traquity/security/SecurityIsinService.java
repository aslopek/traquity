package de.as.traquity.security;

import de.as.traquity.common.error.NotFoundException;

public interface SecurityIsinService {

  /**
   * @param securityId identifies a single security
   * @return the ISIN belonging to
   * @throws NotFoundException if no security matching {@code securityId} exists
   */
  String getIsin(long securityId) throws NotFoundException;
}
