import * as cdk from "aws-cdk-lib";
import "jest-cdk-snapshot";

import { WorkloadStack } from "../src/stack";
import { devWorkloadConfig } from "../src/config";

test("[DEV] Snapshot test for WorkloadStack", () => {
  const app = new cdk.App();
  const stack = new WorkloadStack(app, "WorkloadTestStack", { config: devWorkloadConfig });

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
    ignoreCurrentVersion: true,
    ignoreMetadata: true,
  });
});
