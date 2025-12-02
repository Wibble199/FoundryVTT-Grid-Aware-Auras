/** @import { AuraConfig, AuraConfigWithRadius } from "./data/aura.mjs" */
import { DOCUMENT_AURAS_FLAG, MODULE_NAME } from "./consts.mjs";
import { auraDefaults, getDocumentOwnAuras as getDocumentOwnAurasImpl } from "./data/aura.mjs";
import { AuraLayer } from "./layers/aura-layer/aura-layer.mjs";
import { toggleEffect as toggleEffectImpl } from "./utils/misc-utils.mjs";

/**
 * Creates a new aura on the provided document.
 * @param {Token | TokenDocument | Item} owner The entity that will own the aura.
 * @param {Omit<Partial<AuraConfig>, "id" | "_v">} aura The aura to create.
 * @param {Promise<void>}
 */
export async function createAura(owner, aura = {}) {
	owner = owner instanceof Token ? owner.document : owner;

	const auras = getDocumentOwnAurasImpl(owner);
	const newAura = foundry.utils.mergeObject(auraDefaults(), aura, { inplace: false });
	newAura.id = foundry.utils.randomID();
	await owner.update({ [`flags.${MODULE_NAME}.${DOCUMENT_AURAS_FLAG}`]: [...auras, newAura] });
}

/**
 * Deletes the aura(s) matching the given filter on the provided document.
 * @param {Token | TokenDocument | Item} owner The entity that owns the auras to delete.
 * @param {{ name?: string | RegExp; id?: string | RegExp; }} filter
 * @param {Object} [options]
 * @param {boolean} [options.includeItems] When the owner is a token, whether or not to also delete auras on owned items.
 * @returns {Promise<void>}
 */
export async function deleteAuras(owner, filter, { includeItems = false } = {}) {
	owner = owner instanceof Token ? owner.document : owner;

	await Promise.all([
		deleteAuraImpl(owner),
		...owner instanceof TokenDocument && includeItems ? owner.actor?.items?.map(deleteAuraImpl) ?? [] : []
	]);

	async function deleteAuraImpl(target) {
		const auras = getDocumentOwnAurasImpl(target);
		const filteredAuras = auras.filter(aura => !auraFilterTest(aura, filter));

		if (auras.length !== filteredAuras.length) {
			await target.update({ [`flags.${MODULE_NAME}.${DOCUMENT_AURAS_FLAG}`]: filteredAuras });
		}
	}
}

/**
 * For the given document, returns the auras defined on that document.
 * @param {Token | TokenDocument | Item} owner
 * @returns {AuraConfigWithRadius}
 */
export function getDocumentOwnAuras(owner) {
	owner = owner instanceof Token ? owner.document : owner;
	return getDocumentOwnAurasImpl(owner, { calculateRadius: true });
}

/**
 * For the given token, returns the auras defined on that token and any items owned by the token's actor.
 * @param {Token | TokenDocument} token
 * @returns {{ aura: AuraConfigWithRadius; owner: Document; }[]}
 */
export function getTokenAuras(token) {
	const tokenDoc = token instanceof Token ? token.document : token;

	return [
		...getDocumentOwnAuras(tokenDoc).map(aura => ({ aura, owner: tokenDoc })),
		...tokenDoc.actor?.items?.map(item => getDocumentOwnAuras(item).map(aura => ({ aura, owner: item })))?.flat() ?? []
	];
}

/**
 * Returns an array of auras that the given token is currently inside.
 * @param {Token | { id: string; preview: boolean; }} token
 */
export function getAurasContainingToken(token) {
	return (AuraLayer.current?._auraManager.getAurasContainingToken(token) ?? [])
		.map(({ parent, aura }) => ({ parent, aura: aura.config }));
}

/**
 * Returns an array of tokens that are inside the given aura.
 * @param {Token | { id: string; preview: boolean; }} parent The token that owns the aura.
 * @param {string} auraId The ID of the aura to check.
 */
export function getTokensInsideAura(parent, auraId) {
	return AuraLayer.current?._auraManager.getTokensInsideAura(parent, auraId) ?? [];
}

