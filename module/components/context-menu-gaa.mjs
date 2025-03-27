/**
 * Specialized subclass of the ContextMenu that places the menu at the document body instead of inline. Helps to combat
 * clipping/overflow of the menu.
 *
 * Code taken from the 5e system's ContextMenu5e.
 */
export class ContextMenuGaa extends ContextMenu {
	/** @override */
	_setPosition(html, target, options = {}) {
		if (game.release.generation > 12) {
			return this._setFixedPosition(html, target, options);
		} else {
			html = html[0];
			target = target[0];
		}

		document.body.appendChild(html);
		const { clientWidth, clientHeight } = document.documentElement;
		const { width, height } = html.getBoundingClientRect();

		const { clientX, clientY } = window.event;
		const left = Math.min(clientX, clientWidth - width);
		this._expandUp = clientY + height > clientHeight;
		html.classList.toggle("expand-up", this._expandUp);
		html.classList.toggle("expand-down", !this._expandUp);
		html.style.visibility = "";
		html.style.left = `${left}px`;
		html.style.zIndex = "var(--z-index-tooltip)";
		html.style.width = "min-content";
		if (this._expandUp) html.style.bottom = `${clientHeight - clientY}px`;
		else html.style.top = `${clientY}px`;
		target.classList.add("context");
	}
}
