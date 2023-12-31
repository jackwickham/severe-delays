import type {Component} from "solid-js";
import {LineHistory} from "./LineHistory";
import logo from "./assets/logo-64.png";
import {Route, Routes} from "@solidjs/router";
import {LiveLineView} from "./LiveLineView";
import {NotFound} from "./NotFound";

const App: Component = () => {
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
      <div class="p-4 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" component={LineHistory} />
          <Route path="/live/:line" component={LiveLineView} />
          <Route path="*" component={NotFound} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
