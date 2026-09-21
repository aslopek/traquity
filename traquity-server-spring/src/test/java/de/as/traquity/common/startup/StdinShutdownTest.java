package de.as.traquity.common.startup;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.concurrent.CompletableFuture;
import java.util.function.IntConsumer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

class StdinShutdownTest {

  private static final String MARKER = "TQ_DB_FILE_PASSWORD_STDIN";

  private StdinChannel channel;
  private Environment environment;
  private IntConsumer exitProcess;
  private ApplicationReadyEvent event;
  private ConfigurableApplicationContext context;
  private CompletableFuture<Void> endOfInput;
  private StdinShutdown subject;

  @BeforeEach
  void beforeEach() {
    channel = mock(StdinChannel.class);
    environment = mock(Environment.class);
    exitProcess = mock(IntConsumer.class);
    event = mock(ApplicationReadyEvent.class);
    context = mock(ConfigurableApplicationContext.class);
    endOfInput = new CompletableFuture<>();

    when(environment.getProperty(MARKER)).thenReturn("true");
    when(channel.endOfInput()).thenReturn(endOfInput);
    when(event.getApplicationContext()).thenReturn(context);

    subject = new StdinShutdown(channel, environment, exitProcess);
  }

  @Test
  void onApplicationEvent_stdinEnds_closesTheContextAndShutsDown() {
    subject.onApplicationEvent(event);

    endOfInput.complete(null);

    InOrder order = inOrder(context, exitProcess);
    order.verify(context).close();
    order.verify(exitProcess).accept(0);
  }

  @Test
  void onApplicationEvent_stdinStaysOpen_doesNothing() {
    subject.onApplicationEvent(event);

    verifyNoInteractions(context, exitProcess);
  }

  @Test
  void onApplicationEvent_noMarker_doesNotTouchStdin() {
    when(environment.getProperty(MARKER)).thenReturn(null);

    subject.onApplicationEvent(event);

    verifyNoInteractions(channel, context, exitProcess);
  }

  @Test
  void onApplicationEvent_blankMarker_doesNotShutDown() {
    when(environment.getProperty(MARKER)).thenReturn(" ");

    subject.onApplicationEvent(event);

    verifyNoInteractions(channel, context, exitProcess);
  }

  @Test
  void onApplicationEvent_stdinAlreadyEnded_closesTheContextAndShutsDown() {
    endOfInput.complete(null);

    subject.onApplicationEvent(event);

    InOrder order = inOrder(context, exitProcess);
    order.verify(context).close();
    order.verify(exitProcess).accept(0);
  }
}
