export type Environment = "dev" | "prod";

export enum AwsAccount {
  ManagementAccount = "937168356724",
  Development = "911167928887",
}

export type WorkloadConfig = {
  env: {
    account: string;
    region: string;
  };
  vpcCidrBlock: string;
  maxAzs: number;
  domainName: string;
};

export type ManagementConfig = {
  env: {
    account: string;
    region: string;
  };
};
