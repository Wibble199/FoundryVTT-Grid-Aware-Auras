/** @import { AuraConfig } from "../../data/aura.mjs"; */
import { ENTER_LEAVE_AURA_HOOK } from "../../consts.mjs";
import { getTokenAuras } from "../../data/aura.mjs";
import { pickProperties } from "../../utils/misc-utils.mjs";
import { AuraManager } from "./aura-manager.mjs";
import { Aura } from "./aura.mjs";

/**
 * Layer for managing grid-aware auras on a canvas.
 */
export class AuraLayer extends CanvasLayer {

	/** Whether the initial run has been performed or not. */
	#isInitialised = false;

	_auraManager = new AuraManager();

	/** If true, will not raise any leave hooks when tokens are destroyed. */
	_isTearingDown = false;

	/** @returns {AuraLayer | undefined} */
	static get current() {
		return game.ready ? game.canvas?.gaaAuraLayer : undefined;
	}

	/** @override */
	async _draw() {
		// Reset state
		this._auraManager.clear();
		this._isTearingDown = false;

		// We do this in the ticker with a lower priority than the token update tick, so that the TokenLayer has time to
		// initialise the tokens. If we do this now, some of the tokens may not be ready which can cause weirdness. It
		// also becomes a LOT more difficult to track whether isInit should be true or false. Doing it this way solves
		// both problems.
		canvas.app.ticker.addOnce(() => {
			this.#isInitialised = true;
			this._updateAuras({ isInit: true });
		}, undefined, PIXI.UPDATE_PRIORITY.UTILITY);
	}

	/**
	 * Removes auras for the specified token.
	 * @param {Token} token
	 */
	_onDestroyToken(token) {
		// Remove the aura PIXI objects representing this token's auras and destroy them
		const auras = this._auraManager.getTokenAuras(token);
		for (const aura of auras) {
			// Fire all leave events for the token and any other tokens in the destroyed token's auras IF we're not in
			// the process of tearing down the scene.
			if (!this._isTearingDown) {
				for (const otherToken of this._auraManager.getTokensInsideAura(token, aura.config.id)) {
					this.#handleTokenEnterLeaveAura(otherToken, token, aura.config, false, game.userId, false);
				}
			}

			// Remove the aura from the canvas
			canvas.primary.removeChild(aura.graphics);
			aura.destroy();
		}

		// Remove the token and it's auras
		this._auraManager.deregisterToken(token);
	}

