export function useTemporaryPinState() {
  return useState<boolean>('tsekh-temporary-pin', () => false)
}
