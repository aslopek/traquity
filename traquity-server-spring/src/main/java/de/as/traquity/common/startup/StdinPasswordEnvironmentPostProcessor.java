package de.as.traquity.common.startup;

import static lombok.AccessLevel.PACKAGE;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.apache.commons.logging.Log;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.logging.DeferredLogFactory;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

/**
 * <p>
 * Contributes the database password handed over as the first line of stdin as the {@code TQ_DB_FILE_PASSWORD}
 * property, ahead of the system environment, whenever the packaged Electron spawn set the
 * {@code TQ_DB_FILE_PASSWORD_STDIN} marker. Without that marker - every standalone dev start - this is a no-op and
 * {@code System.in} is never touched.
 * </p>
 *
 * <p>
 * Registered via {@code META-INF/spring.factories}, not {@code META-INF/spring/*.imports}: the latter mechanism
 * exists only for auto-configurations, not for {@link EnvironmentPostProcessor}s.
 * </p>
 */
@RequiredArgsConstructor(access = PACKAGE)
public class StdinPasswordEnvironmentPostProcessor implements EnvironmentPostProcessor {

  private static final String MARKER = "TQ_DB_FILE_PASSWORD_STDIN";
  private static final String PROPERTY = "TQ_DB_FILE_PASSWORD";
  private static final String PROPERTY_SOURCE_NAME = "traquityStdinPassword";

  private final Log log;
  private final StdinChannel channel;

  public StdinPasswordEnvironmentPostProcessor(DeferredLogFactory logFactory) {
    this(logFactory.getLog(StdinPasswordEnvironmentPostProcessor.class), SystemInChannel.channel());
  }

  @Override
  public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
    if (!StringUtils.hasText(environment.getProperty(MARKER))) {
      return;
    }
    channel.readPassword(log).ifPresent(password -> environment.getPropertySources()
        .addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, Map.of(PROPERTY, password))));
  }
}
