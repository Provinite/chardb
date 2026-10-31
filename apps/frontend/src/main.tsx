import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client";
import { ThemedMantineProvider } from "./components/ThemedMantineProvider";
import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";

import { client } from "./lib/apollo";
import { reloadOnStaleChunk } from "./lib/chunkReload";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { CommunityHostProvider } from "./contexts/CommunityHostContext";
import { ThemedToaster } from "./components/ThemedToaster";
import App from "./App";
import { TransitionRouter } from "./routes/TransitionRouter";
import { preloadCurrentPage } from "./routes/preloadRoute";
import { SpotlightNavigation } from "./components/spotlight/SpotlightNavigation";
import "./index.css";
import "./styles/global.css";

reloadOnStaleChunk();
// In parallel with the sign-in check, which the route table waits on.
preloadCurrentPage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <TransitionRouter>
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
      </TransitionRouter>
    </ApolloProvider>
  </React.StrictMode>,
);
