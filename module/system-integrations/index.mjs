import { setupLancerSystemIntegration } from "./lancer.mjs";

export function setupSystemIntegration() {
	switch (game.system.id) {
		case "lancer":
			setupLancerSystemIntegration();
			break;
	}
}
