import { WorkloadConfig } from "./types";

export const config: WorkloadConfig = {
  env: {
    account: "937168356724",
    region: "us-east-1",
  },
  vpcCidrBlock: "10.5.0.0/16",
  maxAzs: 2,
  domainName: "demosfelipetrindade.lat",
  appSubdomain: "app",
  // oidc: {
  //   issuer: "https://sso.us-east-1.amazonaws.com/12345678901234567890",
  //   authorizationEndpoint: "https://login.sso.us-east-1.amazonaws.com/oauth2/authorize",
  //   tokenEndpoint: "https://login.sso.us-east-1.amazonaws.com/oauth2/token",
  //   userInfoEndpoint: "https://login.sso.us-east-1.amazonaws.com/oauth2/userInfo",
  //   clientId: "your-client-id",
  //   clientSecretArn: "arn:aws:secretsmanager:us-east-1:937168356724:secret:oidc-client-secret",
  // },
};
