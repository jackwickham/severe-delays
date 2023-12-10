import {type Component, type JSX} from "solid-js";
import {classList} from "solid-js/web";

export interface ButtonProps {
  children: JSX.Element;
  active?: boolean;
  class?: string;
  rounded?: boolean;
  padded?: boolean;
  onClick?: () => void;
}

export const Button: Component<ButtonProps> = (props: ButtonProps) => {
  return (
    <button
      class={`border-2 border-slate-700 ${props.class || ""}`}
      classList={{
        "bg-slate-700": props.active,
        "hover:bg-slate-600": props.active,
        "bg-slate-100": !props.active,
        "hover:bg-slate-200": !props.active,
        "text-slate-100": props.active,
        "rounded-md": props.rounded !== false,
        "px-2": props.padded !== false,
        "py-1": props.padded !== false,
      }}
      onClick={() => props.onClick?.()}
    >
      {props.children}
    </button>
  );
};
