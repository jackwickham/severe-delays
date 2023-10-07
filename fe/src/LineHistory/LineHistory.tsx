import {For, type Component} from "solid-js";
import {Line} from "./Line";
import {State} from "./types";

export const LineHistory: Component = () => {
  const statusHistory = [
    {
      startTime: new Date("2023-09-02T00:00:00Z"),
      status: {
        state: State.GOOD_SERVICE,
        reason: null,
      },
    },
    {
      startTime: new Date("2023-09-02T08:00:00Z"),
      status: {
        state: State.MINOR_DELAYS,
        reason: "Signal failure",
      },
    },
    {
      startTime: new Date("2023-09-02T12:00:00Z"),
      status: {
        state: State.SEVERE_DELAYS,
        reason: "Faulty train",
      },
    },
    {
      startTime: new Date("2023-09-02T16:00:00Z"),
      status: {
        state: State.PART_SUSPENDED,
        reason: "Signal failure",
      },
    },
    {
      startTime: new Date("2023-09-02T20:00:00Z"),
      status: {
        state: State.SUSPENDED,
        reason: "Customer incident",
      },
    },
    {
      startTime: new Date("2023-09-03T00:00:00Z"),
      status: {
        state: State.PART_CLOSED,
        reason:
          "METROPOLITAN LINE: Saturday 7 and Sunday 8 October, no service between Wembley Park and Amersham / Chesham / Uxbridge / Watford. Chiltern Railways services will not run between Marylebone and Amersham. Replacement buses operate, but will not serve Preston Road, Northwick Park or stations between Harrow-on-the-Hill and Uxbridge. Please use local London Buses services.",
      },
    },
    {
      startTime: new Date("2023-09-03T04:00:00Z"),
      status: {
        state: State.CLOSED,
        reason: "Engineering works",
      },
    },
    {
      startTime: new Date("2023-09-03T14:00:00Z"),
      status: {
        state: State.GOOD_SERVICE,
        reason: null,
      },
    },
  ];
  const displayRange = {
    start: new Date("2023-09-01T22:00:00Z"),
    end: new Date("2023-09-04T00:00:00Z"),
  };
  // Colours from https://content.tfl.gov.uk/tfl-colour-standard-issue-08.pdf
  const lines = [
    {
      name: "Jubilee line",
      statusHistory: statusHistory,
      colour: {
        r: 123,
        g: 134,
        b: 140,
      },
    },
    {
      name: "Metropolitan line",
      statusHistory: statusHistory,
      colour: {
        r: 135,
        g: 15,
        b: 84,
      },
    },
    {
      name: "Northern line",
      statusHistory: statusHistory,
      colour: {
        r: 0,
        g: 0,
        b: 0,
      },
    },
    {
      name: "Elizabeth line",
      statusHistory: [
        {
          startTime: new Date("2023-01-01T00:00:00Z"),
          status: {
            state: State.SEVERE_DELAYS,
            reason: "¯\\_(ツ)_/¯",
          },
        },
      ],
      colour: {
        r: 119,
        g: 61,
        b: 189,
      },
    },
  ];
  return (
    <div class="space-y-10">
      <For each={lines}>
        {(line) => (
          <Line
            name={line.name}
            statusHistory={line.statusHistory}
            colour={line.colour}
            displayRange={displayRange}
          />
        )}
      </For>
    </div>
  );
};
