export function formatAddress(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
