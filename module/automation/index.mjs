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

	// Note that this ONLY runs on the client that triggers the combat change.
	// For now this is fine because we're only dealing with effects - which should only run once.
	// In future, if this is needed for other automations that should run on all clients, need to either change the hook
	// or broadcast that it's happened over the socket.
	Hooks.on("combatTurnChange", (_combat, /** @type {CombatState} */ previous, /** @type {CombatState} */ current) => {
		// Handle token's turn end
		if (previous.combatantId !== current.combatantId && previous.tokenId?.length) {
			const token = game.canvas.tokens.get(previous.tokenId);
			if (token) effects.onTokenCombatTurnEnd(token);
		}

		// Handle the round change
		if (previous.round !== current.round) {
			const isFirstRound = previous.round === 0;
			effects.onCombatRoundChange(isFirstRound);
		}

		// Handle token's turn start
		if (previous.combatantId !== current.combatantId && current.tokenId?.length) {
			const token = game.canvas.tokens.get(current.tokenId);
			if (token) effects.onTokenCombatTurnStart(token);
		}
	});
}
