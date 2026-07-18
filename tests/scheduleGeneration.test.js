import test from "node:test";
import assert from "node:assert/strict";

import { assessGenerateReadiness } from "../src/utils/scheduleGeneration.js";

const readyPayload = {
  classes: [{ name: "X TKR 1", major: "TKR" }],
  rooms: [{ id: "R01", type: "Teori", major: "All" }, { id: "P01", type: "Praktik", major: "All" }],
  teachers: [{ code: "14" }],
  teachingLoads: [{ id: "L1", teacherCode: "14", subject: "PLH", targetGrade: "X", targetMajor: "TKR" }],
  days: ["Senin"],
  timeSlots: { Senin: [{ id: 1, isBreak: false }] },
  teacherAvailability: { "14": { days: ["Senin"], subjects: [] } },
};

test("assessGenerateReadiness blocks non-management users", () => {
  const result = assessGenerateReadiness({
    currentUser: { role: "guru" },
    ...readyPayload,
    strictCompetency: false,
  });

  assert.equal(result.canGenerate, false);
  assert.match(result.blockers[0], /superadmin|waka kurikulum/i);
});

test("assessGenerateReadiness allows waka kurikulum", () => {
  const result = assessGenerateReadiness({
    currentUser: { role: "waka", division: "kurikulum" },
    ...readyPayload,
    strictCompetency: false,
  });

  assert.equal(result.canGenerate, true);
});

test("assessGenerateReadiness warns when strict competency has no teacher subjects", () => {
  const result = assessGenerateReadiness({
    currentUser: { role: "admin" },
    ...readyPayload,
    strictCompetency: true,
  });

  assert.equal(result.canGenerate, true);
  assert.equal(result.warnings.length, 1);
});
