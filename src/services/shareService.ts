import {
  buildIdeaShareSnapshot,
  buildPortfolioShareSnapshot,
  buildPositionShareSnapshot,
} from "@/domain/share";
import { ShareSnapshot } from "@/domain/types";
import { ShareSnapshotRepository } from "@/persistence/shareSnapshotRepository";

type ShareBuilders = {
  idea: typeof buildIdeaShareSnapshot;
  position: typeof buildPositionShareSnapshot;
  portfolio: typeof buildPortfolioShareSnapshot;
};

export interface ShareOutputAdapter {
  render(
    snapshot: ShareSnapshot,
    layout: "portrait" | "square",
  ): Promise<string>;
  shareImage(uri: string): Promise<void>;
  saveImage(uri: string): Promise<void>;
}

export class ShareService {
  constructor(
    private readonly snapshots: ShareSnapshotRepository,
    private readonly builders: ShareBuilders = {
      idea: buildIdeaShareSnapshot,
      position: buildPositionShareSnapshot,
      portfolio: buildPortfolioShareSnapshot,
    },
  ) {}

  async createIdeaSnapshot(
    input: Parameters<typeof buildIdeaShareSnapshot>[0],
  ): Promise<ShareSnapshot> {
    return this.persist(this.builders.idea(input));
  }

  async createPositionSnapshot(
    input: Parameters<typeof buildPositionShareSnapshot>[0],
  ): Promise<ShareSnapshot> {
    return this.persist(this.builders.position(input));
  }

  async createPortfolioSnapshot(
    input: Parameters<typeof buildPortfolioShareSnapshot>[0],
  ): Promise<ShareSnapshot> {
    return this.persist(this.builders.portfolio(input));
  }

  get(id: string): Promise<ShareSnapshot | null> {
    return this.snapshots.get(id);
  }

  private async persist(snapshot: ShareSnapshot): Promise<ShareSnapshot> {
    await this.snapshots.save(snapshot);
    return snapshot;
  }
}
