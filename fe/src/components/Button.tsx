import {type Component, type JSX} from "solid-js";

export interface ButtonProps {
  children: JSX.Element;
  active?: boolean;
  class?: string;
  rounded?: boolean;
  onClick: () => void;
}

export const Button: Component<ButtonProps> = (props: ButtonProps) => {
  return (
    <button
      class={`border-2 border-slate-700 px-2 py-1 ${props.class}`}
      classList={{
        "bg-slate-700": props.active,
        "bg-slate-100": !props.active,
        "text-slate-100": props.active,
        "rounded-md": props.rounded !== false,
      }}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
};
