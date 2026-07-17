const SRM_MAP: [RegExp, string][] = [
  [/stout|imperial stout/i, "#1A0E00"],
  [/brown ale|porter/i, "#6B2E10"],
  [/amber ale|vienna lager/i, "#C4890A"],
  [/belgian/i, "#D4A030"],
  [/pale ale|ipa/i, "#E8B930"],
  [/wheat beer|hefeweizen|witbier/i, "#F3E2A0"],
  [/light lager|pilsner/i, "#F5E6A3"],
  [/sour|berliner weisse/i, "#F5E0A0"],
];

export function getSRMColor(style: string): string {
  for (const [pattern, color] of SRM_MAP) {
    if (pattern.test(style)) return color;
  }
  return "#D4A030";
}