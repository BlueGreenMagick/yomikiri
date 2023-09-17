import { test, expect, describe } from "@jest/globals";
import Utils from "./utils";

describe("Utils", () => {
  test("generateUrlParams", async () => {
    const value = Utils.generateUrlParams({ "key 1": "value 1" });
    expect(value).toBe("key%201=value%201");
  });

  test("SingleQueued", async () => {
    const inner = async (a: string, prom: Promise<void>) => {
      await prom;
      return a;
    };
    const fn = Utils.SingleQueued(inner);

    const [prom1, res1] = Utils.createPromise<void>();
    const [prom2, res2] = Utils.createPromise<void>();
    const [prom3, res3] = Utils.createPromise<void>();
    const ret1 = fn("1", prom1);
    const ret2 = fn("2", prom2);
    const ret3 = fn("3", prom3);
    res1();
    res2();
    res3();
    expect(await ret1).toBe("1");
    expect(await ret2).toBe(null);
    expect(await ret3).toBe("3");
  });
});
