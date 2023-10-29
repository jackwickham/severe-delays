import {type Component} from "solid-js";
import {Button} from "./Button";

export interface ButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
}

export interface SplitButtonProps {
  buttons: ButtonProps[];
}

export const SplitButton: Component<SplitButtonProps> = (props: SplitButtonProps) => {
  return (
    <div class="flex flex-row">
      {props.buttons.map((button) => (
        <Button
          {...button}
          rounded={false}
          class="first:rounded-s-md last:rounded-e-md border-l-0 first:border-l-2"
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
};
