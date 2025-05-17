/**
 * @typedef {Object} MoveCommand
 * @property {"m"} type
 * @property {number} x
 * @property {number} y
 */
/**
 * @typedef {Object} LineCommand
 * @property {"l"} type
 * @property {number} x
 * @property {number} y
 */
/**
 * @typedef {MoveCommand | LineCommand} PathCommand
 */

/**
 * Draws a complex path in the given graphics object.
 * Will initially reset cursor position to (0,0), so the first command should be a move.
 * @param {PIXI.Graphics} graphics The graphics instance to draw the line to.
 * @param {Iterable<PathCommand>} commands The commands of the path to draw.
 */
export function drawComplexPath(graphics, commands) {
	graphics.moveTo(0, 0);

	for (const command of commands) {
		switch (command.type) {
			case "m":
				graphics.moveTo(command.x, command.y);
				break;

			case "l":
				graphics.lineTo(command.x, command.y);
				break;

			default:
				throw new Error("Unknown command");
		}
	}
}

/**
 * Draws a complex dotted path on the given graphics object, using the line style configured on the graphics object.
 * Will initially reset cursor position to (0,0), so the first command should be a move.
 * @param {PIXI.Graphics} graphics The graphics instance to draw the line to.
 * @param {Iterable<PathCommand>} commands The commands of the path to draw.
 * @param {Object} [options={}]
 * @param {number} [options.dashSize=20] The size of the dashes.
 * @param {number} [options.gapSize=undefined] The size of the gaps between dashes (defaults to dashSize).
 * @param {number} [options.offset=0] The initial offset for the dashes.
 */
export function drawDashedComplexPath(graphics, commands, { dashSize = 20, gapSize = undefined, offset = 0 } = {}) {
	gapSize ??= dashSize;

	// Move to start position of the path
	let curX = 0, curY = 0;
	graphics.moveTo(0, 0);

	// Drawing state - whether we are drawing a dash or a gap, plus how much left there is to draw.
	// dashGapRemaining will carry on around corners to 'bend' the dash and make it look more natural.
	let dash = false;
	let dashGapRemaining = offset;

	for (const command of commands) {
		switch (command.type) {
			case "m": {
				({ x: curX, y: curY } = command);
				graphics.moveTo(curX, curY);
				break;
			}

			case "l": {
				// Find the angle from the previous point to this one
				let x1 = curX, y1 = curY;
				let { x: x2, y: y2 } = command;

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

				({ x: curX, y: curY } = command);
				break;
			}

			default:
				throw new Error("Unknown command");
		}
	}
}
