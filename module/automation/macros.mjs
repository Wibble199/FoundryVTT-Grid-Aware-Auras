/** @import { AuraConfig, MacroConfig } from "../data/aura.mjs" */
import { ENABLE_MACRO_AUTOMATION_SETTING, MODULE_NAME } from "../consts.mjs";
import { canTargetToken } from "../data/aura-target-filters.mjs";
import { AuraLayer } from "../layers/aura-layer/aura-layer.mjs";
import { warn } from "../utils/misc-utils.mjs";

/**
 * @param {Token} token
 * @param {Token} parent
 * @param {AuraConfig} aura
 * @param {{ hasEntered: boolean; isPreview: boolean; isInit: boolean; userId: string; }} options
 */
export function onEnterLeaveAura(token, parent, aura, { hasEntered, isPreview, isInit, userId }) {
	if (!game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING)) return;

	for (const macroConfig of aura.macros) {
		if (
			(!isPreview && macroConfig.mode === "ENTER_LEAVE") ||
			(!isPreview && macroConfig.mode === "ENTER" && hasEntered) ||
			(!isPreview && macroConfig.mode === "LEAVE" && !hasEntered) ||
			(isPreview && macroConfig.mode === "PREVIEW_ENTER_LEAVE") ||
			(isPreview && macroConfig.mode === "PREVIEW_ENTER" && hasEntered) ||
			(isPreview && macroConfig.mode === "PREVIEW_LEAVE" && !hasEntered)
		) {
			tryCallMacro(macroConfig, token, parent, aura, { hasEntered, isPreview, isInit, userId });
		}
	}
}

/**
 * @param {Token} token
 * @param {string} userId
 */
export function onTokenCombatTurnStart(token, userId) {
	handleTokenCombatTurnStartEnd(token, userId, true);
}

/**
 * @param {Token} token
 * @param {string} userId
 */
export function onTokenCombatTurnEnd(token, userId) {
	handleTokenCombatTurnStartEnd(token, userId, false);
}

/**
 * @param {Token} token
 * @param {string} userId
 * @param {boolean} isTurnStart Is this being called at the start or end of the token's turn.
 */
function handleTokenCombatTurnStartEnd(token, userId, isTurnStart) {
	if (!game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING)) return;

	// 1. Run any macros that apply on the owner's turn start/end
	const relevantOwnerMode = `OWNER_TURN_${isTurnStart ? "START" : "END"}`;
	for (const aura of AuraLayer.current._auraManager.getTokenAuras(token)) {
		/** @type {Token[] | undefined} */
		let tokensInAura;

		for (const macro of aura.config.macros) {
			if (macro.mode !== "OWNER_TURN_START_END" && macro.mode !== relevantOwnerMode) continue;

			tokensInAura ??= AuraLayer.current._auraManager.getTokensInsideAura(token, aura.config.id).filter(t => !t.isPreview);
			for (const targetToken of tokensInAura) {
				tryCallMacro(macro, targetToken, parent, aura, { isTurnStart, userId });
			}
		}
	}

	// 2. Run any macros that apply on the target's turn start/end
	const relevantTargetMode = `TARGET_TURN_${isTurnStart ? "START" : "END"}`;
	for (const { parent, aura } of AuraLayer.current._auraManager.getAurasContainingToken(token, { preview: false })) {
		for (const macro of aura.config.macros) {
			if (macro.mode !== "TARGET_TURN_START_END" && macro.mode !== relevantTargetMode) continue;

			tryCallMacro(macro, token, parent, aura, { isTurnStart, userId });
		}
	}
}

/**
 * @param {boolean} isFirstRound
 * @param {boolean} isLastRound
 * @param {string} userId
 */
export function onCombatRoundChange(isFirstRound, isLastRound, userId) {
	if (!game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING)) return;

	/** @type {{ parent: Token; aura: Aura; macro: MacroConfig; targetTokens: Token[]; }[]} */
	const roundEndMacros = [];

	/** @type {{ parent: Token; aura: Aura; macro: MacroConfig; targetTokens: Token[]; }[]} */
	const roundStartMacros = [];

	for (const { parent, aura } of AuraLayer.current._auraManager.getAllAuras({ preview: false })) {
		/** @type {Token[] | undefined} */
		let targetTokens;

		for (const macro of aura.config.macros) {
			if (!isFirstRound && (macro.mode === "ROUND_START_END" || macro.mode === "ROUND_END")) {
				targetTokens ??= AuraLayer.current._auraManager.getTokensInsideAura(parent, aura.config.id).filter(t => !t.isPreview);
				roundEndMacros.push({ parent, aura, macro, targetTokens });
			}

			if (!isLastRound && (macro.mode === "ROUND_START_END" || macro.mode === "ROUND_START")) {
				targetTokens ??= AuraLayer.current._auraManager.getTokensInsideAura(parent, aura.config.id).filter(t => !t.isPreview);
				roundStartMacros.push({ parent, aura, macro, targetTokens });
			}
		}
	}

	// Run end macros before start macros
	for (const { parent, aura, macro, targetTokens } of roundEndMacros) {
		for (const token of targetTokens) {
			tryCallMacro(macro, token, parent, aura, { isRoundStart: false, userId });
		}
	}

	for (const { parent, aura, macro, targetTokens } of roundStartMacros) {
		for (const token of targetTokens) {
			tryCallMacro(macro, token, parent, aura, { isRoundStart: true, userId });
		}
	}
}

/**
 * Checks that the macro can be called on the given token, and if so calls it.
 * @param {MacroConfig} macroConfig
 * @param {Token} token
 * @param {Token} parent
 * @param {AuraConfig} aura
 * @param {any} options
 */
function tryCallMacro(macroConfig, token, parent, aura, options) {
	if (!canTargetToken(token, parent, aura, macroConfig.targetTokens)) return;

	const macro = game.macros.get(macroConfig.macroId);
	if (macro) {
		// Foundry already wraps the execution inside a try..catch, so we do not need to worry about errors thrown in macros.
		macro.execute({ token, parent, aura, options });
	} else {
		warn(`Attempted to call macro with ID '${macroConfig.macroId}' due to ${macroConfig.mode} from aura '${aura.name}' on token '${parent.name}', but it could not be found.`);
	}
}
