import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  useTransition,
} from "react";
import { Router } from "react-router-dom";
import {
  createBrowserHistory,
  type Action,
  type Location,
} from "@remix-run/router";

const RouteTransitionContext = createContext(false);

interface RouterState {
  action: Action;
  location: Location;
}

/**
 * True while a navigation is waiting on the next page's code. The page being
 * left stays on screen meanwhile; this is what the top progress bar reads.
 */
export const useRouteTransitionPending = (): boolean =>
  useContext(RouteTransitionContext);

/**
 * `BrowserRouter`, with every location change applied as a transition.
 *
 * Pages are lazy-loaded (see `routes/pages.ts`). A navigation to a page whose
 * chunk has not arrived suspends, and as a transition React keeps the current
 * page on screen until the next one can render, instead of swapping in the
 * Suspense fallback. React Router's own `v7_startTransition` flag does the
 * same but keeps the pending state to itself; owning the transition here is
 * what lets the progress bar know a navigation is under way.
 *
 * The address bar still changes at once: the history entry is pushed
 * synchronously, and only React's render of it waits.
 */
export const TransitionRouter: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [history] = useState(() => createBrowserHistory({ v5Compat: true }));
  const [state, setState] = useState<RouterState>({
    action: history.action,
    location: history.location,
  });
  const [pending, startTransition] = useTransition();

  // A layout effect, so no navigation made by a child's mount effect is
  // missed between render and subscription.
  useLayoutEffect(
    () =>
      history.listen(({ action, location }) =>
        startTransition(() => setState({ action, location })),
      ),
    [history],
  );

  return (
    <RouteTransitionContext.Provider value={pending}>
      <Router
        location={state.location}
        navigationType={state.action}
        navigator={history}
      >
        {children}
      </Router>
    </RouteTransitionContext.Provider>
  );
};
