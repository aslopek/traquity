package de.as.traquity.depot.transaction;

/**
 * Fired when transaction was created, updated or deleted individually.
 *
 * @param previous its state before the change, {@code null} on creation
 * @param current  its state after the change, {@code null} on deletion
 */
public record TransactionChangedEvent(Transaction previous, Transaction current) {}
