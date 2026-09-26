import { AssetFixture, ThemeId } from "@/domain/types";
import { ASSET_FIXTURES } from "@/data/fixtures/assets";
import { AssetRepository } from "./types";

export class MockAssetRepository implements AssetRepository {
  constructor(private readonly assets: AssetFixture[] = ASSET_FIXTURES) {}

  list(): AssetFixture[] {
    return [...this.assets];
  }

  search(query: string): AssetFixture[] {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return this.list();
    return this.assets.filter(
      (asset) =>
        asset.name.toLocaleLowerCase().includes(normalized) ||
        asset.ticker.toLocaleLowerCase().includes(normalized) ||
        asset.themes.some((theme) => theme.replaceAll("_", " ").includes(normalized)),
    );
  }

  filter(filters: {
    type?: AssetFixture["type"];
    theme?: string;
  }): AssetFixture[] {
    return this.assets.filter(
      (asset) =>
        (!filters.type || asset.type === filters.type) &&
        (!filters.theme || asset.themes.includes(filters.theme as ThemeId)),
    );
  }

  getDetails(assetId: string): AssetFixture | null {
    return this.assets.find((asset) => asset.id === assetId) ?? null;
  }

  related(assetId: string, limit = 6): AssetFixture[] {
    const asset = this.getDetails(assetId);
    if (!asset) return [];
    return this.assets
      .filter((candidate) => candidate.id !== assetId)
      .map((candidate) => ({
        candidate,
        sharedThemes: candidate.themes.filter((theme) =>
          asset.themes.includes(theme),
        ).length,
      }))
      .filter(({ sharedThemes }) => sharedThemes > 0)
      .sort((left, right) => right.sharedThemes - left.sharedThemes)
      .slice(0, limit)
      .map(({ candidate }) => candidate);
  }
}
