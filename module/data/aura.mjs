/** @import { EFFECT_MODES, MACRO_MODES, SEQUENCE_EASINGS, SEQUENCE_TRIGGERS, SEQUENCE_POSITIONS, THT_RULER_ON_DRAG_MODES } from "../consts.mjs" */
import { DOCUMENT_AURAS_FLAG, LINE_TYPES, MODULE_NAME } from "../consts.mjs";

export const latestAuraConfigVersion = 1;

/**
 * @typedef {Object} AuraConfig
 * @property {number} _v
 * @property {string} id
 * @property {string} name
 * @property {boolean} enabled
 * @property {number | string} radius A numeric value or a property name on the actor pointing to a numeric value.
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
 * @property {SequencerEffectConfig[]} sequencerEffects
 * @property {Object} terrainHeightTools
 * @property {THT_RULER_ON_DRAG_MODES} terrainHeightTools.rulerOnDrag
 * @property {string} terrainHeightTools.targetTokens ID of the filter to use to specify targetable tokens.
 */
/** @typedef {AuraConfig & { radiusCalculated: number | undefined; }} AuraConfigWithRadius */
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
 * @property {EFFECT_MODES} mode
 * @property {number} priority For ongoing effect modes, determines which one takes priority. For non-ongoing effects, determines which order they apply/remove (if applicable). However, ongoing effects ALWAYS take priority over non-ongoing ones.
 */
/**
 * @typedef {Object} MacroConfig
 * @property {string} macroId
 * @property {string} targetTokens ID of the filter to use to specify targetable tokens.
 * @property {MACRO_MODES} mode
 */
/**
 * @typedef {Object} SequencerEffectConfig
 * @property {string} uId Unique ID for this sequence, used in the sequencer name to uniquely identify it.
 * @property {string} effectPath The DB path of the sequencer effect to play.
 * @property {string} targetTokens ID of the filter to use to specify targetable tokens.
 * @property {SEQUENCE_TRIGGERS} trigger
 * @property {SEQUENCE_POSITIONS} position
 * @property {number} repeatCount
 * @property {number} repeatDelay
 * @property {number} delay
 * @property {number} opacity
 * @property {number} fadeInDuration
 * @property {SEQUENCE_EASINGS} fadeInEasing
 * @property {number} fadeOutDuration
 * @property {SEQUENCE_EASINGS} fadeOutEasing
 * @property {number} scale
 * @property {number} scaleInScale
 * @property {number} scaleInDuration
 * @property {SEQUENCE_EASINGS} scaleInEasing
 * @property {number} scaleOutScale
 * @property {number} scaleOutDuration
 * @property {SEQUENCE_EASINGS} scaleOutEasing
 * @property {number} playbackRate
 * @property {boolean} belowTokens
 */

/**
 * Gets the auras that are present on the given token.
 * @param {Token | TokenDocument} token
 * @returns {AuraConfigWithRadius[]}
 */
export function getTokenAuras(token) {
	const tokenDoc = token instanceof Token ? token.document : token;

	const auras = getDocumentOwnAuras(tokenDoc, { calculateRadius: true });
	const auraIds = new Set(auras.map(a => a.id));

	for (const item of tokenDoc.actor?.items ?? []) {
		for (const aura of getDocumentOwnAuras(item, { calculateRadius: true })) {
			// If there are multiple auras with the same ID, only use one of them.
			// This prevents multiple of the same item with the same aura from having multiple identical auras, and
			// prevents issues with the enter/leave detection (which works off the aura ID, and requires each aura to
			// have a unique ID per actor).
			if (auraIds.has(aura.id)) continue;

			auras.push(aura);
			auraIds.add(aura.id);
		}
	}

	return auras;
}

/**
 * Gets the auras defined on a document.
 * @param {Document} document
 * @param {Object} [options]
 * @param {boolean} [options.calculateRadius] If true, calculates the actual radius (resolving property paths).
 * @returns {(AuraConfig & { radiusCalculated?: number; })[]}
 */
