import { CustomAuraTargetFilterConfig } from "./applications/custom-aura-target-filter-config.mjs";
import {
	CUSTOM_AURA_TARGET_FILTERS_SETTING,
	ENABLE_EFFECT_AUTOMATION_SETTING,
	ENABLE_MACRO_AUTOMATION_SETTING,
	MODULE_NAME,
	SQUARE_GRID_MODE,
	SQUARE_GRID_MODE_SETTING
} from "./consts.mjs";
import { compileCustomFilters } from "./data/aura-target-filters.mjs";
import { AuraLayer } from "./layers/aura-layer/aura-layer.mjs";

export function registerSettings() {
	game.settings.register(MODULE_NAME, SQUARE_GRID_MODE_SETTING, {
		name: "SETTINGS.SquareGridMode.Name",
		hint: "SETTINGS.SquareGridMode.Hint",
		scope: "world",
		default: SQUARE_GRID_MODE.EQUIDISTANT,
		type: Number,
		choices: Object.fromEntries(Object.entries(SQUARE_GRID_MODE)
			.map(([name, value]) => [value, `GRIDAWAREAURAS.SquareGridMode${name.titleCase()}`])),
		config: true,
		onChange: () => AuraLayer.current?._updateAuras({ force: true })
	});

	game.settings.register(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING, {
		name: "SETTINGS.EnableEffectAutomation.Name",
		hint: "SETTINGS.EnableEffectAutomation.Hint",
		scope: "world",
		default: false,
		type: Boolean,
		config: true
	});

	game.settings.register(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING, {
		name: "SETTINGS.EnableMacroAutomation.Name",
		hint: "SETTINGS.EnableMacroAutomation.Hint",
		scope: "world",
		default: false,
		type: Boolean,
		config: true
	});

	game.settings.registerMenu(MODULE_NAME, CUSTOM_AURA_TARGET_FILTERS_SETTING, {
		name: "SETTINGS.CustomAuraTargetFilters.Name",
		hint: "SETTINGS.CustomAuraTargetFilters.Hint",
		label: "Configure",
		icon: "fas fa-filter",
		type: CustomAuraTargetFilterConfig,
		restricted: true
	});

	game.settings.register(MODULE_NAME, CUSTOM_AURA_TARGET_FILTERS_SETTING, {
		name: "SETTINGS.CustomAuraTargetFilters.Name",
		scope: "world",
		default: [],
		type: Array,
		config: false,
		onChange: () => compileCustomFilters()
	});
}
