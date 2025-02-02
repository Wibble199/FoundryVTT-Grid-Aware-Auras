/** @import { AuraConfig } from "../../utils/aura.mjs" */
import { LINE_TYPES, MODULE_NAME, SQUARE_GRID_MODE_SETTING } from "../../consts.mjs";
import { auraDefaults, auraVisibilityDefaults } from "../../utils/aura.mjs";
import { generateHexAuraPolygon } from "../../utils/hex-utils.mjs";
import { drawDashedPath } from "../../utils/pixi-utils.mjs";
import { generateSquareAuraPolygon } from "../../utils/square-utils.mjs";

/**
 * Class that manages a single aura.
 */

export class Aura {

	/** @type {Token} */
	#token;

	/** @type {AuraConfig} */
	#config;

	/**
	 * For evenly-sized tokens on hex grids, whether that token is "heavy" (i.e. the largest part of the token is on
	 * the bottom or the right).
	 */
	#isHeavy = false;

	/** @type {number} */
	#width;

	/** @type {number} */
	#height;

	#isVisible = false;

	/** @type {PIXI.Graphics} */
	#graphics;

	/**
	 * The geometry of the aura, relative to the token position.
	 * Will be null if there is no valid geometry (e.g. gridless or uneven hex size).
	 * @type {AuraGeometry | null}
	 */
	#geometry;

	/** @param {Token} token */
	constructor(token) {
		this.#token = token;
		this.#graphics = new PIXI.Graphics();
	}

	get graphics() {
		return this.#graphics;
	}

	get config() {
		return this.#config;
	}

