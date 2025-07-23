> [!NOTE]
> This page is only relevant to macro, script or module developers that want to integrate with Grid-Aware Auras.

# API

Grid-Aware Auras exposes an API to be used by other macros, scripts, or modules. It is available through the module: `game.modules.get("grid-aware-auras").api`.

- [`createAura`](#createaura)
- [`deleteAuras`](#deleteauras)
- [`getAurasContainingToken`](#getaurascontainingtoken)
- [`getDocumentAuras`](#getdocumentauras)
- [`getTokenAuras`](#gettokenauras)
- [`getTokensInsideAura`](#gettokensinsideaura)
- [`isTokenInside`](#istokeninside)
- [`toggleEffect`](#toggleeffect)
- [`updateAuras`](#updateauras)

## createAura

![Available Since v0.6.0](https://img.shields.io/badge/Available%20Since-v0.6.0-blue?style=flat-square)

Creates a new aura on the specified owner.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`owner`|`Token \| TokenDocument \| Item`|*Required*|The target entity to attach the aura to. Must be a token or an item.|
|`aura`|[`Omit<Partial<AuraConfig>, "id">`](#auraconfig)|`{}`|The initial aura configuration. Will be merged with the default aura config.|

### Returns

A `Promise<void>` that will resolve when the aura has been created.

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [token] = canvas.tokens.controlled;

// Creates a new 5 radius lime aura on the controlled token
await api.createAura(token, {
	name: "My New Aura",
	radius: 5,
	lineColor: "#00ff00",
	fillColor: "#00ff00"
});
```

## deleteAuras

![Available Since v0.6.0](https://img.shields.io/badge/Available%20Since-v0.6.0-blue?style=flat-square)

Deletes auras from the specified owner document.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`owner`|`Token \| TokenDocument \| Item`|*Required*|The target entity to delete the auras from. Must be a token or an item.|
|`filter`|`{ name?: string; id?: string; }`|`{}`|A filter used to specify which aura(s) to delete. Note that the name filter is case-insensitive. You can also find an aura's ID by opening the edit dialog and clicking the book icon in the header.|
|`options`|`Object`|`{}`|Additional options|
|`options.includeItems`|`boolean`|`false`|If the target entity is a token and this is true, then auras on items owned by that token's actor will also be considered for deletion.|

### Returns

A `Promise<void>` that will resolve when the aura(s) have been removed.

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [token] = canvas.tokens.controlled;

// Delete the aura on the token with a specific ID.
await api.deleteAuras(token, { id: "GFjtK29pZqW88hcb" });

// Deletes all auras on the token and any of it's items with the given name (case-insensitive).
await api.deleteAuras(token, { name: "Range" }, { includeItems: true });
```

## getAurasContainingToken

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)

Gets an array of auras that the given token is currently inside.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`token`|`Token`|*Required*|The token to check.|

### Returns

An array of auras that the given token is inside. Each element of the array is an object with the following properties:

|Name|Type|Description|
|-|-|-|
|`parent`|`Token`|The token that owns this aura.|
|`aura`|[`AuraConfig`](#auraconfig)|The aura definition.|

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [token] = [...game.user.targets];

const auras = api.getAurasContainingToken(token);
for (const { parent, aura } of auras) {
	console.log(`${token.name} is inside ${parent.name}'s "${aura.name}" aura.`);
}
```
## getDocumentOwnAuras

![Available Since v0.4.0](https://img.shields.io/badge/Available%20Since-v0.4.0-blue?style=flat-square)

Returns a list of auras that are defined on the given document (TokenDocument or ItemDocument).

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`document`|`Token \| TokenDocument \| Item`|*Required*|The document whose auras to return.|

### Returns

An array of [`AuraConfig`s](#auraconfig).

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const item = game.items.getName("Some Item");

const auras = api.getDocumentOwnAuras(item);
console.log(`Item ${item.name} has the following auras:`);
for (const aura of auras) {
	console.log(` - ${aura.name} (radius: ${aura.radiusCalculated})`);
}
```

## getTokenAuras

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)
![Changed In v0.4.0](https://img.shields.io/badge/Changed%20In-v0.4.0-orange?style=flat-square)

Returns a list of auras that are defined on the given token and any items owned by the token's actor.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`token`|`Token`|*Required*|The token whose auras to return.|

### Returns

An array of objects with the following properties:

|Name|Type|Description|
|-|-|-|
|`aura`|`AuraConfig`|The aura's config|
|`owner`|`Document`|The document that defines the aura - either the TokenDocument for auras defined on the token itself, or the ItemDocument for auras defined on items|

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [token] = [...game.user.targets];

const auras = api.getTokenAuras(token);
console.log(`Token ${token.name} has the following auras:`);
for (const { aura, owner } of auras) {
	console.log(` - ${aura.name} - defined on ${owner.name}`);
}
```

## getTokensInsideAura

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)

Gets an array of Tokens that are inside the given aura.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`parent`|`Token`|*Required*|The token that owns the aura to check.|
|`auraId`|`string`|*Required*|The ID of the aura on belonging to the parent token.|

### Returns

An array of `Token`s within the aura.

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [parent] = [...game.user.targets];
const [aura] = api.getTokenAuras(parent);

const tokens = api.getTokensInsideAura(parent, aura.id);
for (const token of tokens) {
	console.log(`${token.name} is inside ${parent.name}'s "${aura.name}" aura.`);
}
```

## isTokenInside

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)

Checks to see if a token is within the area of another token's aura.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`testToken`|`Token`|*Required*|The token to test if it is within the aura.|
|`parentToken`|`Token`|*Required*|The token that owns the aura that is being tested.|
|`auraId`|`string`|*Required*|The ID of the aura to test for.|

### Returns

Boolean indicating whether the testToken is inside parentToken's aura.

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [target] = [...game.user.targets];
const [parent] = canvas.tokens.controlled;
const [aura] = api.getTokenAuras(parent);

const isInside = api.isTokenInside(target, parent, aura.id);
console.log(`${target.name} ${isInside ? 'is' : 'is not'} inside ${parent.name}'s "${aura.name}" aura.`);
```

## toggleEffect

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)

Can be used to toggle an effect on a target token or actor. If the user calling the function is able to modify the actor, does so immediately. If the user cannot, the action is delegated to a GM user. If no GMs are present, the action will fail.

Note that this requires the '_Enable Effect Automation_' setting to be turned on in the Grid-Aware Auras category.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`target`|`Token \| TokenDocument \| Actor \| string`|*Required*|A token, token document, actor, or UUID for a token or actor which the effect will be applied to/removed from.|
|`effectId`|`string`|*Required*|The ID of the effect to add to/remove from the target. Can be found in the `CONFIG.statusEffects` array.|
|`state`|`boolean`|*Required*|`true` to apply the effect, or `false` to remove it.|
|`options`|`Object`|`{}`|Additional options|
|`options.overlay`|`boolean`|`false`|Whether to apply the effect as an 'overlay' (shows over the entire token).|

### Returns

A promise that resolves when the toggle is completed.

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [token] = [...game.user.targets];
const { id: statusEffectId } = CONFIG.statusEffects.find(s => s.name === "Invisible");

api.toggleEffect(token, statusEffectId, true, { overlay: true });
```

## updateAuras

![Available Since v0.6.0](https://img.shields.io/badge/Available%20Since-v0.6.0-blue?style=flat-square)

Updates one or more auras on the target document.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|`owner`|`Token \| TokenDocument \| Item`|*Required*|The target entity to update the auras on. Must be a token or an item.|
|`filter`|`{ name?: string; id?: string; }`|*Required*|A filter used to specify which aura(s) to update. Note that the name filter is case-insensitive. You can also find an aura's ID by opening the edit dialog and clicking the book icon in the header.|
|`update`|[`Partial<AuraConfig> \| ((existing: AuraConfig) => Partial<AuraConfig>)`](#auraconfig)|Either a partial config to update the auras with, or a transformer function that takes an existing aura and returns the partial config.|
|`options`|`Object`|`{}`|Additional options|
|`options.includeItems`|`boolean`|`false`|If the target entity is a token and this is true, then auras on items owned by that token's actor will also be considered for updates.|

### Returns

A `Promise<void>` that will resolve when the aura(s) have been updated.

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const [token] = canvas.tokens.controlled;

// Update the aura with the specified ID to have the new radius.
await api.updateAuras(token, { id: "GFjtK29pZqW88hcb" }, { radius: 10 });

// Disables the aura with the given name (case-insensitive).
await api.updateAuras(token, { name: "Toxic Gas" }, { enabled: false });

// Toggles all the auras on the token and it's children - enabling disabled ones and disabling enabled ones.
await api.updateAuras(token, {}, aura => ({ enabled: !aura.enabled }), { includeItems: true });
```

---

# Types

- [`AuraConfig`](#auraconfig)
- [`VisibilityConfig`](#visibilityconfig)
- [`EffectConfig`](#effectconfig)
- [`MacroConfig`](#macroconfig)
- [`SequencerEffectConfig`](#sequencereffectconfig)

## AuraConfig

Defines metadata about an aura.

|Name|Type|Description|
|-|-|-|
|`id`|`string`|Unique ID for the aura.|
|`name`|`string`|Name of the aura.|
|`enabled`|`boolean`|Whether this aura is enabled or not. Disabled auras do not trigger hooks.|
|`radius`|`number \| string`|Expression that resolves to the radius of the aura. May be a property path on the actor or item.|
|`radiusCalculated`|`number \| undefined`|When reading the auras, this will get populated with the calculated numeric value of the radius.|
|`lineType`|`number`|Type of line used for the border of the aura. 0 = None, 1 = Solid, 2 = Dashed.|
|`lineWidth`|`number`|Width of the line used for the border of the aura.|
|`lineColor`|`string`|Color of the line used for the border of the aura.|
|`lineOpacity`|`number`|Opacity of the line used for the border of the aura. Ranges from 0-1 where 0 is transparent and 1 is opaque.|
|`lineDashSize`|`number`|When `lineType` is _Dashed_, the size of the filled segments of the line.|
|`lineGapSize`|`number`|When `lineType` is _Dashed_, the size of the gap between filled segments.|
|`fillType`|`number`|Type of fill used in the area of the aura. 0 = None, 1 = Solid, 2 = Pattern.|
|`fillColor`|`string`|Color of the fill used for the area of the aura.|
|`fillOpacity`|`number`|Opacity of the full used for the area of the aura. Ranges from 0-1 where 0 is transparent and 1 is opaque.|
|`fillTexture`|`string`|When `fillType` is _Pattern_, the URL of the image to use as a texture pattern.|
|`fillTextureOffset`|`{ x: number; y: number; }`|When `fillType` is _Pattern_, an offset (in pixels) for the texture.|
|`fillTextureScale`|`{ x: number; y: number; }`|When `fillType` is _Pattern_, a scale (in percent) for the texture. A value of 100 is the default and means no scaling. A value of 50 would mean to shrink the texture by half in that axis.|
|`ownerVisibility`|[`VisibilityConfig`](#visibilityconfig)|The booleans that determine when the aura is visible to owners of the token.|
|`nonOwnerVisibility`|[`VisibilityConfig`](#visibilityconfig)|The booleans that determine when the aura is visible to non-owners of the token.|
|`effects`|[`EffectConfig[]`](#effectconfig)|An array containing all the effects defined on the aura.|
|`macros`|[`MacroConfig[]`](#macroconfig)|An array containing all the macros defined on the aura.|
|`sequencerEffects`|[`SequencerEffectConfig[]`](#sequencereffectconfig)|A array containing all the sequencer effects defined on the aura.|
|`terrainHeightTools`|`Object`|An object containing Terrain Height Tools automation config.|
|`terrainHeightTools.rulerOnDrag`|`"NONE" \| "C2C" \| "E2E"`|The type of ruler to draw to tokens in range of this aura on drag. C2C = Centre-to-Centre. E2E = Edge-to-Edge and Centre-to-Centre.|
|`terrainHeightTools.targetTokens`|`"ALL" \| "FRIENDLY" \| "NEUTRAL" \| "HOSTILE"`|The types of token that line of sight rulers should be drawn to.|

## VisibilityConfig

|Name|Type|Description|
|-|-|-|
|`default`|`boolean`|Whether the aura should be visible when no other states are applicable.|
|`hovered`|`boolean`|Whether the aura should be visible when hovered.|
|`controlled`|`boolean`|Whether the aura should be visible when controlled.|
|`dragging`|`boolean`|Whether the aura should be visible when being dragged.|
|`targeted`|`boolean`|Whether the aura should be visible when targeted.|
|`turn`|`boolean`|Whether the aura should be visible when it is that token's turn in a combat encounter.|

## EffectConfig

Defines metadata about an automated effect.

|Name|Type|Description|
|-|-|-|
|`effectId`|`string`|The ID of the effect to be applied/removed by this aura.|
|`isOverlay`|`boolean`|Whether the effect should be applied as an overlay.|
|`targetTokens`|`string`|The name of the filter that will be used to determine if a token is applicable or not.|
|`mode`|`string`|The name of the trigger that the effect will be applied/removed on.|
|`priority`|`number`|The priority of the effect automation.|

## MacroConfig

Defines metadata about a macro.

|Name|Type|Description|
|-|-|-|
|`macroId`|`string`|The ID of a macro to execute when a token enters/leaves this aura.|
|`targetTokens`|`string`|The name of the filter that will be used to determine if a token is applicable or not.|
|`mode`|`string`|The name of the trigger that the macro will fire on.|

## SequencerEffectConfig

Defines metadata about a sequencer effect.

|Name|Type|Description|
|-|-|-|
|`uId`|`string`|A unique ID for this sequence (used for uniquely naming the sequencer effects).|
|`effectPath`|`string`|The file path, wildcard filepath, or DB path of the effect to play.|
|`targetTokens`|`string`|The name of the filter that will be used to determine if a token is applicable or not.|
|`trigger`|`"ON_ENTER" \| "ON_LEAVE" \| "WHILE_INSIDE"`|The trigger for when the sequencer effect should play.|
|`position`|`"ON_TARGET" \| "ON_OWNER" \| "OWNER_TO_TARGET" \| "TARGET_TO_OWNER"`|Where/how the effect should play.|
|`repeatCount`|`number`|How many times the effect should play in total. Does not apply when `trigger` is `"WHILE_INSIDE"`.|
|`repeatDelay`|`number`|Duration (in milliseconds) between repeats.|
|`delay`|`number`|How long before the effect should begin playing. If there are multiple repeats, does NOT affect duration between repeats, only initial.|
|`opacity`|`number`|The opacity of the effect.|
|`fadeInDuration`|`number`|Duration (in milliseconds) of the fade in transition applied to the sequencer effect.|
|`fadeInEasing`|`string`|The name of an easing function to use for the fade in transition.|
|`fadeOutDuration`|`number`|Duration (in milliseconds) of the fade out transition applied to the sequencer effect.|
|`fadeOutEasing`|`string`|The name of an easing function to use for the fade out transition.|
|`scale`|`number`|The overall scaling factor applied to the effect.|
|`scaleToObject`|`boolean`|Whether the effect will be scaled based on the size of the token it's playing on.|
|`scaleInScale`|`number`|The scaling factor applied to the effect when it starts playing.|
|`scaleInDuration`|`number`|The duration (in milliseconds) of the scaling applied to the effect when it starts playing.|
|`scaleInEasing`|`string`|The name of an easing function to use for the scaling applied to the effect when it starts playing.|
|`scaleOutScale`|`number`|The scaling factor applied to the effect when it finishes playing.|
|`scaleOutDuration`|`number`|The duration (in milliseconds) of the scaling applied to the effect when it finishes playing.|
|`scaleOutEasing`|`string`|The name of an easing function to use for the scaling applied to the effect when it finishes playing.|
|`playbackRate`|`number`|The playback rate of the effect (2 would mean 2x as fast, 0.5 would be half as fast).|
|`belowTokens`|`boolean`|Whether the effect should be displayed below tokens.|
