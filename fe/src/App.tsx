import type {Component, JSX} from "solid-js";
import logo from "./assets/logo-64.png";

const App: Component<{children?: JSX.Element}> = (props) => {
  return (
    <div class="">
      <header class="bg-slate-800 text-slate-100 h-12 w-full flex flex-row items-center justify-center text-lg">
        <div class="max-w-7xl w-full px-3">
          <div class="flex flex-row justify-between items-center">
            <img src={logo} class="inline h-5 mr-2" />
            <p class="grow">Severe Delays</p>
          </div>
        </div>
      </header>
      <div class="p-4 max-w-7xl mx-auto">{props.children}</div>
    </div>
  );
};

export default App;
