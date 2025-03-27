/** @import { AuraTable } from "../components/aura-table.mjs"; */
import { elementName as auraTableElementName } from "../components/aura-table.mjs";
import { DOCUMENT_AURAS_FLAG, MODULE_NAME } from "../consts.mjs";
import { getTokenAuras } from "../data/aura.mjs";

const auraTableElementRef = Symbol("auraTableElementRef");
const auraTableChangeListener = Symbol("auraTableChangeListener");

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

	// Create an AuraTable custom element, if there isn't one already and update the data
	/** @type {AuraTable} */
	let auraTableElement = this[auraTableElementRef];
	if (!auraTableElement) {
		auraTableElement = this[auraTableElementRef] = document.createElement(auraTableElementName);
		auraTableElement.setAttribute("name", `flags.${MODULE_NAME}.${DOCUMENT_AURAS_FLAG}`);
		auraTableElement.addEventListener("change", this[auraTableChangeListener] = e => {
			this._onChangeInput(e);
			updateTokenConfigSize();
		});
	}
	auraTableElement.value = getTokenAuras(this.preview ?? this.document);

	// Create the tab where the table will reside
	const tagContent = $(`<div class="tab" data-group="main" data-tab="gridawareauras"></div>`);
	html.find("> footer").before(tagContent);

	// Attach the table to the tab
	tagContent.get(0).appendChild(auraTableElement);

	updateTokenConfigSize();

	return html;
}

/**
 * Hook for when the TokenConfig dialog is closed.
 * @param {TokenConfig} tokenConfig
 */
export function tokenConfigClose(tokenConfig) {
	/** @type {AuraTable} */
	const auraTable = tokenConfig[auraTableElementRef];
	if (!auraTable) return;

	auraTable._closeOpenDialogs();
	auraTable.removeEventListener("change", tokenConfig[auraTableChangeListener]);

	delete tokenConfig[auraTableElementRef];
}
