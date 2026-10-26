package de.as.traquity.common.util;

import java.util.Collection;

public interface ValueFormatService {

  /**
   * Replaces every template function in {@code value}, substituting {@code id} for every {@code #id} template.
   *
   * @param value the template string to replace functions in
   * @param id the value substituted for every {@code #id} template
   * @return the formatted value
   */
  FormattedValue formatValue(String value, String id);

  /**
   * Classifies which variant of the {@code #id} template function a data source uses, across every URL pattern and
   * header value it carries. Every URL pattern must carry at least one {@code #id} template; a header value does not
   * have to have any.
   *
   * @param urlPatterns the data source's URL patterns
   * @param headerValues the data source's header values
   * @return the keying classification
   */
  SecurityIdKeying keyingOf(Collection<String> urlPatterns, Collection<String> headerValues);
}
