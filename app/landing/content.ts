// Copy and sample content for the home page. Sample headlines are illustrative
// (the endless-feed noise in the hero and the app vignettes), not live news.

export const PLAY_URL = "https://play.google.com/store/apps/details?id=com.chintan.app";
export const APP_STORE_URL = "https://apps.apple.com/in/app/chintan/id6807045745";

// The infinite feed the hero opens inside: the same few stories, re-cut,
// re-angled and re-baited, forever.
export const NOISE = [
  "Sensex swings 600 points in volatile trade",
  "You won't believe what happened next",
  "Markets: 5 stocks to watch today",
  "LIVE: Monsoon session, day 9 updates",
  "Petrol prices revised again",
  "Opinion: Why this changes everything",
  "Watch: The viral clip everyone is sharing",
  "Rupee slips against the dollar",
  "Explained in 60 seconds",
  "Breaking: Sources say talks may resume",
  "IPL auction: who went for how much",
  "Top 10 moments of the week",
  "Rain alert issued for 12 districts",
  "What experts are saying about the bill",
  "Gold rate today in your city",
  "Fact check: Claim goes viral online",
  "Trending: The post that broke the internet",
  "UPDATE: Sources say talks may resume",
  "Sensex recovers 400 points by noon",
  "Here's why everyone is talking about it",
  "Petrol prices: what you need to know",
  "Live score and highlights",
  "The one chart that explains it all",
  "Again: Sources say talks may resume",
  "Shocking: Netizens react",
  "Morning briefing: 25 stories in 5 minutes",
  "Monsoon session: Opposition walks out",
  "Stocks to buy before Monday",
  "Don't miss: this weekend's big releases",
  "Did you see this? Everyone's sharing it",
  "Sensex closes flat after wild session",
  "Reacting to the reaction to the news",
];

export const BRIEF = [
  "Petrol and diesel up ₹4 a litre: the steepest single-day revision in three years.",
  "OpenAI opens its first India office, in Bengaluru.",
  "Monsoon withdraws early from the north-west; rabi sowing to start sooner.",
];

// One developing story, told as updates (not repeats).
export const THREAD = [
  { t: "8:05 AM", outlet: "PTI", text: "Depression over the Bay of Bengal intensifies into a cyclonic storm." },
  { t: "9:20 AM", outlet: "The Hindu", text: "Odisha begins moving families out of coastal villages in three districts." },
  { t: "11:40 AM", outlet: "Sambad", text: "IMD: landfall now expected near Puri tonight, winds up to 110 km/h.", fresh: true },
  { t: "12:05 PM", outlet: "NDTV", text: "Railways cancels 40 trains along the coast until Friday.", fresh: true },
];

export const OUTLETS: { i: string; g: "national" | "regional" | "international" }[] = [
  { i: "TH", g: "national" }, { i: "IE", g: "national" }, { i: "HT", g: "national" },
  { i: "TR", g: "regional" }, { i: "DH", g: "regional" }, { i: "AJ", g: "international" },
];
