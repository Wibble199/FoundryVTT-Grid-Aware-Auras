/** @import { AuraConfig, SequencerEffectConfig } from "../data/aura.mjs" */
import { MODULE_NAME } from "../consts.mjs";
import { canTargetToken } from "../data/aura-target-filters.mjs";
import { AuraLayer } from "../layers/aura-layer/aura-layer.mjs";
import { isSequencerActive } from "../utils/misc-utils.mjs";

// Use a setTimeout to make our promise resolve on the task queue. That means that other modules that are using the
// sequencer.ready hook to run their own work will have completed before this promise resolves. I.E. this allows other
// modules to register their database before GAA attempts to use any effects.
/** @type {Promise<void>} */
const sequencerReady = new Promise(resolve =>
	Hooks.on("sequencer.ready", () => setTimeout(resolve, 0)));

// Each scene also needs its sequencer effect manager to be ready before we can create effects. The manager is destroyed
// during canvasTearDown, so we reset the promise when that happens and wait again for the ready hook.
const createSequencerEffectManagerReadyPromise = () => new Promise(resolve =>
	Hooks.once("sequencerEffectManagerReady", resolve));
let sequencerEffectManagerReady = createSequencerEffectManagerReadyPromise();
Hooks.on("canvasTearDown", () => sequencerEffectManagerReady = createSequencerEffectManagerReadyPromise());

// For a special case (see below), we need to track the effects that are being played but cannot use Sequencer's
// EffectManager to do so.
/** @type {Set<string>} */
const playingEffects = new Set();

Hooks.on("endedSequencerEffect", ({ data }) => playingEffects.delete(data.name));

/**
 * @param {Token} token
 * @param {Token} parent
 * @param {AuraConfig} aura
 * @param {{ hasEntered: boolean; isPreview: boolean; isInit: boolean; userId: string; }} options
 */
