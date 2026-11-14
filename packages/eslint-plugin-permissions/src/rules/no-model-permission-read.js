// @ts-check
const ts = require("typescript");

/**
 * @typedef {import("typescript").Symbol} TsSymbol
 * @typedef {import("typescript").Type} TsType
 * @typedef {import("typescript").Node} TsNode
 * @typedef {import("@typescript-eslint/parser").ParserServicesWithTypeInformation} Services
 * @typedef {import("estree").Node} Node
 * @typedef {import("eslint").Rule.Node} RuleNode
 */

/** `isAdmin`, and every `can*` column of an account or a role. */
const PERMISSION = /^(isAdmin|can[A-Z]\w*)$/;

/** The generated input types that filter rows. */
const WHERE_INPUT = /Where(Unique)?Input$/;

/**
 * The keys of a query's argument under which rows are chosen or ordered. The
 * ones after `having` belong to nested writes and to paging, and take their
 * filter directly, with no `where` around it.
 */
const FILTERING = new Set([
  "where",
  "orderBy",
  "having",
  "cursor",
  "deleteMany",
  "delete",
  "disconnect",
  "connect",
  "set",
]);

/**
 * The client's generated types that carry a model's column names without
 * carrying its values: what is written, what is selected, how many rows have
 * a column set, and references to the column itself. A minimum, a maximum
 * and a grouped row do carry the value, so they are not listed.
 */
const NOT_A_ROW =
  /(Input(Type)?|Select(Scalar)?|Include|Omit|Args|CountAggregateOutputType|FieldEnum|FieldRefs)$/;

/**
 * What a value passes through on its way from an object literal to the call
 * it is an argument of. Anything else, a statement or a declaration above
 * all, means the literal is not part of that argument.
 */
const CARRIES_A_VALUE = new Set([
  "Property",
  "ObjectExpression",
  "ArrayExpression",
  "SpreadElement",
  "ConditionalExpression",
  "LogicalExpression",
  "AwaitExpression",
  "ChainExpression",
  "MemberExpression",
  "CallExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "ArrowFunctionExpression",
  "FunctionExpression",
  "SequenceExpression",
  // Everything a callback's `return` can sit inside.
  "ReturnStatement",
  "BlockStatement",
  "IfStatement",
  "SwitchStatement",
  "SwitchCase",
  "TryStatement",
  "CatchClause",
  "ForStatement",
  "ForOfStatement",
  "ForInStatement",
  "WhileStatement",
  "DoWhileStatement",
  "LabeledStatement",
]);

/** The generated input types that choose or order rows, by declared name. */
const FILTER_INPUT = /(Where\w*Input|OrderBy\w*Input)$/;

/**
 * Where the database's models are declared: the generated Prisma client, and
 * the runtime types it computes query results with.
 */
const PRISMA_CLIENT = ["/.prisma/client/", "/@prisma/client/"];

/**
 * The client's types that compute what a query returns: what `select`,
 * `include`, `omit` and an aggregate give back. Their mapped types are the
 * only declaration a selected column has.
 */
