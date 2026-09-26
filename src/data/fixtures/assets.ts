import { AssetFixture, AssetFixtureSchema, ThemeId } from "@/domain/types";

type BaseFixture = {
  ticker: string;
  name: string;
  sector: string;
  themes: ThemeId[];
  price: string;
  annualDrift?: number;
  annualVol?: number;
  events?: { day: number; movePct: number; spreadDays: number }[];
  pricePrecision?: number;
  quoteGaps?: { fromDay: number; toDay: number }[];
  unavailable?: boolean;
  starter?: boolean;
  demoWinner?: boolean;
  demoLoser?: boolean;
  flat?: boolean;
  sharpMove?: boolean;
  zeroBaseline?: boolean;
};

const stocks: BaseFixture[] = [
  {
    ticker: "NVDA",
    name: "NVIDIA",
    sector: "Semiconductors",
    themes: ["ai", "ai_infrastructure", "semiconductors"],
    price: "142.60",
    events: [{ day: 1, movePct: 0.62, spreadDays: 15 }],
    demoWinner: true,
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    sector: "Software",
    themes: ["ai", "ai_infrastructure", "broad_market"],
    price: "493.20",
    starter: true,
  },
  {
    ticker: "AAPL",
    name: "Apple",
    sector: "Consumer technology",
    themes: ["consumer_brands", "broad_market"],
    price: "249.80",
  },
  {
    ticker: "AMZN",
    name: "Amazon",
    sector: "Consumer and cloud",
    themes: ["consumer_brands", "ai_infrastructure"],
    price: "226.10",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet",
    sector: "Software",
    themes: ["ai", "broad_market"],
    price: "251.70",
  },
  {
    ticker: "META",
    name: "Meta Platforms",
    sector: "Software",
    themes: ["ai", "consumer_brands"],
    price: "714.50",
  },
  {
    ticker: "AVGO",
    name: "Broadcom",
    sector: "Semiconductors",
    themes: ["ai_infrastructure", "semiconductors"],
    price: "342.40",
  },
  {
    ticker: "AMD",
    name: "Advanced Micro Devices",
    sector: "Semiconductors",
    themes: ["ai", "semiconductors"],
    price: "159.20",
  },
  {
    ticker: "TSLA",
    name: "Tesla",
    sector: "Automotive",
    themes: ["energy", "consumer_brands"],
    price: "449.60",
  },
  {
    ticker: "PLTR",
    name: "Palantir",
    sector: "Software",
    themes: ["ai", "ai_infrastructure"],
    price: "163.10",
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase",
    sector: "Financial services",
    themes: ["fintech", "income"],
    price: "314.30",
  },
  {
    ticker: "COST",
    name: "Costco",
    sector: "Retail",
    themes: ["consumer_brands", "broad_market"],
    price: "960.50",
  },
  {
    ticker: "WMT",
    name: "Walmart",
    sector: "Retail",
    themes: ["consumer_brands"],
    price: "103.40",
  },
  {
    ticker: "LLY",
    name: "Eli Lilly",
    sector: "Healthcare",
    themes: ["healthcare"],
    price: "788.20",
  },
  {
    ticker: "UNH",
    name: "UnitedHealth Group",
    sector: "Healthcare",
    themes: ["healthcare"],
    price: "320.70",
  },
  {
    ticker: "XOM",
    name: "Exxon Mobil",
    sector: "Energy",
    themes: ["energy", "income"],
    price: "115.80",
  },
  {
    ticker: "NEE",
    name: "NextEra Energy",
    sector: "Utilities",
    themes: ["energy", "income"],
    price: "79.60",
  },
  {
    ticker: "CCJ",
    name: "Cameco",
    sector: "Nuclear energy",
    themes: ["energy", "nuclear_energy"],
    price: "76.50",
  },
  {
    ticker: "CEG",
    name: "Constellation Energy",
    sector: "Nuclear energy",
    themes: ["energy", "nuclear_energy"],
    price: "369.20",
  },
  {
    ticker: "ORCL",
    name: "Oracle",
    sector: "Software",
    themes: ["ai_infrastructure", "software"],
    price: "287.40",
    quoteGaps: [{ fromDay: 5, toDay: 20 }],
  },
  {
    ticker: "CRM",
    name: "Salesforce",
    sector: "Software",
    themes: ["software", "ai"],
    price: "261.90",
  },
  {
    ticker: "TSM",
    name: "Taiwan Semiconductor",
    sector: "Semiconductors",
    themes: ["ai_infrastructure", "semiconductors"],
    price: "233.10",
  },
  {
    ticker: "INTC",
    name: "Intel",
    sector: "Semiconductors",
    themes: ["semiconductors", "broad_market"],
    price: "35.40",
    unavailable: true,
  },
  {
    ticker: "SMCI",
    name: "Super Micro Computer",
    sector: "Computer hardware",
    themes: ["ai_infrastructure", "semiconductors"],
    price: "46.70",
    events: [{ day: 35, movePct: 0.36, spreadDays: 5 }],
    sharpMove: true,
  },
  {
    ticker: "DIS",
    name: "Walt Disney",
    sector: "Media",
    themes: ["consumer_brands"],
    price: "112.80",
  },
  {
    ticker: "KO",
    name: "Coca-Cola",
    sector: "Beverages",
    themes: ["consumer_brands", "income"],
    price: "69.30",
  },
  {
    ticker: "V",
    name: "Visa",
    sector: "Financial services",
    themes: ["fintech", "broad_market"],
    price: "347.10",
  },
  {
    ticker: "NFLX",
    name: "Netflix",
    sector: "Media",
    themes: ["consumer_brands"],
    price: "1150.00",
  },
  {
    ticker: "XYZ",
    name: "Block",
    sector: "Financial technology",
    themes: ["fintech", "crypto"],
    price: "78.60",
    zeroBaseline: true,
  },
  {
    ticker: "BRK.A",
    name: "Berkshire Hathaway Class A",
    sector: "Financial services",
    themes: ["broad_market", "income"],
    price: "652400.00",
  },
];

