import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ManagementConfig } from "../config";

export interface ManagementStackProps extends cdk.StackProps {
  config: ManagementConfig;
}

export class ManagementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ManagementStackProps) {
    super(scope, id, props);
  }
}
