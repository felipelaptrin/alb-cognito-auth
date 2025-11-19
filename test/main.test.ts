import * as cdk from "aws-cdk-lib";
import "jest-cdk-snapshot";

import { AuthStack } from "../src/stack";

test("Snapshot test for AuthStack", () => {
  const app = new cdk.App();
  const stack = new AuthStack(app, "AuthStackTestStack");

  expect(stack).toMatchCdkSnapshot({
    ignoreAssets: true,
    ignoreCurrentVersion: true,
    ignoreMetadata: true,
  });
});
