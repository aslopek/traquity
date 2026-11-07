package de.as.traquity.security.stocksplit;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface StockSplitService {

  List<StockSplit> getStockSplits(Long securityId) throws NotFoundException;

  void createStockSplit(StockSplit stockSplit, boolean updateTransactions, boolean updateHistoricalPrices)
      throws BadRequestException, ConflictException, NotFoundException;

  /** @return the product of new / old shares of every split with an ex-date after {@code date}; 1 without any */
  BigDecimal getSplitMultiplierAfter(long securityId, LocalDate date);
}