/**
 * Determines if the testToken is inside the given aura belonging to parentToken.
 * @param {Token | { id: string; preview: boolean; }} testToken The token that will be checked to see if it is inside the aura.
 * @param {Token | { id: string; preview: boolean; }} parentToken The token that owns the aura being checked.
 * @param {string} auraId The ID of the aura to test.
 */
export function isTokenInside(testToken, parentToken, auraId) {
	return AuraLayer.current?._auraManager.isInside(testToken, parentToken, auraId) ?? false;
}

/**
 * Can be used to toggle an effect on a target token or actor. If the user calling the function is able to modify the
 * actor, does so immediately. If the user cannot, the action is delegated to a GM user. If no GMs are present, the
 * action will fail.
 * Requires the 'Enable Effect Automation' setting to be turned on.
 * @param {Token | TokenDocument | Actor | string} target A token, token document, actor, or UUID for a token or actor which the effect will be applied to/removed from.
 * @param {string} effectId The ID of the effect to add to/remove from the target.
 * @param {boolean} state true to apply the effect, or false to remove it.
 * @param {Object} [options]
 * @param {boolean} [options.overlay] Whether to apply the effect as an overlay.
 * @returns {Promise<void>}
 */
export async function toggleEffect(target, effectId, state, { overlay = false } = {}) {
	// Try get the actor from the passed target.
	let actor;
	if (target instanceof Token || target instanceof TokenDocument) {
		actor = target.actor;
	} else if (target instanceof Actor) {
		actor = target;
	} else if (typeof target === "string") {
		const targetFromUuid = await fromUuid(target);
		return await toggleEffect(targetFromUuid, effectId, state, { overlay });
	}

	if (!actor) {
		throw new Error("Could not resolve actor.");
	}

	// Toggle the effect
	await toggleEffectImpl(actor, effectId, !!state, { overlay }, true);
}

/**
 * Updates the aura(s) matching the given filter with the given partial data or function.
 * @param {Token | TokenDocument | Item} owner The entity that owns the auras to update.
 * @param {{ name?: string | RegExp; id?: string | RegExp; }} filter
 * @param {Partial<AuraConfig> | ((existing: AuraConfig) => Partial<AuraConfig>)} update
 * @param {Object} [options]
 * @param {boolean} [options.includeItems] When the owner is a token, whether or not to also affect auras on owned items.
 * @returns {Promise<void>}
 */
export async function updateAuras(owner, filter, update, { includeItems = false } = {}) {
	owner = owner instanceof Token ? owner.document : owner;

	if (!update || !["object", "function"].includes(typeof update)) {
		throw new Error("Must provide an object or a function as the `update` parameter.");
	}

	await Promise.all([
		updateAuraImpl(owner),
		...owner instanceof TokenDocument && includeItems ? owner.actor?.items?.map(updateAuraImpl) ?? [] : []
	]);

	async function updateAuraImpl(target) {
		const auras = getDocumentOwnAurasImpl(target);
		let anyMatched = false;
		for (const aura of auras) {
			if (auraFilterTest(aura, filter)) {
				Object.assign(aura, typeof update === "function" ? update(aura) : update);
				anyMatched = true;
			}
		}

		if (anyMatched) {
			await target.update({ [`flags.${MODULE_NAME}.${DOCUMENT_AURAS_FLAG}`]: auras });
		}
	}
}

/**
 * @param {AuraConfig} aura
 * @param {{ name?: string | RegExp; id?: string | RegExp; } | undefined} filter
 */
function auraFilterTest(aura, filter) {
	return (
		(
			filter?.id === undefined ||
			(typeof filter.id === "string" && aura.id === filter.id) ||
			(filter.id instanceof RegExp && filter.id.test(aura.id))
		) &&
		(
			filter?.name === undefined ||
			(typeof filter.name === "string" && aura.name.localeCompare(filter.name, undefined, { sensitivity: "accent" }) === 0) ||
			(filter.name instanceof RegExp && filter.name.test(aura.name))
		)
	);
}
