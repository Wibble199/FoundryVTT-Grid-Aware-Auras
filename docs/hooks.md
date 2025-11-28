# Hooks

- [`gridAwareAuras.endMoveInsideAura`](#gridawareaurasendmoveinsideaura)
- [`gridAwareAuras.enterLeaveAura`](#gridawareaurasenterleaveaura)
- [`gridAwareAuras.startMoveInsideAura`](#gridawareaurasstartmoveinsideaura)

## gridAwareAuras.endMoveInsideAura

![Available Since v0.5.3](https://img.shields.io/badge/Available%20Since-v0.5.3-blue?style=flat-square)

This hook fires when a token ends its movement inside another token's aura.

### Arguments

|Name|Type|Description|
|-|-|-|
|`token`|`Token`|The token that started its movement inside another token's aura.|
|`parent`|`Token`|The token that owns the aura which the other token started moving within.|
|`aura`|[`AuraConfig`](./api.md#auraconfig)|The metadata about the aura that was moved within.|
|`options`|`Object`|Additional information about the hook.|
|`options.startedInside`|`boolean`|Whether the moved token also started its movement inside this same aura.|
|`options.startPosition`|`{ x: number; y: number; }`|The starting position of the token.|
|`options.userId`|`string`|The ID of the user that triggered the movement.|

## gridAwareAuras.enterLeaveAura

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)

This hook fires when a token enters or leaves another token's aura.

If a token enters/leaves multiple auras at the same time, this hook will be called multiple times, once for each entry/exit.

In the options argument, there is an `isPreview` flag which indicates whether or not the hook fired because of part of a drag to move a token. Note that when dealing with previews, when the preview token is first created, if it is within an aura it will immediately call an 'enter' hook. When the drag is released and the preview destroyed, it will call a 'leave' hook. When dragging and dropping a token into an aura, the preview exit hook will fire before the non-preview enter hook.

Enter hooks are called for every token/aura when a scene is loaded. Leave hooks are _not_ called when the scene is unloaded.

Disabled auras will trigger an enter hook when they become enabled if tokens are in their radius. Likewise they will trigger a leave hook when they become disabled for any tokens in their radius. Apart from these two cases, disabled auras will not trigger any hooks.

### Arguments

|Name|Type|Description|
|-|-|-|
|`token`|`Token`|The token that entered/left another token's aura. This is the token that does NOT have that aura.|
|`parent`|`Token`|The token that owns the aura which the other token entered/left.|
|`aura`|[`AuraConfig`](./api.md#auraconfig)|The metadata about the aura that was entered/left.|
|`options`|`Object`|Additional information about the entry/exit event.|
|`options.hasEntered`|`boolean`|True if this hook was called because the token entered the aura; False if this hook was called because the token left the aura.|
|`options.isPreview`|`boolean`|True if this hook was called because of a preview token.|
|`options.isInit`|`boolean`|True if this entry happened when a scene was initialised. This can only be true when `options.hasEntered` is also true.|
|`options.userId`|`string`|The ID of the user that triggered the enter/leave hook to be called.|

### Example

In this example, a token's light emission is changed to represent being on shielded when entering an aura called "Shield Aura", and removed when the token leaves.

```js
Hooks.on("gridAwareAuras.enterLeaveAura", async (token, parent, aura, options) => {
	// We don't want to apply this light to preview tokens
	if (options.isPreview) {
		return;
	}

	// We only care about "Shield Aura" auras
	if (aura.name !== "Shield Aura") {
		return;
	}

	const light = options.hasEntered
		? {
			dim: 1,
			bright: 0.5,
			color: "#00ffff",
			animation: { type: "grid", speed: 8, intensity: 8 }
		}
		: {
			dim: 0,
			bright: 0
		};

	await token.document.update({ light });
});
```

## gridAwareAuras.startMoveInsideAura

![Available Since v0.5.3](https://img.shields.io/badge/Available%20Since-v0.5.3-blue?style=flat-square)

This hook fires when a token starts its movemovement inside another token's aura.

### Arguments

|Name|Type|Description|
|-|-|-|
|`token`|`Token`|The token that started its movement inside another token's aura.|
|`parent`|`Token`|The token that owns the aura which the other token started moving within.|
|`aura`|[`AuraConfig`](./api.md#auraconfig)|The metadata about the aura that was moved within.|
|`options`|`Object`|Additional information about the hook.|
|`options.userId`|`string`|The ID of the user that triggered the movement.|
