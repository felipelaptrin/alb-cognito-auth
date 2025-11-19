import { AwsAccount, WorkloadConfig } from "./types";

export const config: WorkloadConfig = {
  env: {
    account: AwsAccount.Development,
    region: "us-east-1",
  },
  vpcCidrBlock: "10.5.0.0/6",
  maxAzs: 2,
};
