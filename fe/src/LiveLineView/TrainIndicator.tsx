import type {Component} from "solid-js";
import type {Train} from "./types";

interface TrainProps {
  x: number;
  y: number;
  train: Train;
}

export const TrainIndicator: Component<TrainProps> = (props: TrainProps) => {
  const up = props.train.direction === "inbound";
  const directionMultiplier = up ? -1 : 1;
  const path =
    `M ${props.x - 4.2} ${props.y + 4.2 * directionMultiplier} ` +
    `a 6 6, 0, 1, ${up ? 0 : 1}, 8.4 0 ` +
    `l -4.2 ${4.2 * directionMultiplier} Z`;
  return (
    <path d={path} class="fill-teal-500">
      <title>{props.train.currentLocation}</title>
    </path>
  );
};
