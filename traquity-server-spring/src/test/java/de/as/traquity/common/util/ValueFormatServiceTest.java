package de.as.traquity.common.util;

import static de.as.traquity.common.util.SecurityIdKeying.INVALID;
import static de.as.traquity.common.util.SecurityIdKeying.ISIN;
import static de.as.traquity.common.util.SecurityIdKeying.STORED_ID;
import static java.util.Locale.US;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ValueFormatServiceTest {

  private ValueFormatService subject;
  private Locale locale;

  @BeforeEach
  void beforeEach() {
    locale = Locale.getDefault();
    Locale.setDefault(US);
    Clock clock = mock(Clock.class);
    when(clock.instant()).thenReturn(Instant.parse("2024-01-01T16:37:08Z"));
    when(clock.getZone()).thenReturn(ZoneId.of("Europe/Berlin"));
    subject = new ValueFormatServiceImpl(clock);
  }

  @AfterEach
  void afterEach() {
    Locale.setDefault(locale);
  }

  @Test
  void shouldReturnEmptyFormattedValue_whenInputIsNull() {
    FormattedValue result = subject.formatValue(null, null);
    assertThat(result.getFormattedValue()).isEmpty();
    assertThat(result.toString()).isEmpty();
  }

  @Test
  void shouldReturnUnchangedString_whenNoFunctionsPresent() {
    String input = "Hello World 123";
    FormattedValue result = subject.formatValue(input, null);
    assertThat(result.getFormattedValue()).isEqualTo(input);
    assertThat(result.toString()).isEqualTo(input);
  }

  @Test
  void shouldReplaceUuidFunction_withValidUuid() {
    String input = "id:#uuid()";
    FormattedValue result = subject.formatValue(input, null);
    String uuidStr = result.getFormattedValue().substring(3);
    assertThat(UUID.fromString(uuidStr)).isNotNull();
    assertThat(result.toString()).isEqualTo(result.getFormattedValue());
  }

  @Test
  void shouldReplaceRngFunction_withinBounds() {
    String input = "#rng(10,15)";
    FormattedValue result = subject.formatValue(input, null);
    int value = Integer.parseInt(result.getFormattedValue());
    assertThat(value).isBetween(10, 15);
    assertThat(result.toString()).isEqualTo("" + value);
  }

  @Test
  void shouldReplaceBase64Function() {
    String input = "#base64(hello)";
    FormattedValue result = subject.formatValue(input, null);
    assertThat(result.getFormattedValue()).isEqualTo("aGVsbG8=");
    assertThat(result.toString()).isEqualTo("aGVsbG8=");
  }

  @Test
  void shouldReplaceDateFunction_withDifferentArguments() {
    FormattedValue value = subject.formatValue("#date()", null);
    assertThat(value.getFormattedValue()).isEqualTo("2024-01-01");
    assertThat(value.toString()).isEqualTo("2024-01-01");

    value = subject.formatValue("#date(yyyy/MM/dd, 10)", null);
    assertThat(value.getFormattedValue()).isEqualTo("2023/12/22");
    assertThat(value.toString()).isEqualTo("2023/12/22");

    value = subject.formatValue("#date(dd.MM.yyyy, E, 1)", null);
    assertThat(value.getFormattedValue()).isEqualTo("31.12.2023, Sun");
    assertThat(value.toString()).isEqualTo("31.12.2023, Sun");
  }

  @Test
  void shouldHandleNestedMaskAndBase64Functions() {
    String input = "abc#mask(#base64(user:pw))def";
    FormattedValue result = subject.formatValue(input, null);
    assertThat(result.getFormattedValue()).isEqualTo("abcdXNlcjpwdw==def");
    assertThat(result.toString()).isEqualTo("abc*****def");
  }

  @Test
  void shouldReplaceIdFunction_whenIdIsProvided() {
    String input = "user_#id()";
    String id = "12345";
    FormattedValue result = subject.formatValue(input, id);
    assertThat(result.getFormattedValue()).isEqualTo("user_12345");
    assertThat(result.toString()).isEqualTo("user_12345");
  }

  @Test
  void shouldReplaceIdFunctionWithNullString_whenIdIsNull() {
    String input = "id:#id()";
    FormattedValue result = subject.formatValue(input, null);
    assertThat(result.getFormattedValue()).isEqualTo("id:null");
    assertThat(result.toString()).isEqualTo("id:null");
  }

  @Test
  void shouldCollectMaskedValues_andLeaveValueInStringUnchanged() {
    String input = "secret_password_is_#mask(secret123)";
    FormattedValue result = subject.formatValue(input, null);
    assertThat(result.getFormattedValue()).isEqualTo("secret_password_is_secret123");
    assertThat(result.toString()).isEqualTo("secret_password_is_*****");
  }

  @Test
  void shouldCollectMultipleMaskedValues() {
    String input = "#mask(admin) / #mask(password)";
    FormattedValue result = subject.formatValue(input, null);
    assertThat(result.getFormattedValue()).isEqualTo("admin / password");
    assertThat(result.toString()).isEqualTo("***** / *****");
  }

  @Test
  void shouldCombineIdAndMaskFunctions() {
    String input = "session_#id()_#mask(confidential)";
    String id = "abc";
    FormattedValue result = subject.formatValue(input, id);
    assertThat(result.getFormattedValue()).isEqualTo("session_abc_confidential");
    assertThat(result.toString()).isEqualTo("session_abc_*****");
  }

  @Test
  void shouldClassifyAsStoredId_whenEveryIdTemplateIsEmpty() {
    List<String> urlPatterns = List.of("https://api/v1/#id()/data", "https://api/v1/#id()/other");
    List<String> headerValues = List.of("Bearer #id()");
    assertThat(subject.keyingOf(urlPatterns, headerValues)).isEqualTo(STORED_ID);
  }

  @Test
  void shouldClassifyAsIsin_whenEveryIdTemplateIsIsin() {
    List<String> urlPatterns = List.of("https://api/v1/#id(isin)/data", "https://api/v1/#id(isin)/other");
    List<String> headerValues = List.of("Bearer #id(isin)");
    assertThat(subject.keyingOf(urlPatterns, headerValues)).isEqualTo(ISIN);
  }

  @Test
  void shouldClassifyAsInvalid_whenUrlPatternsAreNull() {
    assertThat(subject.keyingOf(null, null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyAsInvalid_whenUrlPatternsAreEmpty() {
    assertThat(subject.keyingOf(List.of(), null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyAsInvalid_whenAUrlPatternIsNull() {
    List<String> urlPatterns = Arrays.asList("https://api/v1/#id()/data", null);
    assertThat(subject.keyingOf(urlPatterns, null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyAsInvalid_whenAUrlHasNoIdTemplate() {
    assertThat(subject.keyingOf(List.of("https://api/v1/data"), null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyAsInvalid_whenBothSpellingsAppearAcrossTwoUrls() {
    List<String> urlPatterns = List.of("https://api/v1/#id()/data", "https://api/v1/#id(isin)/data");
    assertThat(subject.keyingOf(urlPatterns, null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyAsInvalid_whenBothSpellingsAppearInOneUrl() {
    assertThat(subject.keyingOf(List.of("https://api/v1/#id()/#id(isin)/data"), null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyAsInvalid_whenAnArgumentIsNeitherEmptyNorIsin() {
    assertThat(subject.keyingOf(List.of("https://api/v1/#id(wkn)/data"), null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyAsInvalid_whenIsinArgumentIsNotLowerCase() {
    assertThat(subject.keyingOf(List.of("https://api/v1/#id(ISIN)/data"), null)).isEqualTo(INVALID);
  }

  @Test
  void shouldClassifyUnaffectedByAHeaderValueWithNoIdTemplate() {
    List<String> urlPatterns = List.of("https://api/v1/#id()/data");
    List<String> headerValues = List.of("application/json");
    assertThat(subject.keyingOf(urlPatterns, headerValues)).isEqualTo(STORED_ID);
  }

  @Test
  void shouldClassifyAsInvalid_whenAHeaderValueDisagreesWithTheUrls() {
    List<String> urlPatterns = List.of("https://api/v1/#id()/data");
    List<String> headerValues = List.of("#id(isin)");
    assertThat(subject.keyingOf(urlPatterns, headerValues)).isEqualTo(INVALID);
  }
}
