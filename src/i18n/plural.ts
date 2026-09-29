// CLDR plural categories via Intl.PluralRules; every locale defines `other`,
// the category CLDR uses when no more specific one applies.
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

export function plural(locale: string, count: number, forms: PluralForms): string {
  return `${count} ${forms[new Intl.PluralRules(locale).select(count)] ?? forms.other}`;
}
