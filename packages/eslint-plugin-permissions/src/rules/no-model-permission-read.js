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

/** The keys of a query's argument under which rows are chosen or ordered. */
const FILTERING = new Set(["where", "orderBy", "having"]);

/**
 * Where the database's models are declared: the generated Prisma client, and
 * the runtime types it computes query results with.
 */
const PRISMA_CLIENT = ["/.prisma/client/", "/@prisma/client/"];

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
        return isModel(property) || isModel(part.aliasSymbol ?? part.symbol);
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

    /**
     * Whether an object literal sits under a filtering key of an argument to
     * one of the client's own functions. Those are generic over their
     * argument, so the literal is typed by inference and never as a
     * `*WhereInput`.
     * @param {RuleNode} literal
     */
    const isInlineModelFilter = (literal) => {
      let filtering = false;
      /** @type {RuleNode | null} */
      let node = literal;
      while (node && node.type !== "CallExpression") {
        if (node.type === "Property") {
          const name = keyName(node);
          if (name && FILTERING.has(name)) filtering = true;
        }
        // A function is a new scope for arguments: `$transaction((tx) => ...)`
        // does not make its callback's literals arguments of `$transaction`.
        if (
          node.type === "ArrowFunctionExpression" ||
          node.type === "FunctionExpression" ||
          node.type === "FunctionDeclaration"
        ) {
          return false;
        }
        node = node.parent;
      }
      if (!node || !filtering) return false;

      const signature = checker.getResolvedSignature(
        /** @type {import("typescript").CallExpression} */ (tsNodes.get(node)),
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
        const { parent } = node;
        // An assignment's pattern has the type of what it assigns to, so ask
        // about the value instead.
        const source =
          parent.type === "AssignmentExpression" && parent.left === node
            ? parent.right
            : node;

        for (const property of node.properties) {
          if (property.type !== "Property") continue;
          const name = keyName(property);
          if (!name || !PERMISSION.test(name)) continue;

          const from = checker.getTypeAtLocation(tsNodes.get(source));
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
