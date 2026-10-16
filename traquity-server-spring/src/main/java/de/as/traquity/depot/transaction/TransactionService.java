package de.as.traquity.depot.transaction;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.pagination.PageContainer;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

public interface TransactionService {

  Transaction createTransaction(Long depotId, Transaction transaction) throws BadRequestException, NotFoundException;

  Transaction getTransactions(Long depotId, Long transactionId) throws NotFoundException;

  List<Transaction> getTransactions(Set<Long> depotIds, Set<TransactionTypeDto> transactionTypes)
      throws BadRequestException;

  List<Transaction> getTransactions(Set<Long> depotIds, Set<Long> securityIds, Set<TransactionTypeDto> transactionTypes)
      throws BadRequestException;

  void forEachTransaction(Set<Long> depotIds, Set<Long> securityIds, Set<TransactionTypeDto> transactionTypes,
                          Consumer<Transaction> consumer) throws BadRequestException;

  PageContainer<Transaction> getTransactions(TransactionPageRequest request)
      throws BadRequestException, NotFoundException;

  List<Transaction> getTransactions(Long depotId, TransactionTypeDto transactionType, LocalDate date);

  Transaction updateTransaction(Transaction transaction)
      throws BadRequestException, ConflictException, NotFoundException;

  void splitAdjustment(Long securityId, BigDecimal multiplier, LocalDate exDate);

  void deleteTransaction(Long depotId, Long transactionId) throws ConflictException, NotFoundException;
}
