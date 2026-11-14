package de.as.traquity.price.security.historical;

import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static org.springframework.transaction.annotation.Propagation.REQUIRES_NEW;

import de.as.traquity.depot.DepotService;
import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.depot.transaction.TransactionChangedEvent;
import de.as.traquity.depot.transaction.TransactionService;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import de.as.traquity.security.stocksplit.StockSplitService;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
class TradePriceDeriver {

  private static final Set<TransactionTypeDto> TRADE_TYPES = Set.of(BUY, SELL);

  private final TransactionService transactionService;
  private final StockSplitService stockSplitService;
  private final DepotService depotService;
  private final HistoricalSecurityPriceServiceImpl priceService;
  private final MathContext mathContext;

  @TransactionalEventListener
  @Transactional(propagation = REQUIRES_NEW)
  public void deriveTradePrices(TransactionChangedEvent event) {
    Stream.of(event.previous(), event.current())
        .filter(transaction -> transaction != null && TRADE_TYPES.contains(transaction.getTransactionType()))
        .forEach(trade -> deriveTradePrice(trade.getSecurityId(), trade.getDate()));
  }

  private void deriveTradePrice(long securityId, LocalDate date) {
    List<Transaction> trades = transactionService.getTransactions(securityId, date, TRADE_TYPES).stream()
        .filter(trade -> trade.getSecurityCountOriginal().signum() > 0)
        .filter(trade -> trade.getTransactionType() != BUY || trade.getGrossValue().signum() != 0)
        .toList();
    if (trades.isEmpty()) {
      priceService.removeTradePrice(securityId, date);
      return;
    }

    Transaction lastTrade = trades.getLast();
    BigDecimal multiplier = stockSplitService.getSplitMultiplierAfter(securityId, date);
    // calculate manually instead of using getCountForArithmeticOperations(): works safely for inserting transactions after the stock split
    BigDecimal shareCount = lastTrade.getSecurityCountOriginal().multiply(multiplier, mathContext);

    HistoricalSecurityPrice price = new HistoricalSecurityPrice();
    price.setSecurityId(securityId);
    price.setDate(date);
    price.setPrice(lastTrade.getGrossValue().divide(shareCount, mathContext));
    price.setCurrency(depotService.getDepot(lastTrade.getDepotId()).getCurrency());
    priceService.storeTradePrice(price);
  }
}
