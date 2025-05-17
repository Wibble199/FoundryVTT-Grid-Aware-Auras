/** @import { AuraConfigWithRadius } from "./data/aura.mjs" */
import { getDocumentOwnAuras as getDocumentOwnAurasImpl } from "./data/aura.mjs";
import { AuraLayer } from "./layers/aura-layer/aura-layer.mjs";
import { toggleEffect as toggleEffectImpl } from "./utils/misc-utils.mjs";

/**
 * For the given document, returns the auras defined on that document.
 * @param {Document} document
 * @returns {AuraConfigWithRadius}
 */
export function getDocumentOwnAuras(document) {
	return getDocumentOwnAurasImpl(document, { calculateRadius: true });
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
