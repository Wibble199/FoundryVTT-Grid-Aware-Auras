/** @import { AuraConfig } from "../data/aura.mjs" */
import { AuraConfigApplication } from "../applications/aura-config.mjs";
import { ENABLE_EFFECT_AUTOMATION_SETTING, ENABLE_MACRO_AUTOMATION_SETTING, LINE_TYPES, MODULE_NAME } from "../consts.mjs";
import { createAura } from "../data/aura.mjs";
import { html, LitElement, when } from "../lib/lit-all.min.js";
import { ContextMenuGaa } from "./context-menu-gaa.mjs";

export const elementName = "gaa-aura-table";

export class AuraTable extends LitElement {

	static properties = {
		value: { attribute: "value", type: Array, reflect: true },
		disabled: { type: Boolean },
		showHeader: { type: Boolean },
		subHeadingText: { type: String },
		parentId: { type: String },
		attachConfigsTo: { attribute: false }
	};

	static formAssociated = true;

	/** @type {ElementInternals} */
	#internals;

	/** @type {ContextMenuGaa | undefined} */
	#contextMenu;

	/** @type {Map<string, AuraConfigApplication>} */
	#openAuraConfigApps = new Map();

	constructor() {
		super();

		this.#internals = this.attachInternals();

		/** @type {AuraConfig[]} */
		this.value = [];

		/** @type {boolean} */
		this.disabled = false;

		this.showHeader = true;

		/** @type {string | undefined} */
		this.subHeadingText = undefined;

		/** @type {string | undefined} */
		this.parentId = undefined;

		/** @type {Record<string, any> | undefined} */
		this.attachConfigsTo = undefined;

		this.#setupContextMenu();
	}

	get form() {
		return this.#internals.form;
	}

	get name() {
		return this.getAttribute("name");
	}

	get type() {
		return this.localName;
	}

