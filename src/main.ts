import * as cdk from "aws-cdk-lib";
import { WorkloadStack } from "./stack";
import { devWorkloadConfig } from "./config";

const app = new cdk.App();

new WorkloadStack(app, "DevWorkloadStack", { config: devWorkloadConfig });
