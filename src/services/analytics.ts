import { AnalyticsRepository } from "@/persistence/analyticsRepository";
import { MockClock } from "./clock";
import { IdFactory } from "./ids";

export class AnalyticsSink {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly clock: MockClock,
    private readonly idFactory: IdFactory,
    private readonly isDevelopment: boolean,
  ) {}

  async track(
    name: string,
    properties: Record<string, string | number | boolean | null> = {},
  ): Promise<void> {
    const event = {
      id: this.idFactory("event"),
      name,
      occurredAt: this.clock.now(),
      properties,
    };
    await this.repository.record(event);
    if (this.isDevelopment) console.info("[Swipefolio demo analytics]", event);
  }
}
