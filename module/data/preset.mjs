/** @import { AuraConfig } from "./aura.mjs" */
import { MODULE_NAME, PRESET_SETTING } from "../consts.mjs";
import { getAura } from "./aura.mjs";

/**
 * @typedef {Object} Preset
 * @property {AuraConfig} config
 */

/**
 * Represents a preset loaded from settings. The aura config it contains may not be complete or may be a previous data
 * version.
 * @typedef {Omit<Preset, "config"> & { config: Partial<AuraConfig>; }} RawPreset
 */

/**
 * Gets the raw preset data. Note that the aura configs may not be complete or may be of a previous data version.
 */
export function getPresetsRaw() {
	/** @type {RawPreset[]} */
	const presets = game.settings.get(MODULE_NAME, PRESET_SETTING);
	return presets;
}

/**
 * Gets the preset data, with all aura configs updated and default values applied as per `getAura`.
 * @returns {Preset[]}
 */
export function getPresets() {
	return getPresetsRaw().map(p => ({ ...p, config: getAura(p.config) }));
}

/**
 * Replaces all saved preset data with the given preset array.
 * @param {(Preset | RawPreset)[]} presets
 */
export async function savePresets(presets) {
	await game.settings.set(MODULE_NAME, PRESET_SETTING, presets);
}

/**
 * Saves the given aura as a new preset, appending it to the existing data.
 * @param {AuraConfig} aura
 */
export async function saveAuraAsNewPreset(aura) {
	const existing = getPresetsRaw();

	/** @type {Preset} */
	const newPreset = { config: aura };

	await savePresets([...existing, newPreset]);
	ui.notifications.info(`Saved aura '${aura.name}' as a new preset`);
}
