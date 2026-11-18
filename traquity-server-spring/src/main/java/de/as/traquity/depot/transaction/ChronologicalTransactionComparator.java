package de.as.traquity.depot.transaction;

import java.time.LocalTime;
import java.util.Comparator;

/**
 * Orders transactions by date, then by time, then by id. Transactions without a time come before those with a time on the same day.
 * The transaction type is ignored.
 */
public class ChronologicalTransactionComparator implements Comparator<Transaction> {

  private static final Comparator<LocalTime> TIME_NULLS_FIRST = Comparator.nullsFirst(Comparator.naturalOrder());

  @Override
  public int compare(Transaction first, Transaction second) {
    int result = first.getDate().compareTo(second.getDate());
    if (result == 0) {
      result = TIME_NULLS_FIRST.compare(first.getTime(), second.getTime());
    }
    if (result == 0) {
      result = first.getId().compareTo(second.getId());
    }
    return result;
  }
}
