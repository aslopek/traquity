package de.as.traquity.depot.performance;

import static de.as.traquity.common.arithmetic.MathFunctions.ratioOf;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.BUY;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SELL;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.SPECIAL_DIVIDEND;
import static de.as.traquity.depot.transaction.api.model.TransactionTypeDto.TAX;
import static java.math.BigDecimal.ZERO;
import static java.time.DayOfWeek.SATURDAY;
import static java.time.DayOfWeek.SUNDAY;

import de.as.traquity.common.arithmetic.XirrFunction;
import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.depot.DepotService;
import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.depot.transaction.TransactionService;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import de.as.traquity.price.security.historical.HistoricalSecurityPrice;
import de.as.traquity.price.security.historical.HistoricalSecurityPriceService;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.analysis.solvers.BrentSolver;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DepotPerformanceServiceImpl implements DepotPerformanceService {

  private final DepotService depotService;
  private final TransactionService transactionService;
  private final HistoricalSecurityPriceService historicalSecurityPriceService;
  private final MathContext mathContext;
  private final Clock clock;

  @Override
  public DepotPerformance getDepotPerformance(Set<Long> depotIds) throws BadRequestException, NotFoundException {
    List<DepotValue> depotValues = getDepotValue(depotIds);
    DepotPerformance depotPerformance = new DepotPerformance();
    depotPerformance.setValues(depotValues);

    if (depotValues.size() < 2) {
      depotPerformance.setExtendedInternalRateOfReturn(ZERO);
    } else {
      depotPerformance.setExtendedInternalRateOfReturn(getExtendedRateOfInternalReturn(depotValues));
    }

    return depotPerformance;
  }

  private List<DepotValue> getDepotValue(Set<Long> depotIds) throws BadRequestException, NotFoundException {
    String currency = getCurrency(depotIds);
    List<Transaction> transactions = transactionService.getTransactions(depotIds,
        Set.of(BUY, SELL, DIVIDEND, SPECIAL_DIVIDEND, TAX));
    if (transactions.isEmpty()) {
      return List.of();
    }

    final LocalDate firstDate = transactions.getFirst().getDate();
    final LocalDate lastDate = LocalDate.now(clock);
    if (firstDate.isAfter(lastDate)) {
      return List.of();
    }

    List<DepotValue> result = new ArrayList<>((int) ChronoUnit.DAYS.between(firstDate, lastDate));
    initializeDepotValues(result, firstDate, lastDate);
    if (result.isEmpty()) {
      // e.g. the first transaction is on a weekend and no trading day has passed yet
      return List.of();
    }

    int transactionIndex = calculateDay(new DepotValue(result.getFirst().getDate()), result.getFirst(), transactions, 0);

    for (int i = 1; i < result.size(); i++) {
      transactionIndex = calculateDay(result.get(i - 1), result.get(i), transactions, transactionIndex);
    }

    calculatePerformances(result, currency, transactions);
    removeDuplicateLastDay(result);
    return result;
  }

  private BigDecimal getExtendedRateOfInternalReturn(List<DepotValue> depotValues) throws BadRequestException, NotFoundException {
    if (depotValues == null || depotValues.size() < 2) {
      return ZERO;
    }

    List<BigDecimal> cashFlows = new ArrayList<>(depotValues.size());
    List<LocalDate> cashFlowDates = new ArrayList<>(depotValues.size());
    BigDecimal previousInvestedCapital = ZERO;
    DepotValue current = depotValues.getFirst();

    for (DepotValue depotValue : depotValues) {
      current = depotValue;
      cashFlowDates.add(current.getDate());
      cashFlows.add(previousInvestedCapital.subtract(current.getInvestedCapital(), mathContext));
      previousInvestedCapital = current.getInvestedCapital();
    }

    BigDecimal liquidationValue = current.getAbsoluteValue().add(current.getCashPosition(), mathContext);
    XirrFunction xirrFunction = new XirrFunction(cashFlows, cashFlowDates, liquidationValue, mathContext);
    BrentSolver solver = new BrentSolver(1e-10, 1e-14);
    double xirr;
    try {
      xirr = solver.solve(1000, xirrFunction, -0.999, 10.0);
    } catch (Exception e) {
      log.warn("XIRR did not converge, falling back to 0.0", e);
      xirr = 0.0;
    }

    return BigDecimal.valueOf(xirr);
  }

  private String getCurrency(Set<Long> depotIds) throws BadRequestException {
    String currency = null;
    for (Long depotId : depotIds) {
      if (currency == null) {
        currency = depotService.getDepot(depotId).getCurrency();
      } else if (!currency.equals(depotService.getDepot(depotId).getCurrency())) {
        throw new BadRequestException();
      }
    }
    return currency;
  }

  private void initializeDepotValues(List<DepotValue> depotValues, LocalDate firstDate, LocalDate lastDate) {
    LocalDate date = firstDate;
    final LocalDate lastDateExclusive = lastDate.plusDays(1);
    DayOfWeek dayOfWeek;

    while (date.isBefore(lastDateExclusive)) {
      dayOfWeek = date.getDayOfWeek();
      if (dayOfWeek == SATURDAY || dayOfWeek == SUNDAY) {
        date = date.plusDays(1);
        continue;
      }

      depotValues.add(new DepotValue(date));
      date = date.plusDays(1);
    }
  }

  private int calculateDay(DepotValue previousDay, DepotValue dayToBeCalculated, List<Transaction> transactions, int fromIndex) {
    final LocalDate date = dayToBeCalculated.getDate();
    List<Transaction> relevantTransactions = new ArrayList<>();

    int index = fromIndex;
    while (index < transactions.size() && !transactions.get(index).getDate().isAfter(date)) {
      relevantTransactions.add(transactions.get(index));
      index++;
    }

    BigDecimal investedCapital = previousDay.getInvestedCapital();
    BigDecimal cashPosition = previousDay.getCashPosition();
    Map<Long, BigDecimal> positions = new HashMap<>(previousDay.getPositions());

    TransactionTypeDto transactionType;
    BigDecimal positionSize;
    BigDecimal cashPositionDifference;
    long securityId;

    for (Transaction transaction : relevantTransactions) {
      transactionType = transaction.getTransactionType();
      securityId = transaction.getSecurityId();

      // adjust position size
      if (transactionType == BUY || transactionType == SELL) {
        positionSize = positions.getOrDefault(securityId, ZERO);

        if (transactionType == BUY) {
          positionSize = positionSize.add(transaction.getCountForArithmeticOperations(), mathContext);
        } else {
          positionSize = positionSize.subtract(transaction.getCountForArithmeticOperations(), mathContext);
        }

        if (positionSize.compareTo(ZERO) == 0) {
          positions.remove(securityId);
        } else {
          positions.put(securityId, positionSize);
        }
      }

      // adjust cashPosition and investedCapital
      if (transactionType == SELL || transactionType == DIVIDEND || transactionType == SPECIAL_DIVIDEND) {
        cashPosition = cashPosition.add(transaction.getNetValue(mathContext), mathContext);
      } else {
        cashPositionDifference = cashPosition.subtract(transaction.getNetValue(mathContext), mathContext);

        if (cashPositionDifference.compareTo(ZERO) > 0) {
          cashPosition = cashPositionDifference;
        } else {
          // cashPosition <= transaction's net value
          cashPosition = ZERO;
          investedCapital = investedCapital.subtract(cashPositionDifference, mathContext); // subtracting a negative number increases investedCapital
        }
      }
    }

    dayToBeCalculated.setInvestedCapital(investedCapital);
    dayToBeCalculated.setCashPosition(cashPosition);
    dayToBeCalculated.setPositions(positions);
    return index;
  }

  private void calculatePerformances(List<DepotValue> depotValues, String currency, List<Transaction> transactions) {
    if (depotValues.isEmpty()) {
      return;
    }

    // every BUY/SELL is itself a known price point (grossValue / count on that date) - used to fill gaps in and extend
    // beyond the historical price feed, and to let a fresher trade take precedence over a stale historical quote
    Map<Long, List<HistoricalSecurityPrice>> transactionPricesBySecurity = transactions.stream()
        .filter(transaction -> transaction.getTransactionType() == BUY || transaction.getTransactionType() == SELL)
        .filter(transaction -> transaction.getCountForArithmeticOperations().compareTo(ZERO) != 0)
        .collect(Collectors.groupingBy(Transaction::getSecurityId, Collectors.mapping(this::toPricePoint, Collectors.toList())));

    Map<Long, List<HistoricalSecurityPrice>> pricesBySecurity = new HashMap<>();
    Map<Long, Integer> priceIndices = new HashMap<>();
    BigDecimal sharePrice;
    BigDecimal positionSize;
    List<HistoricalSecurityPrice> prices;
    int priceIndex;
    LocalDate date;
    long securityId;

    for (DepotValue current : depotValues) {
      // iterate over the days
      date = current.getDate();

      for (Map.Entry<Long, BigDecimal> position : current.getPositions().entrySet()) {
        // iterate over each position of the given day
        securityId = position.getKey();

        if (!pricesBySecurity.containsKey(securityId)) {
          List<HistoricalSecurityPrice> historicalPrices;
          try {
            historicalPrices = historicalSecurityPriceService.getPrices(securityId, date, currency);
          } catch (RuntimeException e) {
            historicalPrices = List.of();
          }

          // transaction prices only fill gaps - a date with a real historical quote is never replaced by one
          Set<LocalDate> historicalDates = historicalPrices.stream().map(HistoricalSecurityPrice::getDate).collect(Collectors.toSet());
          List<HistoricalSecurityPrice> merged = Stream.concat(historicalPrices.stream(),
                  transactionPricesBySecurity.getOrDefault(securityId, List.of()).stream()
                      .filter(pricePoint -> !historicalDates.contains(pricePoint.getDate())))
              .sorted(Comparator.comparing(HistoricalSecurityPrice::getDate))
              .toList();
          pricesBySecurity.put(securityId, merged);
        }

        // advance to the latest price on or before 'date', continuing where the previous day left off
        prices = pricesBySecurity.get(securityId);
        priceIndex = priceIndices.getOrDefault(securityId, -1);
        while (priceIndex + 1 < prices.size() && !prices.get(priceIndex + 1).getDate().isAfter(date)) {
          priceIndex++;
        }
        priceIndices.put(securityId, priceIndex);
        sharePrice = priceIndex >= 0 ? prices.get(priceIndex).getPrice() : ZERO;

        positionSize = sharePrice.multiply(position.getValue(), mathContext);
        current.setAbsoluteValue(current.getAbsoluteValue().add(positionSize, mathContext));
      }

      // calculate absolute and relative performance
      current.setPerformanceAbsolute(current.getAbsoluteValue().subtract(current.getInvestedCapital(), mathContext));
      // a ratio to a negative invested capital has no meaning
      if (current.getInvestedCapital().signum() >= 0) {
        current.setPerformanceRelative(ratioOf(current.getPerformanceAbsolute(), current.getInvestedCapital(), mathContext));
      }
    }
  }

  private HistoricalSecurityPrice toPricePoint(Transaction transaction) {
    if (transaction.getTransactionType() != BUY && transaction.getTransactionType() != SELL) {
      throw new IllegalArgumentException("Cannot infer security price from transaction type " + transaction.getTransactionType());
    }
    HistoricalSecurityPrice pricePoint = new HistoricalSecurityPrice();
    pricePoint.setSecurityId(transaction.getSecurityId());
    pricePoint.setDate(transaction.getDate());
    pricePoint.setPrice(transaction.getGrossValue().divide(transaction.getCountForArithmeticOperations(), mathContext));
    return pricePoint;
  }

  private void removeDuplicateLastDay(List<DepotValue> depotValues) {
    if (depotValues.size() < 2) {
      return;
    }

    DepotValue last = depotValues.getLast();
    DepotValue secondToLast = depotValues.get(depotValues.size() - 2);
    if (last.getAbsoluteValue().compareTo(secondToLast.getAbsoluteValue()) == 0
        && last.getInvestedCapital().compareTo(secondToLast.getInvestedCapital()) == 0
        && last.getCashPosition().compareTo(secondToLast.getCashPosition()) == 0) {
      depotValues.removeLast();
    }
  }
}
