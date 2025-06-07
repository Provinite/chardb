import 'styled-components';
import { Theme } from '@thclone/ui';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}