export function dedupeBy(items, keyFn) {
  const list = []
  for (const item of items || []) {
    if (!list.some(existing => keyFn(existing) === keyFn(item))) list.push(item)
  }
  return list
}
