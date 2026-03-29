import { ClientActivityLogProvider } from "./components/ClientActivityLogProvider";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { OverlayProvider } from "overlay-kit";
import { GlobalUnhandledExceptionBoundary } from "./components/GlobalUnhandledExceptionBoundary";
import { Toaster } from "./components/ui/sonner";
import { router } from "./router";
import { HarnessDocsServicesProvider } from "./services/HarnessDocsServicesProvider";
import { createAppServices } from "./services/createAppServices";
import "./styles/app.css";

const services = createAppServices();
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalUnhandledExceptionBoundary>
      <OverlayProvider>
        <HarnessDocsServicesProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <ClientActivityLogProvider>
              <RouterProvider router={router} />
              <Toaster />
            </ClientActivityLogProvider>
          </QueryClientProvider>
        </HarnessDocsServicesProvider>
      </OverlayProvider>
    </GlobalUnhandledExceptionBoundary>
  </React.StrictMode>,
);
