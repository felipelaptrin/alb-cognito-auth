import * as cdk from "aws-cdk-lib";
import { WorkloadStack } from "./stack";

const app = new cdk.App();

new WorkloadStack(app, "WorkloadStack", {});
