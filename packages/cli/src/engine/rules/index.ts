/* ─── Rule Registry ─── */

import { Rule } from "../types";
import { structureRules } from "./structure";
import { clarityRules } from "./clarity";
import { completenessRules } from "./completeness";
import { securityRules } from "./security";
import { consistencyRules } from "./consistency";
import { memoryRules } from "./memory";
import { runtimeRules } from "./runtime";
import { skillSafetyRules } from "./skillSafety";

export const allRules: Rule[] = [
  ...structureRules,
  ...clarityRules,
  ...completenessRules,
  ...securityRules,
  ...consistencyRules,
  ...memoryRules,
  ...runtimeRules,
  ...skillSafetyRules,
];

export {
  structureRules,
  clarityRules,
  completenessRules,
  securityRules,
  consistencyRules,
  memoryRules,
  runtimeRules,
  skillSafetyRules,
};
