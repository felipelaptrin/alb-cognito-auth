import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { WorkloadConfig } from "./config";

export interface NetworkStackProps extends cdk.StackProps {
  config: WorkloadConfig;
}

export class WorkloadStack extends cdk.Stack {
  config: WorkloadConfig;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.config = props.config;

    this.createVpc();
  }

  createVpc(): ec2.Vpc {
    const vpc = new ec2.Vpc(this, "Vpc", {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: "isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      natGateways: 1, // It reduces costs but also reduces HA
      maxAzs: this.config.maxAzs,
    });
    return vpc;
  }
}
