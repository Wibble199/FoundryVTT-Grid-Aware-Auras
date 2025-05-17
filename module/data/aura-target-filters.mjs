import { CUSTOM_AURA_TARGET_FILTERS_SETTING, MODULE_NAME } from "../consts.mjs";
import { warn } from "../utils/misc-utils.mjs";

/**
 * @typedef {Object} AuraTargetFilter
 * @property {string} id
 * @property {string} name
 * @property {string} body
*/
/**
 * @typedef {Object} CompiledAuraTargetFilter
 * @property {string} id
 * @property {string} name
 * @property {(targetToken: Token, sourceToken: Token, aura: import("./aura.mjs").AuraConfig) => boolean} f
 */

/**
 * Default non-editable filters.
 * @type {(CompiledAuraTargetFilter & { group: string; })[]}
 */
let standardFilters = [];

/**
 * Custom filters that the GM has added via the world settings.
 * @type {CompiledAuraTargetFilter[]}
 */
let customFilters = [];

/** Lists the available filters for a select element. */
export function listAuraTargetFilters() {
	return [
		...standardFilters.map(({ id, name, group }) => ({ value: id, label: name, group })),
		...customFilters.map(({ id, name }) => ({ value: id, label: name, group: game.i18n.localize("GRIDAWAREAURAS.AuraDisplayCustom") }))
	];
}

export function initialiseAuraTargetFilters() {
	// Uses the previous enum values as the ID so that no config data migration is required.
	standardFilters = [
		{
			id: "ALL",
			name: game.i18n.localize("All"),
			group: "",
			f: () => true
		},
		{
			id: "FRIENDLY",
			name: game.i18n.localize("TOKEN.DISPOSITION.FRIENDLY"),
			group: game.i18n.localize("TOKEN.Disposition"),
			f: t => t.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY
		},
		{
			id: "NEUTRAL",
			name: game.i18n.localize("TOKEN.DISPOSITION.NEUTRAL"),
			group: game.i18n.localize("TOKEN.Disposition"),
			f: t => t.document.disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL
		},
		{
			id: "HOSTILE",
			name: game.i18n.localize("TOKEN.DISPOSITION.HOSTILE"),
			group: game.i18n.localize("TOKEN.Disposition"),
			f: t => t.document.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE
		},
		...Object.keys(game.model.Actor).filter(a => a !== "base").map(a => ({
			id: `ACTORTYPE_${a}`,
			name: game.i18n.localize(`TYPES.Actor.${a}`),
			group: game.i18n.localize("Type"),
			f: t => t.actor?.type === a
		}))
	];

	compileCustomFilters();
}

/**
 * Recompiles the list of custom filters.
 * Should be called on initialisation and whenever the filters world setting changes.
 */
export function compileCustomFilters() {
	customFilters = [];

	/** @type {AuraTargetFilter[]} */
	const customFiltersSettings = game.settings.get(MODULE_NAME, CUSTOM_AURA_TARGET_FILTERS_SETTING) ?? [];
	for (const { body, ...filterMeta } of customFiltersSettings) {
		try {
			const f = new Function("targetToken", "sourceToken", "aura", body);
			customFilters.push({ ...filterMeta, f });
		} catch (err) {
			warn(`Could not compile custom filter '${filterMeta.name}'`, err);
		}
	}
}

/**
 * Executes the filter with the given ID on the token.
 * If the filter is not specified, not found or throws an error, then returns `true` for all non-secret tokens.
 * @param {Token} targetToken The token that has entered/left an aura.
 * @param {Token} sourceToken The token that owns the aura.
 * @param {import("./aura.mjs").AuraConfig} aura The aura configuration.
 * @param {string} filterId The ID of the filter to execute.
 */
export function canTargetToken(targetToken, sourceToken, aura, filterId) {
	const filter = filterId?.length &&
		(standardFilters.find(f => f.id === filterId) ??
		customFilters.find(f => f.id === filterId));

	if (filter) {
		try {
			return !!filter.f(targetToken, sourceToken, aura);
		} catch (err) {
			warn(`Error thrown in aura target filter ${filter.name}`, err);
		}
	}

	return targetToken.disposition !== CONST.TOKEN_DISPOSITIONS.SECRET;
}
