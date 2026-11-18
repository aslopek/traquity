package de.as.traquity.depot.transaction;

import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.TAX;
import static java.time.Month.FEBRUARY;
import static java.time.Month.MARCH;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ChronologicalTransactionComparatorTest {

  private final ChronologicalTransactionComparator subject = new ChronologicalTransactionComparator();

  @Test
  void sort_differentDays_dateFirst() {
    Transaction earlier = transaction(2L, LocalDate.of(2024, FEBRUARY, 29), LocalTime.of(23, 0));
    Transaction later = transaction(1L, LocalDate.of(2024, MARCH, 1), LocalTime.of(1, 0));

    SortAssertions.assertSortedIdsForEveryPermutation(subject, List.of(earlier, later), 2L, 1L);
  }

  @Test
  void sort_sameDay_untimedFirstThenTimeThenId() {
    Transaction t1 = transaction(1L, LocalTime.of(10, 0));
    Transaction t2 = transaction(2L, null);
    Transaction t3 = transaction(3L, LocalTime.of(9, 0));
    Transaction t4 = transaction(4L, null);

    SortAssertions.assertSortedIdsForEveryPermutation(subject, List.of(t1, t2, t3, t4), 2L, 4L, 3L, 1L);
  }

  @Test
  void sort_sameDayNoTime_typeIgnored() {
    Transaction buy = transaction(3L, null);
    when(buy.getTransactionType()).thenReturn(BUY);
    Transaction tax = transaction(1L, null);
    when(tax.getTransactionType()).thenReturn(TAX);
    Transaction dividend = transaction(2L, null);
    when(dividend.getTransactionType()).thenReturn(DIVIDEND);

    SortAssertions.assertSortedIdsForEveryPermutation(subject, List.of(buy, tax, dividend), 1L, 2L, 3L);
  }

  private Transaction transaction(long id, LocalTime time) {
    return transaction(id, LocalDate.of(2024, MARCH, 1), time);
  }

  private Transaction transaction(long id, LocalDate date, LocalTime time) {
    Transaction transaction = mock(Transaction.class);
    when(transaction.getId()).thenReturn(id);
    when(transaction.getDate()).thenReturn(date);
    when(transaction.getTime()).thenReturn(time);
    return transaction;
  }
}
