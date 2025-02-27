import * as api from "./api.mjs";
import { tokenConfigClose, tokenConfigRenderInner } from "./applications/token-aura-config.mjs";
import { MODULE_NAME, SOCKET_NAME, TOGGLE_EFFECT_FUNC } from "./consts.mjs";
import { AuraLayer } from "./layers/aura-layer/aura-layer.mjs";
import { registerSettings } from "./settings.mjs";
import { toggleEffect } from "./utils/misc-utils.mjs";

Hooks.once("init", () => {
	registerSettings();

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

Hooks.on("updateToken", (tokenDocument, _delta, _options, userId) => {
	const token = game.canvas.tokens.get(tokenDocument.id);
	if (token && AuraLayer.current) {
		AuraLayer.current._updateAuras({ token, userId });
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

// When combat is updated (e.g. if a turn was changed), we need to check aura visibility
Hooks.on("updateCombat", combat => {
	for (const combatant of combat.combatants) {
		AuraLayer.current?._updateAuraGraphics({ token: combatant.token });
	}
});

Hooks.on("deleteCombat", combat => {
	for (const combatant of combat.combatants) {
		AuraLayer.current?._updateAuraGraphics({ token: combatant.token });
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

Hooks.on("closeTokenConfig", tokenConfigClose);
