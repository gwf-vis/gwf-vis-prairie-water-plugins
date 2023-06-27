import type { SharedStates } from "gwf-vis-host";

// This is used as a hint of which shared state keys are defined
export type GWFPrairieWaterSharedStates = SharedStates & {
  "gwf-prairie-water.selected-feature"?: string;
};
