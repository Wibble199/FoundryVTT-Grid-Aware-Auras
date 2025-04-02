export const MODULE_NAME = "grid-aware-auras";

export const SOCKET_NAME = `module.${MODULE_NAME}`;

// Flags
export const DOCUMENT_AURAS_FLAG = "auras";

// Settings
export const ENABLE_EFFECT_AUTOMATION_SETTING = "enableEffectAutomation";
export const ENABLE_MACRO_AUTOMATION_SETTING = "enableMacroAutomation";
export const SQUARE_GRID_MODE_SETTING = "squareGridMode";
export const CUSTOM_AURA_TARGET_FILTERS_SETTING = "customAuraTargetFilters";

// Hooks
const HOOK_PREFIX = "gridAwareAuras";
export const ENTER_LEAVE_AURA_HOOK = `${HOOK_PREFIX}.enterLeaveAura`;

// Socket functions
export const TOGGLE_EFFECT_FUNC = "toggleEffect";

/** @enum {number} */
export const LINE_TYPES = /** @type {const} */ ({
	NONE: 0,
	SOLID: 1,
	DASHED: 2
});

/** @enum {number} */
export const SQUARE_GRID_MODE = /** @type {const} */ ({
	EQUIDISTANT: 0,
	ALTERNATING: 1,
	MANHATTAN: 2,
	EXACT: 3
});

/** @enum {keyof typeof AURA_VISIBILITY_MODES} */
export const AURA_VISIBILITY_MODES = /** @type {const} */ ({
	ALWAYS: "TOKEN.DISPLAY_ALWAYS",
	OWNER: "TOKEN.DISPLAY_OWNER",
	HOVER: "TOKEN.DISPLAY_HOVER",
	OWNER_HOVER: "TOKEN.DISPLAY_OWNER_HOVER",
	CONTROL: "TOKEN.DISPLAY_CONTROL",
	DRAG: "GRIDAWAREAURAS.AuraDisplayDrag",
	TURN: "GRIDAWAREAURAS.AuraDisplayOwnerTurn",
	OWNER_TURN: "GRIDAWAREAURAS.AuraDisplayTurn",
	NONE: "TOKEN.DISPLAY_NONE",
	CUSTOM: "GRIDAWAREAURAS.AuraDisplayCustom"
});

/** @enum {keyof typeof EFFECT_APPLICATION_MODES} */
export const EFFECT_APPLICATION_MODES = /** @type {const} */ ({
	APPLY_WHILE_INSIDE: "GRIDAWAREAURAS.EffectApplicationModeApplyWhileInside",
	APPLY_ON_ENTER: "GRIDAWAREAURAS.EffectApplicationModeApplyOnEnter",
	APPLY_ON_LEAVE: "GRIDAWAREAURAS.EffectApplicationModeApplyOnLeave",
	APPLY_ON_OWNER_TURN_START: "GRIDAWAREAURAS.EffectApplicationModeApplyOnOwnerTurnStart",
	APPLY_ON_OWNER_TURN_END: "GRIDAWAREAURAS.EffectApplicationModeApplyOnOwnerTurnEnd",
	APPLY_ON_TARGET_TURN_START: "GRIDAWAREAURAS.EffectApplicationModeApplyOnTargetTurnStart",
	APPLY_ON_TARGET_TURN_END: "GRIDAWAREAURAS.EffectApplicationModeApplyOnTargetTurnEnd",
	APPLY_ON_ROUND_START: "GRIDAWAREAURAS.EffectApplicationModeApplyOnRoundStart",
	APPLY_ON_ROUND_END: "GRIDAWAREAURAS.EffectApplicationModeApplyOnRoundEnd",
	REMOVE_WHILE_INSIDE: "GRIDAWAREAURAS.EffectApplicationModeRemoveWhileInside",
	REMOVE_ON_ENTER: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnEnter",
	REMOVE_ON_LEAVE: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnLeave",
	REMOVE_ON_OWNER_TURN_START: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnOwnerTurnStart",
	REMOVE_ON_OWNER_TURN_END: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnOwnerTurnEnd",
	REMOVE_ON_TARGET_TURN_START: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnTargetTurnStart",
	REMOVE_ON_TARGET_TURN_END: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnTargetTurnEnd",
	REMOVE_ON_ROUND_START: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnRoundStart",
	REMOVE_ON_ROUND_END: "GRIDAWAREAURAS.EffectApplicationModeRemoveOnRoundEnd"
});

/** @type {EFFECT_APPLICATION_MODES[]} */
export const ONGOING_EFFECT_APPLICATION_MODES = [
	"APPLY_WHILE_INSIDE",
	"REMOVE_WHILE_INSIDE"
];

/** @type {EFFECT_APPLICATION_MODES[]} */
export const PRIORITISABLE_EFFECT_APPLICATION_MODES = [
	"APPLY_WHILE_INSIDE",
	"APPLY_ON_ROUND_START",
	"APPLY_ON_ROUND_END",
	"REMOVE_WHILE_INSIDE",
	"REMOVE_ON_ROUND_START",
	"REMOVE_ON_ROUND_END"
];

/** @enum {keyof typeof THT_RULER_ON_DRAG_MODES} */
export const THT_RULER_ON_DRAG_MODES = /** @type {const} */ ({
	NONE: "GRIDAWAREAURAS.ThtRulerOnDragModeNone",
	C2C: "GRIDAWAREAURAS.ThtRulerOnDragModeC2C",
	E2E: "GRIDAWAREAURAS.ThtRulerOnDragModeE2E"
});
