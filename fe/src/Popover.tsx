import {JSX, type Component} from "solid-js";

export interface TooltipProps {
  children: JSX.Element;
  class?: string;
  group?: string;
}

export const Popover: Component<TooltipProps> = (props: TooltipProps) => {
  return (
    <div
      class={`absolute top-0 w-64 -left-32 mt-3 rounded flex-row justify-around hidden group-hover/popover:flex ${
        props.class || ""
      }`}
    >
      <div class="bg-white shadow-lg rounded max-w-full min-w-4 p-2">
        <div class="flex flex-row justify-around h-0">
          <div class="relative -top-3 w-3 h-3 bg-white transform rotate-45"></div>
        </div>
        {props.children}
      </div>
    </div>
  );
};
