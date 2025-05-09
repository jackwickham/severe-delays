import {type JSX, type Component, createSignal} from "solid-js";

export interface TooltipProps {
  children: JSX.Element;
  class?: string;
  group?: string;
  setOnShowHandler: (handler: () => void) => void;
}

const PADDING_X = 4;
const PADDING_Y = 8;

export const Popover: Component<TooltipProps> = (props: TooltipProps) => {
  const [style, setStyle] = createSignal<JSX.CSSProperties>({});
  const [bottom, setBottom] = createSignal(true);

  let popoverElem: HTMLDivElement | undefined;
  let containerElem: HTMLDivElement | undefined;

  const update = () => {
    const popoverRect = popoverElem!.getBoundingClientRect();
    const containerRect = containerElem!.parentElement!.getBoundingClientRect();
    const barCenter = (containerRect.left + containerRect.right) / 2;

    let s: JSX.CSSProperties = {
      "max-width": `calc(100vw - ${PADDING_X}px)`,
    };
    let attachLeft = `-${containerRect.left - PADDING_X}px`;
    let attachRight = `-${window.innerWidth - containerRect.right - PADDING_X}px`;

    if (window.innerWidth <= popoverRect.width) {
      s.left = attachLeft;
      s.right = attachRight;
      s["justify-content"] = "space-around";
    } else if (barCenter + popoverRect.width / 2 > window.innerWidth) {
      s.right = attachRight;
      s["justify-content"] = "end";
    } else if (barCenter - popoverRect.width / 2 < 0) {
      s.left = attachLeft;
      s["justify-content"] = "start";
    } else {
      s.left = "50%";
      s.transform = "translateX(-50%)";
      s["justify-content"] = "space-around";
    }

    if (containerRect.bottom + popoverRect.height + PADDING_Y > window.innerHeight) {
      setBottom(false);
      s.bottom = "0px";
    } else {
      setBottom(true);
      s.top = "0px";
    }

    setStyle(s);
  };

  props.setOnShowHandler(() => update);

  return (
    <div
      class="absolute w-full h-0 drop-shadow-lg"
      classList={{
        "-bottom-0.5": bottom(),
        "-top-0.5": !bottom(),
      }}
      ref={containerElem}
    >
      <div
        class="flex flex-row justify-around h-full"
        classList={{
          "items-end": bottom(),
          "items-start": !bottom(),
        }}
        style={{
          width: "calc(100% + 1rem)",
          transform: "translateX(-0.5rem)",
        }}
      >
        <div
          class="relative w-3 h-3 bg-white transform rotate-45"
          classList={{
            "top-1.5": bottom(),
            "-top-1.5": !bottom(),
          }}
        ></div>
      </div>
      <div class={`absolute w-80 rounded-sm flex flex-row ${props.class || ""}`} style={style()}>
        <div
          class="bg-white rounded-sm max-w-fit min-w-4 p-2 max-h-[30rem] overflow-y-auto"
          ref={popoverElem}
        >
          {props.children}
        </div>
      </div>
    </div>
  );
};
