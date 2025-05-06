/** @import { AuraTable } from "../components/aura-table.mjs"; */
import { DOCUMENT_AURAS_FLAG, MODULE_NAME } from "../consts.mjs";
import { getDocumentOwnAuras } from "../data/aura.mjs";
import { AuraLayer } from "../layers/aura-layer/aura-layer.mjs";
import { createRef, html, LitElement, ref, repeat, styleMap, when } from "../lib/lit-all.min.js";

const elementName = "gaa-token-aura-config";

const elementRef = Symbol("auraTableElementRef");

/**
 * Specialised element for the aura configuration that is shown in the TokenConfig.
 * Implemented as an element as it contains state that should be persisted between TokenConfig renders.
 */
class TokenConfigGridAwareAurasElement extends LitElement {

	static properties = {
		tokenConfig: { attribute: false }
	};

	/** @type {TokenConfig} */
	tokenConfig;

	/** @type {{ value?: AuraTable; }} */
	#tokenAurasTableRef = createRef();

	get appId() {
		return `${this.tokenConfig.appId}-gridawareauras`;
	}

	render() {
		/** @type {Actor | undefined} */
		const actor = this.tokenConfig.document.actor;
		const tokenAuras = getDocumentOwnAuras(this.tokenConfig.preview ?? this.tokenConfig.document);

		/** @type {Item[]} */
		const items = actor?.items ?? [];
		const itemsWithAuras = items
			.map(item => ({ item, auras: getDocumentOwnAuras(item) }))
			.filter(({ auras }) => auras.length > 0);

		return html`
			<gaa-aura-table
				name=${`flags.${MODULE_NAME}.${DOCUMENT_AURAS_FLAG}`}
				.value=${tokenAuras}
				subHeadingText="Token"
				@change=${e => { this.tokenConfig._onChangeInput(e); this.#requestResize(); }}
				.radiusContext=${{ actor }}
				${ref(this.#tokenAurasTableRef)}
				style=${styleMap({ display: "block", marginTop: "0.5rem", marginBottom: itemsWithAuras.length ? "0" : "0.5rem" })}
			></gaa-aura-table>

			${repeat(itemsWithAuras, ({ item }) => item.id, ({ item, auras }) => html`
				<gaa-aura-table
					.value=${auras}
					.parentId=${item.id}
					.showHeader=${false}
					.subHeadingText=${item.name}
					.attachConfigsTo=${item}
					.radiusContext=${{ actor, item }}
					@change=${e => this.#updateItemAura(item, e.target.value)}
				></gaa-aura-table>
			`)}

			${when(itemsWithAuras.length > 0, () => html`
				<hr class="hr-narrow" />
				<p><small>Note that changes made to auras on items are saved immediately (even if you do not click '${game.i18n.localize("TOKEN.Update")}' below).</small></p>
			`)}
		`;
	}

	connectedCallback() {
		super.connectedCallback();

		// When the token's actor redraws (which happens when Items change), redraw this element
		// Actor may not always be present (e.g. if the actor was deleted but token was not)
		if (this.tokenConfig.document.actor) {
			this.tokenConfig.document.actor.apps[this.appId] = {
				render: () => this.requestUpdate(),
				close: () => {}
			};
		}
	}

	disconnectedCallback() {
		super.disconnectedCallback();

		// Remove the function that redraws this element when the actor changes.
		// Actor may not always be present (e.g. if the actor was deleted but token was not)
		if (this.tokenConfig.document.actor) {
			delete this.tokenConfig.document.actor.apps[this.appId];
		}
	}

	/**
	 * @param {Item} item
	 * @param {import("../data/aura.mjs").AuraConfig[]} auras
	 */
	async #updateItemAura(item, auras) {
		await item.update({ [`flags.${MODULE_NAME}.${DOCUMENT_AURAS_FLAG}`]: auras });

		// Because the preview token that appears when the TokenConfig is open is different from the token returned by
		// Actor.getActiveTokens, the updateItem hook won't trigger an update on the preview token. So do it manually.
		if (AuraLayer.current && this.tokenConfig.preview?.object) {
			AuraLayer.current._updateAuras({ token: this.tokenConfig.preview.object });
		}
	}

	#requestResize() {
		this.dispatchEvent(new Event("requestresize"));
	}

	// Disable shadow DOM
	createRenderRoot() {
		return this;
	}

	/**
	 * Closes any Aura dialogs that have been opened from the token's own config.
	 * Does not close Aura dialogs from owned items because those are still active and can still be edited.
	 */
	_closeOpenDialogs() {
		this.#tokenAurasTableRef.value?._closeOpenDialogs();
	}
}

customElements.define(elementName, TokenConfigGridAwareAurasElement);

/**
 * Wrapper for the TokenConfig._renderInner function to add the GAA aura config to it.
 * @param {TokenConfig["_renderInner"]} wrapped
 * @param {Parameters<TokenConfig["_renderInner"]>} args
 * @this {TokenConfig}
 */
export async function tokenConfigRenderInner(wrapped, ...args) {
	const html = await wrapped(...args);

	const updateTokenConfigSize = () => setTimeout(() => {
		if (this._state === Application.RENDER_STATES.RENDERED)
			this.setPosition();
	}, 0);

	// Insert a tab item for the new control
	html.find("> nav.sheet-tabs").append(`
		<a class="item" data-tab="gridawareauras"><i class="far fa-hexagon"></i> ${game.i18n.localize("GRIDAWAREAURAS.Auras")}</a>
	`);

	// Create an TokenConfigGridAwareAurasElement custom element, if there isn't one already.
	// Don't destroy and re-create the table on redraw because then we lose state which needs to be persisted.
	/** @type {TokenConfigGridAwareAurasElement} */
	let element = this[elementRef];
	if (!element) {
		element = this[elementRef] = document.createElement(elementName);
		element.tokenConfig = this;
		element.addEventListener("requestresize", updateTokenConfigSize);
	}

	// Create the tab where the element will reside
	const tabContent = $(`<div class="tab" data-group="main" data-tab="gridawareauras"></div>`);
	html.find("> footer").before(tabContent);

	// Attach the table to the tab
	tabContent.get(0).appendChild(element);
	updateTokenConfigSize();

	return html;
}

/**
 * Hook for when the TokenConfig dialog is closed.
 * @param {TokenConfig} tokenConfig
 */
export function tokenConfigClose(tokenConfig) {
	/** @type {TokenConfigGridAwareAurasElement} */
	const element = tokenConfig[elementRef];
	if (!element) return;
	delete tokenConfig[elementRef];

	// Clean up
	element._closeOpenDialogs();
}
