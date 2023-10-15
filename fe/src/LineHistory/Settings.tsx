import {Component, createEffect, createSignal} from "solid-js";
import {SetStoreFunction, Store, createStore} from "solid-js/store";
import {Button} from "../components/Button";
import {Popover} from "../Popover";
import feather from "feather-icons";

export interface Settings {
  includeClosedInStats: boolean;
  includePlannedClosuresInStats: boolean;
}

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
    <div ref={settingsButtonContainer}>
      <Button onClick={() => setSettingsOpen(!settingsOpen())}>
        <span
          innerHTML={feather.icons.settings.toSvg({
            width: 16,
          })}
        />
      </Button>
      <div
        class="relative w-full h-full"
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

  return (
    <>
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
    </>
  );
};

export const createSettingsStore = () =>
  createStore<Settings>({
    includeClosedInStats: true,
    includePlannedClosuresInStats: false,
  });
