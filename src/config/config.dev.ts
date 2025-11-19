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
};