export function getDocumentOwnAuras(document, { calculateRadius = false } = {}) {
	/** @type {Partial<AuraConfig>[]} */
	const auraData = document.getFlag(MODULE_NAME, DOCUMENT_AURAS_FLAG) ?? [];
	let auras = auraData.map(getAura);

	if (calculateRadius) {
		const actor = document instanceof TokenDocument ? document.actor : document instanceof Item ? document.parent : undefined;
		const item = document instanceof Item ? document : undefined;
		const context = { actor, item };
		auras = auras.map(a => ({ ...a, radiusCalculated: calculateAuraRadius(a.radius, context) }));
	}

	return auras;
}

/**
 * Calculates the actual aura radius from a radius expression.
 * @param {string | number} expression A radius value or the name of a property on the actor or item documents.
 * @param {{ actor: Actor | undefined; item: Item | undefined; }} context The context used to resolve properties from.
 */
export function calculateAuraRadius(expression, context) {
	// If it's a literal number, use that number.
	let parsed = parseInt(expression);
	if (typeof parsed === "number" && !isNaN(parsed))
		return Math.round(parsed);

	// Evaluate the property name against the context
	const property = foundry.utils.getProperty(context, expression);
	parsed = parseInt(property);
	return typeof parsed === "number" && !isNaN(parsed) ? Math.round(parsed) : undefined;
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

/** @type {() => Omit<AuraConfig, "id">} */
export const auraDefaults = () => ({
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
	sequencerEffects: [],
	terrainHeightTools: {
		rulerOnDrag: "NONE",
		targetTokens: ""
	}
});

/** @type {() => EffectConfig} */
export const effectConfigDefaults = () => ({
	effectId: null,
	isOverlay: false,
	targetTokens: "ALL",
	mode: "APPLY_WHILE_INSIDE",
	priority: 0
});

/** @type {() => MacroConfig} */
export const macroConfigDefaults = () => ({
	macroId: null,
	targetTokens: "ALL",
	mode: "ENTER_LEAVE"
});

/** @type {() => SequencerEffectConfig} */
export const sequencerEffectConfigDefaults = () => ({
	uId: foundry.utils.randomID(),
	effectPath: "",
	targetTokens: "ALL",
	trigger: "ON_ENTER",
	position: "ON_TARGET",
	repeatCount: 1,
	repeatDelay: 0,
	delay: 0,
	opacity: 1,
	fadeInDuration: 0,
	fadeInEasing: "linear",
	fadeOutDuration: 0,
	fadeOutEasing: "linear",
	scale: 1,
	scaleInScale: 1,
	scaleInDuration: 0,
	scaleInEasing: "linear",
	scaleOutScale: 1,
	scaleOutDuration: 0,
	scaleOutEasing: "linear",
	playbackRate: 1,
	belowTokens: false
});

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
			config.effects = [effect, ...config.effects ?? []];
		delete config.effect;

		if (macro?.macroId?.length)
			config.macros = [macro, ...config.macros ?? []];
		delete config.macro;

		return config;
	}
];

/** @returns {AuraConfig} */
export function createAura() {
	return foundry.utils.mergeObject(auraDefaults(), { id: foundry.utils.randomID() }, { inplace: false });
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
	config = foundry.utils.mergeObject(auraDefaults(), config, { inplace: false });
	config.effects = config.effects?.map(e => foundry.utils.mergeObject(effectConfigDefaults(), e, { inplace: false })) ?? [];
	config.macros = config.macros?.map(m => foundry.utils.mergeObject(macroConfigDefaults(), m, { inplace: false })) ?? [];
	config.sequencerEffects = config.sequencerEffects?.map(s => foundry.utils.mergeObject(sequencerEffectConfigDefaults(), s, { inplace: false })) ?? [];
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
