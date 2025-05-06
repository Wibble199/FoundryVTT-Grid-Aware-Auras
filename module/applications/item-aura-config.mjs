/** @import { AuraTable } from "../components/aura-table.mjs" */
/** @import { AuraConfig } from "../data/aura.mjs" */
import "../components/aura-table.mjs";
import { DOCUMENT_AURAS_FLAG, MODULE_NAME } from "../consts.mjs";
import { getDocumentOwnAuras } from "../data/aura.mjs";
import { createRef, html, ref, render } from "../lib/lit-all.min.js";

const { ApplicationV2 } = foundry.applications.api;

export class ItemAuraConfigApplication extends ApplicationV2 {

	#item;

	/** @type {{ value?: AuraTable }} */
	#auraTableRef = createRef();

	/** @param {Item} item */
	constructor(item, options = {}) {
		super(options);

		this.#item = item;
		item.apps[this.appId] = this;
	}

	static DEFAULT_OPTIONS = {
		tag: "form",
		window: {
			contentClasses: ["sheet", "standard-form"],
			icon: "far fa-hexagon",
		},
		position: {
			width: 500,
			height: "auto"
		},
		form: {
			closeOnSubmit: true,
			handler: ItemAuraConfigApplication.#onSubmit
		}
	};

	/** @override */
	get id() {
		return `gaa-token-aura-config-${this.#item.id}`;
	}

	/** @override */
	get title() {
		return `Aura Configuration: ${this.#item.name}`;
	}

	/** @override */
	_renderHTML() {
		return html`
			<gaa-aura-table
				name="auras"
				.value=${getDocumentOwnAuras(this.#item)}
				.parentId=${this.#item.id}
				.radiusContext=${{ actor: this.#item.parent, item: this.#item }}
				${ref(this.#auraTableRef)}>
			</gaa-aura-table>

			<footer class="sheet-footer flexrow">
				<button type="submit">
					<i class="fas fa-save"></i>
					${game.i18n.localize("Save Changes")}
				</button>
			</footer>
		`;
	}

	/**
	 * @this {ItemAuraConfigApplication}
	 * @param {Event} _event
	 * @param {HTMLFormElement} _form
	 * @param {FormDataExtended} formData
	 */
	static async #onSubmit(_event, _form, formData) {
		/** @type {{ auras: AuraConfig[] }} */
		const { auras } = formData.object;

		await this.#item.update({
			[`flags.${MODULE_NAME}.${DOCUMENT_AURAS_FLAG}`]: auras
		});
	}

	/** @override */
	close(options = {}) {
		this.#auraTableRef.value?._closeOpenDialogs();
		return super.close(options);
	}

	/** @override */
	_replaceHTML(templateResult, container) {
		render(templateResult, container);
	}
}

/**
 * Hook for adding the "Auras" button to the header of item sheets.
 * @param {ItemSheet} sheet
 * @param {ApplicationHeaderButtons[]} buttons
 */
export function addAuraConfigItemHeaderButton(sheet, buttons) {
	buttons.unshift({
		label: "Auras",
		class: "configure-auras",
		icon: "far fa-hexagon",
		onclick: e => {
			e.preventDefault();
			const app = new ItemAuraConfigApplication(sheet.document);
			app.render(true);
		}
	});
}