	render() {
		const effectsEnabled = game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING);
		const macrosEnabled = game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING);

		return html`
			<table class="grid-aware-auras-table">
				<thead>
					${when(this.showHeader, () => html`
						<tr style="background: none">
							<th style="width: 24px">&nbsp;</th>
							<th class="text-left">${when(!this.subHeadingText?.length, () => "Name")}</th>
							<th class="text-center" style="width: 58px">Radius</th>
							<th class="text-center" style="width: 58px">Line</th>
							<th class="text-center" style="width: 58px">Fill</th>
							<th class="text-center" style="width: 24px">
								${when(!this.disabled, () => html`
									<a @click="${this.#createAura}">
										<i class="fas fa-plus"></i>
									</a>
								`)}
							</th>
						</tr>
					`)}

					${when(this.subHeadingText?.length, () => html`
						<tr style="background: none">
							<th colspan="6">
								<div class="grid-aware-auras-table-item-header">
									<span>${this.subHeadingText}</span>
									<hr class="hr-narrow" />
								</div>
							</th>
						</tr>
					`)}
				</thead>
				<tbody>
					${this.value.map(a => this.#renderAura(a, effectsEnabled, macrosEnabled))}
				</tbody>
			</table>
		`;
	}

	/**
	 * @param {AuraConfig} aura
	 * @param {boolean} effectsEnabled
	 * @param {boolean} macrosEnabled
	 */
	#renderAura(aura, effectsEnabled, macrosEnabled) {
		return html`
			<tr data-aura-id="${aura.id}">
				<td style="width: 24px">
					${this.disabled
						? html`<p style="width: 18px">
							<i class=${`fas fa-toggle-${aura.enabled ? 'on' : 'off'}`}></i>
						</p>`
						: html`<a data-tooltip="Enable/disable aura" style="width: 18px" @click=${() => !this.disabled && this.#setAuraEnabled(aura.id, !aura.enabled)}>
							<i class=${`fas fa-toggle-${aura.enabled ? 'on' : 'off'}`}></i>
						</a>`
					}
				</td>
				<td>
					${aura.name}
					${when((effectsEnabled && aura.effects?.length) || (macrosEnabled && aura.macros?.length),
						() => html`<i class="fas fa-bolt" data-tooltip="This aura applies effects or calls macros"></i>`)}
				</td>
				<td class="text-center" style="width: 58px">
					${aura.radius}
				</td>
				<td class="text-center" style="width: 58px">
					${when(aura.lineType !== LINE_TYPES.NONE,
						() => html`<input type="color" value="${aura.lineColor}" disabled>`)}
				</td>
				<td class="text-center" style="width: 58px">
					${when(aura.fillType !== CONST.DRAWING_FILL_TYPES.NONE,
						() => html`<input type="color" value="${aura.fillColor}" disabled>`)}
				</td>
				<td class="text-center" style="width: 24px">
					${when(!this.disabled, () => html`
						<a @click=${this.#openContextMenu} style="width: 100%; display: inline-block;">
							<i class="fas fa-ellipsis-vertical"></i>
						</a>
					`)}
				</td>
			</tr>
		`;
	}

	#setupContextMenu() {
		/**
		 * Callback wrapper for context menu which adds auraId and aura to the callback parameter.
		 * @template T
		 * @param {(args: { el: JQuery; auraId: string; aura: AuraConfig; }) => T} callback
		 * @returns {(el: JQuery) => T}}
		 */
		const withAura = callback => {
			return el => {
				const auraId = el.data("auraId");
				const aura = this.value.find(a => a.id === auraId);
				return callback({ el, auraId, aura });
			};
		}

		this.#contextMenu = new ContextMenuGaa(this, "[data-aura-id]", [
			{
				name: "Edit",
				icon: "<i class='fas fa-edit'></i>",
				callback: withAura(({ aura }) => this.#editAura(aura))
			},
			{
				name: "Enable",
				icon: "<i class='fas fa-toggle-on'></i>",
				callback: withAura(({ auraId }) => this.#setAuraEnabled(auraId, true)),
				condition: withAura(({ aura }) => !aura.enabled)
			},
			{
				name: "Disable",
				icon: "<i class='fas fa-toggle-off'></i>",
				callback: withAura(({ auraId }) => this.#setAuraEnabled(auraId, false)),
				condition: withAura(({ aura }) => aura.enabled)
			},
			{
				name: "Duplicate",
				icon: "<i class='fas fa-clone'></i>",
				callback: withAura(({ aura }) => {
					const clonedAura = getAura({ ...aura, id: foundry.utils.randomID() });
					this.#editAura(clonedAura);
					this.value = [...this.value, clonedAura];
					this.#dispatchChangeEvent();
				})
			},
			{
				name: "Delete",
				icon: "<i class='fas fa-trash'></i>",
				callback: withAura(({ auraId }) => {
					this.value = this.value.filter(a => a.id !== auraId);
					this.#dispatchChangeEvent();
				})
			}
		]);

		this.#contextMenu.disabled = this.disabled;
	}

	/** @param {Map<string, any>} changedProperties */
	updated(changedProperties) {
		if (changedProperties.has("value")) {
			this.#internals.setFormValue(JSON.stringify(this.value));
		}

		if (this.#contextMenu) {
			this.#contextMenu.disabled = this.disabled;
		}
	}

	/**
	 * Creates a new aura and opens the edit dialog for it.
	 */
	#createAura() {
		const aura = createAura();
		this.#editAura(aura);
		this.value = [...this.value, aura];
		this.#dispatchChangeEvent();
	}

	/**
	 * Opens an edit dialog for the given aura.
	 * @param {AuraConfig} aura
	*/
	#editAura(aura) {
		if (this.#openAuraConfigApps.has(aura.id)) return;

		const app = new AuraConfigApplication(aura, {
			onChange: newAura => {
				this.value = this.value.map(a => a.id === aura.id ? ({ ...a, ...newAura }) : a);
				this.#dispatchChangeEvent();
			},
			onClose: () => this.#openAuraConfigApps.delete(aura.id),
			parentId: this.parentId,
			attachTo: this.attachConfigsTo
		});

		this.#openAuraConfigApps.set(aura.id, app);

		app.render(true);
	}

	/**
	 * @param {string} auraId
	 * @param {boolean} enabled
	 */
	#setAuraEnabled(auraId, enabled) {
		this.value = this.value.map(a => a.id === auraId ? { ...a, enabled } : a);
		this.#dispatchChangeEvent();
	}

	/** @param {MouseEvent} e */
	#openContextMenu(e) {
		e.preventDefault();
		e.stopPropagation();
		const { clientX, clientY } = e;
		e.currentTarget.closest("[data-aura-id]").dispatchEvent(new PointerEvent("contextmenu", {
			view: window, bubbles: true, cancelable: true, clientX, clientY
		}));
	}

	#dispatchChangeEvent() {
		this.#internals.setFormValue(JSON.stringify(this.value));
		const event = new Event("change", { bubbles: true, composed: true });
		this.dispatchEvent(event);
	}

	/**
	 * Closes any Aura dialogs that have been opened.
	 */
	_closeOpenDialogs() {
		for (const auraConfig of this.#openAuraConfigApps.values()) {
			auraConfig.close({ callOnClose: false });
		}
	}

	createRenderRoot() {
		return this;
	}
}

customElements.define(elementName, AuraTable);
