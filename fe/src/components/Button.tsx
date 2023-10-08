import { Component } from "solid-js";

export interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: Component<ButtonProps> = (props: ButtonProps) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};
