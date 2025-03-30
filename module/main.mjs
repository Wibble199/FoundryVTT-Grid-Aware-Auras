import * as api from "./api.mjs";
import { addAuraConfigItemHeaderButton } from "./applications/item-aura-config.mjs";
import { tokenConfigClose, tokenConfigRenderInner } from "./applications/token-aura-config.mjs";
import { DOCUMENT_AURAS_FLAG, MODULE_NAME, SOCKET_NAME, TOGGLE_EFFECT_FUNC } from "./consts.mjs";
import { initialiseAuraTargetFilters } from "./data/aura-target-filters.mjs";
import { AuraLayer } from "./layers/aura-layer/aura-layer.mjs";
import { registerSettings } from "./settings.mjs";
import { toggleEffect } from "./utils/misc-utils.mjs";

Hooks.once("init", () => {
	registerSettings();
	initialiseAuraTargetFilters();

	CONFIG.Canvas.layers.gaaAuraLayer = { group: "interface", layerClass: AuraLayer };

	// Wrap the default TokenConfig instead of using the renderTokenConfig hook because the latter does not run when the
	// config is re-rendered, and it can cause the tab to disappear :(
	libWrapper.register(MODULE_NAME, "TokenConfig.prototype._renderInner", tokenConfigRenderInner, libWrapper.WRAPPER);

	game.modules.get("grid-aware-auras").api = { ...api };
});

Hooks.once("ready", () => {
	game.socket.on(SOCKET_NAME, ({ func, runOn, ...args }) => {
		if (runOn?.length > 0 && runOn !== game.userId)
			return;

		switch(func) {
			case TOGGLE_EFFECT_FUNC:
				const { actorUuid, effectId, state, overlay } = args;
				toggleEffect(actorUuid, effectId, state, overlay, false);
				break;
		}
	});
});

Hooks.on("createToken", (tokenDocument, _options, userId) => {
	const token = game.canvas.tokens.get(tokenDocument.id);
	if (token && AuraLayer.current) {
		AuraLayer.current._updateAuras({ token, userId });
	}
});

Hooks.on("updateToken", (tokenDocument, delta, _options, userId) => {
	const token = game.canvas.tokens.get(tokenDocument.id);
	if (token && AuraLayer.current) {
		AuraLayer.current._updateAuras({ token, tokenDelta: delta, userId });
	}
});

// When token moves or is made visible/hidden, update the aura position and visibility
Hooks.on("refreshToken", (token, { refreshPosition, refreshVisibility }) => {
	if (refreshPosition || refreshVisibility) {
		// If the token is a drag preview, then we update the auras and test collisions (using the position of the
		// preview). We don't test collisions for non-preview tokens on refresh, because then it will repeatedly check
		// and fire hooks etc. when the token is animating for example.
		if (token.isPreview) {
			AuraLayer.current?._updateAuras({ token });
			AuraLayer.current?._testCollisionsForToken(token, { useActualPosition: true });
		} else {
			AuraLayer.current?._updateAuraGraphics({ token });
		}
	}
});

// When token is hovered/unhovered, we need to check aura visibility
Hooks.on("hoverToken", token => {
	AuraLayer.current?._updateAuraGraphics({ token });
});

// When token is controlled/uncontrolled, we need to check aura visibility
Hooks.on("controlToken", token => {
	AuraLayer.current?._updateAuraGraphics({ token });
});

// When token is targeted/untargeted, we need to check aura visibility
Hooks.on("targetToken", (_user, token) => {
	AuraLayer.current?._updateAuraGraphics({ token });
});

// When an item is created, if it has auras and belongs to an actor, update auras on any of that actor's tokens
Hooks.on("createItem", (item, _options, userId) => {
	if (!!item.actor && item.flags?.[MODULE_NAME]?.[DOCUMENT_AURAS_FLAG]?.length > 0) {
		AuraLayer.current?._updateActorAuras(item.actor, { userId });
	}
});

// When an item's auras are updated, update auras on any of that actor's tokens
Hooks.on("updateItem", (item, delta, _options, userId) => {
	if (!!item.actor && delta.flags?.[MODULE_NAME]?.[DOCUMENT_AURAS_FLAG] !== undefined) {
		AuraLayer.current?._updateActorAuras(item.actor, { userId });
	}
});

// When an item is created, if it had auras and belonged to an actor, update auras on any of that actor's tokens
Hooks.on("deleteItem", (item, _options, userId) => {
	if (!!item.actor && item.flags?.[MODULE_NAME]?.[DOCUMENT_AURAS_FLAG]?.length > 0) {
		AuraLayer.current?._updateActorAuras(item.actor, { userId });
	}
});

// When combat is updated (e.g. if a turn was changed), we need to check aura visibility
Hooks.on("updateCombat", combat => {
	for (const combatant of combat.combatants) {
		// combatant.token returns a TokenDocument, but we need Token
		const token = game.canvas.tokens.get(combatant.tokenId);
		AuraLayer.current?._updateAuraGraphics({ token });
	}
});

Hooks.on("deleteCombat", combat => {
	for (const combatant of combat.combatants) {
		// combatant.token returns a TokenDocument, but we need Token
		const token = game.canvas.tokens.get(combatant.tokenId);
		AuraLayer.current?._updateAuraGraphics({ token: token });
	}
});

Hooks.on("destroyToken", token => {
	AuraLayer.current?._onDestroyToken(token);
});

// Need to set the flag in a canvasTearDown instead of in AuraLayer's own tear-down because the TokenLayer tear-down
// happens before the AuraLayer's.
Hooks.on("canvasTearDown", () => {
	if (AuraLayer.current)
		AuraLayer.current._isTearingDown = true;
});

Hooks.on("getItemSheetHeaderButtons", addAuraConfigItemHeaderButton);

Hooks.on("closeTokenConfig", tokenConfigClose);
