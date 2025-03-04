export const MODULE_NAME = "grid-aware-auras";

export const SOCKET_NAME = `module.${MODULE_NAME}`;

// Flags
export const TOKEN_AURAS_FLAG = "auras";

// Settings
export const ENABLE_EFFECT_AUTOMATION_SETTING = "enableEffectAutomation";
export const ENABLE_MACRO_AUTOMATION_SETTING = "enableMacroAutomation";
export const SQUARE_GRID_MODE_SETTING = "squareGridMode";

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

/** @enum {keyof typeof TOKEN_TARGETS} */
export const TOKEN_TARGETS = /** @type {const} */ ({
	ALL: "All",
	FRIENDLY: "TOKEN.DISPOSITION.FRIENDLY",
	NEUTRAL: "TOKEN.DISPOSITION.NEUTRAL",
	HOSTILE: "TOKEN.DISPOSITION.HOSTILE"
});

/** @enum {keyof typeof THT_RULER_ON_DRAG_MODES} */
export const THT_RULER_ON_DRAG_MODES = /** @type {const} */ ({
	NONE: "GRIDAWAREAURAS.ThtRulerOnDragModeNone",
	C2C: "GRIDAWAREAURAS.ThtRulerOnDragModeC2C",
	E2E: "GRIDAWAREAURAS.ThtRulerOnDragModeE2E"
});
