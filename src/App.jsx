import React from "react";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.js";
import "./asset/css/Chat.css";
import { BrowserRouter, Route, Switch } from "react-router-dom";

import Home from "./pages/Home";

class App extends React.Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route component={Home} path="/" exact />
          <Route component={Home} path="/connections" exact>
            <Home connections />
          </Route>
          <Route component={Home} path="/:address" exact />
        </Switch>
      </BrowserRouter>
    );
  }
}

export default App;
