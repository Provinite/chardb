/**
 * A whole-page navigation that replaces the current history entry, for
 * destinations on another host the router cannot reach. Its own module so
 * tests can observe it without patching `window.location`.
 */
export const replaceLocation = (url: string): void => {
  window.location.replace(url);
};
