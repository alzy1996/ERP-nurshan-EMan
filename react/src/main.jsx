import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./lib/firebase"; // init Firebase + anonymous auth early
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
