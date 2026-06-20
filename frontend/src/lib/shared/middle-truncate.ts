/** 与 @pierre/trees MiddleTruncate `split: "extension"` 一致 */
export function splitExtensionLabel(contents: string): [string, string] {
  if (contents.length < 4) return [contents, ""]

  const extensionIndex = contents.lastIndexOf(".") + 1
  const isTooLong = contents.length - extensionIndex > 10
  const splitIndex =
    extensionIndex >= 1 && !isTooLong
      ? extensionIndex
      : Math.ceil(contents.length / 2)

  return [contents.slice(0, splitIndex), contents.slice(splitIndex)]
}
