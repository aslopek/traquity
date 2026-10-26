package de.as.traquity.common.util;

/**
 * Which spelling of the {@code #id} template function a data source uses, across every URL pattern and header value it
 * carries.
 */
public enum SecurityIdKeying {

  /**
   * Every {@code #id} template is {@code #id()}, replaced with a configuration's stored identifier.
   */
  STORED_ID,

  /**
   * Every {@code #id} template is {@code #id(isin)}, replaced with the security's ISIN.
   */
  ISIN,

  /**
   * No single spelling applies to every {@code #id} template, or there is no {@code #id} template at all.
   */
  INVALID
}
