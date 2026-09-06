import React, { forwardRef } from "react";
import { Link } from "react-router-dom";
import { localPath } from "../lib/communityHost";

type HostAwareLinkProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  /** Where to go. A path, or an absolute URL on any of this site's hosts. */
  to: string;
};

/**
 * A link that navigates client-side when it can and reloads the page when it
 * must.
 *
 * Splitting communities onto their own hosts made every cross-scope link
 * absolute, and the router cannot cross an origin -- so those had to become
 * plain anchors. The cost was paid by links that do NOT cross: a community's
 * character roster builds absolute URLs for characters in that same community,
 * and every click was a full page load of the app it was already running.
 *
 * The destination decides. Same origin gets a `<Link>`, anything else gets an
 * `<a>`, and callers no longer have to know which case they are in -- which
 * they often cannot, since it depends on which host the component rendered on.
 */
export const HostAwareLink = forwardRef<HTMLAnchorElement, HostAwareLinkProps>(
  ({ to, children, ...rest }, ref) => {
    const path = localPath(to);

    if (path !== null) {
      return (
        <Link to={path} ref={ref} {...rest}>
          {children}
        </Link>
      );
    }

    return (
      <a href={to} ref={ref} {...rest}>
        {children}
      </a>
    );
  },
);

HostAwareLink.displayName = "HostAwareLink";
