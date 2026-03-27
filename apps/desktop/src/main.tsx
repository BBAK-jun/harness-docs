import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { HarnessDocsServicesProvider } from "./services/HarnessDocsServicesProvider";
import { createAppServices } from "./services/createAppServices";
import "./styles/app.css";

const services = createAppServices();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HarnessDocsServicesProvider services={services}>
      <App />
    </HarnessDocsServicesProvider>
  </React.StrictMode>
);
