import * as cdk from "aws-cdk-lib";
import { WorkloadStack } from "./stack/workload";
import { devWorkloadConfig, managementConfig } from "./config";
import { ManagementStack } from "./stack/management";

const app = new cdk.App();

new WorkloadStack(app, "DevWorkloadStack", { env: devWorkloadConfig.env, config: devWorkloadConfig });

new ManagementStack(app, "ManagementStack", { env: managementConfig.env, config: managementConfig });
