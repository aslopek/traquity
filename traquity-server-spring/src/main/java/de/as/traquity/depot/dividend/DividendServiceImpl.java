package de.as.traquity.depot.dividend;

import static de.as.traquity.common.arithmetic.MathFunctions.ratioOf;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.configuration.securitygroup.SecurityGroup;
import de.as.traquity.configuration.securitygroup.SecurityGroupService;
import de.as.traquity.depot.DepotService;
import de.as.traquity.depot.dividend.api.model.DividendDto;
import de.as.traquity.depot.dividend.api.model.DividendYieldDto;
import de.as.traquity.depot.dividend.api.model.DividendsByMonthDto;
import de.as.traquity.depot.dividend.api.model.DividendsByQuarterDto;
import de.as.traquity.depot.dividend.api.model.DividendsByYearDto;
import de.as.traquity.depot.dividend.api.model.DividendsDto;
import de.as.traquity.depot.position.DepotPosition;
import de.as.traquity.depot.position.DepotPositionService;
import de.as.traquity.depot.transaction.Transaction;
import de.as.traquity.depot.transaction.TransactionService;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import de.as.traquity.security.SecurityService;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
class DividendServiceImpl implements DividendService {

  private static final List<Integer> QUARTERS = List.of(1, 2, 3, 4);
  private static final List<Integer> MONTHS = List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);

  private final DepotService depotService;
  private final DepotPositionService depotPositionService;
  private final TransactionService transactionService;
  private final SecurityGroupService securityGroupService;
  private final SecurityService securityService;
  private final MathContext mathContext;
  private final DividendMapper dividendMapper;

  @Override
  public DividendsDto getDividends(Set<Long> depotIds, boolean includeSpecialDividends) throws BadRequestException {
    validateDepotIds(depotIds);
    final Set<TransactionTypeDto> dividendTypes;
    if (includeSpecialDividends) {
      dividendTypes = Set.of(TransactionTypeDto.DIVIDEND, TransactionTypeDto.SPECIAL_DIVIDEND);
    } else {
      dividendTypes = Set.of(TransactionTypeDto.DIVIDEND);
    }

    List<Transaction> transactions = transactionService.getTransactions(depotIds, dividendTypes);
    Map<Long, List<Transaction>> dividendsBySecurityId = new HashMap<>();
    Map<Integer, List<Dividend>> byYear = new HashMap<>();
    Map<Integer, Map<Integer, List<Dividend>>> byQuarter = new HashMap<>();
    Map<Integer, Map<Integer, List<Dividend>>> byMonth = new HashMap<>();
    aggregateDividends(transactions, dividendsBySecurityId, byYear, byQuarter, byMonth);

    DividendsDto dividends = new DividendsDto();
    dividends.setByYear(new LinkedList<>());
    dividends.setByQuarter(new LinkedList<>());
    dividends.setByMonth(new LinkedList<>());
    dividends.setDividendYield(calculateDividendYields(depotIds, dividendsBySecurityId));

    List<Integer> years = new ArrayList<>(byYear.keySet());
    Collections.sort(years);
    List<Dividend> dividendPayments;

    for (Integer year : years) {
      dividendPayments = byYear.get(year);
      dividends.getByYear().add(getDividendsByYear(year, dividendPayments));
      for (Integer quarter : QUARTERS) {
        if (!byQuarter.containsKey(year) || !byQuarter.get(year).containsKey(quarter)) {
          dividendPayments = List.of();
        } else {
          dividendPayments = byQuarter.get(year).get(quarter);
        }
        dividends.getByQuarter().add(getDividendsByQuarter(year, quarter, dividendPayments));
      }

      for (Integer month : MONTHS) {
        if (!byMonth.containsKey(year) || !byMonth.get(year).containsKey(month)) {
          dividendPayments = List.of();
        } else {
          dividendPayments = byMonth.get(year).get(month);
        }
        dividends.getByMonth().add(getDividendsByMonth(year, month, dividendPayments));
      }
    }

    setDisplayNames(dividends);
    return dividends;
  }

  private void aggregateDividends(List<Transaction> transactions, Map<Long, List<Transaction>> dividendsBySecurity,
                                  Map<Integer, List<Dividend>> byYear,
                                  Map<Integer, Map<Integer, List<Dividend>>> byQuarter, Map<Integer, Map<Integer,
      List<Dividend>>> byMonth) {
    Map<Long, SecurityGroup> securityGroups = securityGroupService.getSecurityGroupsBySecurityId();
    int year, quarter, month;

    for (Transaction transaction : transactions) {
      if (!dividendsBySecurity.containsKey(transaction.getSecurityId())) {
        dividendsBySecurity.put(transaction.getSecurityId(), new LinkedList<>());
      }
      dividendsBySecurity.get(transaction.getSecurityId()).add(transaction);

      year = transaction.getYear();
      quarter = transaction.getQuarter();
      month = transaction.getMonth();

      if (!byYear.containsKey(transaction.getYear())) {
        byYear.put(year, new LinkedList<>());
        byQuarter.put(year, new HashMap<>());
        byMonth.put(year, new HashMap<>());
      }
      if (!byQuarter.get(year).containsKey(quarter)) {
        byQuarter.get(year).put(quarter, new LinkedList<>());
      }
      if (!byMonth.get(year).containsKey(month)) {
        byMonth.get(year).put(month, new LinkedList<>());
      }

      byYear.get(year).add(getDividend(transaction, securityGroups));
      byQuarter.get(year).get(quarter).add(getDividend(transaction, securityGroups));
      byMonth.get(year).get(month).add(getDividend(transaction, securityGroups));
    }

    List<Dividend> dividends;
    for (Integer y : byYear.keySet()) {
      dividends = byYear.get(y);
      dividends = consolidateDividendsBySecurityGroup(dividends);
      byYear.put(y, dividends);
      for (Integer q : byQuarter.get(y).keySet()) {
        dividends = byQuarter.get(y).get(q);
        dividends = consolidateDividendsBySecurityGroup(dividends);
        byQuarter.get(y).put(q, dividends);
      }
      for (Integer m : byMonth.get(y).keySet()) {
        dividends = byMonth.get(y).get(m);
        dividends = consolidateDividendsBySecurityGroup(dividends);
        byMonth.get(y).put(m, dividends);
      }
    }
  }

  private Dividend getDividend(Transaction transaction, Map<Long, SecurityGroup> securityGroups) {
    Dividend dividend = new Dividend();
    dividend.getSecurityIds().add(transaction.getSecurityId());
    dividend.setAbsoluteValueGross(transaction.getGrossValue());
    dividend.setAbsoluteValueNet(transaction.getNetValue(mathContext));

    SecurityGroup securityGroup = securityGroups.get(transaction.getSecurityId());
    if (securityGroup != null) {
      dividend.setSecurityGroupId(securityGroup.getId());
    }
    return dividend;
  }

  private List<Dividend> consolidateDividendsByPosition(List<Dividend> dividends) {
    Map<Long, Sums> dividendsBySecurity = new HashMap<>();
    Map<Long, Sums> dividendsBySecurityGroup = new HashMap<>();
    long dividendId;
    Sums sums;
    for (Dividend dividend : dividends) {
      if (dividend.isGrouped()) {
        dividendId = dividend.getSecurityGroupId();
        if (!dividendsBySecurityGroup.containsKey(dividendId)) {
          dividendsBySecurityGroup.put(dividendId, new Sums());
        }
        sums = dividendsBySecurityGroup.get(dividendId);
      } else {
        dividendId = dividend.getSecurityIds().get(0);
        if (!dividendsBySecurity.containsKey(dividendId)) {
          dividendsBySecurity.put(dividendId, new Sums());
        }
        sums = dividendsBySecurity.get(dividendId);
      }

      sums.add(dividend);
    }

    List<Dividend> result = new ArrayList<>(dividendsBySecurity.size());
    BiConsumer<Long, Sums> consumer = (id, value) -> {
      Dividend dividend = new Dividend();
      dividend.setSecurityIds(value.getSecurityIds());
      dividend.setSecurityGroupId(value.getSecurityGroupId());
      dividend.setAbsoluteValueGross(value.getGrossSum());
      dividend.setAbsoluteValueNet(value.getNetSum());
      result.add(dividend);
    };
    dividendsBySecurity.forEach(consumer);
    dividendsBySecurityGroup.forEach(consumer);
    return result;
  }

  private DividendsByYearDto getDividendsByYear(int year, List<Dividend> dividends) {
    List<Dividend> consolidatedDividends = consolidateDividendsByPosition(dividends);
    DividendsByYearDto byYear = new DividendsByYearDto();
    Sums sums = getSums(consolidatedDividends);

    List<DividendDto> dividendDtos = new ArrayList<>(consolidatedDividends.size());

    for (Dividend dividend : consolidatedDividends) {
      dividend.setRelativeValueGross(dividend.getAbsoluteValueGross().divide(sums.getGrossSum(), mathContext));
      dividend.setRelativeValueNet(dividend.getAbsoluteValueNet().divide(sums.getNetSum(), mathContext));
      dividendDtos.add(dividendMapper.toDto(dividend));
    }

    byYear.setYear(year);
    byYear.setSumGross(sums.getGrossSum());
    byYear.setSumNet(sums.getNetSum());
    byYear.setDividends(dividendDtos);
    return byYear;
  }

  private DividendsByQuarterDto getDividendsByQuarter(int year, int quarter, List<Dividend> dividends) {
    DividendsByYearDto byYear = getDividendsByYear(year, dividends);
    DividendsByQuarterDto byQuarter = new DividendsByQuarterDto();
    byQuarter.setYear(year);
    byQuarter.setQuarter(quarter);
    byQuarter.setSumGross(byYear.getSumGross());
    byQuarter.setSumNet(byYear.getSumNet());
    byQuarter.setDividends(byYear.getDividends());
    return byQuarter;
  }

  private DividendsByMonthDto getDividendsByMonth(int year, int month, List<Dividend> dividends) {
    DividendsByYearDto byYear = getDividendsByYear(year, dividends);
    DividendsByMonthDto byMonth = new DividendsByMonthDto();
    byMonth.setYear(year);
    byMonth.setMonth(month);
    byMonth.setSumGross(byYear.getSumGross());
    byMonth.setSumNet(byYear.getSumNet());
    byMonth.setDividends(byYear.getDividends());
    return byMonth;
  }

  private List<DividendYieldDto> calculateDividendYields(Set<Long> depotIds,
                                                         Map<Long, List<Transaction>> dividendsBySecurityId) {
    Map<Long, SecurityGroup> securityGroups = securityGroupService.getSecurityGroupsBySecurityId();
    Map<Long, DividendYieldDto> dividendYields = new HashMap<>(dividendsBySecurityId.size());
    Map<Long, DepotPosition> depotPositions = new HashMap<>();
    DividendYieldDto dividendYield;
    List<Transaction> regularDividends;
    Transaction latestPayment;
    Transaction secondLatestPayment;
    Transaction thirdLatestPayment;
    long securityId;
    long intervalLatestToSecond;
    long intervalSecondToThird;
    BigDecimal regularPaymentsPerYear;
    BigDecimal estimatedPaymentPerYear;

    for (DepotPosition depotPosition : depotPositionService.getDepotPositions(depotIds, true).getPositions()) {
      depotPositions.put(depotPosition.getPositionId(), depotPosition);
    }

    /*
     * For each security that has at least three regular dividend payments:
     * - compare the interval between latest, second-latest and third-latest payment
     * - if the intervals by more than 15 days or 165 <= interval <= 195: Consider semi-annually payment
     * - if interval <= 35: consider monthly payment
     * - if 80 <= interval <= 100: consider quarterly payment
     * - if 350 <= interval <= 380: consider yearly payment
     */
    for (Map.Entry<Long, List<Transaction>> entry : dividendsBySecurityId.entrySet()) {
      securityId = entry.getKey();
      regularDividends = getRegularDividends(depotIds, entry.getValue());

      /*
       * Only calculate dividend yields if at least three regular payments exist. With less regular payments, it is
       * not possible to safely distinguish between semi-annually and other payment intervals.
       */
      if (regularDividends.size() < 3) {
        continue;
      }

      latestPayment = regularDividends.get(regularDividends.size() - 1);
      secondLatestPayment = regularDividends.get(regularDividends.size() - 2);
      thirdLatestPayment = regularDividends.get(regularDividends.size() - 3);

      intervalLatestToSecond = ChronoUnit.DAYS.between(secondLatestPayment.getDate(), latestPayment.getDate());
      intervalSecondToThird = ChronoUnit.DAYS.between(thirdLatestPayment.getDate(), secondLatestPayment.getDate());

      if (Math.abs(intervalLatestToSecond - intervalSecondToThird) > 15
          || (intervalLatestToSecond >= 165) && (intervalLatestToSecond <= 195)) {
        regularPaymentsPerYear = new BigDecimal("2");
      } else if (intervalLatestToSecond <= 35) {
        regularPaymentsPerYear = new BigDecimal("12");
      } else if (intervalLatestToSecond >= 80 && intervalLatestToSecond <= 100) {
        regularPaymentsPerYear = new BigDecimal("4");
      } else if (intervalLatestToSecond >= 350 && intervalLatestToSecond <= 380) {
        regularPaymentsPerYear = BigDecimal.ONE;
      } else {
        log.warn(
            "Could not estimate regular dividend payments for securityId {} - latest regular pay dates: {}, {}, {}",
            securityId, latestPayment.getDate(), secondLatestPayment.getDate(), thirdLatestPayment.getDate());
        continue;
      }

      /*
       * If the respective depot position was consolidated by security group, also consolidate the dividend payment.
       */
      if (securityGroups.containsKey(securityId) && !depotPositions.containsKey(securityId)) {
        securityId = securityGroups.get(securityId).getId();
      }

      if (depotPositions.containsKey(securityId)) {
        if (dividendYields.containsKey(securityId)) {
          dividendYield = dividendYields.get(securityId);
          dividendYield.getSecurityIds().add(entry.getKey());
        } else {
          dividendYield = new DividendYieldDto();
          dividendYield.setSecurityIds(new LinkedList<>());
          dividendYield.getSecurityIds().add(entry.getKey());
          dividendYield.setSecurityGroupId(depotPositions.get(securityId).getSecurityGroupId());
          dividendYield.setRegularDividendPaymentsPerYear(regularPaymentsPerYear.intValue());
          dividendYields.put(securityId, dividendYield);
          dividendYield.setEstimatedPaymentGross(BigDecimal.ZERO);
          dividendYield.setEstimatedPaymentNet(BigDecimal.ZERO);
        }

        estimatedPaymentPerYear = regularPaymentsPerYear.multiply(latestPayment.getGrossValue(), mathContext);
        estimatedPaymentPerYear =
            estimatedPaymentPerYear.add(dividendYield.getEstimatedPaymentGross(),
                mathContext);
        dividendYield.setEstimatedPaymentGross(estimatedPaymentPerYear);
        dividendYield.setCurrentYieldGross(ratioOf(estimatedPaymentPerYear, depotPositions.get(securityId).getCurrentSizeAbsolute(),
            mathContext));
        dividendYield.setYieldOnCostGross(ratioOf(estimatedPaymentPerYear, depotPositions.get(securityId).getBuyInAbsolute(),
            mathContext));

        estimatedPaymentPerYear = regularPaymentsPerYear.multiply(latestPayment.getNetValue(mathContext));
        estimatedPaymentPerYear =
            estimatedPaymentPerYear.add(dividendYield.getEstimatedPaymentNet(),
                mathContext);
        dividendYield.setEstimatedPaymentNet(estimatedPaymentPerYear);
        dividendYield.setCurrentYieldNet(ratioOf(estimatedPaymentPerYear, depotPositions.get(securityId).getCurrentSizeAbsolute(),
            mathContext));
        dividendYield.setYieldOnCostNet(ratioOf(estimatedPaymentPerYear, depotPositions.get(securityId).getBuyInAbsolute(),
            mathContext));
      }
    }

    List<DividendYieldDto> result = new ArrayList<>(dividendYields.values());
    result.sort((a, b) -> b.getYieldOnCostGross().compareTo(a.getYieldOnCostGross()));
    return result;
  }

  private List<Transaction> getRegularDividends(Set<Long> depotIds, List<Transaction> transactions) {
    List<Transaction> regularDividends = transactions.stream().filter(e -> e.getTransactionType().equals(
        TransactionTypeDto.DIVIDEND)).toList();
    if (depotIds.size() == 1) {
      return regularDividends;
    }

    List<Transaction> consolidated = new ArrayList<>(transactions.size());
    final double maxDifferenceInDays = 7;
    boolean consolidateWithPrevious;
    Transaction previous = null;

    for (Transaction transaction : regularDividends) {
      consolidateWithPrevious = previous != null && ChronoUnit.DAYS.between(previous.getDate(),
          transaction.getDate()) <= maxDifferenceInDays;
      if (consolidateWithPrevious) {
        consolidateTransaction(previous, transaction);
      } else {
        previous = transaction;
        consolidated.add(transaction);
      }
    }

    return consolidated;
  }

  private void consolidateTransaction(Transaction base, Transaction summand) {
    base.setGrossValue(base.getGrossValue().add(summand.getGrossValue(), mathContext));
    BigDecimal baseValue = base.getTax() == null ? BigDecimal.ZERO : base.getTax();
    BigDecimal summandValue = summand.getTax() == null ? BigDecimal.ZERO : summand.getTax();
    base.setTax(baseValue.add(summandValue, mathContext));

    baseValue = base.getFee() == null ? BigDecimal.ZERO : base.getFee();
    summandValue = summand.getFee() == null ? BigDecimal.ZERO : summand.getFee();
    base.setFee(baseValue.add(summandValue, mathContext));
  }

  private List<Dividend> consolidateDividendsBySecurityGroup(List<Dividend> dividends) {
    Map<Long, Dividend> consolidatedDividends = new HashMap<>();
    List<Dividend> result = new ArrayList<>(dividends.size());
    Dividend consolidatedDividend;
    Long securityGroupId;

    for (Dividend dividend : dividends) {
      securityGroupId = dividend.getSecurityGroupId();
      if (securityGroupId == null) {
        result.add(dividend);
        continue;
      }

      consolidatedDividend = consolidatedDividends.get(securityGroupId);
      if (consolidatedDividend == null) {
        result.add(dividend);
        consolidatedDividends.put(securityGroupId, dividend);
      } else {
        consolidateDividend(consolidatedDividend, dividend);
      }
    }
    return result;
  }

  private void consolidateDividend(Dividend base, Dividend summand) {
    List<Long> baseSecurityIds = base.getSecurityIds();
    List<Long> summandSecurityIds = summand.getSecurityIds();
    for (Long securityId : summandSecurityIds) {
      if (!baseSecurityIds.contains(securityId)) {
        baseSecurityIds.add(securityId);
      }
    }

    base.setAbsoluteValueGross(base.getAbsoluteValueGross().add(summand.getAbsoluteValueGross(), mathContext));
    base.setAbsoluteValueNet(base.getAbsoluteValueNet().add(summand.getAbsoluteValueNet(), mathContext));
  }

  private void setDisplayNames(DividendsDto dividends) {
    Map<Long, String> securityNames = securityService.getNamesById();
    Map<Long, SecurityGroup> securityGroups = securityGroupService.getSecurityGroupsBySecurityId();
    Consumer<DividendDto> setDisplayNames = dividend -> {
      List<Long> securityIds = dividend.getSecurityIds();
      if (securityIds.size() == 1) {
        dividend.setDisplayName(securityNames.get(securityIds.get(0)));
      } else {
        dividend.setDisplayName(securityGroups.get(securityIds.get(0)).getName());
      }
    };

    dividends.getByYear().forEach(byYear -> byYear.getDividends().forEach(setDisplayNames));
    dividends.getByQuarter().forEach(byQuarter -> byQuarter.getDividends().forEach(setDisplayNames));
    dividends.getByMonth().forEach(byMonth -> byMonth.getDividends().forEach(setDisplayNames));
    dividends.getDividendYield().forEach(dividendYield -> {
      List<Long> securityIds = dividendYield.getSecurityIds();
      if (securityIds.size() == 1) {
        dividendYield.setDisplayName(securityNames.get(securityIds.get(0)));
      } else {
        SecurityGroup securityGroup;
        int i = 0;
        do {
          securityGroup = securityGroups.get(securityIds.get(i));
          i++;
        } while (securityGroup == null && i < securityIds.size());

        if (securityGroup == null) {
          dividendYield.setDisplayName("");
        } else {
          dividendYield.setDisplayName(securityGroup.getName());
        }
      }
    });
  }

  private void validateDepotIds(Set<Long> depotIds) throws BadRequestException, NotFoundException {
    if (depotIds.isEmpty()) {
      throw new BadRequestException();
    }
    if (!depotService.depotsHaveSameCurrency(depotIds)) {
      throw new BadRequestException();
    }
  }

  private Sums getSums(List<Dividend> dividends) {
    Sums sums = new Sums();

    for (Dividend dividend : dividends) {
      sums.add(dividend);
    }

    return sums;
  }

  @Data
  private class Sums {

    private BigDecimal grossSum = BigDecimal.ZERO;
    private BigDecimal netSum = BigDecimal.ZERO;
    private List<Long> securityIds = new LinkedList<>();
    private Long securityGroupId = null;

    void add(Dividend dividend) {
      securityGroupId = dividend.getSecurityGroupId();
      grossSum = grossSum.add(dividend.getAbsoluteValueGross(), mathContext);
      netSum = netSum.add(dividend.getAbsoluteValueNet(), mathContext);

      for (Long securityId : dividend.getSecurityIds()) {
        if (!securityIds.contains(securityId)) {
          securityIds.add(securityId);
        }
      }
    }
  }
}
