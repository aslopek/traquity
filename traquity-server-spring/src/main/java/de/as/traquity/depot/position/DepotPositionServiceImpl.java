package de.as.traquity.depot.position;

import static de.as.traquity.common.arithmetic.MathFunctions.shareOf;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static java.math.BigDecimal.ZERO;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.configuration.securitygroup.SecurityGroup;
import de.as.traquity.configuration.securitygroup.SecurityGroupService;
import de.as.traquity.depot.Depot;
import de.as.traquity.depot.DepotService;
import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.depot.transaction.TransactionService;
import de.as.traquity.exchangerates.OutdatedExchangeRateException;
import de.as.traquity.price.security.historical.HistoricalSecurityPriceService;
import de.as.traquity.security.SecurityService;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiFunction;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class DepotPositionServiceImpl implements DepotPositionService {

  private final DepotService depotService;
  private final TransactionService transactionService;
  private final HistoricalSecurityPriceService historicalSecurityPriceService;
  private final SecurityService securityService;
  private final SecurityGroupService securityGroupService;
  private final Clock clock;
  private final MathContext mathContext;

  @Override
  public DepotComposition getDepotPositions(Set<Long> depotIds, boolean consolidateSecurityGroups)
      throws BadRequestException {
    List<Depot> depots = new ArrayList<>(depotIds.size());
    for (Long id : depotIds) {
      try {
        depots.add(depotService.getDepot(id));
      } catch (NotFoundException e) {
        throw new BadRequestException();
      }
    }

    Set<String> currencies = depots.stream().map(Depot::getCurrency).collect(Collectors.toSet());
    if (currencies.size() != 1) {
      throw new BadRequestException();
    }

    Map<Long, DepotPosition> positionsById = new HashMap<>();
    List<DepotPosition> depotPositions;
    DepotPosition existing;
    for (long id : depotIds) {
      depotPositions = getDepotPositions(id, false).getPositions();
      for (DepotPosition position : depotPositions) {
        if (positionsById.containsKey(position.getPositionId())) {
          existing = positionsById.get(position.getPositionId());
          existing.setCount(existing.getCount().add(position.getCount(), mathContext));
          existing.setBuyInAbsolute(existing.getBuyInAbsolute().add(position.getBuyInAbsolute(), mathContext));
          existing.setCurrentSizeAbsolute(existing.getCurrentSizeAbsolute().add(position.getCurrentSizeAbsolute(),
              mathContext));
          existing.setPerformanceAbsolute(existing.getCurrentSizeAbsolute().subtract(existing.getBuyInAbsolute(),
              mathContext));
          setPerformanceRelative(existing);
        } else {
          positionsById.put(position.getPositionId(), position);
        }
      }
    }

    List<DepotPosition> consolidatedDepotPositions = new ArrayList<>(positionsById.size());
    BigDecimal sumBuyInSize = ZERO;
    BigDecimal sumCurrentSize = ZERO;
    for (DepotPosition position : positionsById.values()) {
      consolidatedDepotPositions.add(position);
      sumBuyInSize = sumBuyInSize.add(position.getBuyInAbsolute(), mathContext);
      sumCurrentSize = sumCurrentSize.add(position.getCurrentSizeAbsolute(), mathContext);
    }
    for (DepotPosition position : consolidatedDepotPositions) {
      position.setCurrentSizeRelative(shareOf(position.getCurrentSizeAbsolute(), sumCurrentSize, mathContext));
      position.setBuyInRelative(shareOf(position.getBuyInAbsolute(), sumBuyInSize, mathContext));
    }

    if (consolidateSecurityGroups) {
      consolidatedDepotPositions = consolidateDepotPositions(consolidatedDepotPositions);
    } else {
      setDisplayNames(consolidatedDepotPositions);
    }

    consolidatedDepotPositions.sort(Collections.reverseOrder());
    DepotComposition depotComposition = toDepotComposition(consolidatedDepotPositions);
    depotComposition.setCurrency(depots.getFirst().getCurrency());
    return depotComposition;
  }

  @Override
  public DepotComposition getDepotPositions(Long depotId, boolean consolidateSecurityGroups) throws BadRequestException {
    Depot depot;

    try {
      depot = depotService.getDepot(depotId);
    } catch (NotFoundException e) {
      throw new BadRequestException();
    }

    /*
     * size of the queue is the number of fractional shares measured in thousandths
     * e.g. 1.5 shares are represented as 1500 entries
     * each entry represents the price at which the share was bought
     *
     */
    Map<Long, Deque<ShareBatch>> fractionalSharesBySecurityId = new HashMap<>();
    List<Transaction> transactions = transactionService.getTransactions(Set.of(depotId), Set.of(BUY, SELL));
    Deque<ShareBatch> shareBatches;
    BigDecimal shares;
    BigDecimal pricePerShare;
    ShareBatch shareBatch;

    for (Transaction transaction : transactions) {
      if (!fractionalSharesBySecurityId.containsKey(transaction.getSecurityId())) {
        fractionalSharesBySecurityId.put(transaction.getSecurityId(), new LinkedList<>());
      }

      shareBatches = fractionalSharesBySecurityId.get(transaction.getSecurityId());
      shares = transaction.getCountForArithmeticOperations();
      pricePerShare = transaction.getGrossValue().divide(shares, mathContext);

      if (transaction.getTransactionType() == BUY) {
        shareBatches.addLast(new ShareBatch(shares, pricePerShare));
      } else if (transaction.getTransactionType() == SELL) {
        while (shares.compareTo(ZERO) > 0 && !shareBatches.isEmpty()) {
          shareBatch = shareBatches.peekFirst();

          if (shareBatch.remainingShares.compareTo(shares) <= 0) {
            shares = shares.subtract(shareBatch.remainingShares, mathContext);
            shareBatches.removeFirst();
          } else {
            shareBatch.remainingShares = shareBatch.remainingShares.subtract(shares, mathContext);
            shares = ZERO;
          }
        }
      }
    }

    List<DepotPosition> depotPositions = new LinkedList<>();
    DepotPosition depotPosition;
    BigDecimal latestPrice;
    BigDecimal sumBuyInSize = ZERO;
    BigDecimal sumCurrentSize = ZERO;

    for (Map.Entry<Long, Deque<ShareBatch>> entry : fractionalSharesBySecurityId.entrySet()) {
      if (entry.getValue().isEmpty()) {
        continue;
      }
      try {
        latestPrice = historicalSecurityPriceService.getLatestPrice(entry.getKey(), depot.getCurrency()).getPrice();
      } catch (NotFoundException e) {
        latestPrice = null;
      } catch (OutdatedExchangeRateException e) {
        latestPrice = e.getConversionResult();
      }
      depotPosition = getPosition(entry.getValue(), depotId, entry.getKey(), latestPrice);
      depotPositions.add(depotPosition);
      sumBuyInSize = sumBuyInSize.add(depotPosition.getBuyInAbsolute(), mathContext);
      sumCurrentSize = sumCurrentSize.add(depotPosition.getCurrentSizeAbsolute(), mathContext);
    }

    for (DepotPosition position : depotPositions) {
      position.setCurrentSizeRelative(shareOf(position.getCurrentSizeAbsolute(), sumCurrentSize, mathContext));
      position.setBuyInRelative(shareOf(position.getBuyInAbsolute(), sumBuyInSize, mathContext));
    }

    if (consolidateSecurityGroups) {
      depotPositions = consolidateDepotPositions(depotPositions);
    } else {
      setDisplayNames(depotPositions);
    }
    depotPositions.sort(Collections.reverseOrder());
    DepotComposition depotComposition = toDepotComposition(depotPositions);
    depotComposition.setCurrency(depot.getCurrency());
    return depotComposition;
  }

  @Override
  public List<Lot> getLots(long depotId, long securityId) throws NotFoundException {
    List<Transaction> transactions = transactionService.getTransactions(Set.of(depotId),
        Set.of(securityId),
        Set.of(BUY, SELL));
    if (transactions.isEmpty()) {
      return new LinkedList<>();
    }

    List<Lot> lots = new ArrayList<>(transactions.size());

    for (Transaction transaction : transactions) {
      if (transaction.getTransactionType() == BUY) {
        Lot.add(lots, transaction, clock);
      } else {
        Lot.subtract(lots, transaction, mathContext);
      }
    }

    String currency = depotService.getDepot(depotId).getCurrency();
    for (Lot lot : lots) {
      lot.setCurrency(currency);
    }
    BigDecimal latestPrice;
    try {
      latestPrice = historicalSecurityPriceService.getLatestPrice(securityId, currency).getPrice();
    } catch (NotFoundException e) {
      latestPrice = null;
    } catch (OutdatedExchangeRateException e) {
      latestPrice = e.getConversionResult();
    }

    Lot.calculatePerformance(lots, latestPrice, mathContext, clock);
    return lots;
  }

  private DepotPosition getPosition(Deque<ShareBatch> fractionalShares, long depotId, long securityId,
                                    BigDecimal currentPrice) {
    BigDecimal count = ZERO;
    BigDecimal buyIn = ZERO;
    ShareBatch shareBatch;
    BigDecimal partialSum;

    while (!fractionalShares.isEmpty()) {
      shareBatch = fractionalShares.pollFirst();

      partialSum = shareBatch.remainingShares.multiply(shareBatch.pricePerShare, mathContext);
      buyIn = buyIn.add(partialSum, mathContext);
      count = count.add(shareBatch.remainingShares, mathContext);
    }

    BigDecimal absoluteSize;

    if (currentPrice != null) {
      absoluteSize = count.multiply(currentPrice, mathContext);
    } else {
      absoluteSize = buyIn;
    }

    BigDecimal performanceAbsolute = absoluteSize.subtract(buyIn, mathContext);
    DepotPosition depotPosition = new DepotPosition();
    depotPosition.setSecurityIds(List.of(securityId));
    depotPosition.setCount(count);
    depotPosition.setBuyInAbsolute(buyIn);
    depotPosition.setCurrentSizeAbsolute(absoluteSize);
    depotPosition.setPerformanceAbsolute(performanceAbsolute);
    setPerformanceRelative(depotPosition);
    return depotPosition;
  }

  private void setPerformanceRelative(DepotPosition depotPosition) {
    BigDecimal buyIn = depotPosition.getBuyInAbsolute();
    BigDecimal absoluteSize = depotPosition.getCurrentSizeAbsolute();
    BigDecimal performanceRelative = ZERO;
    if (buyIn != null && ZERO.compareTo(buyIn) != 0) {
      performanceRelative = absoluteSize.divide(buyIn, mathContext);
      if (performanceRelative.compareTo(BigDecimal.ONE) >= 0) {
        // positive performance
        performanceRelative = performanceRelative.subtract(BigDecimal.ONE, mathContext);
      } else {
        // negative performance
        performanceRelative = BigDecimal.ONE.subtract(performanceRelative, mathContext).negate();
      }
    }
    depotPosition.setPerformanceRelative(performanceRelative);
  }

  private void setDisplayNames(List<DepotPosition> depotPositions) {
    Set<Long> securityIds = depotPositions.stream().map(p -> p.getSecurityIds().getFirst()).collect(Collectors.toSet());
    Map<Long, String> securityNames = securityService.getNamesById(securityIds);
    for (DepotPosition depotPosition : depotPositions) {
      depotPosition.setDisplayName(securityNames.get(depotPosition.getSecurityIds().getFirst()));
    }
  }

  /**
   * Consolidates the given {@link DepotPosition}s. Requirement: Each {@link DepotPosition#getSecurityIds()} contains
   * exactly one ID, i.e. the positions have not previously been consolidated.
   */
  private List<DepotPosition> consolidateDepotPositions(List<DepotPosition> depotPositions) {
    List<DepotPosition> consolidated = new ArrayList<>(depotPositions.size());
    Set<Long> securityIds = depotPositions.stream().map(p -> p.getSecurityIds().getFirst()).collect(Collectors.toSet());
    Map<Long, String> securityNames = securityService.getNamesById(securityIds);
    Map<Long, SecurityGroup> securityGroups = securityGroupService.getSecurityGroupsBySecurityId();
    Map<Long, DepotPosition> consolidatedPositions = new HashMap<>();
    securityIds.retainAll(securityGroups.keySet());
    SecurityGroup securityGroup;
    DepotPosition consolidatedPosition;

    for (DepotPosition depotPosition : depotPositions) {
      securityGroup = securityGroups.get(depotPosition.getSecurityIds().getFirst());
      if (securityGroup == null) {
        consolidated.add(depotPosition);
        depotPosition.setDisplayName(securityNames.get(depotPosition.getSecurityIds().getFirst()));
      } else {
        consolidatedPosition = consolidatedPositions.get(securityGroup.getId());
        if (consolidatedPosition == null) {
          consolidatedPosition = depotPosition;
          consolidated.add(consolidatedPosition);
          consolidatedPositions.put(securityGroup.getId(), consolidatedPosition);
          consolidatedPosition.setSecurityIds(new LinkedList<>(consolidatedPosition.getSecurityIds()));
          consolidatedPosition.setSecurityGroupId(securityGroup.getId());
          consolidatedPosition.setDisplayName(securityGroup.getName());
        } else {
          consolidate(consolidatedPosition, depotPosition);
        }
      }
    }

    for (DepotPosition depotPosition : consolidatedPositions.values()) {
      if (depotPosition.getSecurityIds().size() == 1) {
        depotPosition.setDisplayName(securityNames.get(depotPosition.getSecurityIds().getFirst()));
      }
    }

    return consolidated;
  }

  private void consolidate(DepotPosition target, DepotPosition source) {
    List<Long> targetSecurityIds = target.getSecurityIds();
    List<Long> otherSecurityIds = source.getSecurityIds();
    for (long securityId : otherSecurityIds) {
      if (!targetSecurityIds.contains(securityId)) {
        targetSecurityIds.add(securityId);
      }
    }

    BiFunction<BigDecimal, BigDecimal, BigDecimal> add = (targetValue, sourceValue) -> {
      BigDecimal targetNotNull = targetValue != null ? targetValue : ZERO;
      BigDecimal sourceNotNull = sourceValue != null ? sourceValue : ZERO;
      return targetNotNull.add(sourceNotNull, mathContext);
    };

    target.setCount(add.apply(target.getCount(), source.getCount()));
    target.setBuyInAbsolute(add.apply(target.getBuyInAbsolute(), source.getBuyInAbsolute()));
    target.setBuyInRelative(add.apply(target.getBuyInRelative(), source.getBuyInRelative()));
    target.setCurrentSizeAbsolute(add.apply(target.getCurrentSizeAbsolute(), source.getCurrentSizeAbsolute()));
    target.setCurrentSizeRelative(add.apply(target.getCurrentSizeRelative(), source.getCurrentSizeRelative()));
    target.setPerformanceAbsolute(target.getCurrentSizeAbsolute().subtract(target.getBuyInAbsolute(), mathContext));
    setPerformanceRelative(target);
  }

  private DepotComposition toDepotComposition(List<DepotPosition> positions) {
    DepotComposition depotComposition = new DepotComposition();
    depotComposition.setBuyInAbsolute(ZERO);
    depotComposition.setCurrentSizeAbsolute(ZERO);
    for (DepotPosition depotPosition : positions) {
      depotComposition.setBuyInAbsolute(depotComposition.getBuyInAbsolute().add(depotPosition.getBuyInAbsolute(),
          mathContext));
      depotComposition.setCurrentSizeAbsolute(depotComposition.getCurrentSizeAbsolute().add(depotPosition.getCurrentSizeAbsolute(),
          mathContext));
    }
    depotComposition.setPerformanceAbsolute(depotComposition.getCurrentSizeAbsolute().subtract(depotComposition.getBuyInAbsolute(),
        mathContext));
    if (depotComposition.getBuyInAbsolute().signum() == 0) {
      depotComposition.setPerformanceRelative(null);
    } else {
      depotComposition.setPerformanceRelative(depotComposition.getPerformanceAbsolute().divide(depotComposition.getBuyInAbsolute(),
          mathContext));
    }
    depotComposition.setPositions(positions);
    return depotComposition;
  }
  @AllArgsConstructor
  private static class ShareBatch {

    BigDecimal remainingShares;
    BigDecimal pricePerShare;
  }
}
