import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CoinProvider } from "./components/CoinContext";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <CoinProvider>
        <App />
      </CoinProvider>
  </React.StrictMode>
);
