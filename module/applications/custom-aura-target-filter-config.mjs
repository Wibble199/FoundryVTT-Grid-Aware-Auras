/** @import { AuraTargetFilter } from "../data/aura-target-filters.mjs" */
import { CUSTOM_AURA_TARGET_FILTERS_SETTING, MODULE_NAME } from "../consts.mjs";
import { classMap, html, render, when } from "../lib/lit-all.min.js";

const { ApplicationV2 } = foundry.applications.api;

export class CustomAuraTargetFilterConfig extends ApplicationV2 {

	/** @type {(AuraTargetFilter & { _error?: string; })[]} */
	#model;

	constructor(options = {}) {
		super(options);

		this.#model = [...game.settings.get(MODULE_NAME, CUSTOM_AURA_TARGET_FILTERS_SETTING) ?? []];
	}

	static DEFAULT_OPTIONS = {
		id: "gaa-custom-aura-target-filter-config",
		tag: "form",
		window: {
			contentClasses: ["standard-form"],
			icon: "fas fa-filter",
			title: "SETTINGS.CustomAuraTargetFilters.Name",
			resizable: true
		},
		position: {
			width: 700,
			height: 650
		}
	};

	/** @override */
	_renderHTML() {
		const helpLink = `https://github.com/Wibble199/FoundryVTT-Grid-Aware-Auras/blob/v${game.modules.get("grid-aware-auras").version}/docs/custom-aura-target-filters.md`;

		return html`
			<p style="margin: 0">
				${game.i18n.localize("SETTINGS.CustomAuraTargetFilters.LongHint")}
				<br/>
				<a href=${helpLink} target="_blank">
					${game.i18n.localize("SETTINGS.CustomAuraTargetFilters.LongHintLink")}
					<i class="fas fa-external-link"></i>
				</a>
			</p>
			<div class="filter-list">
				${this.#model.map(filter => html`
					<div class="filter-item">
						<input class="name" type="text" placeholder="Name" .value=${filter.name} @change=${e => filter.name = e.target.value} required>
						<div class=${classMap({ "body": true, "is-invalid": filter._error?.length })} @click=${this.#functionBodyClick}>
							<span>function (targetToken, sourceToken, aura) {</span>
							<textarea rows="1" @change=${e => filter.body = e.target.value} spellcheck="false">${filter.body}</textarea>
							<span>}</span>
							${when(filter._error?.length, () => html`<p class="error">${filter._error}</p>`)}
						</div>
						<a class="delete" @click=${this.#deleteFilter(filter.id)}><i class="fas fa-times"></i></a>
					</div>
				`)}
			</div>
			<footer class="form-footer">
				<button type="button" @click=${this.#createNewFilter}>
					<i class="fas fa-plus"></i>
					Create New Filter
				</button>
				<button type="submit" @click=${this.#submit}>
					<i class="fa-solid fa-save"></i>
					${game.i18n.localize("Save Changes")}
				</button>
			</footer>
		`;
	}

	#createNewFilter = () => {
		this.#model.push({
			id: foundry.utils.randomID(),
			name: "New Filter",
			body: ""
		});
		this.render();
	};

	/** @type {(e: Event) => void} e */
	#functionBodyClick = e => {
		e.currentTarget.querySelector("textarea").focus();
	};

	/**
	 * @param {string} filterId
	 * @returns {() => void}
	 */
	#deleteFilter(filterId) {
		return () => {
			this.#model = this.#model.filter(f => f.id !== filterId);
			this.render();
		};
	}

	#submit = async () => {
		// Attempt to compile each function. If it fails, show an error for that function.
		for (const filter of this.#model) {
			if (!filter.body?.length) {
				filter._error = "Function body cannot be empty";
			} else {
				try {
					new Function("targetToken", "sourceToken", "aura", filter.body);
					delete filter._error;
				} catch (err) {
					filter._error = err.message;
				}
			}
		}

		if (this.#model.some(f => f._error?.length)) {
			await this.render();
			return;
		}

		// If all valid, save to settings and close window
		const settingsValue = this.#model.map(({ id, name, body }) => ({ id, name, body }));
		await game.settings.set(MODULE_NAME, CUSTOM_AURA_TARGET_FILTERS_SETTING, settingsValue);

		await this.close();
	};

	/** @override */
	_replaceHTML(templateResult, container) {
		render(templateResult, container);
	}
}
