const assetModules = import.meta.glob(
  [
    "./assets/survival-loop/*.png",
    "!./assets/survival-loop/*generated-sheet.png",
  ],
  {
    eager: true,
    query: "?url",
    import: "default",
  },
) as Record<string, string>;

function toSpriteKey(path: string) {
  const fileName = path.split("/").pop() ?? "";
  const baseName = fileName.replace(/\.png$/, "");
  return baseName.replace(/-([a-z0-9])/g, function (_, char: string) {
    return char.toUpperCase();
  });
}

export const survivalSpriteUrls = Object.fromEntries(
  Object.entries(assetModules).map(function ([path, url]) {
    return [toSpriteKey(path), url];
  }),
) as Record<string, string>;

export type SurvivalSpriteKey = keyof typeof survivalSpriteUrls;