	/**
	 * Updates the aura graphical positions and visibility on the canvas for all tokens, or a single token.
	 * Does not perform any collision tests.
	 * @param {Object} [options]
	 * @param {Token} [options.token] If provided, only updates the positions for auras belonging to this token.
	 */
	_updateAuraGraphics({ token } = {}) {
		// Tokens may not all be ready yet
		if (!this.#isInitialised) return;

		const tokens = token ? [token] : canvas.tokens.placeables;

		for (const token of tokens) {
			for (const aura of this._auraManager.getTokenAuras(token)) {
				aura.updatePosition();
				aura.updateVisibility();
			}
		}
	}

	/**
	 * Updates the auras on all tokens, or a single one - adding new auras, updating existing ones and removing old ones
	 * as neccessary. Will also test for collisions on the affected token(s), to account for new auras and changes.
	 * @param {Object} [options]
	 * @param {Token} [options.token] If provided, only updates the auras for the given token.
	 * @param {boolean} [options.force] If true, will force a recalculation of the auras (e.g. for when scene changes).
	 * @param {string} [options.userId] The user ID of the user that has triggered this test. Defaults to current user.
	 * @param {boolean} [options.isInit] Should be set to true when performing initial tests on scene load.
	 */
	_updateAuras({ token, tokenDelta, force = false, userId, isInit = false } = {}) {
		// Tokens may not all be ready yet
		if (!this.#isInitialised) return;

		userId ??= game.userId;
		force ||= isInit;

		/** @type {Token[]} */
		const tokens = token ? [token] : canvas.tokens.placeables;

		for (const token of tokens) {
			const auras = getTokenAuras(token);

			const previousAuras = this._auraManager.getTokenAuras(token);

			// If any of the auras that are in the map already no longer exist, remove the aura and call leave hooks for
			// any tokens that were in that aura
			for (const previousAura of previousAuras) {
				if (auras.some(a => a.id === previousAura.config.id)) continue;

				for (const otherToken of this._auraManager.getTokensInsideAura(token, previousAura.config.id)) {
					this.#handleTokenEnterLeaveAura(otherToken, token, previousAura.config, false, userId, false);
				}

				canvas.primary.removeChild(previousAura.graphics);
				previousAura.destroy();
				this._auraManager.deregisterAura(token, previousAura.config.id);
			}

			// If any of the auras in the token's aura array don't have a corresponding entry in the manager, create one
			// Also update all the auras.
			for (const auraConfig of auras) {
				const aura = previousAuras.find(a => a.config.id === auraConfig.id);
				if (aura) {
					aura.update(auraConfig, { tokenDelta, force });
				} else {
					const newAura = new Aura(token);
					newAura.update(auraConfig, { tokenDelta, force });
					canvas.primary.addChild(newAura.graphics);
					this._auraManager.registerAura(token, newAura);
				}
			}
		}

		if (token) {
			this._testCollisionsForToken(token, { tokenDelta, userId });
		} else {
			this.#testCollisions({ userId, isInit });
		}
	}

	/**
	 * Updates all of the given actor's linked tokens, as per `_updateAuras`.
	 * @param {Actor} actor Actor whose tokens to update.
	 * @param {Object} [options]
	 * @param {string} [options.userId] The user ID of the user that has triggered this test. Defaults to current user.
	 */
	_updateActorAuras(actor, { userId } = {}) {
		for (const token of actor.getActiveTokens({ linked: true, document: true })) {
			this._updateAuras({ token, userId });
		}
	}

	/**
	 * Tests whether or not a specific/all tokens are inside a specific/any auras.
	 * @param {Object} [options]
	 * @param {string} [options.userId] The user ID of the user that has triggered this test. Defaults to current user.
	 * @param {Token} [options.sourceToken] If provided, only tests the auras from this token. If not, tests all auras.
	 * @param {Record<string, any>} [options.sourceTokenDelta] If provided, prefers this over values in sourceToken.
	 * @param {Token} [options.targetToken] If provided, only tests this token against the auras. If not, tests all tokens.
	 * @param {Record<string, any>} [options.targetTokenDelta] If provided, prefers this over values in targetToken.
	 * @param {Token} [options.destroyToken] If provided, assumes that any tests involving this token are non-entered.
	 * @param {boolean} [options.useActualPosition] If false (default), uses the position of the token document. If true,
	 * uses the actual position of the token on the canvas.
	 * @param {boolean} [options.isInit] Should be set to true when performing initial tests on scene load.
	 */
	#testCollisions({
		userId,
		sourceToken,
		sourceTokenDelta,
		targetToken,
		targetTokenDelta,
		destroyToken,
		useActualPosition = false,
		isInit = false
	} = {}) {
		// Tokens may not all be ready yet
		if (!this.#isInitialised)
			return;

		// Array of the auras to test and their owner tokens
		const aurasToTest = (sourceToken
			? [sourceToken]
			: [...game.canvas.tokens.placeables]
		).flatMap(t => this._auraManager.getTokenAuras(t).map(aura => ({ parent: t, aura })));

		// Array of the tokens to test
		const tokensToTest = targetToken
			? [targetToken]
			: [...game.canvas.tokens.placeables];

		// Perform collision tests
		for (const token of tokensToTest) {

			// Prefer values from the delta if provided, if not use the token's x/y or the document's x/y depending on
			// if we want the displayed position of the token or the persisted position.
			const position = pickProperties(["x", "y"], targetTokenDelta, useActualPosition ? token : token.document);

			for (const { parent, aura } of aurasToTest) {
				if (parent.id === token.id) // token cannot enter it's own aura
					continue;

				const isInAura = aura.config.enabled
					&& parent !== destroyToken && token !== destroyToken
					&& aura.isInside(token, {
						sourceTokenPosition: sourceTokenDelta,
						useActualSourcePosition: useActualPosition,
						targetTokenPosition: position
					});

				if (this._auraManager.setIsInside(token, parent, aura.config.id, isInAura)) {
					this.#handleTokenEnterLeaveAura(token, parent, aura.config, isInAura, userId ?? game.userId, isInit);
				}
			}
		}
	}

	/**
	 * Tests collisions for the specific token.
	 * @param {Token} token
	 * @param {Object} [options]
	 * @param {Record<string, any>} [options.tokenDelta] If provided, uses values from this instead of the token's.
	 * @param {string} [options.userId] The ID of the user that has triggered this test. Default to current user.
	 * @param {boolean} [options.useActualPosition] If false (default), uses the position of the token document. If true,
	 * uses the actual position of the token on the canvas.
	 * @param {boolean} [options.destroyToken] If true, treats the passed `token` as destroy for collisions.
	 */
	_testCollisionsForToken(token, { tokenDelta, userId, useActualPosition = false, destroyToken = false } = {}) {
		this.#testCollisions({ userId, sourceToken: token, sourceTokenDelta: tokenDelta, destroyToken: destroyToken ? token : undefined, useActualPosition });
		this.#testCollisions({ userId, targetToken: token, targetTokenDelta: tokenDelta, destroyToken: destroyToken ? token : undefined, useActualPosition });
	}

	/**
	 * Method that runs any automation and calls hooks for when a token enters or leaves an aura.
	 * @param {Token} token The token that entered or left the aura.
	 * @param {Token} parent The token that owns the aura.
	 * @param {AuraConfig} aura
	 * @param {boolean} hasEntered
	 * @param {string} userId The ID of the user that has triggered this test.
	 * @param {boolean} isInit
	 */
	#handleTokenEnterLeaveAura(token, parent, aura, hasEntered, userId, isInit) {
		const isPreview = parent.isPreview || token.isPreview;

		// Call hooks
		Hooks.callAll(
			ENTER_LEAVE_AURA_HOOK,
			token,
			parent,
			aura,
			{ hasEntered, isPreview, isInit, userId }
		);
	}
}
