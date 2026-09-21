package de.as.traquity.common.startup;

import static lombok.AccessLevel.PACKAGE;

import java.util.function.IntConsumer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Closes the application context and exits the JVM with code 0 once stdin reaches EOF, but only when the packaged
 * Electron spawn set the {@code TQ_DB_FILE_PASSWORD_STDIN} marker - without it, this component attaches nothing and
 * touches no stream.
 */
@Slf4j
@Component
@RequiredArgsConstructor(access = PACKAGE)
class StdinShutdown implements ApplicationListener<ApplicationReadyEvent> {

  private static final String MARKER = "TQ_DB_FILE_PASSWORD_STDIN";

  private final StdinChannel channel;
  private final Environment environment;
  private final IntConsumer exitProcess;

  @Autowired
  StdinShutdown(Environment environment) {
    this(SystemInChannel.channel(), environment, System::exit);
  }

  @Override
  public void onApplicationEvent(ApplicationReadyEvent event) {
    if (!StringUtils.hasText(environment.getProperty(MARKER))) {
      return;
    }
    ConfigurableApplicationContext context = event.getApplicationContext();
    channel.endOfInput().thenRun(() -> shutDown(context));
  }

  private void shutDown(ConfigurableApplicationContext context) {
    log.info("stdin reached its end; shutting down");
    context.close();
    exitProcess.accept(0);
  }
}
