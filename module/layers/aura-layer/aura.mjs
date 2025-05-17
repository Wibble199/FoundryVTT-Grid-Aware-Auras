/** @import { AuraConfig, AuraConfigWithRadius } from "../../data/aura.mjs" */
/** @import { AuraGeometry } from "./geometry/index.mjs" */
import { LINE_TYPES, MODULE_NAME, SQUARE_GRID_MODE_SETTING } from "../../consts.mjs";
import { auraDefaults, auraVisibilityDefaults } from "../../data/aura.mjs";
import { pickProperties } from "../../utils/misc-utils.mjs";
import { drawComplexPath, drawDashedComplexPath } from "../../utils/pixi-utils.mjs";
import { GridlessAuraGeometry, HexagonalAuraGeometry, SquareAuraGeometry } from "./geometry/index.mjs";

/**
 * Class that manages a single aura.
 */
export class Aura {

	/** @type {Token} */
	#token;

	/** @type {AuraConfig} */
	#config;

	/** @type {number | undefined} */
	#radius;

	#isVisible = false;

	/** @type {PIXI.Graphics} */
	#graphics;

	/**
	 * The geometry of the aura, relative to the token position.
	 * Will be null if there is no valid geometry.
	 * @type {AuraGeometry | null}
	 */
	#geometry = null;

	/** @param {Token} token */
	constructor(token) {
		this.#token = token;
		this.#graphics = new PIXI.Graphics();
		this.#graphics.sortLayer = 690; // Render just below tokens
	}

	get graphics() {
		return this.#graphics;
	}

	get config() {
		return this.#config;
	}

