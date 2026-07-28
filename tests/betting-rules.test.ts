import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isExactMatch, pickCountFor, pointsFor, reasonFor } from "../lib/betting-rules";

describe("isExactMatch", () => {
  test("完全一致(単勝・1件)は的中", () => {
    assert.equal(isExactMatch(["a"], ["a"]), true);
  });

  test("完全一致(2連単・順序も一致)は的中", () => {
    assert.equal(isExactMatch(["a", "b"], ["a", "b"]), true);
  });

  test("順序が逆だと2連単は不的中", () => {
    assert.equal(isExactMatch(["b", "a"], ["a", "b"]), false);
  });

  test("値が違えば不的中", () => {
    assert.equal(isExactMatch(["a"], ["b"]), false);
  });

  test("件数が違えば不的中", () => {
    assert.equal(isExactMatch(["a", "b"], ["a", "b", "c"]), false);
  });

  test("両方空配列は的中扱いにしない(不正な入力を的中として扱わないため)", () => {
    assert.equal(isExactMatch([], []), false);
  });

  test("3連単、部分的に合っていても完全一致でなければ不的中(部分点なし)", () => {
    assert.equal(isExactMatch(["a", "b", "d"], ["a", "b", "c"]), false);
  });
});

describe("pickCountFor / pointsFor / reasonFor", () => {
  test("win: 1件選択・10pt", () => {
    assert.equal(pickCountFor("win"), 1);
    assert.equal(pointsFor("win"), 10);
    assert.equal(reasonFor("win"), "betting_win");
  });

  test("exacta: 2件選択・30pt", () => {
    assert.equal(pickCountFor("exacta"), 2);
    assert.equal(pointsFor("exacta"), 30);
  });

  test("trifecta: 3件選択・50pt", () => {
    assert.equal(pickCountFor("trifecta"), 3);
    assert.equal(pointsFor("trifecta"), 50);
  });
});
