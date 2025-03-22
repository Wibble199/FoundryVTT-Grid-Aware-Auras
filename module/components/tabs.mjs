import { classMap, html, LitElement, literal, nothing } from "../lib/lit-all.min.js";

export const elementName = "gaa-tabs";
export const elementLiteral = literal`gaa-tabs`;

class Tabs extends LitElement {

	static properties = {
		tabs: { attribute: false },
		navClasses: { type: String },
		navStyle: { type: String },
		_selectedTabIndex: { state: true },
	};

	constructor() {
		super();

		/** @type {{ name: string; icon?: string; template: () => any; hidden?: boolean; }[]} */
		this.tabs = [];

		this.navClasses = "";
		this.navStyle = "";

		this._selectedTabIndex = 0;

		this.style.display = "contents";
	}

	render() {
		return html`
			<nav class=${`tabs sheet-tabs ${this.navClasses}`} style=${this.navStyle}>
				${this.tabs.map((tab, index) => tab.hidden ? nothing : html`
					<a class=${classMap({ active: this._selectedTabIndex === index })} @click=${() => this.#setSelectedTab(index)} data-tab>
						${tab.icon?.length ? html`<i class=${tab.icon}></i>` : nothing}
						${tab.name}
					</a>
				`)}
			</nav>

			${this.tabs[this._selectedTabIndex]?.template() ?? nothing}
		`;
	}

	/** @param {number} tabIndex */
	#setSelectedTab(tabIndex) {
		this._selectedTabIndex = tabIndex;
		this.dispatchEvent(new Event("tabchange", { bubbles: true, composed: true }));
	}

	createRenderRoot() {
		return this;
	}
}

customElements.define(elementName, Tabs);
