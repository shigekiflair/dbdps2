import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canHostPlan, canViewPlan, canChangeAdminStatus } from "../lib/permissions";

describe("canHostPlan", () => {
  test("未ログインは常にfalse", () => {
    assert.equal(canHostPlan(null, "user-1"), false);
    assert.equal(canHostPlan({ userId: null, isAdmin: false } as any, "user-1"), false);
  });

  test("サイト管理者はどの企画でもtrue(自分が作った企画でなくても)", () => {
    assert.equal(canHostPlan({ userId: "admin-1", isAdmin: true }, "someone-else"), true);
    assert.equal(canHostPlan({ userId: "admin-1", isAdmin: true }, null), true);
  });

  test("企画の作成者本人はtrue", () => {
    assert.equal(canHostPlan({ userId: "user-1", isAdmin: false }, "user-1"), true);
  });

  test("他人が作った企画には権限が無い一般ユーザーはfalse", () => {
    assert.equal(canHostPlan({ userId: "user-1", isAdmin: false }, "user-2"), false);
  });

  test("運営キュレーション企画(createdBy=null)は管理者以外false", () => {
    assert.equal(canHostPlan({ userId: "user-1", isAdmin: false }, null), false);
  });
});

describe("canViewPlan", () => {
  test("運営キュレーション企画は誰でも閲覧可", () => {
    assert.equal(canViewPlan({ createdBy: null, visibility: "public" }, null), true);
    assert.equal(canViewPlan({ createdBy: null, visibility: "public" }, "viewer-1"), true);
  });

  test("privateは作成者本人だけ閲覧可", () => {
    assert.equal(canViewPlan({ createdBy: "owner-1", visibility: "private" }, "owner-1"), true);
    assert.equal(canViewPlan({ createdBy: "owner-1", visibility: "private" }, "someone-else"), false);
    assert.equal(canViewPlan({ createdBy: "owner-1", visibility: "private" }, null), false);
  });

  test("unlisted/publicは誰でも閲覧可", () => {
    assert.equal(canViewPlan({ createdBy: "owner-1", visibility: "unlisted" }, null), true);
    assert.equal(canViewPlan({ createdBy: "owner-1", visibility: "public" }, "someone-else"), true);
  });
});

describe("canChangeAdminStatus", () => {
  test("自分自身の管理者権限を外すことはできない", () => {
    assert.equal(canChangeAdminStatus("admin-1", false, "admin-1"), false);
  });

  test("他人の管理者権限は外せる", () => {
    assert.equal(canChangeAdminStatus("admin-2", false, "admin-1"), true);
  });

  test("自分自身に管理者権限を付与するのは許可(既に管理者のはずだが念のため矛盾は無い)", () => {
    assert.equal(canChangeAdminStatus("admin-1", true, "admin-1"), true);
  });

  test("他人に管理者権限を付与できる", () => {
    assert.equal(canChangeAdminStatus("user-2", true, "admin-1"), true);
  });
});
