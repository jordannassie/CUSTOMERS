// Countries for the business location (BUG-073, BUG-086). The setup and Settings forms list these, and checks send
// the ISO code to the AI's web search as user_location (D-67). Pure.

// ISO 3166-1 alpha-2, plus XK (Kosovo), which Google uses, sorted by English name. Written out rather than read from
// Intl.DisplayNames, because Node and browsers name some countries differently ("Palestinian Territories" and
// "Palestine"), which broke hydration of the country select.
const LIST =
  "AF:Afghanistan|AX:Åland Islands|AL:Albania|DZ:Algeria|AS:American Samoa|AD:Andorra|AO:Angola|AI:Anguilla|" +
  "AQ:Antarctica|AG:Antigua & Barbuda|AR:Argentina|AM:Armenia|AW:Aruba|AU:Australia|AT:Austria|AZ:Azerbaijan|" +
  "BS:Bahamas|BH:Bahrain|BD:Bangladesh|BB:Barbados|BY:Belarus|BE:Belgium|BZ:Belize|BJ:Benin|BM:Bermuda|" +
  "BT:Bhutan|BO:Bolivia|BA:Bosnia & Herzegovina|BW:Botswana|BV:Bouvet Island|BR:Brazil|" +
  "IO:British Indian Ocean Territory|VG:British Virgin Islands|BN:Brunei|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|" +
  "KH:Cambodia|CM:Cameroon|CA:Canada|CV:Cape Verde|BQ:Caribbean Netherlands|KY:Cayman Islands|" +
  "CF:Central African Republic|TD:Chad|CL:Chile|CN:China|CX:Christmas Island|CC:Cocos (Keeling) Islands|" +
  "CO:Colombia|KM:Comoros|CG:Congo - Brazzaville|CD:Congo - Kinshasa|CK:Cook Islands|CR:Costa Rica|" +
  "CI:Côte d’Ivoire|HR:Croatia|CU:Cuba|CW:Curaçao|CY:Cyprus|CZ:Czechia|DK:Denmark|DJ:Djibouti|DM:Dominica|" +
  "DO:Dominican Republic|EC:Ecuador|EG:Egypt|SV:El Salvador|GQ:Equatorial Guinea|ER:Eritrea|EE:Estonia|" +
  "SZ:Eswatini|ET:Ethiopia|FK:Falkland Islands|FO:Faroe Islands|FJ:Fiji|FI:Finland|FR:France|GF:French Guiana|" +
  "PF:French Polynesia|TF:French Southern Territories|GA:Gabon|GM:Gambia|GE:Georgia|DE:Germany|GH:Ghana|" +
  "GI:Gibraltar|GR:Greece|GL:Greenland|GD:Grenada|GP:Guadeloupe|GU:Guam|GT:Guatemala|GG:Guernsey|GN:Guinea|" +
  "GW:Guinea-Bissau|GY:Guyana|HT:Haiti|HM:Heard & McDonald Islands|HN:Honduras|HK:Hong Kong|HU:Hungary|" +
  "IS:Iceland|IN:India|ID:Indonesia|IR:Iran|IQ:Iraq|IE:Ireland|IM:Isle of Man|IL:Israel|IT:Italy|JM:Jamaica|" +
  "JP:Japan|JE:Jersey|JO:Jordan|KZ:Kazakhstan|KE:Kenya|KI:Kiribati|XK:Kosovo|KW:Kuwait|KG:Kyrgyzstan|LA:Laos|" +
  "LV:Latvia|LB:Lebanon|LS:Lesotho|LR:Liberia|LY:Libya|LI:Liechtenstein|LT:Lithuania|LU:Luxembourg|MO:Macao|" +
  "MG:Madagascar|MW:Malawi|MY:Malaysia|MV:Maldives|ML:Mali|MT:Malta|MH:Marshall Islands|MQ:Martinique|" +
  "MR:Mauritania|MU:Mauritius|YT:Mayotte|MX:Mexico|FM:Micronesia|MD:Moldova|MC:Monaco|MN:Mongolia|ME:Montenegro|" +
  "MS:Montserrat|MA:Morocco|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NL:Netherlands|" +
  "NC:New Caledonia|NZ:New Zealand|NI:Nicaragua|NE:Niger|NG:Nigeria|NU:Niue|NF:Norfolk Island|KP:North Korea|" +
  "MK:North Macedonia|MP:Northern Mariana Islands|NO:Norway|OM:Oman|PK:Pakistan|PW:Palau|PS:Palestine|PA:Panama|" +
  "PG:Papua New Guinea|PY:Paraguay|PE:Peru|PH:Philippines|PN:Pitcairn Islands|PL:Poland|PT:Portugal|" +
  "PR:Puerto Rico|QA:Qatar|RE:Réunion|RO:Romania|RU:Russia|RW:Rwanda|WS:Samoa|SM:San Marino|" +
  "ST:São Tomé & Príncipe|SA:Saudi Arabia|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leone|SG:Singapore|" +
  "SX:Sint Maarten|SK:Slovakia|SI:Slovenia|SB:Solomon Islands|SO:Somalia|ZA:South Africa|" +
  "GS:South Georgia & South Sandwich Islands|KR:South Korea|SS:South Sudan|ES:Spain|LK:Sri Lanka|" +
  "BL:St. Barthélemy|SH:St. Helena|KN:St. Kitts & Nevis|LC:St. Lucia|MF:St. Martin|PM:St. Pierre & Miquelon|" +
  "VC:St. Vincent & Grenadines|SD:Sudan|SR:Suriname|SJ:Svalbard & Jan Mayen|SE:Sweden|CH:Switzerland|SY:Syria|" +
  "TW:Taiwan|TJ:Tajikistan|TZ:Tanzania|TH:Thailand|TL:Timor-Leste|TG:Togo|TK:Tokelau|TO:Tonga|" +
  "TT:Trinidad & Tobago|TN:Tunisia|TR:Türkiye|TM:Turkmenistan|TC:Turks & Caicos Islands|TV:Tuvalu|" +
  "UM:U.S. Outlying Islands|VI:U.S. Virgin Islands|UG:Uganda|UA:Ukraine|AE:United Arab Emirates|" +
  "GB:United Kingdom|US:United States|UY:Uruguay|UZ:Uzbekistan|VU:Vanuatu|VA:Vatican City|VE:Venezuela|" +
  "VN:Vietnam|WF:Wallis & Futuna|EH:Western Sahara|YE:Yemen|ZM:Zambia|ZW:Zimbabwe";

