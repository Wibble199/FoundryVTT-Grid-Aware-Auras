/** @import { AuraConfig, EffectConfig } from "../data/aura.mjs" */
import { ENABLE_EFFECT_AUTOMATION_SETTING, MODULE_NAME, ONGOING_EFFECT_MODES } from "../consts.mjs";
import { canTargetToken } from "../data/aura-target-filters.mjs";
import { AuraLayer } from "../layers/aura-layer/aura-layer.mjs";
import { getOrCreate, groupBy, toggleEffect } from "../utils/misc-utils.mjs";

/**
 * @param {Token} token
 * @param {Token} parent
 * @param {AuraConfig} aura
 * @param {{ hasEntered: boolean; isPreview: boolean; isInit: boolean; userId: string; }} options
 */
export function onEnterLeaveAura(token, parent, aura, { hasEntered, isInit, isPreview, userId }) {
	// Do nothing if effect automation is not enabled
	if (!game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING)) return;

	// Do not run if:
	// - We're initialising (because the effects will already have be applied from last session)
	// - On preview tokens
	// - Or if the current user is not the one that triggered the change; We only want this code to run once, regardless
	//   of how many users are on the scene when it happens. Ideally we'd limit this to just GM users so that we know
	//   we'd be able to do this, however a GM user may not have this scene loaded and would not recieve this event.
	if (isInit || isPreview || userId !== game.userId || !aura.effects?.length)
		return;

	// Get a list of all effects with ongoing application modes that are applied by auras that this token is currently
	// inside (excluding any from this aura).
	const ongoingEffectTargetingToken = getOngoingAuraEffectsOnToken(token, parent, aura.id);

	// For each effect declared by this aura
	for (const auraEffect of aura.effects) {
		if (!auraEffect.effectId?.length || !canTargetToken(token, parent, aura, auraEffect.targetTokens))
			continue;

		const highestPriorityOngoingEffect = ongoingEffectTargetingToken.get(auraEffect.effectId)?.[0];

		/** @type {(v: boolean) => void} */
		const setEffect = v => toggleEffect(token.actor, auraEffect.effectId, v, { overlay: auraEffect.isOverlay }, true);

		switch (auraEffect.mode) {
			// Ongoing effects always take priority over non-ongoing effects, so the only time these top four cases
			// do anything is when there are no ongoing effects.
			case "APPLY_ON_ENTER":
			case "REMOVE_ON_ENTER":
				if (hasEntered && !highestPriorityOngoingEffect)
					setEffect(auraEffect.mode === "APPLY_ON_ENTER");
				break;

			case "APPLY_ON_LEAVE":
			case "REMOVE_ON_LEAVE":
				if (!hasEntered && !highestPriorityOngoingEffect)
					setEffect(auraEffect.mode === "APPLY_ON_LEAVE");
				break;

			// For the ongoing apply effect, we apply effect to the actor when entering the aura if the currently
			// highest priority ongoing effect is null or has a lower priority.
			// We remove the effect on leaving the aura if there is no other ongoing effect OR the next highest priority
			// ongoing effect is a "REMOVE_WHILE_INSIDE" mode effect.
			case "APPLY_WHILE_INSIDE":
				if (hasEntered && (!highestPriorityOngoingEffect || highestPriorityOngoingEffect.priority < auraEffect.priority)) {
					setEffect(true);
				} else if (!hasEntered && (!highestPriorityOngoingEffect || highestPriorityOngoingEffect.mode === "REMOVE_WHILE_INSIDE")) {
					setEffect(false);
				} else if (highestPriorityOngoingEffect) {
					setEffect(highestPriorityOngoingEffect.mode === "APPLY_WHILE_INSIDE"); // Re-apply in case we're out of sync
				}
				break;

			// For the ongoing remove effect, we remove effect from the actor when entering the aura if the currently
			// highest priority ongoing effect is null or has a lower priority.
			// We do not re-add the effect when leaving.
			case "REMOVE_WHILE_INSIDE":
				if (hasEntered && (!highestPriorityOngoingEffect || highestPriorityOngoingEffect.priority < auraEffect.priority)) {
					setEffect(false);
				} else if (highestPriorityOngoingEffect) {
					setEffect(highestPriorityOngoingEffect.mode === "APPLY_WHILE_INSIDE"); // Re-apply in case we're out of sync
				}
				break;
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
 * Implementation for handling effects that are applied at the start or end of token's turn.
 * @param {Token} token The token that owns effects
 * @param {string} userId
 * @param {boolean} #isStart Is this being called at the start or end of the token's turn.
 */
function handleTokenCombatTurnStartEnd(token, userId, isStart) {
	// Do nothing if effect automation is not enabled
	if (!game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING)) return;

	// Do nothing if this wasn't the user that caused the change
	if (userId !== game.userId) return;

	// 1. Handle any of the token's aura effects that apply/remove on owner turn start
	const applyOwnerMode = `APPLY_ON_OWNER_TURN_${isStart ? "START" : "END"}`;
	const removeOwnerMode = `REMOVE_ON_OWNER_TURN_${isStart ? "START" : "END"}`;

	for (const aura of AuraLayer.current._auraManager.getTokenAuras(token)) {
		// Get all effects that are applied or removed at turn start
		const relevantEffects = aura.config.effects
			.filter(e => e.mode === applyOwnerMode || e.mode === removeOwnerMode);
		if (relevantEffects.length <= 0) continue;

		// Loop over all the tokens in the aura, and all the effects that are added/removed at owner turn start
		for (const targetToken of AuraLayer.current._auraManager.getTokensInsideAura(token, aura.config.id)) {
			/** @type {Map<string, EffectConfig[]> | undefined} */
			let ongoingEffectTargetingToken;

			for (const effect of relevantEffects) {
				// If there are any ongoing effects for the same effect, then don't do anything because the ongoing
				// effect will take priority
				ongoingEffectTargetingToken ??= getOngoingAuraEffectsOnToken(targetToken);
				if (ongoingEffectTargetingToken.has(effect.effectId)) continue;

				// Ignore tokens that cannot be targetted
				if (!canTargetToken(targetToken, token, aura.config, effect.targetTokens)) continue;

				// Apply/remove
				toggleEffect(targetToken.actor, effect.effectId, effect.mode === applyOwnerMode, { overlay: effect.isOverlay }, true);
			}
		}
	}

	// 2. Check all the auras the token is in to see if any of them apply/remove effects on target turn start
	const applyTargetMode = `APPLY_ON_TARGET_TURN_${isStart ? "START" : "END"}`;
	const removeTargetMode = `REMOVE_ON_TARGET_TURN_${isStart ? "START" : "END"}`;

	/** @type {Map<string, EffectConfig[]> | undefined} */
	let ongoingEffectTargetingToken;

	for (const { parent, aura } of AuraLayer.current._auraManager.getAurasContainingToken(token, { preview: false })) {
		// Get all effects that are applied or removed at turn start
		const relevantEffects = aura.config.effects
			.filter(e => e.mode === applyTargetMode || e.mode === removeTargetMode);
		if (relevantEffects.length <= 0) continue;

		for (const effect of relevantEffects) {
			// If there are any ongoing effects for the same effect, then don't do anything because the ongoing
			// effect will take priority
			ongoingEffectTargetingToken ??= getOngoingAuraEffectsOnToken(token);
			if (ongoingEffectTargetingToken.has(effect.effectId)) continue;

			// Ignore tokens that cannot be targetted
			if (!canTargetToken(token, parent, aura.config, effect.targetTokens)) continue;

			// Apply/remove
			toggleEffect(token.actor, effect.effectId, effect.mode === applyTargetMode, { overlay: effect.isOverlay }, true);
		}
	}
}

/**
 * @param {boolean} isFirstRound True when combat is on the first round; means round end effects aren't applied/removed.
 * @param {boolean} isLastRound True when the last combat turn has ended; means round start effects aren't applied/removed.
 * @param {string} userId The user ID that triggered the change. Will only run logic if this is the current user.
 */
export function onCombatRoundChange(isFirstRound, isLastRound, userId) {
	// Do nothing if effect automation is not enabled
	if (!game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING)) return;

	// Do nothing if this wasn't the user that trigged the combat round change.
	// It is assumed current user is a GM if they are changing the combat.
	if (userId !== game.userId) return;

	// 1. Find all relevant effects to apply, then order them by round end effects first, then round start effects; then
	// order by priority (lowest to highest). We do priority in reverse order, because that is the order we loop over
	// the effects, so the lower priority ones should go first as they may get overridden by the higher priority ones.

	/** @type {{ parent: Token; aura: Aura; effect: EffectConfig; targetTokens: Token[]; }[]} */
	const allRelevantEffects = [];

	// Check all active auras on the scene to see if they have start/end effects
	for (const { parent, aura } of AuraLayer.current._auraManager.getAllAuras({ preview: false })) {
		/** @type {Token[] | undefined} */
		let tokensInAura;

		allRelevantEffects.push(...aura.config.effects
			.filter(e =>
				(!isLastRound && e.mode === "APPLY_ON_ROUND_START") ||
				(!isLastRound && e.mode === "REMOVE_ON_ROUND_START") ||
				(!isFirstRound && e.mode === "APPLY_ON_ROUND_END") ||
				(!isFirstRound && e.mode === "REMOVE_ON_ROUND_END"))
			.map(effect => ({
				parent, aura, effect,
				targetTokens: tokensInAura ?? (tokensInAura = AuraLayer.current._auraManager.getTokensInsideAura(parent, aura.config.id))
			})));
	}

	allRelevantEffects.sort((a, b) => {
		const aIsRoundStartMode = a.effect.mode === "APPLY_ON_ROUND_START" || a.effect.mode === "REMOVE_ON_ROUND_START";
		const bIsRoundStartMode = b.effect.mode === "APPLY_ON_ROUND_START" || b.effect.mode === "REMOVE_ON_ROUND_START";
		return aIsRoundStartMode !== bIsRoundStartMode
			? +bIsRoundStartMode - +aIsRoundStartMode // round start first
			: a.effect.priority - b.effect.priority; // then sort by priority
	});

	// Maintain a map of ongoing effects - this is lazily evaluated for each token as needed
	/** @type {Map<Token, Map<string, EffectConfig[]>>} */
	const ongoingEffectsByToken = new Map();

	// 2. Loop over all round start/end effects and apply them
	for (const { parent, aura, effect, targetTokens } of allRelevantEffects) {
		for (const target of targetTokens) {
			// Ignore tokens that cannot be targetted
			if (!canTargetToken(target, parent, aura.config, effect.targetTokens)) continue;

			// Check to see if there are any ongoing effects applying to this token for this effect type. If so, ignore
			// this aura's effect.
			const ongoingEffects = getOrCreate(ongoingEffectsByToken, target, () => getOngoingAuraEffectsOnToken(target));
			if (ongoingEffects.has(effect.effectId)) continue;

			// Apply/remove effect
			const isApplyMode = effect.mode === "APPLY_ON_ROUND_START" || effect.mode === "APPLY_ON_ROUND_END";
			toggleEffect(target.actor, effect.effectId, isApplyMode, { overlay: effect.isOverlay }, true);
		}
	}
}

/**
 * Returns a map of the highest priority ongoing effects being applied by auras to the given token.
 * @param {Token} token
 * @param {Token} [ignoreAuraOwner] Excludes effects that come from the aura with this owner and the specified ID.
 * @param {string} [ignoreAuraId] Excludes effects that come from the aura with the specified owner and this ID.
 * @return Map where the key is the ID of the effect, value is the highest priority effect config for that effect.
 */
function getOngoingAuraEffectsOnToken(token, ignoreAuraOwner, ignoreAuraId) {
	const ongoingEffects = AuraLayer.current._auraManager.getAurasContainingToken(token, { preview: false })
		.filter(({ parent, aura }) => parent !== ignoreAuraOwner || aura.config.id !== ignoreAuraId)
		.flatMap(({ parent, aura }) => aura.config.effects
			.filter(effect => ONGOING_EFFECT_MODES.includes(effect.mode)
				&& canTargetToken(token, parent, aura, effect.targetTokens)))
		.sort((a, b) => b.priority - a.priority);

	return groupBy(ongoingEffects, e => e.effectId);
}
