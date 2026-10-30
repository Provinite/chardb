# Frontend architecture

How components in the frontend and `@chardb/ui` divide the work. How they look is in [STYLING.md](./STYLING.md).

## Two kinds of component

**Data components** decide what to show. They run Apollo queries and mutations, read the router, auth and the current community, and handle loading and errors. Pages are data components.

**Presentational components** show what they are given. Everything arrives through props; anything the user does leaves through callbacks (`onSave`, `onSelect`). They hold UI state only: whether a menu is open, what is typed in a field before it is submitted.

A presentational component never imports `@apollo/client`, `react-router-dom`, generated GraphQL hooks or app contexts. If it needs something from one of them, its data component passes it in.

```tsx
// TradeList.tsx: data
export const TradeList = () => {
  const { data, loading } = useMyTradesQuery();
  const [accept] = useAcceptTradeMutation();
  if (loading) return <TradeListSkeleton />;
  return (
    <TradeListView
      trades={data.myTrades}
      onAccept={(id) => accept({ variables: { id } })}
    />
  );
};

// TradeListView.tsx: presentational
export const TradeListView = ({ trades, onAccept }: TradeListViewProps) => (
  <DataTable.Root rows={trades}>{/* … */}</DataTable.Root>
);
```

When one component does both, split it: the data component keeps the name, and its presentational half takes a `View` suffix in the same folder. A component small enough that splitting adds nothing (a page that renders one view) may stay whole.

Presentational components are tested by rendering them with props, without `MockedProvider` or a router. Data components are tested for what they fetch and pass down.

## Where components live

| Kind | Lives in |
|---|---|
| Building blocks: primitives, layout, form controls, `DataTable`, `Menu`, `Truncate` | `@chardb/ui` |
| Presentational components for one area of the app (a character card, a trade row) | `apps/frontend/src/components/<area>/` |
| Data components | Beside the presentational components they feed, or in `pages/` |

Presentational components in the frontend are built from `@chardb/ui` parts. A component unique to one page is fine, but check `@chardb/ui` for a part before writing markup and styles from scratch.

### `@chardb/ui`

The package may know what a user or character is: `UserTypeahead` and `CharacterTypeahead` take users and characters as props. It never fetches, routes or reads app state; the caller supplies the data. It does not declare `@apollo/client` or `react-router-dom`, and importing an undeclared package is a lint error (`import/no-extraneous-dependencies`), so a fetch in `ui` fails CI.

A component moves into `@chardb/ui` when a second area of the app needs it, or when it is a pattern STYLING.md names. Until then it stays beside the page that uses it. Moving it means removing anything specific to its first use: props become general, copy comes from the caller.

Every part in `@chardb/ui` forwards `className` and `ref`, and changes behaviour through composition rather than props (see [Components](./STYLING.md#components)).
