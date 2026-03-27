import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { HarnessDocsServicesProvider } from "./services/HarnessDocsServicesProvider";
import { createAppServices } from "./services/createAppServices";
import "./styles/app.css";

const services = createAppServices();
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HarnessDocsServicesProvider services={services}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </HarnessDocsServicesProvider>
  </React.StrictMode>
);
