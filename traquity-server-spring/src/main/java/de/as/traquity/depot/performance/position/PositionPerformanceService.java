package de.as.traquity.depot.performance.position;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.NotFoundException;
import java.util.Set;

public interface PositionPerformanceService {

  /**
   * Returns the total performance, over its whole transaction history, of the given securities in the given depots. The depots must
   * all share one currency. A {@code null} {@code securityIds} covers every security with a transaction in one of the depots.
   *
   * @throws BadRequestException when {@code depotIds} is {@code null} or empty, {@code securityIds} is non-{@code null} but empty, or
   *                              the given depots don't all share one currency
   * @throws NotFoundException   when {@code depotIds} or {@code securityIds} identify a depot or security that doesn't exist
   */
  PositionPerformance getPositionPerformance(Set<Long> depotIds, Set<Long> securityIds)
      throws BadRequestException, NotFoundException;
}
