import { AssetFixture, SocialSnapshot } from "@/domain/types";
import { ASSET_FIXTURES } from "@/data/fixtures/assets";
import { generateSocialSnapshot } from "@/data/generator/social";
import { SocialDataProvider } from "./types";

export class MockSocialDataProvider implements SocialDataProvider {
  private socialMissing = false;

  constructor(
    private readonly assets: AssetFixture[] = ASSET_FIXTURES,
    private seed = "swipefolio-v1",
    private readonly today: () => number = () => 0,
  ) {}

  getSnapshot(subjectId: string, day: number): SocialSnapshot | null {
    if (this.socialMissing || day > this.today()) return null;
    const asset = this.assets.find((candidate) => candidate.id === subjectId);
    return asset ? generateSocialSnapshot(asset, this.seed, day) : null;
  }

  setSocialMissing(missing: boolean): void {
    this.socialMissing = missing;
  }

  setSeed(seed: string): void {
    this.seed = seed;
  }
}