export const COUNTRIES: readonly (readonly [code: string, name: string])[] = LIST.split("|").map((entry) => {
  const [code, name] = entry.split(":");
  return [code, name] as const;
});

export const COUNTRY_CODES = COUNTRIES.map(([code]) => code);
const NAMES = new Map(COUNTRIES);

const CODES = new Set(COUNTRY_CODES);

const ALIASES: Record<string, string> = {
  usa: "US",
  "u s": "US",
  "u s a": "US",
  "united states of america": "US",
  uk: "GB",
  "great britain": "GB",
  england: "GB",
  // Names some runtimes use instead.
  "palestinian territories": "PS",
  "hong kong sar china": "HK",
  "macao sar china": "MO",
  "myanmar burma": "MM",
  burma: "MM",
};

let byName: Map<string, string> | null = null;

/** "PK" -> "Pakistan". */
export function countryName(code: string): string {
  return NAMES.get(code) ?? code;
}

function normalise(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * What a business has saved ("PK", "pk", "Pakistan", "USA") as an ISO code. An unknown country is "", never
 * guessed as the US (BUG-073).
 */
export function countryCode(country: string | null | undefined): string {
  const text = (country ?? "").trim();
  const key = normalise(text);
  if (!key) return "";
  if (ALIASES[key]) return ALIASES[key];
  if (/^[a-z]{2}$/i.test(text)) return CODES.has(text.toUpperCase()) ? text.toUpperCase() : "";
  if (!byName) byName = new Map(COUNTRY_CODES.map((code) => [normalise(countryName(code)), code]));
  return byName.get(key) ?? "";
}

/** Every country for a select, by name. */
export function countryOptions(): { code: string; name: string }[] {
  return COUNTRIES.map(([code, name]) => ({ code, name }));
}
