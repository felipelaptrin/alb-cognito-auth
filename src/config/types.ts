export type Environment = "dev" | "prod";

export enum AwsAccount {
  ManagementAccount = "937168356724",
  Development = "869935103835",
}

export type WorkloadConfig = {
  env: {
    account: string;
    region: string;
  };
  vpcCidrBlock: string;
  maxAzs: number;
};

export type ManagementConfig = {
  env: {
    account: string;
    region: string;
  };
};
