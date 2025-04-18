import iso from 'iso-3166-1';

export const countryMap: Record<string, string> = {};

iso.all().forEach(entry => {
  if (entry.alpha2 && entry.numeric) {
    countryMap[entry.alpha2] = entry.numeric;
  }
});

countryMap["XK"] = "383"