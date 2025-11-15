/** @import { AURA_POSITIONS, EFFECT_MODES, MACRO_MODES, SEQUENCE_EASINGS, SEQUENCE_TRIGGERS, SEQUENCE_POSITIONS, THT_RULER_ON_DRAG_MODES } from "../consts.mjs" */
import { DOCUMENT_AURAS_FLAG, LINE_TYPES, MODULE_NAME } from "../consts.mjs";

export const latestAuraConfigVersion = 1;

/**
 * @typedef {Object} AuraConfig
 * @property {number} _v
 * @property {string} id
 * @property {string} name
 * @property {boolean} enabled
 * @property {number | string} radius A numeric value or a property name on the actor pointing to a numeric value.
 * @property {AURA_POSITIONS} position
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
 * @property {boolean} scaleToObject
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
 * @param {TokenDocument | Item} document
 * @param {Object} [options]
 * @param {boolean} [options.calculateRadius] If true, calculates the actual radius (resolving property paths).
 * @returns {(AuraConfig & { radiusCalculated?: number; })[]}
 */
export function getDocumentOwnAuras(document, { calculateRadius = false } = {}) {
	// Only Items and TokenDocuments can have auras
	if (!(document instanceof TokenDocument || document instanceof Item || document instanceof foundry.data.PrototypeToken)) {
		throw new Error("Must provide an Item or Token document to getDocumentOwnAuras.");
	}

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
	if (expression === "") return undefined;

	/** @param {number} v */
	const round2dp = v => Math.round(v * 100) / 100;

	// If it's a literal number, use that number.
	let parsed = +expression;
	if (typeof parsed === "number" && !isNaN(parsed))
		return round2dp(parsed);

	// For backwards compatibility, we see if it is a property path on the context. If so, we use that.
	const property = foundry.utils.getProperty(context, expression);
	if (property !== undefined) {
		parsed = parseInt(property);
		return typeof parsed === "number" && !isNaN(parsed) ? round2dp(parsed) : undefined;
	}

	// Finally, try and evaluate it as a Roll
	try {
		const roll = new Roll(expression, context);
		if (roll.isDeterministic) {
			roll.evaluateSync();
			return round2dp(roll.total);
		}
	} catch {
		return undefined;
	}

	return undefined;
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
	position: "CENTER",
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
	scaleToObject: false,
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
 * @param {Object} [options]
 * @param {boolean} [options.newId] If true, assigns a new ID to the aura.
 * @returns {AuraConfig}
 */
export function getAura(config, { newId = false } = {}) {
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
	if (newId) config.id = foundry.utils.randomID();
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

/**
 * Shows a dialog with the JSON for the given aura.
 * @param {AuraConfig} aura
 */
export function exportAuraJson(aura) {
	const { id, ...auraWithoutId } = aura;
	new foundry.applications.api.DialogV2({
		window: {
			title: "Export",
			icon: "fas fa-download",
			resizable: true
		},
		classes: ["grid-aware-auras-import-export-dialog"],
		content: `<textarea>${JSON.stringify(auraWithoutId)}</textarea>`,
		buttons: [
			{
				icon: "<i class='fas fa-times'></i>",
				label: game.i18n.localize("Close"),
				action: "close"
			}
		],
		position: {
			width: 530,
			height: 320
		}
	}).render(true);
}

/**
 * Shows a dialog to the user and asks them to provide JSON for a new aura.
 * @param {Object} [options]
 * @param {boolean} [options.newId] When true, will create a new ID for the aura, regardless of if it was provided in the JSON.
 * @returns {Promise<AuraConfig>}
 */
export function importAuraJson({ newId = true } = {}) {
	return new Promise(resolve => {
		new foundry.applications.api.DialogV2({
			window: {
				title: "Import",
				icon: "fas fa-upload",
				resizable: true
			},
			classes: ["grid-aware-auras-import-export-dialog"],
			content: "<textarea></textarea>",
			buttons: [
				{
					icon: "<i class=''></i>",
					label: "Import",
					callback: (_event, _target, dialog) => {
						// On Foundry V13, dialog is a DialogV2; on Foundry V12 this is the dialog's element.
						const dialogElement = dialog instanceof foundry.applications.api.DialogV2 ? dialog.element : dialog;
						const json = dialogElement.querySelector("textarea").value;
						try {
							let parsed;
							try {
								parsed = JSON.parse(json);
							} catch (ex) {
								throw new Error(`Failed to import aura: Invalid JSON provided (${ex.message}).`);
							}

							if (Array.isArray(parsed) || typeof parsed !== "object")
								throw new Error("Failed to import aura: Expected JSON to be an object.");

							resolve(getAura(parsed, { newId }));
						} catch (error) {
							ui.notifications.error(error.message);
							throw error; // Rethrow to prevent dialog from closing
						}
					}
				},
				{
					icon: "<i class='fas fa-times'></i>",
					label: game.i18n.localize("Close"),
					action: "close"
				}
			],
			position: {
				width: 530,
				height: 320
			}
		}).render(true);
	});
}
