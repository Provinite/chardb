import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
// Registers the <altcha-widget> custom element.
import "altcha";
import type { AltchaWidgetElement } from "altcha";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "altcha-widget": React.DetailedHTMLProps<
        React.HTMLAttributes<AltchaWidgetElement>,
        AltchaWidgetElement
      > & {
        challenge?: string;
        display?: "invisible";
        auto?: "onfocus";
      };
    }
  }
}

/** What the widget's `statechange` event carries. */
interface StateDetail {
  state: string;
  payload?: string | null;
}

const stateDetail = (event: Event): StateDetail | null =>
  event instanceof CustomEvent &&
  typeof event.detail === "object" &&
  event.detail !== null &&
  typeof event.detail.state === "string"
    ? event.detail
    : null;

export interface SignupChallengeWidgetHandle {
  /**
   * The solved challenge's payload, solving it first if the work is not done
   * yet. Null when it cannot be solved.
   */
  solve: () => Promise<string | null>;
}

export interface SignupChallengeWidgetProps {
  /** The challenge JSON from `signupChallenge`. */
  challenge: string;
}

/**
 * The sign-up form's proof of work (ALTCHA), with nothing on screen.
 *
 * It starts solving when focus first enters the form, so by the time someone
 * presses Create Account the work is usually done; `solve` finishes it
 * otherwise. Remount it with a new challenge (a `key`) after a failed sign-up.
 */
export const SignupChallengeWidget = forwardRef<
  SignupChallengeWidgetHandle,
  SignupChallengeWidgetProps
>(function SignupChallengeWidget({ challenge }, ref) {
  const widget = useRef<AltchaWidgetElement>(null);
  /** The payload of a finished solve, kept from the widget's events. */
  const payload = useRef<string | null>(null);

  useEffect(() => {
    const element = widget.current;
    if (!element) return;
    const onStateChange = (event: Event) => {
      const detail = stateDetail(event);
      payload.current =
        detail?.state === "verified" ? (detail.payload ?? null) : null;
    };
    element.addEventListener("statechange", onStateChange);
    return () => element.removeEventListener("statechange", onStateChange);
  }, []);

  useImperativeHandle(ref, () => ({
    solve: async () => {
      const element = widget.current;
      if (!element) return null;
      // The solve that focus started: wait for it rather than race it.
      if (element.getState() === "verifying") {
        await new Promise<void>((resolve) => {
          const onStateChange = (event: Event) => {
            if (stateDetail(event)?.state === "verifying") return;
            element.removeEventListener("statechange", onStateChange);
            resolve();
          };
          element.addEventListener("statechange", onStateChange);
        });
      }
      if (payload.current) return payload.current;
      try {
        const result = await element.verify();
        return result?.payload ?? null;
      } catch {
        return null;
      }
    },
  }));

  return (
    <altcha-widget
      ref={widget}
      challenge={challenge}
      display="invisible"
      auto="onfocus"
    />
  );
});
