package de.as.traquity.common.startup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Optional;
import org.apache.commons.logging.Log;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;

class StdinPasswordEnvironmentPostProcessorTest {

  private static final String MARKER = "TQ_DB_FILE_PASSWORD_STDIN";
  private static final String PROPERTY = "TQ_DB_FILE_PASSWORD";
  private static final String STDIN_SOURCE_NAME = "traquityStdinPassword";

  private Log log;
  private StdinChannel channel;
  private ConfigurableEnvironment environment;
  private MutablePropertySources sources;
  private SpringApplication application;
  private ArgumentCaptor<PropertySource<?>> contribution;
  private StdinPasswordEnvironmentPostProcessor subject;

  @BeforeEach
  void beforeEach() {
    log = mock(Log.class);
    channel = mock(StdinChannel.class);
    environment = mock(ConfigurableEnvironment.class);
    sources = mock(MutablePropertySources.class);
    application = mock(SpringApplication.class);
    contribution = ArgumentCaptor.captor();

    when(environment.getProperty(MARKER)).thenReturn("true");
    when(environment.getPropertySources()).thenReturn(sources);
    when(channel.readPassword(log)).thenReturn(Optional.of("hunter2"));

    subject = new StdinPasswordEnvironmentPostProcessor(log, channel);
  }

  @Test
  void postProcessEnvironment_ok() {
    subject.postProcessEnvironment(environment, application);

    verify(sources).addFirst(contribution.capture());
    assertThat(contribution.getValue())
        .extracting(PropertySource::getName, PropertySource::getSource)
        .containsExactly(STDIN_SOURCE_NAME, Map.of(PROPERTY, "hunter2"));
  }

  @Test
  void postProcessEnvironment_addsThePropertySourceFirstAndNowhereElse() {
    subject.postProcessEnvironment(environment, application);

    verify(sources).addFirst(any());
    verifyNoMoreInteractions(sources);
  }

  @Test
  void postProcessEnvironment_logsNothing() {
    subject.postProcessEnvironment(environment, application);

    verifyNoInteractions(log);
  }

  @Test
  void postProcessEnvironment_emptyPasswordLine_ok() {
    when(channel.readPassword(log)).thenReturn(Optional.of(""));

    subject.postProcessEnvironment(environment, application);

    verify(sources).addFirst(contribution.capture());
    assertThat(contribution.getValue())
        .extracting(PropertySource::getName, PropertySource::getSource)
        .containsExactly(STDIN_SOURCE_NAME, Map.of(PROPERTY, ""));
  }

  @Test
  void postProcessEnvironment_noPasswordLine_contributesNothing() {
    when(channel.readPassword(log)).thenReturn(Optional.empty());

    subject.postProcessEnvironment(environment, application);

    verifyNoInteractions(sources);
  }

  @Test
  void postProcessEnvironment_noMarker_doesNotTouchStdin() {
    when(environment.getProperty(MARKER)).thenReturn(null);

    subject.postProcessEnvironment(environment, application);

    verifyNoInteractions(channel, sources);
  }

  @Test
  void postProcessEnvironment_blankMarker_doesNotTouchStdin() {
    when(environment.getProperty(MARKER)).thenReturn("");

    subject.postProcessEnvironment(environment, application);

    verifyNoInteractions(channel, sources);
  }
}