const etfs: BaseFixture[] = [
  {
    ticker: "VOO",
    name: "Vanguard S&P 500 ETF",
    sector: "Broad market",
    themes: ["broad_market"],
    price: "563.20",
    starter: true,
  },
  {
    ticker: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    sector: "Broad market",
    themes: ["broad_market"],
    price: "648.70",
  },
  {
    ticker: "VTI",
    name: "Vanguard Total Stock Market ETF",
    sector: "Broad market",
    themes: ["broad_market"],
    price: "312.50",
  },
  {
    ticker: "QQQ",
    name: "Invesco QQQ Trust",
    sector: "Technology",
    themes: ["broad_market", "ai", "semiconductors"],
    price: "574.40",
  },
  {
    ticker: "SCHD",
    name: "Schwab U.S. Dividend Equity ETF",
    sector: "Dividend equities",
    themes: ["income"],
    price: "27.80",
  },
  {
    ticker: "VYM",
    name: "Vanguard High Dividend Yield ETF",
    sector: "Dividend equities",
    themes: ["income"],
    price: "132.60",
  },
  {
    ticker: "XLK",
    name: "Technology Select Sector SPDR Fund",
    sector: "Technology",
    themes: ["ai", "semiconductors"],
    price: "246.80",
  },
  {
    ticker: "SMH",
    name: "VanEck Semiconductor ETF",
    sector: "Semiconductors",
    themes: ["ai_infrastructure", "semiconductors"],
    price: "294.10",
  },
  {
    ticker: "XLE",
    name: "Energy Select Sector SPDR Fund",
    sector: "Energy",
    themes: ["energy"],
    price: "89.70",
  },
  {
    ticker: "URNM",
    name: "Sprott Uranium Miners ETF",
    sector: "Nuclear energy",
    themes: ["energy", "nuclear_energy"],
    price: "43.60",
  },
  {
    ticker: "IBIT",
    name: "iShares Bitcoin Trust ETF",
    sector: "Digital assets",
    themes: ["crypto", "crypto_infrastructure"],
    price: "62.10",
  },
  {
    ticker: "XLV",
    name: "Health Care Select Sector SPDR Fund",
    sector: "Healthcare",
    themes: ["healthcare"],
    price: "149.80",
  },
  {
    ticker: "IWM",
    name: "iShares Russell 2000 ETF",
    sector: "Small-cap equities",
    themes: ["broad_market"],
    price: "228.90",
  },
  {
    ticker: "TAN",
    name: "Invesco Solar ETF",
    sector: "Clean energy",
    themes: ["energy"],
    price: "42.20",
  },
  {
    ticker: "BIL",
    name: "SPDR Bloomberg 1-3 Month T-Bill ETF",
    sector: "Fixed income",
    themes: ["income", "fixed_income"],
    price: "91.10",
    annualDrift: 0,
    annualVol: 0,
    flat: true,
  },
];

