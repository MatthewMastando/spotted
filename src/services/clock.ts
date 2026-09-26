import { AppSettings } from "@/domain/types";
import { clampDay, valuationInstant } from "@/domain/time";

export class MockClock {
  private settings: AppSettings;

  constructor(
    settings: AppSettings,
    private readonly persist: (settings: AppSettings) => Promise<void>,
  ) {
    this.settings = settings;
  }

  today(): number {
    return this.settings.clock.dayOffset;
  }

  now(): string {
    return valuationInstant(this.today());
  }

  async advance(days: 1 | 7): Promise<number> {
    const dayOffset = clampDay(this.today() + days);
    await this.update({ ...this.settings, clock: { dayOffset } });
    return dayOffset;
  }

  async reset(): Promise<void> {
    await this.update({ ...this.settings, clock: { dayOffset: 0 } });
  }

  async updateSettings(settings: AppSettings): Promise<void> {
    await this.update(settings);
  }

  private async update(settings: AppSettings): Promise<void> {
    await this.persist(settings);
    this.settings = settings;
  }
}
