import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { ThemedMantineProvider } from "./components/ThemedMantineProvider";
import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";

import { client } from "./lib/apollo";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { CommunityHostProvider } from "./contexts/CommunityHostContext";
import { ThemedToaster } from "./components/ThemedToaster";
import App from "./App";
import { SpotlightNavigation } from "./components/spotlight/SpotlightNavigation";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <ThemeProvider>
          <ThemedMantineProvider>
            <AuthProvider>
              {/* Outside <App /> because Layout, the navigation and the route
                  table all need to know which community's host this is before
                  any of them render. */}
              <CommunityHostProvider>
                <SpotlightNavigation />
                <App />
                <ThemedToaster />
              </CommunityHostProvider>
            </AuthProvider>
          </ThemedMantineProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>,
);