const PRISMA_ROWS = [
  "GetFindResult",
  "DefaultSelection",
  "ApplyOmit",
  "UnwrapPayload",
  // An aggregate's `_min` and `_max`. Its `_count` comes through here too,
  // and is told apart by being a number.
  "GetScalarType",
];

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow reading a permission off a database model. Needs type information.",
    },
    schema: [
      {
        type: "object",
        properties: {
          declaredIn: { type: "array", items: { type: "string" } },
          computedRows: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      read: "`{{name}}` is read off the database model here, which answers for the account and not for this request. Read it from the request's RequestPermissions (@CurrentPermissions()).",
      untyped:
        "`{{name}}` is read off a value with no type here, so it cannot be told apart from a database model. Give it a type; if it is a model whose type did not resolve, build @chardb/database.",
      filter:
        "`{{name}}` chooses rows by a permission column here, which answers for the account and not for this request. Use RequestPermissions.communityIdsWith().",
    },
  },
  create(context) {
    const services = /** @type {Partial<Services>} */ (
      context.sourceCode.parserServices
    );
    if (!services.program || !services.esTreeNodeToTSNodeMap) {
      throw new Error(
        "no-model-permission-read needs type information: set parserOptions.project for the files it runs on",
      );
    }
    const checker = services.program.getTypeChecker();
    // ESLint hands rules ESTree's node types and the parser's map is keyed
    // by its own; they are the same objects.
    const tsNodes = /** @type {{ get(node: Node): TsNode }} */ (
      /** @type {unknown} */ (services.esTreeNodeToTSNodeMap)
    );

    /** @type {string[]} */
    const declaredIn = context.options[0]?.declaredIn ?? PRISMA_CLIENT;
    /** @type {string[]} */
    const computedRows = context.options[0]?.computedRows ?? PRISMA_ROWS;

    /** @param {TsSymbol | undefined} symbol */
    const isModel = (symbol) =>
      (symbol?.getDeclarations() ?? []).some((declaration) => {
        const file = declaration.getSourceFile().fileName.replace(/\\/g, "/");
        return declaredIn.some((part) => file.includes(part));
      });

    /**
     * `any`, including what an import that did not resolve becomes. Every
     * model is one of those where the Prisma client was never generated, and
     * the rule would otherwise pass everything there.
     * @param {TsType} type
     */
    const isUntyped = (type) => (type.flags & ts.TypeFlags.Any) !== 0;

    /**
     * A type's parts: the members of a union or intersection, all the way
     * down, or the type itself.
     * @param {TsType} type
     * @returns {TsType[]}
     */
    const parts = (type) =>
      type.isUnionOrIntersection() ? type.types.flatMap(parts) : [type];

    /**
     * The named type, constant or class a declaration is written inside.
     * @param {TsNode} declaration
     */
    const containerName = (declaration) => {
      for (let node = declaration.parent; node; node = node.parent) {
        if (
          ts.isTypeAliasDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isVariableDeclaration(node) ||
          ts.isClassDeclaration(node)
        ) {
          return node.name?.getText() ?? "";
        }
      }
      return "";
    };

    /**
     * A column declared by the client as part of a row, and not as part of
     * an input, a selection or a tally, which use the same column names.
     * @param {TsSymbol | undefined} symbol
     */
    const isRowColumn = (symbol) =>
      isModel(symbol) &&
      (symbol?.getDeclarations() ?? []).some(
        (declaration) => !NOT_A_ROW.test(containerName(declaration)),
      );

    /**
     * A type the client computed a row with: one of the mapped types in
     * `computedRows`. The client has other mapped types, which count rows or
     * pass a caller's own type through.
     * @param {TsSymbol | undefined} symbol
     */
    const isComputedRow = (symbol) =>
      isModel(symbol) &&
      (symbol?.getDeclarations() ?? []).some(
        (declaration) =>
          ts.isMappedTypeNode(declaration) &&
          computedRows.includes(containerName(declaration)),
      );

    /**
     * What a type is known to be when it is, or is built from, a type
     * parameter: `T extends User`, and `T["isAdmin"]` inside `Pick<T, ...>`.
     * @param {TsType} type
     */
    const constrained = (type) => checker.getBaseConstraintOfType(type) ?? type;

    /**
     * A permission column holds a boolean. The same name with any other
     * type is something about the column: its name as a string, a count of
     * rows, a reference to it in a query.
     * @param {TsType} type
     */
    const isFlag = (type) =>
      parts(constrained(type)).some(
        (part) => (part.flags & ts.TypeFlags.BooleanLike) !== 0,
      );

    /**
     * Whether `name` on a value of this type is a model's column. Either the
     * column itself is declared by the client, or the type that carries it
     * is one the client computed: what a `select` returns has no declaration
     * for its columns, only for the mapped type that produced them.
     * @param {TsType} type
     * @param {string} name
     */
    const readsModel = (type, name) =>
      parts(checker.getNonNullableType(type))
        .flatMap((part) => parts(constrained(part)))
        .some((part) => {
          const property = part.getProperty(name);
          if (!property || !isFlag(checker.getTypeOfSymbol(property))) {
            return false;
          }
          return isRowColumn(property) || isComputedRow(part.getSymbol());
        });

    /**
     * @param {TsType} type what is being read from
     * @param {string} name
     * @returns {"untyped" | "read" | undefined}
     */
    const verdict = (type, name) =>
      isUntyped(type) ? "untyped" : readsModel(type, name) ? "read" : undefined;

    /**
     * Whether a literal expected to be this type chooses or orders rows:
     * the type is one of the client's `*WhereInput`s, or `name` on it was
     * declared in one of the client's filtering or ordering inputs.
     * @param {TsType} type
     * @param {string} name
     */
    const isModelFilter = (type, name) =>
      parts(checker.getNonNullableType(type)).some((part) => {
        const symbol = part.aliasSymbol ?? part.getSymbol();
        if (
          symbol !== undefined &&
          WHERE_INPUT.test(symbol.getName()) &&
          isModel(symbol)
        ) {
          return true;
        }
        const property = part.getProperty(name);
        return (
          isModel(property) &&
          (property?.getDeclarations() ?? []).some((declaration) =>
            FILTER_INPUT.test(containerName(declaration)),
          )
        );
      });

    /**
     * The name a property node reads or writes, when it is spelled out.
     * @param {{ computed: boolean, key: Node }} property
     */
    const keyName = (property) => {
      if (property.computed) return undefined;
      if (property.key.type === "Identifier") return property.key.name;
      if (property.key.type === "Literal") return String(property.key.value);
      return undefined;
    };

    /**
     * The type an object pattern takes apart. A pattern that assigns, at any
     * depth or in a loop, is an object literal to TypeScript, and has to be
     * asked what it is assigned from.
     * @param {TsNode} pattern
     */
    const typeTakenApart = (pattern) => {
      if (!ts.isObjectLiteralExpression(pattern)) {
        return checker.getTypeAtLocation(pattern);
      }
      try {
        return checker.getTypeOfAssignmentPattern(pattern);
      } catch {
        // The checker asserts on patterns in places the language does not
        // allow one, which is where code sits while it is being typed.
        return checker.getTypeAtLocation(pattern);
      }
    };

    /** @param {RuleNode} call a CallExpression */
    const signatureOf = (call) =>
      checker.getResolvedSignature(
        /** @type {import("typescript").CallExpression} */ (tsNodes.get(call)),
      );

    /** @param {RuleNode} call a CallExpression */
    const callsModel = (call) => {
      const declaration = signatureOf(call)?.getDeclaration();
      return (
        declaration !== undefined &&
        declaredIn.some((part) =>
          declaration
            .getSourceFile()
            .fileName.replace(/\\/g, "/")
            .includes(part),
        )
      );
    };

    /**
     * A call that hands back what it was given: one of the language's own
     * functions whose result is an object. `Promise.all`, `Object.assign`
     * and `concat` are; `JSON.stringify` and `includes` answer with a string
     * and a boolean, and a function of the project's own may do anything
     * with its argument.
     * @param {RuleNode} call a CallExpression
     */
    const returnsItsArguments = (call) => {
      const signature = signatureOf(call);
      const declaration = signature?.getDeclaration();
      if (!signature || !declaration) return false;
      if (
        !services.program?.isSourceFileDefaultLibrary(
          declaration.getSourceFile(),
        )
      ) {
        return false;
      }
      return parts(checker.getReturnTypeOfSignature(signature)).some(
        (part) => (part.flags & ts.TypeFlags.Object) !== 0,
      );
    };

    /**
     * Whether a value at `from` is what `node` evaluates to or runs, and not
     * something `node` only tests, loops over or discards.
     * @param {RuleNode} node
     * @param {RuleNode | undefined} from
     */
    const carries = (node, from) => {
      switch (node.type) {
        case "IfStatement":
        case "ConditionalExpression":
        case "SwitchCase":
          return from !== node.test;
        case "SwitchStatement":
          return from !== node.discriminant;
        case "WhileStatement":
        case "DoWhileStatement":
        case "ForStatement":
        case "ForOfStatement":
        case "ForInStatement":
          return from === node.body;
        case "SequenceExpression":
          return from === node.expressions.at(-1);
        case "MemberExpression":
          return from === node.object;
        default:
          return true;
      }
    };

    /**
     * Whether an object literal sits under a filtering key of an argument to
     * one of the client's own functions. Those are generic over their
     * argument, so the literal is typed by inference and never as a
     * `*WhereInput`.
     *
     * The literal has to reach the call as a value. One a callback returns
     * counts, and so does what a method or one of the language's own
     * functions then makes of it, as in
     * `where: { OR: ids.map((id) => ({ ... })).filter(Boolean) }`. One that
     * is only declared or tested inside a callback, or handed to some other
     * function as an argument, does not: `where: { id: idOf({ ... }) }`
     * filters by whatever `idOf` returns. A filtering key inside a callback
     * does not reach out of it either, so the body of
     * `$transaction((tx) => ...)` is not an argument to `$transaction`.
     * @param {RuleNode} literal
     */
    const isInlineModelFilter = (literal) => {
      let filtering = false;
      /** @type {RuleNode | undefined} */
      let from;
      for (
        /** @type {RuleNode | null} */ let node = literal;
        node && CARRIES_A_VALUE.has(node.type) && carries(node, from);
        from = node, node = node.parent
      ) {
        if (node.type === "Property") {
          const name = keyName(node);
          if (name && FILTERING.has(name)) filtering = true;
        } else if (
          node.type === "ArrowFunctionExpression" ||
          node.type === "FunctionExpression"
        ) {
          filtering = false;
        } else if (node.type === "CallExpression") {
          if (callsModel(node)) return filtering;
          const isCallback =
            from?.type === "ArrowFunctionExpression" ||
            from?.type === "FunctionExpression";
          if (
            from !== node.callee &&
            !isCallback &&
            !returnsItsArguments(node)
          ) {
            return false;
          }
        }
      }
      return false;
    };

    return {
      // user.isAdmin, role.canEditCharacter
      MemberExpression(node) {
        if (node.computed || node.property.type !== "Identifier") return;
        const { name } = node.property;
        if (!PERMISSION.test(name)) return;

        // A column is neither called nor, when assigned to, read.
        const { parent } = node;
        if (parent.type === "CallExpression" && parent.callee === node) return;
        if (parent.type === "AssignmentExpression" && parent.left === node) {
          return;
        }

        const from = checker.getTypeAtLocation(tsNodes.get(node.object));
        const messageId = verdict(from, name);
        if (messageId) {
          context.report({ node: node.property, messageId, data: { name } });
        }
      },

      // const { isAdmin } = user; ({ isAdmin } = user)
      ObjectPattern(node) {
        for (const property of node.properties) {
          if (property.type !== "Property") continue;
          const name = keyName(property);
          if (!name || !PERMISSION.test(name)) continue;

          // A pattern that assigns, at any depth or in a loop, is an object
          // literal to TypeScript, and has to be asked what it takes apart.
          const messageId = verdict(typeTakenApart(tsNodes.get(node)), name);
          if (messageId) {
            context.report({ node: property.key, messageId, data: { name } });
          }
        }
      },

      // where: { role: { canEditCharacter: true } }
      ObjectExpression(node) {
        /** @type {boolean | undefined} */
        let inline;
        for (const property of node.properties) {
          if (property.type !== "Property") continue;
          const name = keyName(property);
          if (!name || !PERMISSION.test(name)) continue;

          inline ??= isInlineModelFilter(node);
          const expected = checker.getContextualType(
            /** @type {import("typescript").Expression} */ (tsNodes.get(node)),
          );
          if (inline || (expected && isModelFilter(expected, name))) {
            context.report({
              node: property.key,
              messageId: "filter",
              data: { name },
            });
          }
        }
      },
    };
  },
};
