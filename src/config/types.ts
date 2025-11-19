export type Environment = "dev" | "prod";

export type OidcConfig = {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  clientId: string;
  clientSecretArn: string; // ARN of the secret in AWS Secrets Manager
};

export type WorkloadConfig = {
  env: {
    account: string;
    region: string;
  };
  vpcCidrBlock: string;
  maxAzs: number;
  domainName: string;
  appSubdomain: string;
  oidc?: OidcConfig;
};

export type ManagementConfig = {
  env: {
    account: string;
    region: string;
  };
};
