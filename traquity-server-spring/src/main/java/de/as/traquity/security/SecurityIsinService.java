package de.as.traquity.security;

import de.as.traquity.common.error.NotFoundException;

public interface SecurityIsinService {

  /**
   * Returns the ISIN a security's master data currently carries.
   */
  String getIsin(long securityId) throws NotFoundException;
}
