import 'styled-components';
import { Theme } from '@chardb/ui';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}