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
 * The keys of a query's argument under which rows are chosen or ordered. A
 * nested `deleteMany` takes its filter directly, with no `where` around it.
 */
const FILTERING = new Set(["where", "orderBy", "having", "deleteMany"]);

/**
 * The client's generated types that carry a model's column names without
 * being a row of it: what is written, what is selected, and what is counted.
 */
const NOT_A_ROW =
  /(Input(Type)?|Select(Scalar)?|Include|Omit|Args|OutputType|FieldEnum|AggregateType)$/;

/**
 * Where the database's models are declared: the generated Prisma client, and
 * the runtime types it computes query results with.
 */
const PRISMA_CLIENT = ["/.prisma/client/", "/@prisma/client/"];

/**
 * The runtime's types that compute the rows a query returns: what `select`,
 * `include`, `omit` and `groupBy` give back. Their mapped types are the only
 * declaration a selected column has.
 */
const PRISMA_ROWS = [
  "GetFindResult",
  "DefaultSelection",
  "ApplyOmit",
  "UnwrapPayload",
  "GetGroupByResult",
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
     * Whether `name` on a value of this type is a model's column. Either the
     * column itself is declared by the client, or the type that carries it
     * is one the client computed: what a `select` returns has no declaration
     * for its columns, only for the mapped type that produced them.
     * @param {TsType} type
     * @param {string} name
     */
    const readsModel = (type, name) =>
      parts(checker.getNonNullableType(type)).some((part) => {
        const property = part.getProperty(name);
        if (!property) return false;
        return isRowColumn(property) || isComputedRow(part.getSymbol());
      });

    /**
     * @param {TsType} type what is being read from
     * @param {string} name
     * @returns {"untyped" | "read" | undefined}
     */
    const verdict = (type, name) =>
      isUntyped(type) ? "untyped" : readsModel(type, name) ? "read" : undefined;

    /** @param {TsType} type */
    const isModelFilter = (type) =>
      parts(checker.getNonNullableType(type)).some((part) => {
        const symbol = part.aliasSymbol ?? part.getSymbol();
        return (
          symbol !== undefined &&
          WHERE_INPUT.test(symbol.getName()) &&
          isModel(symbol)
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

    /** @param {RuleNode} call a CallExpression */
    const callsModel = (call) => {
      const signature = checker.getResolvedSignature(
        /** @type {import("typescript").CallExpression} */ (tsNodes.get(call)),
      );
      const declaration = signature?.getDeclaration();
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
     * Whether an object literal sits under a filtering key of an argument to
     * one of the client's own functions. Those are generic over their
     * argument, so the literal is typed by inference and never as a
     * `*WhereInput`.
     *
     * A literal a callback returns counts when the callback itself is under
     * the filtering key: `where: { OR: ids.map((id) => ({ ... })) }`. A
     * filtering key inside a callback does not reach out of it, so the body
     * of `$transaction((tx) => ...)` is not an argument to `$transaction`.
     * @param {RuleNode} literal
     */
    const isInlineModelFilter = (literal) => {
      let filtering = false;
      let leftCallback = false;
      for (
        /** @type {RuleNode | null} */ let node = literal;
        node;
        node = node.parent
      ) {
        if (node.type === "Property") {
          const name = keyName(node);
          if (name && FILTERING.has(name)) filtering = true;
        } else if (
          node.type === "ArrowFunctionExpression" ||
          node.type === "FunctionExpression"
        ) {
          filtering = false;
          leftCallback = true;
        } else if (node.type === "CallExpression") {
          if (callsModel(node)) return filtering;
          // Past the call a callback was handed to, and no other.
          if (!leftCallback) return false;
          leftCallback = false;
        } else if (
          node.type === "FunctionDeclaration" ||
          node.type === "Program"
        ) {
          return false;
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
          const pattern = tsNodes.get(node);
          const from = ts.isObjectLiteralExpression(pattern)
            ? checker.getTypeOfAssignmentPattern(pattern)
            : checker.getTypeAtLocation(pattern);
          const messageId = verdict(from, name);
          if (messageId) {
            context.report({ node: property.key, messageId, data: { name } });
          }
        }
      },

      // where: { role: { canEditCharacter: true } }
      ObjectExpression(node) {
        /** @type {boolean | undefined} */
        let filters;
        for (const property of node.properties) {
          if (property.type !== "Property") continue;
          const name = keyName(property);
          if (!name || !PERMISSION.test(name)) continue;

          if (filters === undefined) {
            const expected = checker.getContextualType(
              /** @type {import("typescript").Expression} */ (
                tsNodes.get(node)
              ),
            );
            filters =
              (expected !== undefined && isModelFilter(expected)) ||
              isInlineModelFilter(node);
          }
          if (filters) {
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
