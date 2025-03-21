/** @import { THT_RULER_ON_DRAG_MODES } from "../consts.mjs" */
import { LINE_TYPES, MODULE_NAME, TOKEN_AURAS_FLAG } from "../consts.mjs";

/**
 * @typedef {Object} AuraConfig
 * @property {string} id
 * @property {string} name
 * @property {boolean} enabled
 * @property {number} radius
 * @property {LINE_TYPES} lineType
 * @property {number} lineWidth
 * @property {string} lineColor
 * @property {number} lineOpacity
 * @property {number} lineDashSize
 * @property {number} lineGapSize
 * @property {number} fillType
 * @property {string} fillColor
 * @property {number} fillOpacity
 * @property {string} fillTexture
 * @property {{ x: number; y: number; }} fillTextureOffset
 * @property {{ x: number; y: number; }} fillTextureScale
 * @property {VisibilityConfig} ownerVisibility
 * @property {VisibilityConfig} nonOwnerVisibility
 * @property {Object} effect
 * @property {string} effect.effectId
 * @property {boolean} effect.isOverlay
 * @property {string} effect.targetTokens ID of the filter to use to specify targetable tokens.
 * @property {Object} macro
 * @property {string | null} macro.macroId
 * @property {Object} terrainHeightTools
 * @property {THT_RULER_ON_DRAG_MODES} terrainHeightTools.rulerOnDrag
 * @property {string} terrainHeightTools.targetTokens ID of the filter to use to specify targetable tokens.
 */
/**
 * @typedef {Object} VisibilityConfig
 * @property {boolean} default
 * @property {boolean} hovered
 * @property {boolean} controlled
 * @property {boolean} dragging
 * @property {boolean} targeted
 * @property {boolean} turn
 */

/**
 * Gets the auras that are present on the given token.
 * @param {Token | TokenDocument} token
 * @return {AuraConfig[]}
 */
export function getTokenAuras(token) {
	const tokenDoc = token instanceof Token ? token.document : token;
	return tokenDoc.getFlag(MODULE_NAME, TOKEN_AURAS_FLAG) ?? [];
}

/** @type {VisibilityConfig} */
export const auraVisibilityDefaults = {
	default: true,
	hovered: true,
	controlled: true,
	dragging: true,
	targeted: true,
	turn: true
};

/** @type {Omit<AuraConfig, "id">} */
export const auraDefaults = {
	name: "New Aura",
	enabled: true,
	radius: 1,
	lineType: LINE_TYPES.SOLID,
	lineWidth: 4,
	lineColor: "#FF0000",
	lineOpacity: 0.8,
	lineDashSize: 15,
	lineGapSize: 10,
	fillType: CONST.DRAWING_FILL_TYPES.SOLID,
	fillColor: "#FF0000",
	fillOpacity: 0.1,
	fillTexture: "",
	fillTextureOffset: { x: 0, y: 0 },
	fillTextureScale: { x: 100, y: 100 },
	ownerVisibility: auraVisibilityDefaults,
	nonOwnerVisibility: auraVisibilityDefaults,
	effect: {
		effectId: null,
		isOverlay: false,
		targetTokens: ""
	},
	macro: {
		macroId: null
	},
	terrainHeightTools: {
		rulerOnDrag: "NONE",
		targetTokens: ""
	}
};

/** @returns {AuraConfig} */
export function createAura() {
	return foundry.utils.mergeObject(auraDefaults, { id: foundry.utils.randomID() }, { inplace: false });
}

/**
 * From the given (possibly incomplete, e.g. when new fields are added) aura config, gets the complete config.
 * @param {Partial<AuraConfig>} [config]
 * @returns {AuraConfig}
 */
export function getAura(config) {
	return foundry.utils.mergeObject(auraDefaults, config, { inplace: false });
}

// Some default visibility presets
/** @type {Record<import("../consts.mjs").AURA_VISIBILITY_MODES, { owner: VisibilityConfig; nonOwner: VisibilityConfig; }>} */
export const auraVisibilityModeMatrices = {
	"ALWAYS": {
		owner: {
			default: true,
			hovered: true,
			controlled: true,
			dragging: true,
			targeted: true,
			turn: true
		},
		nonOwner: {
			default: true,
			hovered: true,
			targeted: true,
			turn: true
		}
	},
	"OWNER": {
		owner: {
			default: true,
			hovered: true,
			controlled: true,
			dragging: true,
			targeted: true,
			turn: true
		},
		nonOwner: {
			default: false,
			hovered: false,
			targeted: false,
			turn: false
		}
	},
	"HOVER": {
		owner: {
			default: false,
			hovered: true,
			controlled: false,
			dragging: false,
			targeted: false,
			turn: false
		},
		nonOwner: {
			default: false,
			hovered: true,
			targeted: false,
			turn: false
		}
	},
	"OWNER_HOVER": {
		owner: {
			default: false,
			hovered: true,
			controlled: false,
			dragging: false,
			targeted: false,
			turn: false
		},
		nonOwner: {
			default: false,
			hovered: false,
			targeted: false,
			turn: false
		}
	},
	"CONTROL": {
		owner: {
			default: false,
			hovered: false,
			controlled: true,
			dragging: false,
			targeted: false,
			turn: false
		},
		nonOwner: {
			default: false,
			hovered: false,
			targeted: false,
			turn: false
		}
	},
	"DRAG": {
		owner: {
			default: false,
			hovered: false,
			controlled: false,
			dragging: true,
			targeted: false,
			turn: false
		},
		nonOwner: {
			default: false,
			hovered: false,
			targeted: false,
			turn: false
		}
	},
	"TURN": {
		owner: {
			default: false,
			hovered: false,
			controlled: false,
			dragging: false,
			targeted: false,
			turn: true
		},
		nonOwner: {
			default: false,
			hovered: false,
			targeted: false,
			turn: true
		}
	},
	"OWNER_TURN": {
		owner: {
			default: false,
			hovered: false,
			controlled: false,
			dragging: false,
			targeted: false,
			turn: true
		},
		nonOwner: {
			default: false,
			hovered: false,
			targeted: false,
			turn: false
		}
	},
	"NONE": {
		owner: {
			default: false,
			hovered: false,
			controlled: false,
			dragging: false,
			targeted: false,
			turn: false
		},
		nonOwner: {
			default: false,
			hovered: false,
			targeted: false,
			turn: false
		}
	}
};
