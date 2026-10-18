import {computed, Signal} from '@angular/core';

/**
 * The frame's aggregate: one term per section, so that a section reporting itself incomplete blocks finishing without
 * any other section knowing it exists.
 */
export function enableSaveAndStart(databaseValid: Signal<boolean>, javaValid: Signal<boolean>): Signal<boolean> {
  return computed((): boolean => databaseValid() && javaValid());
}
