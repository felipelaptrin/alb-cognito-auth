import * as cdk from "aws-cdk-lib";
import { WorkloadStack } from "./stack/workload";
import { devWorkloadConfig } from "./config";

const app = new cdk.App();

new WorkloadStack(app, "DevWorkloadStack", { env: devWorkloadConfig.env, config: devWorkloadConfig });
