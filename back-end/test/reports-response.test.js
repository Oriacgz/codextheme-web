import test from "node:test";
import assert from "node:assert/strict";
import { reportResponse } from "../../front-end/src/services/reports.js";
test("legacy reports API remains renderable without summary metrics", () => {
  const data = reportResponse({ reports: [] });
  assert.deepEqual(data.reports, []);
  assert.equal(data.summary, null);
});
test("reports summary tolerates absent chart values and rejects malformed counts", () => {
  assert.deepEqual(
    reportResponse({ reports: [], stats: { open: 0, closed: 0 } }).summary
      .daily,
    [],
  );
  assert.equal(
    reportResponse({ reports: [], stats: { open: "0", closed: 0 } }).summary,
    null,
  );
  assert.throws(() => reportResponse({}), /could not be loaded/);
});
