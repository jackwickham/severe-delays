import {type Accessor, onCleanup} from "solid-js";
import type {DOMElement} from "solid-js/jsx-runtime";

export function clickOutside(el: DOMElement, accessor: Accessor<() => void>) {
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
