package de.as.traquity.depot.performance.position;

import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SPECIAL_DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.TAX;
import static java.math.BigDecimal.ZERO;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.depot.DepotService;
import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.depot.transaction.TransactionService;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import de.as.traquity.price.security.historical.HistoricalSecurityPriceService;
import de.as.traquity.security.SecurityService;
import java.math.BigDecimal;
import java.math.MathContext;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class PositionPerformanceServiceImpl implements PositionPerformanceService {

  private static final Set<TransactionTypeDto> ALL_TYPES = Set.of(BUY, SELL, DIVIDEND, SPECIAL_DIVIDEND, TAX);

  private final DepotService depotService;
  private final SecurityService securityService;
  private final TransactionService transactionService;
  private final HistoricalSecurityPriceService historicalSecurityPriceService;
  private final MathContext mathContext;

  @Override
  public PositionPerformance getPositionPerformance(Set<Long> depotIds, Set<Long> securityIds)
      throws BadRequestException, NotFoundException {
    if (depotIds == null || depotIds.isEmpty() || (securityIds != null && securityIds.isEmpty())) {
      throw new BadRequestException();
    }
    if (!depotService.depotsHaveSameCurrency(depotIds)) {
      throw new BadRequestException();
    }
    if (securityIds != null && !securityService.securitiesExist(securityIds)) {
      throw new NotFoundException();
    }

    String currency = depotService.getDepot(depotIds.iterator().next()).getCurrency();
    PositionPerformance performance = new PositionPerformance();
    performance.setCurrency(currency);

    Map<LotKey, Deque<BigDecimal>> openLots = new HashMap<>();
    Map<Long, BigDecimal> latestPricePerShare = new HashMap<>();
    transactionService.forEachTransaction(depotIds, securityIds, ALL_TYPES, transaction -> {
      accumulate(performance, transaction);
      updateOpenLots(openLots, transaction);
      updateLatestPricePerShare(latestPricePerShare, transaction);
    });

    Map<Long, BigDecimal> heldShares = new HashMap<>();
    for (Map.Entry<LotKey, Deque<BigDecimal>> entry : openLots.entrySet()) {
      for (BigDecimal remainingShares : entry.getValue()) {
        heldShares.merge(entry.getKey().securityId(), remainingShares, (a, b) -> a.add(b, mathContext));
      }
    }
    Map<Long, HistoricalSecurityPrice> latestPrices = historicalSecurityPriceService.getLatestPrices(heldShares.keySet(), currency);
    for (Map.Entry<Long, BigDecimal> entry : heldShares.entrySet()) {
      HistoricalSecurityPrice latestPrice = latestPrices.get(entry.getKey());
      BigDecimal price = latestPrice != null ? latestPrice.getPrice() : latestPricePerShare.get(entry.getKey());
      performance.setCurrentSizeAbsolute(
          performance.getCurrentSizeAbsolute().add(entry.getValue().multiply(price, mathContext), mathContext));
    }

    performance.setNetCashFlow(performance.getBuysGross()
        .add(performance.getSellsGross(), mathContext)
        .add(performance.getDividendsGross(), mathContext)
        .add(performance.getTaxes(), mathContext)
        .add(performance.getFees(), mathContext));
    performance.setCostBasis(performance.getBuysGross()
        .add(performance.getTaxes(), mathContext)
        .add(performance.getFees(), mathContext)
        .negate());
    performance.setPerformanceAbsolute(performance.getNetCashFlow()
        .add(performance.getCurrentSizeAbsolute(), mathContext));
    if (performance.getCostBasis().compareTo(ZERO) > 0) {
      performance.setPerformanceRelative(performance.getPerformanceAbsolute().divide(performance.getCostBasis(), mathContext));
    }

    return performance;
  }

  private void accumulate(PositionPerformance performance, Transaction transaction) {
    BigDecimal grossValue = transaction.getGrossValue();
    BigDecimal tax = transaction.getTax() == null ? ZERO : transaction.getTax();
    BigDecimal fee = transaction.getFee() == null ? ZERO : transaction.getFee();

    switch (transaction.getTransactionType()) {
      case BUY -> performance.setBuysGross(performance.getBuysGross().subtract(grossValue, mathContext));
      case SELL -> performance.setSellsGross(performance.getSellsGross().add(grossValue, mathContext));
      case DIVIDEND, SPECIAL_DIVIDEND -> performance.setDividendsGross(performance.getDividendsGross().add(grossValue, mathContext));
      case TAX -> performance.setTaxes(performance.getTaxes().subtract(grossValue, mathContext));
    }
    performance.setTaxes(performance.getTaxes().subtract(tax, mathContext));
    performance.setFees(performance.getFees().subtract(fee, mathContext));
  }

  private void updateOpenLots(Map<LotKey, Deque<BigDecimal>> openLots, Transaction transaction) {
    TransactionTypeDto type = transaction.getTransactionType();
    if (type != BUY && type != SELL) {
      return;
    }

    LotKey key = new LotKey(transaction.getDepotId(), transaction.getSecurityId());
    Deque<BigDecimal> lots = openLots.computeIfAbsent(key, id -> new LinkedList<>());
    BigDecimal shares = transaction.getCountForArithmeticOperations();
    if (type == BUY) {
      if (shares.compareTo(ZERO) != 0) {
        lots.addLast(shares);
      }
      return;
    }

    while (shares.compareTo(ZERO) > 0 && !lots.isEmpty()) {
      BigDecimal remainingShares = lots.removeFirst();
      if (remainingShares.compareTo(shares) <= 0) {
        shares = shares.subtract(remainingShares, mathContext);
      } else {
        lots.addFirst(remainingShares.subtract(shares, mathContext));
        shares = ZERO;
      }
    }
  }

  // last write wins, hence the caller must ensure the method is called in transaction.date ascending order
  private void updateLatestPricePerShare(Map<Long, BigDecimal> latestPricePerShare, Transaction transaction) {
    TransactionTypeDto type = transaction.getTransactionType();
    if (type != BUY && type != SELL) {
      return;
    }

    BigDecimal shares = transaction.getCountForArithmeticOperations();
    if (shares.compareTo(ZERO) == 0) {
      return;
    }
    latestPricePerShare.put(transaction.getSecurityId(), transaction.getGrossValue().divide(shares, mathContext));
  }

  private record LotKey(Long depotId, Long securityId) {}
}
