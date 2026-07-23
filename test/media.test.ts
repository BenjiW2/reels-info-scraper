import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicInstagramUrl } from "../src/media.js";

test("accepts public Instagram Reel URLs", () => {
  assert.equal(
    assertPublicInstagramUrl("https://www.instagram.com/reel/ABC_123/?igsh=x"),
    "https://www.instagram.com/reel/ABC_123/?igsh=x"
  );
  assert.equal(
    assertPublicInstagramUrl("https://www.instagram.com/example.user/reel/ABC_123/"),
    "https://www.instagram.com/example.user/reel/ABC_123/"
  );
});

test("rejects non-Instagram and non-Reel URLs", () => {
  assert.throws(() => assertPublicInstagramUrl("https://example.com/reel/x"), /Instagram Reel/);
  assert.throws(() => assertPublicInstagramUrl("https://instagram.com/accounts/login/"), /Instagram Reel/);
});
