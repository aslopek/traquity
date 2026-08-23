import {WritableSignalStore} from "../../../../../common/types/signal-store.type";
import {PickedDatabase} from "../../../../../bridge/startup-bridge.type";
import {ConfigureStoreState} from "../../configure.store";
import {selectExistingDatabase} from "./select-existing-database";
import {selectNewDatabase} from "./select-new-database";

export function adoptPickedDatabase(signalStore: WritableSignalStore<ConfigureStoreState>,
                                    picked: PickedDatabase): void {
  if (picked.fileExists) {
    selectExistingDatabase(signalStore, picked.basePath);
    return;
  }
  selectNewDatabase(signalStore, picked.basePath);
}