const crypto: BaseFixture[] = [
  {
    ticker: "BTC",
    name: "Bitcoin",
    sector: "Layer 1 networks",
    themes: ["crypto"],
    price: "111250.00",
    events: [{ day: 1, movePct: 0.44, spreadDays: 21 }],
  },
  {
    ticker: "ETH",
    name: "Ethereum",
    sector: "Smart contract networks",
    themes: ["crypto", "crypto_infrastructure"],
    price: "4210.00",
    starter: true,
  },
  {
    ticker: "SOL",
    name: "Solana",
    sector: "Smart contract networks",
    themes: ["crypto", "crypto_infrastructure"],
    price: "218.40",
  },
  {
    ticker: "XRP",
    name: "XRP",
    sector: "Payments networks",
    themes: ["crypto", "fintech"],
    price: "2.84",
  },
  {
    ticker: "ADA",
    name: "Cardano",
    sector: "Smart contract networks",
    themes: ["crypto", "crypto_infrastructure"],
    price: "0.82",
    events: [{ day: 1, movePct: -0.62, spreadDays: 21 }],
    demoLoser: true,
  },
  {
    ticker: "DOGE",
    name: "Dogecoin",
    sector: "Digital currencies",
    themes: ["crypto"],
    price: "0.24",
    annualVol: 0.88,
  },
  {
    ticker: "LINK",
    name: "Chainlink",
    sector: "Crypto infrastructure",
    themes: ["crypto", "crypto_infrastructure"],
    price: "24.60",
  },
  {
    ticker: "AVAX",
    name: "Avalanche",
    sector: "Smart contract networks",
    themes: ["crypto", "crypto_infrastructure"],
    price: "31.20",
  },
  {
    ticker: "DOT",
    name: "Polkadot",
    sector: "Crypto infrastructure",
    themes: ["crypto", "crypto_infrastructure"],
    price: "5.90",
  },
  {
    ticker: "LTC",
    name: "Litecoin",
    sector: "Digital currencies",
    themes: ["crypto"],
    price: "105.40",
  },
  {
    ticker: "UNI",
    name: "Uniswap",
    sector: "Decentralized finance",
    themes: ["crypto", "fintech"],
    price: "9.60",
  },
  {
    ticker: "AAVE",
    name: "Aave",
    sector: "Decentralized finance",
    themes: ["crypto", "fintech"],
    price: "268.50",
  },
  {
    ticker: "NEAR",
    name: "NEAR Protocol",
    sector: "Smart contract networks",
    themes: ["crypto", "crypto_infrastructure"],
    price: "4.70",
  },
  {
    ticker: "HBAR",
    name: "Hedera",
    sector: "Distributed networks",
    themes: ["crypto", "crypto_infrastructure"],
    price: "0.31",
  },
  {
    ticker: "SHIB",
    name: "Shiba Inu",
    sector: "Digital currencies",
    themes: ["crypto"],
    price: "0.00002420",
    pricePrecision: 8,
    annualVol: 1.15,
  },
];

const themeCopy: Record<ThemeId, string> = {
  ai: "artificial intelligence",
  ai_infrastructure: "AI infrastructure",
  income: "income-oriented investing",
  energy: "energy demand",
  nuclear_energy: "nuclear energy",
  crypto: "digital assets",
  crypto_infrastructure: "crypto infrastructure",
  consumer_brands: "consumer brands",
  broad_market: "broad-market exposure",
  healthcare: "healthcare",
  fintech: "financial technology",
  semiconductors: "semiconductor demand",
  software: "software",
  industrial: "industrial activity",
  fixed_income: "short-term fixed income",
  defense: "defense and aerospace",
};

function decimalMetric(value: number): string {
  return value.toFixed(3);
}

