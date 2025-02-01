import { ENABLE_EFFECT_AUTOMATION_SETTING, MODULE_NAME, SOCKET_NAME, TOGGLE_EFFECT_FUNC } from "../consts.mjs";

/**
 * Logs a message to the console.
 * @param {string} message
 * @param  {...any} args
 */
export function log(message, ...args) {
	console.log(`Grid Aware Auras | ${message}`, ...args);
}

/**
 * Logs a warning message to the console.
 * @param {string} message
 * @param  {...any} args
 */
export function warn(message, ...args) {
	console.warn(`Grid Aware Auras | ${message}`, ...args);
}

/**
 * Gets or creates an item in the given map.
 * @template TKey
 * @template TValue
 * @template {Map<TKey, TValue>} TMap
 * @param {TMap} map
 * @param {TKey} key
 * @param {() => TValue} valueFactory
 * @returns {TMap extends Map<any, infer I> ? I : never}
 */
export function getOrCreate(map, key, valueFactory) {
	if (map.has(key)) {
		return map.get(key);
	}

	const value = valueFactory();
	map.set(key, value);
	return value;
}

/**
 * Sets the effect with the given ID to be active or inactive on the ID with given actor.
 * @param {Actor | string} actorOrUuid The actor instance or the UUID of the actor to add the effect to.
 * @param {string} effectId The ID of the status effect to add.
 * @param {boolean} state Whether to add (true) or remove (false) the effect.
 * @param {boolean} overlay When adding an effect, whether to set as an overlay.
 * @param {boolean} [allowDelegation] Whether this call should allow delegation to a GM user if the current user
 * does not have permission.
 */
export async function toggleEffect(actorOrUuid, effectId, state, overlay, allowDelegation = false) {
	// Disallow this is the setting is not turned on
	if (!game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING)) return;

	const actor = typeof actorOrUuid === "string" ? await fromUuid(actorOrUuid) : actorOrUuid;
	if (!actor) return;

	if (actor.canUserModify(game.user, "update")) {
		// If current user can edit this actor, then do it
		const existingEffects = actor.effects.filter(e => e.statuses.size === 1 && e.statuses.has(effectId));

		if (existingEffects.length === 0 && state) {
			const effect = CONFIG.statusEffects.find(e => e.id === effectId);
			if (!effect) return;
			await actor.createEmbeddedDocuments("ActiveEffect", [
				{
					name: effect.name,
					icon: effect.icon,
					statuses: [effect.id],
					flags: overlay ? { "core.overlay": true } : {}
				}
			]);
		}

		else if (existingEffects.length > 0 && !state) {
			await actor.deleteEmbeddedDocuments("ActiveEffect", existingEffects.map(e => e.id));
		}

	} else if (allowDelegation) {
		// If the user can't edit this actor, but delegation is allowed, delegate to a GM user
		const actorUuid = typeof actorOrUuid === "string" ? actorOrUuid : actorOrUuid.uuid;
		const gmUserId = game.users.find(u => u.isGM && u.active)?.id;
		if (gmUserId) {
			log(`Delegating effect toggling to GM user '${gmUserId}'.`);
			game.socket.emit(SOCKET_NAME, { func: TOGGLE_EFFECT_FUNC, runOn: gmUserId, actorUuid, effectId, state, overlay });
		} else {
			warn(`No GM users available. Unable to toggle effect to actor '${actor.name}'.`);
		}
	}
}

/**
 * Determines if the token should be affected by automation that targets the given `target`.
 * @param {Token} token
 * @param {import("../consts.mjs").TOKEN_TARGETS} target
 */
export function targetsToken(token, target) {
	const { disposition } = token.document;
	switch (target) {
		case "ALL": return disposition !== CONST.TOKEN_DISPOSITIONS.SECRET;
		case "FRIENDLY": return disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY;
		case "NEUTRAL": return disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL;
		case "HOSTILE": return disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
		default: return false;
	}
}

/**
 * Determines if the `a` and `b` are partially equal. For each property in `b`, if it has a property in `a` with the
 * same value, it is equal. Does not check additional properties on `a`.
 * @param {Object} a
 * @param {Object} b
 * @example
 * partialEqual({ x: 1 }, { x: 1 }); // => true - both objects have `x` with the same value
 * partialEqual({ x: 1, y: 2 }, { x: 1 }); // => true - both have equal `x` values, `y` is ignored because it's not on b
 * partialEqual({ x: 1 }, { x: 1, y: 2 }); // => false - a does not have the `y` property
 */
export function partialEqual(a, b) {
	for (const [k, v] of Object.entries(b))
		if (a[k] !== v)
			return false;
	return true;
}

/**
 * Determines if the required version of Terrain Height Tools is installed active to support the THT integration.
 * @returns {boolean}
 */
export function isTerrainHeightToolsActive() {
	const module = game.modules.get("terrain-height-tools");
	return module?.active === true && !foundry.utils.isNewerVersion("0.4.7", module.version);
}
