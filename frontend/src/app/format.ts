export function formatDateTime(value: string): string {
  const normalized = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Cuiaba",
  }).format(new Date(normalized));
}

export function formatCurrency(value: number | null): string {
  if (value === null) {
    return "-";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function joinText(values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" · ");
}
