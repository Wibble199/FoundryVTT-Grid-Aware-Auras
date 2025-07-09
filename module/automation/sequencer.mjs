/** @import { AuraConfig, SequencerEffectConfig } from "../data/aura.mjs" */
/** @import { SEQUENCE_MODES } from "../consts.mjs" */
import { MODULE_NAME } from "../consts.mjs";
import { canTargetToken } from "../data/aura-target-filters.mjs";
import { AuraLayer } from "../layers/aura-layer/aura-layer.mjs";
import { isSequencerActive } from "../utils/misc-utils.mjs";

/** @type {SEQUENCE_MODES[]} */
const onEnterEffects = ["TARGET_ENTER", "OWNER_ENTER", "TARGET_TO_OWNER_ENTER", "OWNER_TO_TARGET_ENTER"];

/** @type {SEQUENCE_MODES[]} */
const onLeaveEffects = ["TARGET_LEAVE", "OWNER_LEAVE"];

// Use a setTimeout to make our promise resolve on the task queue. That means that other modules that are using the
// sequencer.ready hook to run their own work will have completed before this promise resolves. I.E. this allows other
// modules to register their database before GAA attempts to use any effects.
/** @type {Promise<void>} */
const sequencerReady = new Promise(resolve =>
	Hooks.on("sequencer.ready", () => setTimeout(resolve, 0)));

// Each scene also needs its sequencer effect manager to be ready before we can create effects. The manager is destroyed
// during canvasTearDown, so we reset the promise when that happens and wait again for the ready hook.
const createSequencerEffectManagerReadyPromise = () => new Promise(resolve =>
	Hooks.on("sequencerEffectManagerReady", resolve));
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
			// If we have entered because the scene was initialising, then we only play persistent enter effects
			for (const effect of applicableEffects) {
				if (!onEnterEffects.includes(effect.mode) || !effect.persistent) continue;
				playEffect(effect);
			}

		} else if (hasEntered) {
			// If we have entered when the scene was already running, then play all enter effects
			// First, we play the non-persistent ones and create a promise that resolves when they're all done
			const promise = Promise.allSettled(applicableEffects
				.filter(effect => onEnterEffects.includes(effect.mode) && !effect.persistent)
				.map(playEffect));

			// Once they have run, we then run any persistent effects
			for (const effect of applicableEffects) {
				if (!effect.persistent || !onEnterEffects.includes(effect.mode)) continue;

				if (effect.waitForNonPersistent)
					promise.then(() => playEffect(effect));
				else
					playEffect(effect);
			}

		} else {
			// When leaving, stop any persistent effects and play any leave effects
			for (const effect of applicableEffects) {
				// Special case: persistent OWNER_ENTER effects would run multiple times simultaneously on the same
				// parent token if multiple targets were in the aura. So, if there is still a valid target in the aura
				// for this effect, don't end the effect.
				if (effect.persistent && effect.mode === "OWNER_ENTER") {
					const hasMatchingTarget = AuraLayer.current._auraManager.getTokensInsideAura(parent, aura.id)
						.some(t => !t.isPreview && t !== token && canTargetToken(t, parent, aura, effect.targetTokens));
					if (hasMatchingTarget) continue;

					// We then need to use the alternate name for this effect (which doesn't use the token ID)
					Sequencer.EffectManager.endEffects({
						name: [MODULE_NAME, parent.id, aura.id, effect.uId].join("_")
					});

				} else if (effect.persistent && onEnterEffects.includes(effect.mode)) {
					Sequencer.EffectManager.endEffects({ name: getEffectName(token.id, parent.id, aura.id, effect.uId) }, false);
				} else if (onLeaveEffects.includes(effect.mode)) {
					playEffect(effect);
				}
			}
		}
	});

	/**
	 * Creates a sequence with an effect, using the given configuration function and returns a promise when the effect is
	 * complete.
	 * @param {SequencerEffectConfig} effect
	 * @returns {Promise<void>}
	 */
	function playEffect(effect) {
		let effectName = getEffectName(token.id, parent.id, aura.id, effect.uId);

		// Special case: persistent OWNER_ENTER effects would run multiple times simultaneously on the same parent token
		// if multiple targets were in the aura. So, we need to use a different name for this effect (which doesn't vary
		// on the target token ID), and also check if that effect is being run already or not (done in playIf below).
		const isPersistedOwnerEnter = effect.persistent && effect.mode === "OWNER_ENTER";
		if (isPersistedOwnerEnter) {
			effectName = [MODULE_NAME, parent.id, aura.id, effect.uId].join("_");
		}

		return new Promise(resolve => {

			const seq = new Sequence();
			const eff = seq.effect()
				.name(effectName)
				.file(effect.effectPath)
				.origin(parent)
				.attachTo(["TARGET_ENTER", "TARGET_TO_OWNER_ENTER", "TARGET_LEAVE"].includes(effect.mode) ? token : parent)
				.belowTokens(effect.belowTokens === true)
				.delay(effect.delay);

			if (effect.mode === "TARGET_TO_OWNER_ENTER") {
				eff.stretchTo(parent, { attachTo: true });
			} else if (effect.mode === "OWNER_TO_TARGET_ENTER") {
				eff.stretchTo(token, { attachTo: true });
			}

			if (effect.persistent) {
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

			if (isPersistedOwnerEnter) {
				// Note that we cannot use Sequencer's EffectManager.getEffects because when multiple tokens trigger an
				// enter at the same time, it evalutes all the playIfs first before creating them. Therefore, getEffects
				// would always return a blank array, so we need to track this ourselves.
				eff.playIf(() => {
					if (playingEffects.has(effectName)) return false;
					playingEffects.add(effectName);
					return true;
				});
			}

			eff.waitUntilFinished().thenDo(resolve);
			seq.play({ local: true }); // onEnterLeaveAura hook fires for all players, so easier to manage effects per-user
		});
	}
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