function buildStock(item: BaseFixture, index: number): AssetFixture {
  const primaryTheme = themeCopy[item.themes[0]];
  const nullMetrics = index === 7;
  return {
    id: `stk_${item.ticker.toLowerCase().replace(".", "_")}`,
    type: "stock",
    ticker: item.ticker,
    name: item.name,
    currency: "USD",
    themes: item.themes,
    sector: item.sector,
    description: `${item.name} is a ${item.sector.toLowerCase()} company in this synthetic market set.`,
    thesis: `Its exposure to ${primaryTheme} may matter if demand continues to evolve.`,
    risk: `${item.sector} companies can face competition, valuation swings, and changing demand.`,
    iconInitials: item.ticker.slice(0, 2),
    iconColor: iconColor(index),
    metrics: {
      kind: "stock",
      revenueGrowthYoY: nullMetrics
        ? null
        : decimalMetric(0.035 + (index % 16) * 0.019),
      epsTtm: index === 13 ? null : decimalMetric(1.2 + (index % 21) * 0.81),
      grossMargin: nullMetrics
        ? null
        : decimalMetric(0.21 + (index % 8) * 0.047),
      operatingMargin: decimalMetric(0.04 + (index % 11) * 0.024),
      revenueTtm: nullMetrics
        ? null
        : String(2_100_000_000 + index * 1_470_000_000),
      netIncomeTtm: decimalMetric(350_000_000 + index * 194_000_000),
      cash: index === 7 ? null : String(900_000_000 + index * 230_000_000),
      totalDebt:
        index === 19 ? null : String(280_000_000 + index * 185_000_000),
      freeCashFlowTtm: decimalMetric(170_000_000 + index * 127_000_000),
      sharesOutstanding: String(750_000_000 + index * 63_000_000),
      peers: stocks
        .filter(
          (peer) => peer.sector === item.sector && peer.ticker !== item.ticker,
        )
        .slice(0, 3)
        .map((peer) => peer.ticker),
    },
    market: {
      currentPrice: item.price,
      annualDrift: item.annualDrift ?? 0.035 + (index % 7) * 0.018,
      annualVol: item.annualVol ?? 0.17 + (index % 8) * 0.035,
      events: item.events ?? [],
      pricePrecision: item.pricePrecision ?? 2,
      ...(item.quoteGaps ? { quoteGaps: item.quoteGaps } : {}),
      ...(item.unavailable ? { unavailable: true } : {}),
    },
    flags: {
      ...(item.starter ? { starter: true } : {}),
      ...(item.demoWinner ? { demoWinner: true } : {}),
      ...(item.demoLoser ? { demoLoser: true } : {}),
      ...(item.flat ? { flat: true } : {}),
      ...(item.sharpMove ? { sharpMove: true } : {}),
    },
    social: {
      ...(item.zeroBaseline ? { zeroBaseline: true } : {}),
      sampleSize: 48 + index * 3,
    },
  };
}

function buildEtf(item: BaseFixture, index: number): AssetFixture {
  const primaryTheme = themeCopy[item.themes[0]];
  return {
    id: `etf_${item.ticker.toLowerCase()}`,
    type: "etf",
    ticker: item.ticker,
    name: item.name,
    currency: "USD",
    themes: item.themes,
    sector: item.sector,
    description: `${item.name} is an exchange-traded fund focused on ${primaryTheme}.`,
    thesis: `A single fund can offer a simple way to explore ${primaryTheme}.`,
    risk: "Fund prices can fall with their holdings; concentration and expenses vary by strategy.",
    iconInitials: item.ticker.slice(0, 2),
    iconColor: iconColor(index + stocks.length),
    metrics: {
      kind: "etf",
      expenseRatio:
        index === 8 ? null : decimalMetric(0.0003 + (index % 6) * 0.0014),
      distributionYield:
        index === 13 ? null : decimalMetric(0.006 + (index % 7) * 0.009),
      top10Concentration: decimalMetric(0.19 + (index % 7) * 0.071),
      aum: String(1_400_000_000 + index * 7_300_000_000),
      objective: `Provides synthetic exposure to ${primaryTheme}.`,
      holdings: [
        {
          name: "Synthetic Holding A",
          weight: decimalMetric(0.12 + (index % 3) * 0.02),
        },
        {
          name: "Synthetic Holding B",
          weight: decimalMetric(0.08 + (index % 4) * 0.01),
        },
      ],
      exposures: [
        {
          label: item.sector,
          weight: decimalMetric(0.42 + (index % 5) * 0.08),
        },
        {
          label: "Other sectors",
          weight: decimalMetric(0.58 - (index % 5) * 0.08),
        },
      ],
      distributionNotes:
        "Synthetic distribution profile; no cash distributions are modeled.",
    },
    market: {
      currentPrice: item.price,
      annualDrift: item.annualDrift ?? 0.025 + (index % 6) * 0.014,
      annualVol: item.annualVol ?? 0.11 + (index % 6) * 0.025,
      events: item.events ?? [],
      pricePrecision: item.pricePrecision ?? 2,
      ...(item.quoteGaps ? { quoteGaps: item.quoteGaps } : {}),
      ...(item.unavailable ? { unavailable: true } : {}),
    },
    flags: {
      ...(item.starter ? { starter: true } : {}),
      ...(item.flat ? { flat: true } : {}),
      ...(item.sharpMove ? { sharpMove: true } : {}),
    },
    social: { sampleSize: 42 + index * 4 },
  };
}

