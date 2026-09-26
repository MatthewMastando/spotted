import { rankDeck, DeckFilters, DeckMode } from "@/domain/deck";
import { D } from "@/domain/decimal";
import { ThemeId } from "@/domain/types";
import { AssetRepository, SocialDataProvider } from "@/data/providers/types";
import { DeckActionRepository } from "@/persistence/deckActionRepository";
import { SavedIdeaRepository } from "@/persistence/savedIdeaRepository";
import { MockClock } from "./clock";
import { SavedIdeaService } from "./savedIdeaService";

export class DeckService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly savedIdeas: SavedIdeaRepository,
    private readonly actions: DeckActionRepository,
    private readonly savedIdeaService: SavedIdeaService,
    private readonly social: SocialDataProvider,
    private readonly clock: MockClock,
    private readonly seed: () => string,
    private readonly interests: () => ThemeId[],
  ) {}

  async getItems(mode: DeckMode = "for_you", filters: DeckFilters = {}) {
    const activeSaved = await this.savedIdeas.list("active");
    const filterKey = getFilterKey(filters);
    const passedIds = await this.savedIdeaService.passedIds(filterKey);
    const savedThemes = [
      ...new Set(
        activeSaved.flatMap(
          (saved) => this.assets.getDetails(saved.assetId)?.themes ?? [],
        ),
      ),
    ];
    const freshDeck =
      !filters.type && !filters.theme && !(await this.actions.hasActions());
    const attentionRatios = new Map<string, number | null>();
    if (mode === "trending") {
      for (const asset of this.assets.list()) {
        const snapshot = this.social.getSnapshot(asset.id, this.clock.today());
        const baseline = snapshot ? D(snapshot.baseline) : D(0);
        attentionRatios.set(
          asset.id,
          snapshot && baseline.gte(5)
            ? D(snapshot.count).div(baseline).toNumber()
            : null,
        );
      }
    }
    return rankDeck({
      assets: this.assets.list(),
      mode,
      seed: this.seed(),
      interests: this.interests(),
      savedThemes,
      activeSavedIds: activeSaved.map((saved) => saved.assetId),
      passedIds,
      filters,
      freshDeck,
      attentionRatios,
    });
  }

  async pass(
    assetId: string,
    actionId: string,
    filters: DeckFilters = {},
  ): Promise<void> {
    await this.savedIdeaService.pass(assetId, actionId, getFilterKey(filters));
  }

  async reviewPassedIdeas(filters: DeckFilters = {}): Promise<void> {
    await this.actions.clearPassed(getFilterKey(filters));
  }
}

export function getFilterKey(filters: DeckFilters): string {
  return `type=${filters.type ?? "all"};theme=${filters.theme ?? "all"}`;
}
