/* @refresh reload */
import {render} from "solid-js/web";

import "./index.css";
import App from "./App";
import {Route, Router} from "@solidjs/router";
import {LineHistory} from "./LineHistory";
import {LiveLineView} from "./LiveLineView";
import {NotFound} from "./NotFound";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <Router root={App}>
      <Route path="/" component={LineHistory} />
      <Route path="/live/:line" component={LiveLineView} />
      <Route path="*" component={NotFound} />
    </Router>
  ),
  root!
);
