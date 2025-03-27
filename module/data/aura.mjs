/** @import { EFFECT_APPLICATION_MODES, THT_RULER_ON_DRAG_MODES } from "../consts.mjs" */
import { DOCUMENT_AURAS_FLAG, LINE_TYPES, MODULE_NAME } from "../consts.mjs";

export const latestAuraConfigVersion = 1;

/**
 * @typedef {Object} AuraConfig
 * @property {number} _v
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
 * @property {EffectConfig[]} effects
 * @property {MacroConfig[]} macros
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
 * @typedef {Object} EffectConfig
 * @property {string} effectId
 * @property {boolean} isOverlay
 * @property {string} targetTokens ID of the filter to use to specify targetable tokens.
 */
/**
 * @typedef {Object} MacroConfig
 * @property {string} macroId
 */

/**
 * Gets the auras that are present on the given token.
 * @param {Token | TokenDocument} token
 * @return {AuraConfig[]}
 */
export function getTokenAuras(token) {
	const tokenDoc = token instanceof Token ? token.document : token;
	const auras = tokenDoc.getFlag(MODULE_NAME, DOCUMENT_AURAS_FLAG) ?? [];
	return auras.map(getAura);
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
	_v: latestAuraConfigVersion,
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
	effects: [],
	macros: [],
	terrainHeightTools: {
		rulerOnDrag: "NONE",
		targetTokens: ""
	}
};

/** @type {EffectConfig} */
export const effectConfigDefaults = {
	effectId: null,
	isOverlay: false,
	targetTokens: "ALL"
};

/** @type {MacroConfig} */
export const macroConfigDefaults = {
	macroId: null
};

/**
* Migration functions to migrate Aura config to newer versions.
* Note that the incoming config may be partial in some rare cases.
* @type {((config: any) => any)[]}
*/
const migrations = [
	// v0 -> v1
	// Change `effect` and `macro` properties into arrays.
	config => {
		const { effect, macro } = config;

		// Because the inner property names (effectId, isOverlay, targetTokens) are the same, can just place the
		// existing object into the array. Any any additional default values (such as mode) will be set in `getAura`.
		if (effect?.effectId?.length)
			config.effects = [effect, ...(config.effects ?? [])];
		delete config.effect;

		if (macro?.macroId?.length)
			config.macros = [macro, ...(config.macros ?? [])];
		delete config.macro;

		return config;
	},
];

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
	// Migrate
	for (let version = +(config._v ?? 0); version < latestAuraConfigVersion; version++) {
		config = migrations[version](config);
	}
	config._v = latestAuraConfigVersion;

	// Merge with defaults
	config = foundry.utils.mergeObject(auraDefaults, config, { inplace: false });
	config.effects = config.effects?.map(e => foundry.utils.mergeObject(effectConfigDefaults, e, { inplace: false })) ?? [];
	config.macros = config.macros?.map(m => foundry.utils.mergeObject(macroConfigDefaults, m, { inplace: false })) ?? [];
	return config;
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
