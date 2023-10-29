import {Accessor, onCleanup} from "solid-js";

export function clickOutside(el: HTMLElement, accessor: Accessor<() => void>) {
  const onClick = (e: MouseEvent) => !el.contains(e.target as Node) && accessor()?.();
  document.body.addEventListener("click", onClick);
  onCleanup(() => document.body.removeEventListener("click", onClick));
}

declare module "solid-js" {
  namespace JSX {
    interface DirectiveFunctions {
      clickOutside: typeof clickOutside;
    }
  }
}
