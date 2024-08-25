import type {Component} from "solid-js";
import type {Direction, Train} from "./types";

interface TrainProps {
  x: number;
  y: number;
  train: Train;
  mapDirection: Direction;
}

export const TrainIndicator: Component<TrainProps> = (props: TrainProps) => {
  const up = props.train.direction !== props.mapDirection;
  const directionMultiplier = up ? -1 : 1;
  const path =
    `M ${props.x - 4.2} ${props.y + 4.2 * directionMultiplier} ` +
    `a 6 6, 0, 1, ${up ? 0 : 1}, 8.4 0 ` +
    `l -4.2 ${4.2 * directionMultiplier} Z`;
  return (
    <path d={path} class="fill-teal-500">
      <title>{`Train to ${
        props.train.destination
      }, currently ${props.train.currentLocation[0].toLowerCase()}${props.train.currentLocation.substring(
        1
      )} [${props.train.vehicleId}]`}</title>
    </path>
  );
};
