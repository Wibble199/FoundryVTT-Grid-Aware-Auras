> [!NOTE]
> This page is only relevant to macro, script or module developers that want to integrate with Grid-Aware Auras.

# API

Grid-Aware Auras exposes an API to be used by other macros, scripts, or modules. It is available through the module: `game.modules.get("grid-aware-auras").api`.

- [`getAurasContainingToken`](#getaurascontainingtoken)
- [`getDocumentAuras`](#getdocumentauras)
- [`getTokenAuras`](#gettokenauras)
- [`getTokensInsideAura`](#gettokensinsideaura)
- [`isTokenInside`](#istokeninside)
- [`toggleEffect`](#toggleeffect)

## getAurasContainingToken

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)

Gets an array of auras that the given token is currently inside.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|token|`Token`|*Required*|The token to check.|

### Returns

An array of auras that the given token is inside. Each element of the array is an object with the following properties:

|Name|Type|Description|
|-|-|-|
|parent|`Token`|The token the owns this aura.|
|aura|[`AuraConfig`](#auraconfig)|The aura definition.|

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
|document|`Document`|*Required*|The document whose auras to return.|

### Returns

An array of [`AuraConfig`s](#auraconfig).

### Example

```js
const { api } = game.modules.get("grid-aware-auras");
const item = game.items.get("Some Item");

const auras = api.geDocumentAuras(item);
console.log(`Item ${item.name} has the following auras:`);
for (const aura of auras) {
	console.log(` - ${aura.name} (radius: ${aura.radius})`);
}
```

## getTokenAuras

![Available Since v0.2.0](https://img.shields.io/badge/Available%20Since-v0.2.0-blue?style=flat-square)
![Changed In v0.4.0](https://img.shields.io/badge/Changed%20In-v0.4.0-orange?style=flat-square)

Returns a list of auras that are defined on the given token and any items owned by the token's actor.

### Parameters

|Name|Type|Default|Description|
|-|-|-|-|
|token|`Token`|*Required*|The token whose auras to return.|

### Returns

An array of objects with the following properties:

|Name|Type|Description|
|-|-|-|
|aura|`AuraConfig`|The aura's config|
|owner|`Document`|The document that defines the aura - either the TokenDocument for auras defined on the token itself, or the ItemDocument for auras defined on items|

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
|parent|`Token`|*Required*|The token that owns the aura to check.|
|auraId|`string`|*Required*|The ID of the aura on belonging to the parent token.|

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
|testToken|`Token`|*Required*|The token to test if it is within the aura.|
|parentToken|`Token`|*Required*|The token that owns the aura that is being tested.|
|auraId|`string`|*Required*|The ID of the aura to test for.|

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

---

# Types

- [`AuraConfig`](#auraconfig)
- [`VisibilityConfig`](#visibilityconfig)

## AuraConfig

Defines metadata about an aura.

|Name|Type|Description|
|-|-|-|
|`id`|`string`|Unique ID for the aura.|
|`name`|`string`|Name of the aura.|
|`enabled`|`boolean`|Whether this aura is enabled or not. Disabled auras do not trigger hooks.|
|`radius`|`number`|Radius of the aura measured in grid cells.|
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
|`effect`|`Object`|An object containing effect automation config.|
|`effect.effectId`|`string`|The ID of the effect to be added/removed by this aura. May be null or empty.|
|`effect.isOverlay`|`boolean`|Whether the effect should be applied as an overlay.|
|`effect.targetTokens`|`"ALL" \| "FRIENDLY" \| "NEUTRAL" \| "HOSTILE"`|What token dispositions can have the effect applied/removed.|
|`macro`|`Object`|An object containing macro automation config.|
|`macro.macroId`|`string`|The ID of a macro to execute when a token enters/leaves this aura. May be null or empty.|
|`terrainHeightTools`|`Object`|An object containing Terrain Height Tools automation config.|
|`terrainHeightTools.rulerOnDrag`|`"NONE" \| "C2C" \| "E2E"`|The type of ruler to draw to tokens in range of this aura on drag. C2C = Centre-to-Centre. E2E = Edge-to-Edge and Centre-to-Centre.|
|`terrainHeightTools.targetTokens`|`"ALL" \| "FRIENDLY" \| "NEUTRAL" \| "HOSTILE"`|The types of token that line of sight rulers should be drawn to.|

## VisibilityConfig

|Name|Type|Description|
|-|-|-|
|default|`boolean`|Whether the aura should be visible when no other states are applicable.|
|hovered|`boolean`|Whether the aura should be visible when hovered.|
|controlled|`boolean`|Whether the aura should be visible when controlled.|
|dragging|`boolean`|Whether the aura should be visible when being dragged.|
|targeted|`boolean`|Whether the aura should be visible when targeted.|
|turn|`boolean`|Whether the aura should be visible when it is that token's turn in a combat encounter.|
