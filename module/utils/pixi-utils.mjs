/**
 * Draws a dotted path on the given graphics object, using the line style configured on the graphics object.
 * Multiple points can be given to continue the dashing (e.g. bend a dash around a corner).
 * @param {PIXI.Graphics} graphics The graphics instance to draw the line to.
 * @param {number[]} points The (x,y) points of the line to draw.
 * @param {Object} [options={}]
 * @param {boolean} [options.closed=false] If true, joins the final point back up to the first to close the path.
 * @param {number} [options.dashSize=20] The size of the dashes.
 * @param {number} [options.gapSize=undefined] The size of the gaps between dashes (defaults to dashSize).
 * @param {number} [options.offset=0] The initial offset for the dashes.
 */
export function drawDashedPath(graphics, points, { closed = false, dashSize = 20, gapSize = undefined, offset = 0 } = {}) {
	gapSize ??= dashSize;

	// Normalise points into objects
	if (closed) points = [...points, points[0], points[1]];

	// Move to start position of the path
	graphics.moveTo(points[0], points[1]);

	// Drawing state - whether we are drawing a dash or a gap, plus how much left there is to draw.
	// dashGapRemaining will carry on around corners to 'bend' the dash and make it look more natural.
	let dash = false;
	let dashGapRemaining = offset;

	// For each subsequent point, find the angle from the previous point to this one
	for (let i = 2; i < points.length; i += 2) {
		const x1 = points[i - 2];
		const y1 = points[i - 1];
		const x2 = points[i];
		const y2 = points[i + 1];
		const angle = Math.atan2(y2 - y1, x2 - x1);
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const totalLength = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

		let remainingLength = totalLength;

		while (remainingLength > Number.EPSILON) {

			if (dashGapRemaining <= 0) {
				dash = !dash;
				dashGapRemaining = dash ? dashSize : gapSize;
			}

			const totalDrawn = totalLength - remainingLength;
			const distToDraw = Math.min(remainingLength, dashGapRemaining);
			remainingLength -= distToDraw;
			dashGapRemaining -= distToDraw;

			if (dash) {
				graphics.moveTo(x1 + (cos * totalDrawn), y1 + (sin * totalDrawn));
				graphics.lineTo(x1 + (cos * (totalDrawn + distToDraw)), y1 + (sin * (totalDrawn + distToDraw)));
			}
		}
	}
}
