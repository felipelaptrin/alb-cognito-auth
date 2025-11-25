export type Environment = "dev" | "prod";

export type WorkloadConfig = {
  env: {
    account: string;
    region: string;
  };
  vpcCidrBlock: string;
  maxAzs: number;
  domainName: string;
  appSubdomain: string;
  samlMetadataUrl?: string;
};

export type ManagementConfig = {
  env: {
    account: string;
    region: string;
  };
};