	/**
	 * Updates this aura graphic, and redraws it if required.
	 * @param {AuraConfig} config
	 * @param {Object} [options]
	 * @param {boolean} [options.force] Force a redraw, even if no aura properties have changed.
	*/
	update(config, { force = false } = {}) {
		let shouldRedraw = false;

		this.updatePosition();

		// Update token size
		if (this.#width !== this.#token.document.width) {
			this.#width = this.#token.document.width;
			shouldRedraw = true;
		}

		if (this.#height !== this.#token.document.height) {
			this.#height = this.#token.document.height;
			shouldRedraw = true;
		}

		// Update aura
		if (this.#config !== config) {
			this.#config = config;
			shouldRedraw = true;
		}

		// Update heavy flag
		const isHeavy = Aura._isTokenHeavy(this.#token);
		if (this.#isHeavy !== isHeavy) {
			this.#isHeavy = isHeavy;
			shouldRedraw = true;
		}

		// If a relevant property has changed, do a redraw
		if (shouldRedraw || force) {
			this.#redraw();
		}

		this.updateVisibility();
	}

	updatePosition() {
		this.#graphics.x = this.#token.x;
		this.#graphics.y = this.#token.y;
	}

	updateVisibility() {
		// Transition opacity
		this.#isVisible = this.#getVisibility();
		this.#graphics.alpha = this.#isVisible ? 1 : 0;
	}

	/**
	 * Determines whether the given coordinate is inside this aura or not.
	 * @param {number} x
	 * @param {number} y
	 * @param {Object} [options]
	 * @param {boolean} [options.useActualPosition] If false (default), uses the position of the token document. If true,
	 * uses the actual position of the token on the canvas.
	 */
	isInside(x, y, { useActualPosition = false } = {}) {
		// Need to offset by token position, as the geometry is relative to token position, not relative to canvas pos
		const { x: xOffset, y: yOffset } = useActualPosition ? this.#token : this.#token.document;

		return this.#geometry?.isInside(x - xOffset, y - yOffset) ?? false;
	}

	destroy() {
		this.#graphics.destroy();
	}

	async #redraw() {
		const config = { ...auraDefaults, ...this.#config };

		// Negative radii are not supported
		if (config.radius < 0) {
			this.#graphics.clear();
			return;
		}

		// Generate polygon points. If there are none, early exit
		const points = this.#getPolygonPoints(config);
		if (points.length === 0) {
			this.#graphics.clear();
			this.#geometry = null;
			return;
		}

		this.#geometry = new AuraGeometry(points);

		// Load the texture BEFORE clearing, otherwise there's a noticable flash every time something is chaned.
		const texture = config.fillType === CONST.DRAWING_FILL_TYPES.PATTERN
			? await loadTexture(config.fillTexture)
			: null;

		this.#graphics.clear();

		this.#configureFillStyle({ ...config, fillTexture: texture });

		// If we are using a dashed path, because of the way the dash is implemted, we need to draw the fill separately
		// from the stroke.
		if (config.lineType === LINE_TYPES.DASHED) {
			this.#configureLineStyle({ lineType: LINE_TYPES.NONE });
			this.#graphics.drawPolygon(points);
			this.#graphics.endFill();
			this.#configureLineStyle(config);
			drawDashedPath(this.#graphics, points, { closed: true, dashSize: config.lineDashSize, gapSize: config.lineGapSize });
		} else {
			this.#configureLineStyle(config);
			this.#graphics.drawPolygon(points);
		}
	}

	/**
	 * Determines whether this aura should be visible, based on it's config and assigned token.
	 */
	#getVisibility() {
		// If token is hidden or set as invisible in config, then it is definitely not visible
		if (!this.#token.visible || !this.#config.enabled) {
			return false;
		}

		// If the token has a preview, hide the token's own auras
		if (this.#token.hasPreview) {
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
			{ inplace: false });

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
	 * Gets the points of the shape polygon for the current state.
	 * @param {AuraConfig} aura
	 */
	#getPolygonPoints(aura) {
		switch (canvas.grid.type) {
			case CONST.GRID_TYPES.GRIDLESS: {
				// Gridless not supported
				return [];
			}

			case CONST.GRID_TYPES.SQUARE: {
				return generateSquareAuraPolygon(aura.radius, {
					gridSize: canvas.grid.size,
					width: this.#width,
					height: this.#height,
					mode: game.settings.get(MODULE_NAME, SQUARE_GRID_MODE_SETTING)
				});
			}

			default: { // Any hex
				const centerSize = this.#width !== this.#height || (this.#width % 1) !== 0
					? 0
					: this.#width;

				// Hex only supports tokens with equal width/height and integer size
				if (centerSize <= 0 || (centerSize % 1) !== 0)
					return [];

				return generateHexAuraPolygon(aura.radius, {
					centerSize,
					gridSize: canvas.grid.size,
					cols: [CONST.GRID_TYPES.HEXEVENQ, CONST.GRID_TYPES.HEXODDQ].includes(canvas.grid.type),
					isHeavy: this.#isHeavy
				});
			}
		}
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
			width: lineType === LINE_TYPES.NONE ? 0 : lineWidth
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

	/**
	 * Determines if the given hex token is "heavy" (larger at the bottom/right than the top/left).
	 * @param {Token} token
	 */
	static _isTokenHeavy(token) {
		// If the Hex Size Support/Token Border Supplements module is active, use that to determine whether or not it's
		// heavy. "Alt" is HSS's name for what we call "Heavy".
		const hss = game.modules.get("hex-size-support");
		if (hss?.active === true) {
			return hss.api.isAltOrientation(token);
		}

		// Foundry seems to render size 2 tokens as heavy and size 4s as not-heavy.
		return token.document.width === 2;
	}
}

export class AuraGeometry {

	/**
	 * Edges sorted by their Y values, so that it is quicker to find relevant ones when doing hit testing.
	 * `p1` is always the top-left most point, and `p2` is always the bottom-right most point.
	 */
	#ySortedEdges;

	#top;

	#bottom;

	/** @param {number[]} points */
	constructor(points) {
		({ sortedEdges: this.#ySortedEdges, top: this.#top, bottom: this.#bottom } = AuraGeometry.#getYSortedEdges(points));
	}

	/**
	 * Determines whether the given point is inside this aura's geometry or not using the ray cast algorithm.
	 * @param {number} x
	 * @param {number} y
	 */
	isInside(x, y) {
		// If the y is out of bounds, then it is definately not inside so we can skip looking for edges
		if (y < this.#top || y > this.#bottom)
			return false;

		let collisionCount = 0;

		for (let { p1, p2, slope } of this.#ySortedEdges) {
			// If edge is horizontal, then it should be ignored as it will either at the wrong Y or will intersect an
			// infinite number of times (as it lies on the test ray)
			if (p1.y === p2.y)
				continue;

			// Since the edges are sorted, once we find one that has a top (p1) Y higher than the test y point, we can
			// stop searching
			if (y < p1.y)
				break;

			// If the bottom point of the line is lower than Y, then it can't collide.
			if (y > p2.y)
				continue;

			// If the test point lies within the y range of this edge, work out what the x point of the line is at the
			// exact y test point. If this is less than the test x point then collision occured.
			const edgeX = (y - p1.y) / slope + p1.x;

			if (edgeX < x)
				collisionCount++;
		}

		return collisionCount % 2 === 1;
	}

	/** @param {number[]} points */
	static #getYSortedEdges(points) {
		/** @type {{ p1: { x: number; y: number; }; p2: { x: number; y: number }; slope: number; }[]} */
		const edges = [];

		let top = Infinity;
		let bottom = -Infinity;

		for (let i = 0; i < points.length; i += 2) {
			const y1 = points[i + 1];
			const y2 = points[(i + 3) % points.length];

			let p1 = { x: points[i], y: y1 };
			let p2 = { x: points[(i + 2) % points.length], y: y2 };

			// p1 should be top-left most, p2 should be bottom-right most; so may need to swap p1 and p2 around
			if (p2.y < p1.y || (p2.y === p1.y && p2.x < p1.x))
				([p1, p2] = [p2, p1]);

			const slope = p1.x === p2.x
				? Infinity
				: (p2.y - p1.y) / (p2.x - p1.x);

			edges.push({ p1, p2, slope });

			top = Math.min(top, y1, y2);
			bottom = Math.max(bottom, y1, y2);
		}

		edges.sort((a, b) => a.p1.y === b.p1.y
			? a.p1.x - b.p1.x
			: a.p1.y - b.p1.y);

		return { sortedEdges: edges, top, bottom };
	}
}
