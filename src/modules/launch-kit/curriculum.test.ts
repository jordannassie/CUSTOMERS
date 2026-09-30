import { afterAll, describe, expect, it } from "vitest";
import {
  firstIncompleteLessonPath,
  getLesson,
  MODULES,
  moduleCompletion,
  nextLessonPath,
} from "./curriculum";

afterAll(() => undefined);

describe("launch kit curriculum", () => {
  it("has six modules and a unique lesson id for every lesson", () => {
    expect(MODULES).toHaveLength(6);
    const ids = MODULES.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(MODULES[5].isActivationModule).toBe(true);
  });

  it("points to the next lesson, then the next module, then the academy home", () => {
    const first = MODULES[0].lessons[0];
    const second = MODULES[0].lessons[1];
    expect(nextLessonPath(MODULES[0].slug, first.slug)).toBe(
      `/academy/${MODULES[0].slug}/${second.slug}`,
    );
    const lastInFirst = MODULES[0].lessons[MODULES[0].lessons.length - 1];
    expect(nextLessonPath(MODULES[0].slug, lastInFirst.slug)).toBe(
      `/academy/${MODULES[1].slug}/${MODULES[1].lessons[0].slug}`,
    );
    const lastModule = MODULES[MODULES.length - 1];
    const lastLesson = lastModule.lessons[lastModule.lessons.length - 1];
    expect(nextLessonPath(lastModule.slug, lastLesson.slug)).toBe("/academy");
  });

  it("returns the first incomplete lesson and module completion counts", () => {
    const completed = new Set([MODULES[0].lessons[0].id]);
    expect(firstIncompleteLessonPath(completed)).toBe(
      `/academy/${MODULES[0].slug}/${MODULES[0].lessons[1].slug}`,
    );
    const stats = moduleCompletion(MODULES[0], completed);
    expect(stats.done).toBe(1);
    expect(stats.complete).toBe(false);
    expect(getLesson("missing", "missing")).toBeUndefined();
  });
});
