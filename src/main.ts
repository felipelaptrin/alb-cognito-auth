import * as cdk from "aws-cdk-lib";
import { AuthStack } from "./stack";

const app = new cdk.App();

new AuthStack(app, "Stack", {});
