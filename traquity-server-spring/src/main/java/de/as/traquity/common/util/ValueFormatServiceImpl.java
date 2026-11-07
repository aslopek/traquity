package de.as.traquity.common.util;

import static de.as.traquity.common.util.SecurityIdKeying.INVALID;
import static de.as.traquity.common.util.SecurityIdKeying.ISIN;
import static de.as.traquity.common.util.SecurityIdKeying.STORED_ID;
import static java.nio.charset.StandardCharsets.UTF_8;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class ValueFormatServiceImpl implements ValueFormatService {

  private static final Pattern FUNCTION_PATTERN = Pattern.compile("#(uuid|date|rng|base64|mask|id)\\(([^()]*)\\)");
  private static final Pattern ID_TEMPLATE_PATTERN = Pattern.compile("#id\\(([^()]*)\\)");
  private final Clock clock;
  private final Random rng = new SecureRandom();

  @Override
  public FormattedValue formatValue(String value, String id) {
    if (value == null) {
      return new FormattedValue("", Collections.emptySet());
    }

    Set<String> valuesToMask = new HashSet<>();
    String current = value;
    boolean matchesFound = true;
    Matcher matcher;
    StringBuilder sb;
    String functionName, arguments, replacement;

    while (matchesFound) {
      matcher = FUNCTION_PATTERN.matcher(current);
      sb = new StringBuilder();
      matchesFound = false;

      while (matcher.find()) {
        matchesFound = true;
        functionName = matcher.group(1);
        arguments = matcher.group(2).trim();

        if ("mask".equals(functionName)) {
          valuesToMask.add(arguments);
          replacement = arguments;
        } else {
          replacement = executeFunction(functionName, arguments, id);
        }

        matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
      }
      matcher.appendTail(sb);
      current = sb.toString();
    }

    return new FormattedValue(current, valuesToMask);
  }

  @Override
  public SecurityIdKeying keyingOf(Collection<String> urlPatterns, Collection<String> headerValues) {
    if (urlPatterns == null || urlPatterns.isEmpty()) {
      return INVALID;
    }

    Set<String> arguments = new HashSet<>();
    for (String urlPattern : urlPatterns) {
      List<String> idArguments = idArguments(urlPattern);
      if (idArguments.isEmpty()) {
        return INVALID;
      }
      arguments.addAll(idArguments);
    }

    if (headerValues != null) {
      for (String headerValue : headerValues) {
        arguments.addAll(idArguments(headerValue));
      }
    }

    if (arguments.equals(Set.of(""))) {
      return STORED_ID;
    }
    if (arguments.equals(Set.of("isin"))) {
      return ISIN;
    }
    return INVALID;
  }

  private List<String> idArguments(String value) {
    if (value == null) {
      return List.of();
    }

    List<String> arguments = new ArrayList<>();
    Matcher matcher = ID_TEMPLATE_PATTERN.matcher(value);
    while (matcher.find()) {
      arguments.add(matcher.group(1).trim());
    }
    return arguments;
  }

  private String executeFunction(String name, String args, String id) {
    switch (name) {
      case "id":
        return id != null ? id : "null";

      case "uuid":
        return UUID.randomUUID().toString();

      case "date":
        return executeDateFunction(args);

      case "rng":
        String[] parts = args.split(",");
        int min = Integer.parseInt(parts[0].trim());
        int max = Integer.parseInt(parts[1].trim());
        int randomNum = rng.nextInt((max - min) + 1) + min;
        return String.valueOf(randomNum);

      case "base64":
        return Base64.getEncoder().encodeToString(args.getBytes(UTF_8));

      default:
        return "";
    }
  }

  private String executeDateFunction(String args) {
    final LocalDate today = LocalDate.now(clock);
    if (args.isEmpty()) {
      return today.toString();
    }

    int lastCommaIndex = args.lastIndexOf(',');
    String formatStr;
    int days = 0;

    if (lastCommaIndex != -1) {
      formatStr = args.substring(0, lastCommaIndex).trim();
      String daysStr = args.substring(lastCommaIndex + 1).trim();
      days = Integer.parseInt(daysStr);
    } else {
      formatStr = args.trim();
    }

    DateTimeFormatter formatter = DateTimeFormatter.ofPattern(formatStr);
    return today.minusDays(days).format(formatter);
  }
}
