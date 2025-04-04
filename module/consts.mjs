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

/** @enum {keyof typeof EFFECT_MODES} */
export const EFFECT_MODES = /** @type {const} */ ({
	APPLY_WHILE_INSIDE: "GRIDAWAREAURAS.EffectModeApplyWhileInside",
	APPLY_ON_ENTER: "GRIDAWAREAURAS.EffectModeApplyOnEnter",
	APPLY_ON_LEAVE: "GRIDAWAREAURAS.EffectModeApplyOnLeave",
	APPLY_ON_OWNER_TURN_START: "GRIDAWAREAURAS.EffectModeApplyOnOwnerTurnStart",
	APPLY_ON_OWNER_TURN_END: "GRIDAWAREAURAS.EffectModeApplyOnOwnerTurnEnd",
	APPLY_ON_TARGET_TURN_START: "GRIDAWAREAURAS.EffectModeApplyOnTargetTurnStart",
	APPLY_ON_TARGET_TURN_END: "GRIDAWAREAURAS.EffectModeApplyOnTargetTurnEnd",
	APPLY_ON_ROUND_START: "GRIDAWAREAURAS.EffectModeApplyOnRoundStart",
	APPLY_ON_ROUND_END: "GRIDAWAREAURAS.EffectModeApplyOnRoundEnd",
	REMOVE_WHILE_INSIDE: "GRIDAWAREAURAS.EffectModeRemoveWhileInside",
	REMOVE_ON_ENTER: "GRIDAWAREAURAS.EffectModeRemoveOnEnter",
	REMOVE_ON_LEAVE: "GRIDAWAREAURAS.EffectModeRemoveOnLeave",
	REMOVE_ON_OWNER_TURN_START: "GRIDAWAREAURAS.EffectModeRemoveOnOwnerTurnStart",
	REMOVE_ON_OWNER_TURN_END: "GRIDAWAREAURAS.EffectModeRemoveOnOwnerTurnEnd",
	REMOVE_ON_TARGET_TURN_START: "GRIDAWAREAURAS.EffectModeRemoveOnTargetTurnStart",
	REMOVE_ON_TARGET_TURN_END: "GRIDAWAREAURAS.EffectModeRemoveOnTargetTurnEnd",
	REMOVE_ON_ROUND_START: "GRIDAWAREAURAS.EffectModeRemoveOnRoundStart",
	REMOVE_ON_ROUND_END: "GRIDAWAREAURAS.EffectModeRemoveOnRoundEnd"
});

/** @type {EFFECT_MODES[]} */
export const ONGOING_EFFECT_MODES = [
	"APPLY_WHILE_INSIDE",
	"REMOVE_WHILE_INSIDE"
];

/** @enum {keyof typeof MACRO_MODES} */
export const MACRO_MODES = /** @type {const} */ ({
	ENTER_LEAVE: "GRIDAWAREAURAS.MacroModeEnterLeave",
	ENTER: "GRIDAWAREAURAS.MacroModeEnter",
	LEAVE: "GRIDAWAREAURAS.MacroModeLeave",
	PREVIEW_ENTER_LEAVE: "GRIDAWAREAURAS.MacroModePreviewEnterLeave",
	PREVIEW_ENTER: "GRIDAWAREAURAS.MacroModePreviewEnter",
	PREVIEW_LEAVE: "GRIDAWAREAURAS.MacroModePreviewLeave",
	OWNER_TURN_START_END: "GRIDAWAREAURAS.MacroModeOwnerTurnStartEnd",
	OWNER_TURN_START: "GRIDAWAREAURAS.MacroModeOwnerTurnStart",
	OWNER_TURN_END: "GRIDAWAREAURAS.MacroModeOwnerTurnEnd",
	TARGET_TURN_START_END: "GRIDAWAREAURAS.MacroModeTargetTurnStartEnd",
	TARGET_TURN_START: "GRIDAWAREAURAS.MacroModeTargetTurnStart",
	TARGET_TURN_END: "GRIDAWAREAURAS.MacroModeTargetTurnEnd",
	ROUND_START_END: "GRIDAWAREAURAS.MacroModeRoundStartEnd",
	ROUND_START: "GRIDAWAREAURAS.MacroModeRoundStart",
	ROUND_END: "GRIDAWAREAURAS.MacroModeRoundEnd"
});

/** @enum {keyof typeof THT_RULER_ON_DRAG_MODES} */
export const THT_RULER_ON_DRAG_MODES = /** @type {const} */ ({
	NONE: "GRIDAWAREAURAS.ThtRulerOnDragModeNone",
	C2C: "GRIDAWAREAURAS.ThtRulerOnDragModeC2C",
	E2E: "GRIDAWAREAURAS.ThtRulerOnDragModeE2E"
});
