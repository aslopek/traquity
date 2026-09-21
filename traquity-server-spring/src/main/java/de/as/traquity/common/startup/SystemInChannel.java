package de.as.traquity.common.startup;

import java.time.Duration;
import lombok.experimental.UtilityClass;

/**
 * The single {@link StdinChannel} over {@link System#in}, shared by the environment post-processor and the shutdown
 * component so both reach the same stream position. {@code System.in} reaches EOF exactly once per JVM; a second
 * instance would read that EOF and contribute an empty password over a good one, or shut the app down immediately.
 * Constructing this reads nothing - the reader thread starts on the first {@code readPassword}/{@code endOfInput}
 * call.
 */
@UtilityClass
class SystemInChannel {

  private final Duration TIMEOUT = Duration.ofSeconds(5);
  private final int LIMIT_IN_BYTES = 4096;
  private final StdinChannel CHANNEL = new StdinChannel(System.in, TIMEOUT, LIMIT_IN_BYTES);

  StdinChannel channel() {
    return CHANNEL;
  }
}
