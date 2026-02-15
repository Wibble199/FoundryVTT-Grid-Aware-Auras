/** @typedef {(actor: Actor | undefined, item: Item | undefined) => number} ExpressionExtensionResolver */
/** @typedef {Record<string, ExtensionTreeNode> | ExpressionExtension} ExtensionTreeNode */

import { warn } from "../utils/misc-utils.mjs";

/** @type {Record<string, ExtensionTreeNode>} */
const extensions = {};

const validNameRegex = /^(?:[a-z0-9\-_]+\.)*[a-z0-9\-_]+$/i;

/**
 * Registers a new radius expression extension.
 * @param {string} name The name to register the expression under. Must only use alphanumeric, '.', '-' or '_' characters, must not start or end with '.', or contain consequtive '.'s.
 * @param {ExpressionExtensionResolver} resolver Function to resolve a value. Accepts actor and item parameters.
 * @param {Object} [options]
 * @param {string} [options.description] An optional HTML message shown to the user describing this extension. Not yet implemented.
 */
export function registerRadiusExpressionExtension(name, resolver, { description = "" } = {}) {
	if (typeof resolver !== "function") {
		throw new Error("Resolver must be a function");
	}

	if (!validNameRegex.test(name)) {
		throw new Error(`Invalid name '${name}': Must only use alphanumeric, '.', '-' or '_' characters, must not start or end with '.', or contain consequtive '.'s.`);
	}

	const nameParts = name.split(".");

	// Check to see if this new extension would be a sub-property of any of the existing extenions
	// E.G. if there is an existing extension "example", we cannot register one called "example.foo".
	let current = extensions;
	for (const part of nameParts) {
		current = current[part];
		if (current === undefined) break;
		if (current instanceof ExpressionExtension) throw new Error(`Invalid name '${name}': Either an extension with this name already exits, or adding this would cause an invalid object.`);
	}

	// If current is not undefined at this point, then it is an object. That means that registering an extension with
	// this name would cause that extension to be a sub-property of a function which is invalid.
	// E.G. if there is an existing extension "foo.bar", we cannot register one called "foo" b/c "foo" is an object.
	if (current !== undefined) throw new Error(`Invalid name '${name}': Registering this would cause an invalid object.`);

	// Register extension
	current = extensions;
	for (const part of nameParts.slice(0, -1)) {
		current[part] ??= {};
		current = current[part];
	}
	current[nameParts[nameParts.length - 1]] = new ExpressionExtension(resolver, description);
}

export function hasRadiusExtensions() {
	return Object.keys(extensions).length > 0;
}

/**
 * Creates a Proxy object with getters for each extension that can be used within a roll expression.
 * The proxy will not execute any of the extension functions until required (i.e. no premature evaluation).
 * @param {Actor} actor
 * @param {Item | undefined} item
 * @returns {any}
 */
export function createRadiusExtensionProxy(actor, item) {
	const createProxy = (/** @type {string[]} */ pathParts) => {
		return new Proxy({}, {
			get(_, prop) {
				const next = getExtension([...pathParts, prop]);

				if (next === undefined)
					return undefined;

				if (next instanceof ExpressionExtension) {
					try {
						const resolvedValue = next.resolve(actor, item);
						return typeof resolvedValue === "number" ? resolvedValue : 0;
					} catch (err) {
						warn(`Error in radius expression extension '${path}'`, err);
						return 0;
					}
				}

				return createProxy([...pathParts, prop]);
			},

			has(_, prop) {
				const current = getExtension(pathParts);
				return typeof current !== "undefined" && !(current instanceof ExpressionExtension) && prop in current;
			},

			ownKeys() {
				const current = getExtension(pathParts);
				return typeof current === "undefined" || current instanceof ExpressionExtension
					? []
					: Object.keys(current);
			},

			getOwnPropertyDescriptor(_, prop) {
				const next = getExtension([...pathParts, prop]);
				return next === undefined ? undefined : {
					configurable: true,
					enumerable: true,
					get: () => next instanceof ExpressionExtension
						? next(actor, item)
						: createProxy([...pathParts, prop])
				};
			}
		});
	};

	return createProxy([]);
}

// This is a class rather than just a POJO so that we can test for it using instanceof to tell it apart from other
// objects in the `expressions` object tree.
class ExpressionExtension {
	/**
	 * @param {ExpressionExtensionResolver} resolver
	 * @param {string} description
	 */
	constructor(resolver, description) {
		this.resolve = resolver;
		this.description = description;
	}
}

/**
 * @param {string[]} pathParts
 * @returns {ExtensionTreeNode | undefined}
 */
function getExtension(pathParts) {
	let current = extensions;
	for (const part of pathParts) {
		if (part in current) current = current[part];
		else return undefined;
	}
	return current;
}