function buildCrypto(item: BaseFixture, index: number): AssetFixture {
  const primaryTheme = themeCopy[item.themes[0]];
  return {
    id: `cry_${item.ticker.toLowerCase()}`,
    type: "crypto",
    ticker: item.ticker,
    name: item.name,
    currency: "USD",
    themes: item.themes,
    sector: item.sector,
    description: `${item.name} is a digital asset associated with ${primaryTheme}.`,
    thesis: `Its network may attract interest as ${primaryTheme} develops.`,
    risk: "Digital assets can be highly volatile and face liquidity, technology, and regulatory risks.",
    iconInitials: item.ticker.slice(0, 2),
    iconColor: iconColor(index + stocks.length + etfs.length),
    metrics: {
      kind: "crypto",
      circulatingSupply:
        index === 14
          ? "589500000000000"
          : String(7_500_000 + index * 3_670_000),
      maxSupply:
        index === 1 || index === 5
          ? null
          : String(21_000_000 + index * 9_700_000),
      volume24h:
        index === 12 ? null : String(240_000_000 + index * 412_000_000),
      networkPurpose: `Synthetic description of ${item.name}'s network role in ${primaryTheme}.`,
      supplyStructure:
        index === 1
          ? "No fixed maximum supply in this synthetic fixture."
          : "A capped supply is modeled for this fixture.",
      tokenRisks:
        "Protocol design, concentration, and market liquidity can change materially.",
    },
    market: {
      currentPrice: item.price,
      annualDrift: item.annualDrift ?? 0.025 + (index % 8) * 0.024,
      annualVol: item.annualVol ?? 0.44 + (index % 5) * 0.12,
      events: item.events ?? [],
      pricePrecision:
        item.pricePrecision ?? (Number(item.price) < 0.01 ? 6 : 2),
      ...(item.quoteGaps ? { quoteGaps: item.quoteGaps } : {}),
      ...(item.unavailable ? { unavailable: true } : {}),
    },
    flags: {
      ...(item.starter ? { starter: true } : {}),
      ...(item.demoWinner ? { demoWinner: true } : {}),
      ...(item.demoLoser ? { demoLoser: true } : {}),
      ...(item.flat ? { flat: true } : {}),
      ...(item.sharpMove ? { sharpMove: true } : {}),
    },
    social: {
      ...(item.zeroBaseline ? { zeroBaseline: true } : {}),
      sampleSize: 50 + index * 5,
    },
  };
}

function iconColor(index: number): string {
  const colors = [
    "#B7D8FF",
    "#D9C3FF",
    "#FFC8A1",
    "#A8E2D0",
    "#FFD98E",
    "#F5B9CE",
  ];
  return colors[index % colors.length];
}

export const ASSET_FIXTURES: AssetFixture[] = [
  ...stocks.map(buildStock),
  ...etfs.map(buildEtf),
  ...crypto.map(buildCrypto),
].map((fixture) => AssetFixtureSchema.parse(fixture));

export const ASSETS: AssetFixture[] = ASSET_FIXTURES;
