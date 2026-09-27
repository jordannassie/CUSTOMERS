// Hand-built Places signals for tests and the dev server's PLACES_FIXTURES mode, so no real Google call is
// needed to see the page. Same made-up businesses and place ids as the onboarding competitor fixtures.
import type { FetchSignals, PlaceSignals } from "./places";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const hours = (open: string, closedOn: string[] = []) =>
  WEEK.map((day) => `${day}: ${closedOn.includes(day) ? "Closed" : open}`);

const signals = (
  rating: number | null,
  reviewCount: number | null,
  categories: string[],
  website: string | null,
  week: string[] | null,
): PlaceSignals => ({ rating, reviewCount, categories, website, hours: week, mapsUri: "https://maps.google.com/?cid=fixture" });

export const FIXTURE_SIGNALS: Record<string, PlaceSignals> = {
  "ChIJ-fixture-sunrise-coffee": signals(4.2, 12, ["Coffee shop"], null, hours("7:00 AM to 3:00 PM", ["Sunday"])),
  "ChIJ-fixture-bean-house": signals(4.7, 320, ["Coffee shop", "Bakery"], "https://beanhouse.example", hours("6:00 AM to 8:00 PM")),
  "ChIJ-fixture-daily-grind": signals(4.5, 211, ["Coffee shop", "Cafe"], "https://dailygrind.example", hours("6:30 AM to 6:00 PM")),
  "ChIJ-fixture-copper-kettle": signals(4.6, 158, ["Cafe", "Breakfast restaurant"], "https://copperkettle.example", hours("7:00 AM to 4:00 PM", ["Monday"])),
  "ChIJ-fixture-north-roasters": signals(4.8, 96, ["Coffee roasters"], "https://northroasters.example", hours("7:00 AM to 5:00 PM")),
  "ChIJ-fixture-morning-ritual": signals(4.3, 74, ["Coffee shop"], null, hours("6:00 AM to 2:00 PM", ["Saturday", "Sunday"])),
  "ChIJ-fixture-lantern-espresso": signals(4.4, 61, ["Espresso bar"], "https://lantern.example", null),
  "ChIJ-fixture-kiln-coffee": signals(null, null, ["Coffee shop"], null, null),
  "ChIJ-fixture-blue-door": signals(4.5, 402, ["Coffee shop"], "https://bluedoor.example", hours("7:00 AM to 7:00 PM")),
};

export const fixtureSignals: FetchSignals = async (placeId) => FIXTURE_SIGNALS[placeId] ?? null;
