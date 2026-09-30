export type Risk = 'Low' | 'Moderate' | 'High';
export type Horizon = 'Short' | 'Medium' | 'Long';

export interface Investment {
  id: string;
  name: string;
  type: 'Stocks' | 'ETFs' | 'Bonds' | 'Crypto' | 'Real Estate' | 'Commodities';
  kind: string;
  issuer: string;
  risk: Risk;
  /** minimum order in USD */
  min: number;
  /** demo annual return, percent */
  ret: number;
  hor: Horizon;
  /** fee as a fraction of the order amount */
  fee: number;
  added: string;
  score: number;
  blurb: string;
  /** true when the return is an illustration rather than historical */
  illus: boolean;
}

const I = (
  id: string, name: string, type: Investment['type'], kind: string, issuer: string, risk: Risk,
  min: number, ret: number, hor: Horizon, fee: number, added: string, score: number,
  blurb: string, illus = false,
): Investment => ({ id, name, type, kind, issuer, risk, min, ret, hor, fee, added, score, blurb, illus });

export const CATALOG: Investment[] = [
  I('global-tech-fund', 'Global Tech Fund', 'ETFs', 'ETF', 'VAULTA Funds', 'Moderate', 100, 12.8, 'Long', 0.005, '2026-08-14', 9, 'Diversified exposure to leading global technology companies.'),
  I('sustainable-growth', 'Sustainable Growth Portfolio', 'ETFs', 'Managed Portfolio', 'VAULTA Managed', 'Moderate', 250, 9.4, 'Long', 0.0075, '2026-09-02', 8, 'A managed mix of companies screened for sustainability practices.'),
  I('digital-assets-fund', 'Digital Assets Fund', 'Crypto', 'Crypto', 'VAULTA Digital', 'High', 50, 27.6, 'Medium', 0.015, '2026-09-10', 7, 'A basket of selected digital assets. Prices can swing sharply.'),
  I('blue-chip-leaders', 'Blue Chip Leaders', 'Stocks', 'Stock basket', 'Large-cap US companies', 'Moderate', 25, 10.2, 'Long', 0.003, '2026-07-20', 8, 'Established large companies with long operating histories.'),
  I('growth-innovators', 'Growth Innovators', 'Stocks', 'Stock basket', 'Mid-cap growth companies', 'High', 50, 18.9, 'Medium', 0.004, '2026-09-18', 6, 'Faster-growing companies with larger potential price swings.'),
  I('treasury-ladder', 'Treasury Ladder', 'Bonds', 'Bond', 'Government securities', 'Low', 500, 4.1, 'Short', 0.002, '2026-06-30', 7, 'Short-dated government bonds aimed at steadier income.', true),
  I('corporate-income', 'Corporate Income Bonds', 'Bonds', 'Bond', 'Investment-grade issuers', 'Low', 250, 5.1, 'Medium', 0.003, '2026-08-05', 6, 'Investment-grade corporate bonds that pay regular interest.', true),
  I('prime-property', 'Prime Property Trust', 'Real Estate', 'Real estate', 'Commercial property portfolio', 'Moderate', 500, 7.3, 'Long', 0.01, '2026-09-22', 7, 'Property-backed exposure to office and logistics assets.', true),
  I('gold-reserve', 'Gold Reserve', 'Commodities', 'Commodity', 'Physical gold exposure', 'Moderate', 100, 6.2, 'Medium', 0.004, '2026-07-11', 6, 'Exposure to gold as a potential portfolio diversifier.'),
];

export const findInvestment = (id: string) => CATALOG.find((i) => i.id === id);
