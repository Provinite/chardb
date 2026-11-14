// @ts-check
const ts = require("typescript");

/**
 * @typedef {import("typescript").Symbol} TsSymbol
 * @typedef {import("typescript").Type} TsType
 * @typedef {import("@typescript-eslint/parser").ParserServicesWithTypeInformation} Services
 * @typedef {import("estree").Node} Node
 */

/** `isAdmin`, and every `can*` column of an account or a role. */
const PERMISSION = /^(isAdmin|can[A-Z]\w*)$/;

/** The generated input types that filter rows. */
const WHERE_INPUT = /Where(Unique)?Input$/;

/** Where the database's models are declared: the generated Prisma client. */
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
        "`{{name}}` filters rows by a role's column here, which answers for the account and not for this request. Use RequestPermissions.communityIdsWith().",
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
    const tsNodes =
      /** @type {{ get(node: Node): import("typescript").Node }} */ (
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

    /** @param {TsType} type */
    const isModelFilter = (type) =>
      parts(type).some((part) => {
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
    const keyName = (property) =>
      !property.computed && property.key.type === "Identifier"
        ? property.key.name
        : undefined;

    return {
      // user.isAdmin, role.canEditCharacter
      MemberExpression(node) {
        if (node.computed || node.property.type !== "Identifier") return;
        const { name } = node.property;
        if (!PERMISSION.test(name)) return;

        const from = checker.getTypeAtLocation(tsNodes.get(node.object));
        const symbol = checker.getSymbolAtLocation(tsNodes.get(node.property));
        const messageId = isUntyped(from)
          ? "untyped"
          : isModel(symbol)
            ? "read"
            : undefined;
        if (messageId) {
          context.report({ node: node.property, messageId, data: { name } });
        }
      },

      // const { isAdmin } = user
      ObjectPattern(node) {
        for (const property of node.properties) {
          if (property.type !== "Property") continue;
          const name = keyName(property);
          if (!name || !PERMISSION.test(name)) continue;

          const from = checker.getTypeAtLocation(tsNodes.get(node));
          const isRead = parts(checker.getNonNullableType(from)).some((part) =>
            isModel(part.getProperty(name)),
          );
          const messageId = isUntyped(from)
            ? "untyped"
            : isRead
              ? "read"
              : undefined;
          if (messageId) {
            context.report({ node: property.key, messageId, data: { name } });
          }
        }
      },

      // where: { role: { canEditCharacter: true } }
      ObjectExpression(node) {
        for (const property of node.properties) {
          if (property.type !== "Property") continue;
          const name = keyName(property);
          if (!name || !PERMISSION.test(name)) continue;

          const expected = checker.getContextualType(
            /** @type {import("typescript").Expression} */ (tsNodes.get(node)),
          );
          if (expected && isModelFilter(checker.getNonNullableType(expected))) {
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
