import type { Component } from 'solid-js';
import { LineHistory } from './LineHistory';

const App: Component = () => {
  return (
    <div class="">
      <header class="bg-slate-800 text-slate-100 h-12 w-full flex flex-row items-center justify-center text-lg">
        <div class="max-w-7xl w-full p-4">
          <div class="flex flex-row justify-between">
            <p class="grow">
              Severe Delays
            </p>
          </div>
        </div>
      </header>
      <div class="p-4 max-w-7xl mx-auto">
        <LineHistory />
      </div>
    </div>
  );
};

export default App;
