package de.as.traquity.depot.transaction;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

final class SortAssertions {

  private SortAssertions() {
  }

  /**
   * Sorts every permutation of {@code transactions} with {@code comparator} and asserts that each result has the ids
   * {@code expectedIds}, in that order.
   *
   * @param comparator the comparator to sort with
   * @param transactions the transactions to permute
   * @param expectedIds the ids of the transactions in the expected order
   */
  static void assertSortedIdsForEveryPermutation(Comparator<Transaction> comparator, List<Transaction> transactions, Long... expectedIds) {
    for (List<Transaction> permutation : permutationsOf(transactions)) {
      List<Transaction> sorted = new ArrayList<>(permutation);
      sorted.sort(comparator);

      assertThat(sorted).as("initial order %s", idsOf(permutation)).extracting(Transaction::getId).containsExactly(expectedIds);
    }
  }

  private static List<Long> idsOf(List<Transaction> transactions) {
    return transactions.stream().map(Transaction::getId).toList();
  }

  private static List<List<Transaction>> permutationsOf(List<Transaction> transactions) {
    if (transactions.size() <= 1) {
      return List.of(transactions);
    }
    List<List<Transaction>> permutations = new ArrayList<>();
    for (Transaction first : transactions) {
      List<Transaction> rest = new ArrayList<>(transactions);
      rest.remove(first);
      for (List<Transaction> permutation : permutationsOf(rest)) {
        List<Transaction> result = new ArrayList<>(List.of(first));
        result.addAll(permutation);
        permutations.add(result);
      }
    }
    return permutations;
  }
}
