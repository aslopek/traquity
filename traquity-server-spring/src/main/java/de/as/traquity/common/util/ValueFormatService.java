package de.as.traquity.common.util;

import java.util.Collection;

public interface ValueFormatService {

  /**
   * Replaces every template function in {@code value}, substituting {@code id} for every {@code #id} template, whatever
   * argument it carries.
   */
  FormattedValue formatValue(String value, String id);

  /**
   * Classifies which spelling of the {@code #id} template function a data source uses, across every URL pattern and
   * header value it carries. Every URL pattern must carry at least one {@code #id} template; a header value need not
   * carry any. Arguments are trimmed exactly as {@link #formatValue} trims them, and {@code isin} is case-sensitive.
   */
  SecurityIdKeying keyingOf(Collection<String> urlPatterns, Collection<String> headerValues);
}
