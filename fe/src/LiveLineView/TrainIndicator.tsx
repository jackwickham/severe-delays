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

  const getLocationDescription = () => {
    if (props.train.currentLocation && props.train.currentLocation.length > 0) {
      return `${props.train.currentLocation[0].toLowerCase()}${props.train.currentLocation.substring(1)}`;
    }
    if (props.train.location) {
      if (props.train.location.type === "at") {
        return "at station";
      } else if (props.train.location.type === "leaving") {
        return "leaving station";
      } else if (props.train.location.type === "approaching") {
        return "approaching station";
      } else if (props.train.location.type === "left") {
        return "departed station";
      } else if (props.train.location.type === "between") {
        return "between stations";
      }
    }
    return "unknown location";
  };

  return (
    <path d={path} class="fill-teal-500">
      <title>{`Train to ${props.train.destination}, currently ${getLocationDescription()} [${
        props.train.vehicleId
      }]`}</title>
    </path>
  );
};
