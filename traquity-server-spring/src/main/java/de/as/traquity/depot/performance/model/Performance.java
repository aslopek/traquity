package de.as.traquity.depot.performance.model;

import de.as.traquity.depot.transaction.ChronologicalTransactionComparator;
import de.as.traquity.depot.transaction.Transaction;
import java.math.BigDecimal;
import java.math.MathContext;
import java.util.LinkedList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/**
 * Note: this class has a natural ordering that is inconsistent with equals.
 */
@Getter
public class Performance implements Comparable<Performance> {

  private final List<Long> securityIds;
  private final List<Transaction> transactions;

  @Setter
  private BigDecimal absoluteValueGross;

  @Setter
  private BigDecimal absoluteValueNet;

  public Performance() {
    securityIds = new LinkedList<>();
    transactions = new LinkedList<>();
    absoluteValueGross = BigDecimal.ZERO;
    absoluteValueNet = BigDecimal.ZERO;
  }

  public void add(Performance other, MathContext mathContext) {
    transactions.addAll(other.transactions);
    transactions.sort(new ChronologicalTransactionComparator());
    absoluteValueGross = absoluteValueGross.add(other.absoluteValueGross, mathContext);
    absoluteValueNet = absoluteValueNet.add(other.absoluteValueNet, mathContext);
  }

  @Override
  public int compareTo(Performance other) {
    if (other == null) {
      throw new IllegalArgumentException();
    }
    int compareResult = absoluteValueGross.compareTo(other.absoluteValueGross);
    if (compareResult == 0) {
      compareResult = absoluteValueNet.compareTo(other.absoluteValueNet);
    }
    return compareResult;
  }
}
