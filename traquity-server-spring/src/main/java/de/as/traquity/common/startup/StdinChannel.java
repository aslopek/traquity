package de.as.traquity.common.startup;

import static java.nio.charset.StandardCharsets.UTF_8;
import static java.util.concurrent.TimeUnit.MILLISECONDS;

import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import lombok.RequiredArgsConstructor;
import org.apache.commons.logging.Log;

/**
 * Owns an {@link InputStream} for the whole run: its first line is the database password, and everything after that
 * is discarded - the stream exists to be closed, which is what {@link #endOfInput()} reports. Started by whichever of
 * {@link #readPassword} / {@link #endOfInput} is called first, on a single daemon thread that is never restarted.
 */
@RequiredArgsConstructor
class StdinChannel {

  private static final byte LINE_FEED = 0x0A;

  private final InputStream input;
  private final Duration timeout;
  private final int limitInBytes;

  private final CompletableFuture<String> passwordLine = new CompletableFuture<>();
  private final CompletableFuture<Void> endOfInput = new CompletableFuture<>();
  private boolean started;
  private boolean attempted;
  private Optional<String> password = Optional.empty();

  /**
   * The first line, or empty when no line completed (the read timed out, failed, or exceeded the limit). Memoized:
   * a second call after the first line already resolved would otherwise repeat a stale outcome.
   */
  synchronized Optional<String> readPassword(Log log) {
    if (!attempted) {
      attempted = true;
      start();
      password = awaitPasswordLine(log);
    }
    return password;
  }

  private Optional<String> awaitPasswordLine(Log log) {
    try {
      return Optional.of(passwordLine.get(timeout.toMillis(), MILLISECONDS));
    } catch (TimeoutException e) {
      log.warn("No database password arrived on stdin within " + timeout + ", falling back to the environment");
      return Optional.empty();
    } catch (ExecutionException e) {
      log.warn("Failed to read the database password from stdin, falling back to the environment", e.getCause());
      return Optional.empty();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return Optional.empty();
    }
  }

  /**
   * Completes, always normally, once the stream reaches EOF or a read on it fails - either way, nothing more will
   * ever arrive on it.
   */
  synchronized CompletableFuture<Void> endOfInput() {
    start();
    return endOfInput;
  }

  private synchronized void start() {
    if (started) {
      return;
    }
    started = true;
    // a blocking read() on a pipe is not interruptible, so the thread must be a daemon and is simply abandoned
    Thread thread = new Thread(this::consume, "stdin-channel");
    thread.setDaemon(true);
    thread.start();
  }

  private void consume() {
    ByteArrayOutputStream collected = new ByteArrayOutputStream();
    byte[] buffer = new byte[256];
    boolean lineComplete = false;
    try {
      int count;
      while ((count = input.read(buffer)) != -1) {
        if (lineComplete) {
          continue; // everything past the first line is discarded: this stream exists to be closed
        }
        int lineFeed = indexOfLineFeed(buffer, count);
        int upTo = lineFeed == -1 ? count : lineFeed;
        if (collected.size() + upTo > limitInBytes) {
          passwordLine.completeExceptionally(
              new IOException("More than " + limitInBytes + " bytes arrived on stdin before the end of the first line"));
          lineComplete = true;
          continue;
        }
        collected.write(buffer, 0, upTo);
        if (lineFeed != -1) {
          // decoded in one go, over the complete byte array: a multi-byte character can be split across two reads
          passwordLine.complete(new String(collected.toByteArray(), UTF_8));
          lineComplete = true;
        }
      }
    } catch (IOException e) {
      passwordLine.completeExceptionally(e);
    } finally {
      // a first line that never ended is no handover; completing an already-completed future is a no-op
      passwordLine.completeExceptionally(new EOFException("stdin ended before the first line was complete"));
      endOfInput.complete(null);
    }
  }

  private static int indexOfLineFeed(byte[] buffer, int count) {
    // 0x0A cannot occur as a UTF-8 continuation byte, so this scan cannot split a multi-byte character
    for (int i = 0; i < count; i++) {
      if (buffer[i] == LINE_FEED) {
        return i;
      }
    }
    return -1;
  }
}
