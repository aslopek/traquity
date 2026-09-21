package de.as.traquity.common.startup;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.commons.logging.Log;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class StdinChannelTest {

  private Log log;
  private CountDownLatch blockingLatch;

  @BeforeEach
  void beforeEach() {
    log = mock(Log.class);
    blockingLatch = new CountDownLatch(1);
  }

  @AfterEach
  void afterEach() {
    // releases a reader thread left blocked in a stubbed read, so it cannot outlive the test run
    blockingLatch.countDown();
  }

  @Test
  void readPassword_ok() {
    StdinChannel channel = channelOf(new ByteArrayInputStream("hunter2\n".getBytes(UTF_8)));

    Optional<String> result = channel.readPassword(log);

    assertThat(result).hasValue("hunter2");
    verifyNoInteractions(log);
  }

  @Test
  void readPassword_oneBytePerRead_multiByteCharactersDecoded() throws IOException {
    byte[] bytes = "äöüßé\n".getBytes(UTF_8);
    AtomicInteger position = new AtomicInteger();
    InputStream input = mock(InputStream.class);
    when(input.read(any(byte[].class))).thenAnswer(invocation -> {
      int index = position.getAndIncrement();
      if (index >= bytes.length) {
        return -1;
      }
      invocation.<byte[]>getArgument(0)[0] = bytes[index];
      return 1;
    });

    Optional<String> result = channelOf(input).readPassword(log);

    assertThat(result).hasValue("äöüßé");
  }

  @Test
  void readPassword_noiseAfterTheFirstLine_returnsOnlyTheFirstLine() {
    StdinChannel channel = channelOf(new ByteArrayInputStream("hunter2\nnoise\n".getBytes(UTF_8)));

    Optional<String> result = channel.readPassword(log);

    assertThat(result).hasValue("hunter2");
  }

  @Test
  void readPassword_bareLineFeed_returnsAnEmptyPassword() {
    StdinChannel channel = channelOf(new ByteArrayInputStream("\n".getBytes(UTF_8)));

    Optional<String> result = channel.readPassword(log);

    assertThat(result).hasValue("");
  }

  @Test
  void readPassword_surroundingWhitespace_keptVerbatim() {
    StdinChannel channel = channelOf(new ByteArrayInputStream(" secret \r\n".getBytes(UTF_8)));

    Optional<String> result = channel.readPassword(log);

    assertThat(result).hasValue(" secret \r");
  }

  @Test
  void readPassword_lineNeverEnds_returnsEmpty() throws IOException {
    InputStream input = mock(InputStream.class);
    when(input.read(any(byte[].class))).thenAnswer(invocation -> {
      blockingLatch.await();
      return -1;
    });

    Optional<String> result = new StdinChannel(input, Duration.ofMillis(100), 4096).readPassword(log);

    assertThat(result).isEmpty();
  }

  @Test
  void readPassword_streamEndsBeforeTheLine_returnsEmpty() {
    StdinChannel channel = channelOf(new ByteArrayInputStream("hunter2".getBytes(UTF_8)));

    Optional<String> result = channel.readPassword(log);

    assertThat(result).isEmpty();
  }

  @Test
  void readPassword_moreThanTheLimit_returnsEmpty() {
    StdinChannel channel = new StdinChannel(new ByteArrayInputStream("pass-\n".getBytes(UTF_8)), Duration.ofSeconds(5), 4);

    Optional<String> result = channel.readPassword(log);

    assertThat(result).isEmpty();
  }

  @Test
  void readPassword_exactlyTheLimit_ok() {
    StdinChannel channel = new StdinChannel(new ByteArrayInputStream("pass\n".getBytes(UTF_8)), Duration.ofSeconds(5), 4);

    Optional<String> result = channel.readPassword(log);

    assertThat(result).hasValue("pass");
  }

  @Test
  void readPassword_calledTwice_doesNotReadTheStreamAgain() {
    InputStream input = spy(new ByteArrayInputStream("hunter2\n".getBytes(UTF_8)));
    StdinChannel channel = channelOf(input);
    channel.readPassword(log);
    awaitEndOfInput(channel); // the reader thread consumes past the first line, so it must be done before the invocations are cleared
    clearInvocations(input);

    Optional<String> result = channel.readPassword(log);

    assertThat(result).hasValue("hunter2");
    verifyNoInteractions(input);
  }

  @Test
  void readPassword_streamAlreadyAtEndOfInput_ok() {
    StdinChannel channel = channelOf(new ByteArrayInputStream("hunter2\n".getBytes(UTF_8)));
    awaitEndOfInput(channel);

    Optional<String> result = channel.readPassword(log);

    assertThat(result).hasValue("hunter2");
  }

  @Test
  void endOfInput_streamEnds_completes() {
    StdinChannel channel = channelOf(new ByteArrayInputStream("hunter2\n".getBytes(UTF_8)));

    assertThat(channel.endOfInput()).succeedsWithin(Duration.ofSeconds(5));
  }

  @Test
  void endOfInput_emptyStream_completes() {
    StdinChannel channel = channelOf(new ByteArrayInputStream(new byte[0]));

    assertThat(channel.endOfInput()).succeedsWithin(Duration.ofSeconds(5));
  }

  @Test
  void endOfInput_readFails_completes() throws IOException {
    InputStream input = mock(InputStream.class);
    when(input.read(any(byte[].class))).thenThrow(new IOException("error"));

    assertThat(channelOf(input).endOfInput()).succeedsWithin(Duration.ofSeconds(5));
  }

  @Test
  void endOfInput_streamStaysOpen_pending() throws IOException {
    InputStream input = mock(InputStream.class);
    when(input.read(any(byte[].class))).thenAnswer(invocation -> {
      blockingLatch.await();
      return -1;
    });

    assertThat(channelOf(input).endOfInput()).isNotDone();
  }

  /**
   * Blocks until the reader thread has read the end of the stream, so the stream is exhausted once this returns.
   */
  private void awaitEndOfInput(StdinChannel channel) {
    channel.endOfInput().join();
  }

  private StdinChannel channelOf(InputStream input) {
    return new StdinChannel(input, Duration.ofSeconds(5), 4096);
  }
}
