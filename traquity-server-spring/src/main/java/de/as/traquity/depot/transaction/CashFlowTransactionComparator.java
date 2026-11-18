package de.as.traquity.depot.transaction;

import java.math.MathContext;
import java.util.Comparator;

/**
 * Orders transactions for tracking a depot's cash flow: money coming in is booked before money going out, but only within one day.
 *
 * <p>The date is the first criterion, so a later day never comes before an earlier. On the same day, transactions come in this
 * order:
 * <ol>
 *   <li>Dividends, by id. Their time is ignored.</li>
 *   <li>Taxes, by net value ascending, so that refunds come first, then by id.</li>
 *   <li>Sells without a time, by id.</li>
 *   <li>Buys without a time, by id.</li>
 *   <li>Buys and sells with a time, by time, then by id.</li>
 * </ol>
 */
public class CashFlowTransactionComparator implements Comparator<Transaction> {

  private static final int DIVIDEND_RANK = 0;
  private static final int TAX_RANK = 1;
  private static final int UNTIMED_SELL_RANK = 2;
  private static final int UNTIMED_BUY_RANK = 3;
  private static final int TIMED_TRADE_RANK = 4;

  @Override
  public int compare(Transaction first, Transaction second) {
    int result = first.getDate().compareTo(second.getDate());
    if (result == 0) {
      result = Integer.compare(rankOf(first), rankOf(second));
    }
    if (result == 0 && rankOf(first) == TAX_RANK) {
      result = first.getNetValue(MathContext.UNLIMITED).compareTo(second.getNetValue(MathContext.UNLIMITED));
    }
    if (result == 0 && rankOf(first) == TIMED_TRADE_RANK) {
      result = first.getTime().compareTo(second.getTime());
    }
    if (result == 0) {
      result = first.getId().compareTo(second.getId());
    }
    return result;
  }

  private int rankOf(Transaction transaction) {
    return switch (transaction.getTransactionType()) {
      case DIVIDEND, SPECIAL_DIVIDEND -> DIVIDEND_RANK;
      case TAX -> TAX_RANK;
      case SELL -> transaction.getTime() == null ? UNTIMED_SELL_RANK : TIMED_TRADE_RANK;
      case BUY -> transaction.getTime() == null ? UNTIMED_BUY_RANK : TIMED_TRADE_RANK;
    };
  }
}
