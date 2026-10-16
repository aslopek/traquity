package de.as.traquity.depot.transaction;

import de.as.traquity.common.error.BadRequestException;
import de.as.traquity.common.error.ConflictException;
import de.as.traquity.common.error.InternalServerErrorException;
import de.as.traquity.common.error.NotFoundException;
import de.as.traquity.common.pagination.PageContainer;
import de.as.traquity.depot.DepotService;
import de.as.traquity.depot.transaction.api.model.TransactionTypeDto;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
class TransactionServiceImpl implements TransactionService {

  private final TransactionMapper transactionMapper;
  private final TransactionRepository transactionRepository;
  private final DepotService depotService;
  private final MathContext mathContext;
  private final EntityManager entityManager;

  @Override
  public Transaction createTransaction(Long depotId, Transaction transaction)
      throws BadRequestException, NotFoundException {
    // the foreign key violation would surface as a 400 and could not be told apart from an unknown securityId
    if (!depotService.depotExists(depotId)) {
      throw new NotFoundException();
    }

    TransactionEntity entity = transactionMapper.toEntity(transaction);
    entity.setDepotId(depotId);
    entity = persist(entity);
    return transactionMapper.fromEntity(entity);
  }

  @Override
  public Transaction getTransactions(Long depotId, Long transactionId) throws NotFoundException {
    TransactionEntity entity =
        transactionRepository.findByIdAndDepotId(transactionId, depotId).orElseThrow(NotFoundException::new);
    return transactionMapper.fromEntity(entity);
  }

  @Override
  public List<Transaction> getTransactions(Set<Long> depotIds, Set<TransactionTypeDto> transactionTypes)
      throws BadRequestException {
    if (depotIds == null || depotIds.isEmpty() || transactionTypes == null || transactionTypes.isEmpty()) {
      throw new BadRequestException();
    }
    List<TransactionEntity> entities =
        transactionRepository.findAllByDepotIdInAndTransactionTypeInOrderByDateAscTimeAsc(depotIds, transactionTypes);
    return entities.stream().map(transactionMapper::fromEntity).toList();
  }

  @Override
  public List<Transaction> getTransactions(Set<Long> depotIds, Set<Long> securityIds,
                                           Set<TransactionTypeDto> transactionTypes) throws BadRequestException {
    if (depotIds == null || depotIds.isEmpty() || securityIds == null || securityIds.isEmpty()
        || transactionTypes == null || transactionTypes.isEmpty()) {
      throw new BadRequestException();
    }
    List<TransactionEntity> entities =
        transactionRepository.findAllByDepotIdInAndSecurityIdInAndTransactionTypeInOrderByDateAscTimeAsc(depotIds,
            securityIds, transactionTypes);
    return entities.stream().map(transactionMapper::fromEntity).toList();
  }

  @Override
  @Transactional(readOnly = true)
  public void forEachTransaction(Set<Long> depotIds, Set<Long> securityIds, Set<TransactionTypeDto> transactionTypes,
                                 Consumer<Transaction> consumer) throws BadRequestException {
    if (depotIds == null || depotIds.isEmpty() || transactionTypes == null || transactionTypes.isEmpty()
        || (securityIds != null && securityIds.isEmpty())) {
      throw new BadRequestException();
    }
    try (Stream<TransactionEntity> entities = securityIds == null
        ? transactionRepository.streamAllByDepotIdInAndTransactionTypeInOrderByDateAscTimeAscIdAsc(depotIds, transactionTypes)
        : transactionRepository.streamAllByDepotIdInAndTransactionTypeInAndSecurityIdInOrderByDateAscTimeAscIdAsc(depotIds,
        transactionTypes, securityIds)) {
      entities.forEach(entity -> {
        consumer.accept(transactionMapper.fromEntity(entity));
        entityManager.detach(entity);
      });
    }
  }

  @Override
  public PageContainer<Transaction> getTransactions(TransactionPageRequest request)
      throws BadRequestException, NotFoundException {
    if (request == null) {
      throw new BadRequestException();
    }
    request.validate();
    Set<Long> depotIds = request.getDepotIds();
    if (depotIds != null && depotIds.stream().anyMatch(depotId -> !depotService.depotExists(depotId))) {
      throw new NotFoundException();
    }
    PageRequest pageRequest = PageRequest.of(request.getPage(), request.getPageSize());
    Specification<TransactionEntity> specification = new TransactionSpecification(request);
    Page<TransactionEntity> transactions = transactionRepository.findAll(specification, pageRequest);

    PageContainer<Transaction> result = new PageContainer<>();
    result.setTotal(transactions.getTotalElements());
    result.setCurrentPage(request.getPage());
    // an empty result has no pages at all, so the last page stays 0 rather than underflowing to -1
    result.setLastPage(Math.max(0, transactions.getTotalPages() - 1));
    result.setPageSize(request.getPageSize());
    result.setItems(transactions.stream().map(transactionMapper::fromEntity).toList());
    return result;
  }

  @Override
  public List<Transaction> getTransactions(Long depotId, TransactionTypeDto transactionType, LocalDate date) {
    List<TransactionEntity> transactions =
        transactionRepository.findAllByDepotIdAndTransactionTypeAndDate(depotId, transactionType, date);
    List<Transaction> result = new LinkedList<>();
    for (TransactionEntity transaction : transactions) {
      result.add(transactionMapper.fromEntity(transaction));
    }
    return result;
  }

  @Override
  @Transactional
  public Transaction updateTransaction(Transaction transaction)
      throws BadRequestException, ConflictException, NotFoundException {
    TransactionEntity existing = transactionRepository.findByIdAndDepotId(transaction.getId(), transaction.getDepotId())
        .orElseThrow(NotFoundException::new);
    if (!existing.getVersion().equals(transaction.getVersion())) {
      throw new ConflictException();
    }
    TransactionEntity entity = transactionMapper.toEntity(transaction);
    entity = persist(entity);
    return transactionMapper.fromEntity(entity);
  }

  @Override
  public void splitAdjustment(Long securityId, BigDecimal multiplier, LocalDate exDate) {
    transactionRepository.findAllBySecurityIdAndDateLessThan(securityId, exDate).forEach(transaction -> {
      BigDecimal count = transaction.getSecurityCountSplitAdjusted();
      if (count == null) {
        count = transaction.getSecurityCountOriginal();
      }
      count = count.multiply(multiplier, mathContext);
      transaction.setSecurityCountSplitAdjusted(count);
      transactionRepository.save(transaction);
    });
    transactionRepository.flush();
  }

  @Override
  @Transactional
  public void deleteTransaction(Long depotId, Long transactionId) throws ConflictException, NotFoundException {
    TransactionEntity entity =
        transactionRepository.findByIdAndDepotId(transactionId, depotId).orElseThrow(NotFoundException::new);
    try {
      transactionRepository.delete(entity);
      transactionRepository.flush();
    } catch (ObjectOptimisticLockingFailureException e) {
      throw new ConflictException();
    }
  }

  private TransactionEntity persist(TransactionEntity transaction)
      throws ConflictException, InternalServerErrorException {
    TransactionEntity saved;
    try {
      saved = transactionRepository.saveAndFlush(transaction);
    } catch (ObjectOptimisticLockingFailureException e) {
      throw new ConflictException();
    } catch (DataIntegrityViolationException e) {
      throw new BadRequestException();
    } catch (Exception e) {
      log.error("{}: {}", e.getClass().getName(), e.getMessage());
      throw new InternalServerErrorException();
    }
    return saved;
  }
}
