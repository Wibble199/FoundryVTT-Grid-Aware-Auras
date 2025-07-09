import { ENTER_LEAVE_AURA_HOOK } from "../consts.mjs";
import * as effects from "./effects.mjs";
import * as macros from "./macros.mjs";
import * as terrainHeightTools from "./terrain-height-tools.mjs";

/** @typedef {{ round: number; turn: number; combatantId: string; tokenId: string; }} CombatState */

export function setupAutomation() {
	Hooks.on(ENTER_LEAVE_AURA_HOOK, (...args) => {
		effects.onEnterLeaveAura(...args);
		macros.onEnterLeaveAura(...args);
		terrainHeightTools.onEnterLeaveAura(...args);
	});

	Hooks.on("updateCombat", (/** @type {Combat} */ combat, _delta, _options, /** @type {string} */ userId) => {
		// Combat may not be linked to a scene (combat.scene = null). In this case we can still continue, but any
		// automation will only run on tokens that are on the same scene as the user that triggered the update.
		if (!combat.previous || (combat.scene && combat.scene.id !== game.canvas.scene.id)) return;

		// Handle token's turn end
		if (combat.previous.combatantId !== combat.current.combatantId && combat.previous.tokenId?.length) {
			const token = game.canvas.tokens.get(combat.previous.tokenId);
			if (token) {
				effects.onTokenCombatTurnEnd(token, userId);
				macros.onTokenCombatTurnEnd(token, userId);
			}
		}

		// Handle the round change
		if (combat.previous.round !== combat.current.round) {
			const isFirstRound = combat.previous.round === 0;
			effects.onCombatRoundChange(isFirstRound, false, userId);
			macros.onCombatRoundChange(isFirstRound, false, userId);
		}

		// Handle token's turn start
		if (combat.previous.combatantId !== combat.current.combatantId && combat.current.tokenId?.length) {
			const token = game.canvas.tokens.get(combat.current.tokenId);
			if (token) {
				effects.onTokenCombatTurnStart(token, userId);
				macros.onTokenCombatTurnStart(token, userId);
			}
		}
	});

	// Handle end turn events on combat deletion, so long as the combat had been started (round > 0)
	Hooks.on("deleteCombat", (/** @type {Combat} */ combat, _options, userId) => {
		if (combat.round > 0) {
			effects.onCombatRoundChange(false, true, userId);
			macros.onCombatRoundChange(false, true, userId);
		}
	});
}
