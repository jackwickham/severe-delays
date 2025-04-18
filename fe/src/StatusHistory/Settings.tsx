import {type Component, createEffect, createSignal} from "solid-js";
import {type SetStoreFunction, type Store, createStore} from "solid-js/store";
import {Button} from "../components/Button";
import {Popover} from "../Popover";
import feather from "feather-icons";

const LOCAL_STORAGE_KEY = "settings";

export interface Settings {
  includeClosedInStats: boolean;
  includePlannedClosuresInStats: boolean;
  favouriteLines: string[];
  favouriteStations: string[];
  includeStationInformationInStats: boolean;
}

type SerializedSettings = Partial<Settings>;

export interface SettingsProps {
  store: Store<Settings>;
  setStore: SetStoreFunction<Settings>;
}

export const Settings: Component<SettingsProps> = (props) => {
  let settingsButtonContainer: HTMLDivElement | undefined;
  let onShowSettingsHandler: (() => void) | undefined;
  let [settingsOpen, setSettingsOpen] = createSignal(false);
  createEffect(() => {
    if (settingsOpen()) {
      onShowSettingsHandler?.();
    }
  });
  createEffect(() => {
    const handler = (e: Event) => {
      if (settingsOpen() && !settingsButtonContainer!.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  });

  return (
    <div ref={settingsButtonContainer} class="relative">
      <Button onClick={() => setSettingsOpen(!settingsOpen())}>
        <span
          innerHTML={feather.icons.settings.toSvg({
            width: 16,
          })}
        />
      </Button>
      <div
        class="absolute w-full h-full top-0"
        classList={{
          hidden: !settingsOpen(),
        }}
      >
        <Popover setOnShowHandler={(handler) => (onShowSettingsHandler = handler)}>
          <SettingsPopoverContent {...props} />
        </Popover>
      </div>
    </div>
  );
};

const SettingsPopoverContent: Component<SettingsProps> = (props) => {
  let includeClosedInStatsCheckbox: HTMLInputElement | undefined;
  let includePlannedClosuresInStatsCheckbox: HTMLInputElement | undefined;
  let includeStationInformationInStatsCheckbox: HTMLInputElement | undefined;

  return (
    <div class="space-y-3">
      <h3 class="font-semibold text-lg">Line Settings</h3>
      <div>
        <label>
          <input
            type="checkbox"
            class="mr-2"
            ref={includeClosedInStatsCheckbox}
            checked={props.store.includeClosedInStats}
            onInput={() =>
              props.setStore({includeClosedInStats: includeClosedInStatsCheckbox!.checked})
            }
          />
          Include service closed in stats
        </label>
      </div>
      <div>
        <label>
          <input
            type="checkbox"
            class="mr-2"
            ref={includePlannedClosuresInStatsCheckbox}
            checked={props.store.includePlannedClosuresInStats}
            onInput={() =>
              props.setStore({
                includePlannedClosuresInStats: includePlannedClosuresInStatsCheckbox!.checked,
              })
            }
          />
          Include planned closures in stats
        </label>
      </div>

      <h3 class="font-semibold text-lg pt-2">Station Settings</h3>
      <div>
        <label>
          <input
            type="checkbox"
            class="mr-2"
            ref={includeStationInformationInStatsCheckbox}
            checked={props.store.includeStationInformationInStats}
            onInput={() =>
              props.setStore({
                includeStationInformationInStats: includeStationInformationInStatsCheckbox!.checked,
              })
            }
          />
          Show informational messages
        </label>
      </div>
    </div>
  );
};

export const createSettingsStore: () => [Settings, SetStoreFunction<Settings>] = () => {
  let existingSettings: SerializedSettings;
  try {
    existingSettings = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}");
  } catch (e) {
    console.warn("Failed to read settings", e);
    existingSettings = {};
  }
  const settingsWithDefaults: Settings = Object.assign(
    {
      includeClosedInStats: true,
      includePlannedClosuresInStats: true,
      favouriteLines: [],
      favouriteStations: [],
      includeStationInformationInStats: false,
    },
    existingSettings
  );

  const [store, setStore] = createStore<Settings>(settingsWithDefaults);
  createEffect(() => updatePersistedSettings(store));
  return [store, setStore];
};

const updatePersistedSettings = (settings: Settings) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
};