export function onEnterLeaveAura(token, parent, aura, { hasEntered, isInit, isPreview }) {
	// Do not run on preview tokens
	if (isPreview || !isSequencerActive())
		return;

	const applicableEffects = aura.sequencerEffects
		.filter(effect => canTargetToken(token, parent, aura, effect.targetTokens));

	if (applicableEffects.length === 0)
		return;

	// Only do this when sequencer is ready. This means that when called during Foundry's initialisation, it waits for
	// database entries to be registered before attempting to create any effects.
	Promise.all([sequencerReady, sequencerEffectManagerReady]).then(() => {
		if (hasEntered && isInit) {
			// If we have entered because the scene was initialising, then we only play persistent effects (the one-off
			// enter effects would have already played previously)
			for (const effect of applicableEffects) {
				if (isPersistent(effect))
					playEffect(effect);
			}

		} else if (hasEntered) {
			// If we have entered when the scene was already running, then play all enter effects
			for (const effect of applicableEffects) {
				if (["ON_ENTER", "WHILE_INSIDE"].includes(effect.trigger))
					playEffect(effect);
			}

		} else {
			// When leaving, stop any persistent effects and play any leave effects
			for (const effect of applicableEffects) {
				switch (effect.trigger) {
					case "WHILE_INSIDE":
						// Special case: persistent ON_OWNER effects would run multiple times simultaneously on the
						// same parent token if multiple targets were in the aura. So, if there is still a valid target
						// in the aura for this effect, don't end the effect.
						if (effect.position === "ON_OWNER") {
							const hasMatchingTarget = AuraLayer.current._auraManager.getTokensInsideAura(parent, aura.id)
								.some(t => !t.isPreview && t !== token && canTargetToken(t, parent, aura, effect.targetTokens));
							if (hasMatchingTarget) continue;

							// We then need to use the alternate name for this effect (which doesn't use the token ID)
							Sequencer.EffectManager.endEffects({
								name: [MODULE_NAME, parent.id, aura.id, effect.uId].join("_")
							});

						} else {
							Sequencer.EffectManager.endEffects({ name: getEffectName(token.id, parent.id, aura.id, effect.uId) }, false);
						}
						break;

					case "ON_LEAVE":
						playEffect(effect);
				}
			}
		}
	});

	/**
	 * Creates a sequence with an effect, using the given configuration function and returns a promise when the effect is
	 * complete.
	 * @param {SequencerEffectConfig} effect
	 */
	function playEffect(effect) {
		let effectName = getEffectName(token.id, parent.id, aura.id, effect.uId);

		// Special case: persistent WHILE_INSIDE ON_OWNER effects would run multiple times simultaneously on the same
		// parent token if multiple targets were in the aura. So, we need to use a different name for this effect (which
		// doesn't vary on the target token ID), and also check if that effect is being run already or not (done in
		// playIf below).
		const isPersistedOwnerEnter = isPersistent(effect) && effect.position === "ON_OWNER";
		if (isPersistedOwnerEnter) {
			effectName = [MODULE_NAME, parent.id, aura.id, effect.uId].join("_");
		}

		const seq = new Sequence();
		const eff = seq.effect()
			.name(effectName)
			.file(effect.effectPath)
			.origin(parent)
			.attachTo(["ON_TARGET", "TARGET_TO_OWNER"].includes(effect.position) ? token : parent)
			.delay(effect.delay)
			.opacity(Math.min(Math.max(effect.opacity, 0), 1))
			.scale(effect.scale)
			.playbackRate(effect.playbackRate)
			.belowTokens(effect.belowTokens === true)
			.tieToDocuments(parent);

		if (effect.position === "TARGET_TO_OWNER") {
			eff.stretchTo(parent, { attachTo: true });
		} else if (effect.position === "OWNER_TO_TARGET") {
			eff.stretchTo(token, { attachTo: true });
		}

		if (isPersistent(effect)) {
			eff.persist();
		} else {
			eff.repeats(effect.repeatCount, effect.repeatDelay);
		}

		// Don't fade in when it's being activated because of scene transition
		if (!isInit && effect.fadeInDuration > 0) {
			eff.fadeIn(effect.fadeInDuration, { ease: effect.fadeInEasing });
		}

		if (effect.fadeOutDuration > 0) {
			eff.fadeOut(effect.fadeOutDuration, { ease: effect.fadeOutEasing });
		}

		// Don't scale in when it's being activated because of scene transition
		if (!isInit && effect.scaleInDuration > 0) {
			eff.scaleIn(effect.scaleInScale, effect.scaleInDuration, { ease: effect.scaleInEasing });
		}

		if (effect.scaleOutDuration > 0) {
			eff.scaleOut(effect.scaleOutScale, effect.scaleOutDuration, { ease: effect.scaleOutEasing });
		}

		if (isPersistedOwnerEnter) {
			// Note that we cannot use Sequencer's EffectManager.getEffects because when multiple tokens trigger an
			// enter at the same time, it evalutes all the playIfs first before creating them (created as a queued task
			// or a microtask). Therefore, getEffects would always return a blank array, so we need to track this
			// ourselves.
			eff.playIf(() => {
				if (playingEffects.has(effectName)) return false;
				playingEffects.add(effectName);
				return true;
			});
		}

		eff.waitUntilFinished();
		seq.play({ local: true }); // onEnterLeaveAura hook fires for all players, so easier to manage effects per-user
	}
}

/**
 * Determines if the sequence effect is persistent - i.e. plays continuously until cancelled.
 * @param {SequencerEffectConfig} effect
 */
function isPersistent(effect) {
	return effect.trigger === "WHILE_INSIDE";
}

/**
 * Gets a unique name for this effect.
 * @param {string} tokenId
 * @param {string} parentId
 * @param {string} auraId
 * @param {string} sequencerEffectId
 */
function getEffectName(tokenId, parentId, auraId, sequencerEffectId) {
	return [MODULE_NAME, parentId, tokenId, auraId, sequencerEffectId].join("_");
}
