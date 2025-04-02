/** @import { Aura } from "./aura.mjs" */

import { getOrCreate, warn } from "../../utils/misc-utils.mjs";

/** @typedef {Token | { id: string; isPreview: boolean; }} PartialToken */

const cidSeparator = "|";

/**
 * Class for managing and looking up auras.
 */
export class AuraManager {

	/**
	 * Map of token composite IDs onto a map of aura IDs onto Aura instances.
	 * @type {Map<string, Map<string, Aura>>}
	 */
	#tokenAuraMap = new Map();

	/**
	 * Map of token composite IDs onto a set of auras composite IDs that the token is inside.
	 * @type {Map<string, Set<string>>}
	 */
	#aurasContainingToken = new Map();

	/**
	 * Map of aura composite IDs onto a set of token composite IDs that are inside that aura.
	 * @type {Map<string, Set<string>>}
	 */
	#tokensInAura = new Map();

	/**
	 * Returns all active auras.
	 * @param {Object} [filter]
	 * @param {boolean} [filter.preview] If not undefined, excludes (when false) or only includes (when true) preview token auras.
	 */
	*getAllAuras({ preview } = {}) {
		for (const [tokenCId, auraMap] of this.#tokenAuraMap) {
			// Apply preview filter
			if (preview !== undefined && this.#parseTokenCompositeId(tokenCId).isPreview !== preview) continue;

			const parent = this.#getTokenFromCompositeId(tokenCId);
			if (!parent) continue;

			for (const aura of auraMap.values())
				yield { parent, aura };
		}
	}

	/**
	 * Gets the Aura instances belonging to the given token.
	 * @param {PartialToken} token
	 */
	getTokenAuras(token) {
		const tokenCId = this.#getTokenCompositeId(token);
		const auras = this.#tokenAuraMap.get(tokenCId);
		return auras ? [...auras.values()] : [];
	}

	/**
	 * Returns the tokens that are within the given aura.
	 * @param {PartialToken} parentToken The token that owns the aura.
	 * @param {string} auraId
	 */
	getTokensInsideAura(parentToken, auraId) {
		const auraCId = this.#getAuraCompositeId(parentToken, auraId);
		const tokenCIds = [...(this.#tokensInAura.get(auraCId) ?? [])];
		return tokenCIds.map(cid => this.#getTokenFromCompositeId(cid)).filter(t => !!t);
	}

	/**
	 * Returns the auras that the given token is inside.
	 * @param {PartialToken} token
	 * @param {Object} [filter]
	 * @param {boolean} [filter.preview] If not undefined, excludes (when false) or only includes (when true) preview token auras.
	 */
	getAurasContainingToken(token, { preview } = {}) {
		const tokenCId = this.#getTokenCompositeId(token);
		const auraCIds = [...(this.#aurasContainingToken.get(tokenCId) ?? [])];
		return auraCIds
			.filter(cid => preview === undefined || this.#parseAuraCompositeId(cid).tokenIsPreview === preview)
			.map(cid => this.#getAuraFromCompositeId(cid))
			.filter(t => !!t);
	}

	/**
	 * Adds a new aura to the manager for tracking.
	 * @param {PartialToken} parentToken The token that owns this aura.
	 * @param {Aura} aura The `Aura` instance to register.
	 */
	registerAura(parentToken, aura) {
		// Get the sub-map to hold the auras for this token, or create it if it does not exist
		const tokenCId = this.#getTokenCompositeId(parentToken);
		const tokenAuras = getOrCreate(this.#tokenAuraMap, tokenCId, () => new Map());

		// Add the aura to the map
		tokenAuras.set(aura.config.id, aura);
	}

	/**
	 * Determines if the aura with the given ID and parent token is registed in the manager.
	 * @param {PartialToken} parentToken The token that owns this aura.
	 * @param {string} auraId
	 */
	hasAura(parentToken, auraId) {
		const tokenCId = this.#getTokenCompositeId(parentToken);
		return this.#tokenAuraMap.get(tokenCId)?.has(auraId) ?? false;
	}

	/**
	 * Determines if a token is inside the aura with the given parent token and ID.
	 * @param {PartialToken} token The token to check whether it is inside/outside the aura.
	 * @param {PartialToken} parent The token that owns the aura.
	 * @param {string} auraId
	 */
	isInside(token, parent, auraId) {
		const tokenCId = this.#getTokenCompositeId(token);
		const auraCId = this.#getAuraCompositeId(parent, auraId);
		return this.#aurasContainingToken.get(tokenCId)?.has(auraCId) ?? false;
	}

	/**
	 * Sets whether or not the given token is inside the aura with the given ID.
	 * @param {PartialToken} token The token that has entered/left the aura.
	 * @param {PartialToken} parent The token that owns the aura.
	 * @param {string} auraId
	 * @param {boolean} isInside Whether token is inside the aura.
	 * @returns true if the the inside state has changed (i.e. the token was in but is not anymore; or vice versa)
	 */
	setIsInside(token, parent, auraId, isInside) {
		const tokenCId = this.#getTokenCompositeId(token);
		const auraCId = this.#getAuraCompositeId(parent, auraId);
		const isCurrentlyInside = this.#aurasContainingToken.get(tokenCId)?.has(auraCId) ?? false;
		if (isInside === isCurrentlyInside) return false; // no change needed

		// Add to or remove aura from the token-to-auras map.
		const aurasContainingToken = getOrCreate(this.#aurasContainingToken, tokenCId, () => new Set());
		aurasContainingToken[isInside ? "add" : "delete"](auraCId);

		// Add to or remove aura from the aura-to-tokens map.
		const tokensInAura = getOrCreate(this.#tokensInAura, auraCId, () => new Set());
		tokensInAura[isInside ? "add" : "delete"](tokenCId);

		return true;
	}

	/**
	 * Removes a token from the manager, removing any auras the token may have had and any known collisions on this
	 * token. Note that this does not remove the auras from the scene, so handle that first.
	 * @param {PartialToken} token
	 */
	deregisterToken(token) {
		const tokenCId = this.#getTokenCompositeId(token);

		// Remove this token from the maps which hold data about which tokens are inside which auras
		const aurasOwnedByToken = this.#tokenAuraMap.get(tokenCId);
		if (aurasOwnedByToken) {
			for (const auraId of aurasOwnedByToken.keys()) {
				const auraCId = this.#getAuraCompositeId(token, auraId);
				this.#deregisterAuraFromCollisions(auraCId);
			}
		}

		// Remove the token from any sets in the tokensInAura map.
		const aurasContainingToken = this.#aurasContainingToken.get(tokenCId);
		if (aurasContainingToken) {
			for (const auraId of aurasContainingToken) {
				this.#tokensInAura.get(auraId)?.delete(tokenCId);
			}
		}

		// Remove the map holding the auras this token is in
		this.#aurasContainingToken.delete(tokenCId);

		// Remove the map holding this token's auras
		this.#tokenAuraMap.delete(tokenCId);
	}

	/**
	 * Removes an aura from the manager. Note that this does not remove the aura from the scene, so that needs to be
	 * handled separately.
	 * @param {PartialToken} token
	 * @param {string} auraId
	 * @returns true if the aura existed and was deleted, or false if it did not exist.
	 */
	deregisterAura(token, auraId) {
		// Try remove the aura from the map
		const tokenCId = this.#getTokenCompositeId(token);
		const map = this.#tokenAuraMap.get(tokenCId);
		if (!map) return false;
		if (!map.delete(auraId)) return false;

		// If the aura was removed, also look up any tokens that were colliding with it and remove those entries.
		const auraCId = this.#getAuraCompositeId(token, auraId);
		this.#deregisterAuraFromCollisions(auraCId);
		return true;
	}

	/** @param {string} auraCId */
	#deregisterAuraFromCollisions(auraCId) {
		const tokensInsideAura = this.#tokensInAura.get(auraCId);
		if (!tokensInsideAura) return;

		// Delete this aura from other tokens' collisions
		for (const tokenId of tokensInsideAura) {
			this.#aurasContainingToken.get(tokenId)?.delete(auraCId);
		}

		// Delete the aura's own collisions
		this.#tokensInAura.delete(auraCId);
	}

	/** Deregisters everything this manager is keeping track of. */
	clear() {
		this.#tokenAuraMap.clear();
		this.#aurasContainingToken.clear();
		this.#tokensInAura.clear();
	}

	/**
	 * Gets a Token's composite ID.
	 * @param {PartialToken} token
	 */
	#getTokenCompositeId(token) {
		return [token.id, token.isPreview].join(cidSeparator);
	}

	/**
	 * Parses a token's composite ID.
	 * @param {string} tokenCId
	 */
	#parseTokenCompositeId(tokenCId) {
		const [tokenId, isPreviewStr] = tokenCId.split(cidSeparator);
		return { tokenId, isPreview: isPreviewStr === "true" };
	}

	/**
	 * Attempts to get a Token from a token composite ID.
	 * @param {string} tokenCId
	 * @returns {Token | undefined}
	 */
	#getTokenFromCompositeId(tokenCId) {
		const { tokenId, isPreview } = this.#parseTokenCompositeId(tokenCId);
		const token = canvas.tokens.placeables.find(t => t.id === tokenId && t.isPreview === isPreview);
		if (!token) warn(`getTokenFromCompositeId: A token matching composite ID '${tokenCId}' was not found.`);
		return token;
	}

	/**
	 * Gets an Aura's composite ID.
	 * @param {PartialToken} parent The token that owns the aura. Can be partial.
	 * @param {string} auraId The ID of the aura.
	 * @returns {string}
	 */
	#getAuraCompositeId(parent, auraId) {
		return [parent.id, parent.isPreview, auraId].join(cidSeparator);
	}

	/**
	 * Parses an aura's composite ID.
	 * @param {string} auraCId
	 */
	#parseAuraCompositeId(auraCId) {
		const [tokenId, tokenIsPreview, auraId] = auraCId.split(cidSeparator);
		return { tokenId, tokenIsPreview: tokenIsPreview === "true", auraId };
	}

	/**
	 * Attempts to get an Aura from an aura's composite ID.
	 * @param {string} auraCId
	 */
	#getAuraFromCompositeId(auraCId) {
		const { tokenId, tokenIsPreview, auraId } = this.#parseAuraCompositeId(auraCId);
		const tokenCId = this.#getTokenCompositeId({ id: tokenId, isPreview: tokenIsPreview });
		const parent = this.#getTokenFromCompositeId(tokenCId);
		const aura = this.#tokenAuraMap.get(tokenCId)?.get(auraId);
		if (!aura) warn(`getAuraFromCompositeId: An aura matching composite ID '${auraCId}' was not found.`);
		return aura && parent ? { parent, aura } : null;
	}
}
