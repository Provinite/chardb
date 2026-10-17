import { HalloweenUi, Color, EVENT_NAME } from "./ui";
import { HalloweenRandom } from "../random";
import { HalloweenClock } from "../clock";
import { HalloweenConfig } from "../halloween.config";
import { buildInteraction, fixedClock, testConfig } from "../testing/fixtures";

describe("HalloweenUi", () => {
  let random: HalloweenRandom;
  let ui: HalloweenUi;

  beforeEach(() => {
    random = new HalloweenRandom();
    ui = new HalloweenUi(
      testConfig() as HalloweenConfig,
      random,
      fixedClock("2025-10-17T15:30:00.000Z") as HalloweenClock,
    );
  });

  it("uses the bot's colors", () => {
    expect(Color.Primary).toBe(0xeb6123);
    expect(Color.Error).toBe(0xff0000);
    expect(Color.Warning).toBe(0xffff00);
  });

  it("names the event", () => {
    expect(EVENT_NAME).toBe("Cloverse Halloween 2026");
  });

  it("signs embeds as Daphne for icons 0-5", () => {
    jest.spyOn(random, "int").mockReturnValue(5);
    expect(ui.author()).toEqual({
      name: "Daphne",
      icon_url: "https://images.test/halloween/icon/5.png",
    });
    expect(random.int).toHaveBeenCalledWith(11);
  });

  it("signs embeds as Luther for icons 6-10", () => {
    jest.spyOn(random, "int").mockReturnValue(6);
    expect(ui.author()).toEqual({
      name: "Luther",
      icon_url: "https://images.test/halloween/icon/6.png",
    });
  });

  it("stamps embeds with the current time", () => {
    expect(ui.timestamp()).toBe("2025-10-17T15:30:00.000Z");
  });

  it("picks one of the 130 candy images", () => {
    jest.spyOn(random, "int").mockReturnValue(129);
    expect(ui.candyImageUrl()).toBe(
      "https://images.test/halloween/candy/129.png",
    );
    expect(random.int).toHaveBeenCalledWith(130);
  });

  it("footers errors with the interaction id", () => {
    expect(ui.errorFooter(buildInteraction({ id: "interaction-1" }))).toEqual({
      text: "Reference ID: interaction-1",
    });
  });
});