	/**
	 * Updates this aura graphic, and redraws it if required.
	 * @param {AuraConfigWithRadius} config
	 * @param {Object} [options]
	 * @param {Record<string, any>} [options.tokenDelta] If provided, uses the properties from this instead of the token
	 * @param {boolean} [options.force] Force a redraw, even if no aura properties have changed.
	*/
	update(config, { tokenDelta, force = false } = {}) {
		this.updatePosition({ tokenDelta });

		const shouldRedraw = force ||
			this.#config !== config ||
			this.#radius !== config.radiusCalculated ||
			(tokenDelta && (
				"width" in tokenDelta ||
				"height" in tokenDelta ||
				"hexagonalShape" in tokenDelta
			));

		this.#config = config;
		this.#radius = config.radiusCalculated;

		// If a relevant property has changed, do a redraw
		if (shouldRedraw || force) {
			const { width, height, hexagonalShape } = pickProperties(["width", "height", "hexagonalShape"], tokenDelta, this.#token.document);
			this.#redraw(width, height, config.radiusCalculated, hexagonalShape);
		}

		this.updateVisibility();
	}

	/**
	 * @param {Object} [options]
	 * @param {Record<string, any>} [options.tokenDelta] If provided, uses the properties from this instead of the token
	 */
	updatePosition({ tokenDelta } = {}) {
		this.#graphics.x = tokenDelta?.x ?? this.#token.x;
		this.#graphics.y = tokenDelta?.y ?? this.#token.y;
		this.#graphics.elevation = tokenDelta?.elevation ?? this.#token.document.elevation;
	}

	updateVisibility() {
		// Transition opacity
		this.#isVisible = this.#getVisibility();
		this.#graphics.alpha = this.#isVisible ? 1 : 0;
	}

	/**
	 * Determines whether the given coordinate is inside this aura or not.
	 * @param {Token} targetToken
	 * @param {Object} [options]
	 * @param {{ x?: number; y?: number; }} [options.sourceTokenPosition] If provided, treats the token that owns the
	 * aura as being at this position. If not provided, falls back to the Token or TokenDocument position.
	 * @param {boolean} [options.useActualSourcePosition] If false (default), uses the position of the token document.
	 * If true, uses the actual position of the token on the canvas.
	 * @param {{ x: number; y: number }} [options.targetTokenPosition] If provided, treats the target token as if it
	 * were at these coordinates instead.
	 */
	isInside(targetToken, { sourceTokenPosition, useActualSourcePosition = false, targetTokenPosition } = {}) {
		// Need to offset by token position, as the geometry is relative to token position, not relative to canvas pos
		const auraOffset = pickProperties(["x", "y"], sourceTokenPosition, useActualSourcePosition ? this.#token : this.#token.document);

		return this.#geometry?.isInside(targetToken, { auraOffset, tokenAltPosition: targetTokenPosition }) ?? false;
	}

	destroy() {
		this.#graphics.destroy();
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 * @param {number} radius
	 * @param {number} hexagonalShape
	 */
	async #redraw(width, height, radius, hexagonalShape) {
		const auraConfig = { ...auraDefaults, ...this.#config };

		width ??= this.#token.document.width;
		height ??= this.#token.document.height;
		hexagonalShape ??= this.#token.document.hexagonalShape;

		// Negative radii are not supported
		if (typeof radius !== "number" || radius < 0) {
			this.#graphics.clear();
			this.#geometry = null;
			return;
		}

		switch (canvas.grid.type) {
			case CONST.GRID_TYPES.GRIDLESS:
				this.#geometry = new GridlessAuraGeometry(width, height, radius, canvas.grid.size);
				break;

			case CONST.GRID_TYPES.SQUARE:
				this.#geometry = new SquareAuraGeometry(
					width,
					height,
					radius,
					game.settings.get(MODULE_NAME, SQUARE_GRID_MODE_SETTING),
					canvas.grid.size
				);
				break;

			default: // hexagonal
				this.#geometry = new HexagonalAuraGeometry(
					width,
					height,
					radius,
					hexagonalShape,
					[CONST.GRID_TYPES.HEXEVENQ, CONST.GRID_TYPES.HEXODDQ].includes(canvas.grid.type),
					canvas.grid.size
				);
		}

		if (!this.#geometry) {
			this.#graphics.clear();
			return;
		}

		// Load the texture BEFORE clearing, otherwise there's a noticable flash every time something is chaned.
		const texture = auraConfig.fillType === CONST.DRAWING_FILL_TYPES.PATTERN
			? await loadTexture(auraConfig.fillTexture)
			: null;

		this.#graphics.clear();

		this.#configureFillStyle({ ...auraConfig, fillTexture: texture });

		// If we are using a dashed path, because of the way the dash is implemted, we need to draw the fill separately
		// from the stroke.
		if (auraConfig.lineType === LINE_TYPES.DASHED) {
			this.#configureLineStyle({ lineType: LINE_TYPES.NONE });
			drawComplexPath(this.#graphics, this.#geometry.getPath());
			this.#graphics.endFill();

			this.#configureLineStyle(auraConfig);
			drawDashedComplexPath(this.#graphics, this.#geometry.getPath(), { dashSize: auraConfig.lineDashSize, gapSize: auraConfig.lineGapSize });

		} else {
			this.#configureLineStyle(auraConfig);
			drawComplexPath(this.#graphics, this.#geometry.getPath());
			this.#graphics.endFill();
		}
	}

	/**
	 * Determines whether this aura should be visible, based on it's config and assigned token.
	 */
	#getVisibility() {
		// If token is hidden or set as invisible in config, then it is definitely not visible
		if (!this.#token.visible || this.#token.hasPreview || !this.#config.enabled) {
			return false;
		}

		// Otherwise, determine the visibility based on either ownerVisibility or nonOwnerVisibility, depending on the
		// user's relationship to the token.
		//
		// For all flags other than default (e.g. targeted, hovered, etc.), we see if any of them are relevant now.
		// If any of the relevant ones are true, then the aura should be visible (OR logic).
		// Otherwise, if there are no relevant states (i.e. the token is not targeted AND not hovered, etc.) then use
		// the default visibility.
		// We use mergeObject so that if new states are added in future, they have their defaults handled correctly.
		const visibility = foundry.utils.mergeObject(
			auraVisibilityDefaults,
			this.#token.isOwner ? this.#config.ownerVisibility : this.#config.nonOwnerVisibility,
			{ inplace: false }
		);

		let hasRelevantNonDefaultState = false;

		if (this.#token.hover) {
			if (visibility.hovered) return true;
			hasRelevantNonDefaultState = true;
		}

		if (this.#token.controlled) {
			if (visibility.controlled) return true;
			hasRelevantNonDefaultState = true;
		}

		if (this.#token.isPreview) {
			if (visibility.dragging) return true;
			hasRelevantNonDefaultState = true;
		}

		if (this.#token.isTargeted) {
			if (visibility.targeted) return true;
			hasRelevantNonDefaultState = true;
		}

		if (this.#token.inCombat && this.#token.combatant?.combat?.current?.tokenId === this.#token.id) {
			if (visibility.turn) return true;
			hasRelevantNonDefaultState = true;
		}

		return !hasRelevantNonDefaultState && visibility.default;
	}

	/**
	 * Configures the line style for this graphics instance based on the given values.
	 */
	#configureLineStyle({
		lineType = LINE_TYPES.NONE, lineWidth = 0, lineColor = "#000000", lineOpacity = 0
	} = {}) {
		this.#graphics.lineStyle({
			color: Color.from(lineColor),
			alpha: lineOpacity,
			width: lineType === LINE_TYPES.NONE ? 0 : lineWidth,
			alignment: 0
		});
	}

	/**
	 * Configures the fill style for this graphics instance based on the given values.
	 */
	#configureFillStyle({
		fillType = CONST.DRAWING_FILL_TYPES.NONE, fillColor = "#000000", fillOpacity = 0, fillTexture = undefined, fillTextureOffset = { x: 0, y: 0 }, fillTextureScale = { x: 0, y: 0 }
	} = {}) {
		const color = Color.from(fillColor ?? "#000000");
		if (fillType === CONST.DRAWING_FILL_TYPES.SOLID) {
			this.#graphics.beginFill(fillColor, fillOpacity);
		} else if (fillType === CONST.DRAWING_FILL_TYPES.PATTERN && fillTexture) {
			const { x: xOffset, y: yOffset } = fillTextureOffset;
			const { x: xScale, y: yScale } = fillTextureScale;
			this.#graphics.beginTextureFill({
				texture: fillTexture,
				color,
				alpha: fillOpacity,
				matrix: new PIXI.Matrix(xScale / 100, 0, 0, yScale / 100, xOffset, yOffset)
			});
		} else { // NONE
			this.#graphics.beginFill(0x000000, 0);
		}
	}
}
