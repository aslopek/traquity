import {DepotState} from '../depot.state';
import {SetDepotsSliceActionArgs} from '../depot.actions';
import {DepotRead} from '../../../gen/api/depot';
import {defaultCurrency} from '../default-currency';

export function setDepotSliceReducer(state: Readonly<DepotState>, actionArgs: SetDepotsSliceActionArgs): DepotState {
  let {
    depots,
    selectedDepotIds,
  } = actionArgs;

  // if depots exist but none are selected, select the first depot
  if (depots.length > 0 && selectedDepotIds.length === 0) {
    selectedDepotIds = [depots[0].id];
  }

  let selectionIsValid: boolean = true;
  const availableDepotIds: number[] = depots.map(depot => depot.id);
  for (const selectedDepotId of selectedDepotIds) {
    if (!availableDepotIds.includes(selectedDepotId)) {
      selectionIsValid = false;
      break;
    }
  }

  if (selectionIsValid) {
    selectedDepotIds = restrictToSingleCurrency(depots, selectedDepotIds);
    return {
      ...actionArgs,
      initialized: true,
      selectedDepotCurrency: getSelectedDepotCurrency(depots, selectedDepotIds),
      selectedDepotIds
    };
  }

  if (depots.length === 0) {
    return {
      ...actionArgs,
      initialized: true,
      selectedDepotCurrency: defaultCurrency,
      selectedDepotIds: []
    };
  }

  return {
    ...actionArgs,
    initialized: true,
    selectedDepotCurrency: depots[0].currency,
    selectedDepotIds: [depots[0].id]
  };
}

function getSelectedDepotCurrency(depots: DepotRead[], selectedDepotIds: number[]): string {
  return depots.find(depot => selectedDepotIds.includes(depot.id))?.currency ?? defaultCurrency;
}

function restrictToSingleCurrency(depots: DepotRead[], selectedDepotIds: number[]): number[] {
  const firstCurrency: string | undefined = depots.find(depot => depot.id === selectedDepotIds[0])?.currency;
  return selectedDepotIds.filter(id => depots.find(depot => depot.id === id)?.currency === firstCurrency);
}
