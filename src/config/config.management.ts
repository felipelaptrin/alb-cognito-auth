import { AwsAccount, ManagementConfig } from "./types";

export const config: ManagementConfig = {
  env: {
    account: AwsAccount.ManagementAccount,
    region: "us-east-1",
  },
};
