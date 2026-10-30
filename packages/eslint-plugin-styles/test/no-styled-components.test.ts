import rule from "../src/rules/no-styled-components";
import { ruleTester } from "./ruleTester";

const options = [{ root: "/repo", allow: ["apps/frontend/src/Old.tsx"] }];
const newFile = "/repo/apps/frontend/src/New.tsx";
const error = { messageId: "styledComponents" };

ruleTester.run("no-styled-components", rule, {
  valid: [
    {
      code: 'import styled from "styled-components";',
      filename: "/repo/apps/frontend/src/Old.tsx",
      options,
    },
    {
      code: 'import { style } from "@vanilla-extract/css";',
      filename: newFile,
      options,
    },
  ],
  invalid: [
    {
      code: 'import styled from "styled-components";',
      filename: newFile,
      options,
      errors: [error],
    },
    {
      code: 'import { css, keyframes } from "styled-components";',
      filename: newFile,
      options,
      errors: [error],
    },
    {
      code: 'export { ThemeProvider } from "styled-components";',
      filename: newFile,
      options,
      errors: [error],
    },
    {
      code: 'const sc = await import("styled-components");',
      filename: newFile,
      options,
      errors: [error],
    },
  ],
});
