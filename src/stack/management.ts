import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ManagementConfig } from "../config";
import * as sso from "aws-cdk-lib/aws-sso";
import * as customIdentityCenter from "../custom";

export interface ManagementStackProps extends cdk.StackProps {
  config: ManagementConfig;
}

export class ManagementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ManagementStackProps) {
    super(scope, id, props);

    const instanceArn = "arn:aws:sso:::instance/ssoins-7223c55c41650ede";
    const applicationUrl = "https://app.demosfelipetrindade.lat";
    const cognitoIssuerUrl = "https://auth.demosfelipetrindade.lat";
    const cognitoUserPoolClientId = "7kej4cff5f822hlo5g70mvbaoa";

    const trustTokenIssuer = new customIdentityCenter.TrustTokenIssuer(this, "TrustTokenIssuer", {
      instanceArn: instanceArn,
      name: "CognitoTest",
      issuerUrl: cognitoIssuerUrl,
    });

    const identityCenterApplication = new sso.CfnApplication(this, "MyCfnApplication", {
      applicationProviderArn: "arn:aws:sso::aws:applicationProvider/custom",
      instanceArn: instanceArn,
      name: "MyTestApp",
      description: "An authless app that has authentication using Identity Center and Cognito integration.",
      portalOptions: {
        signInOptions: {
          origin: "APPLICATION",
          applicationUrl: applicationUrl,
        },
        visibility: "ENABLED",
      },
    });
    new customIdentityCenter.ApplicationAssignmentConfiguration(this, "MyCfnApplicationAssignment", {
      applicationArn: identityCenterApplication.attrApplicationArn,
      assignmentRequired: false,
    });
    new customIdentityCenter.ApplicationGrant(this, "MyCfnApplicationGrant", {
      applicationArn: identityCenterApplication.attrApplicationArn,
      cognitoUserPoolClientId: cognitoUserPoolClientId,
      trustedTokenIssuerArn: trustTokenIssuer.arn,
    });
    new customIdentityCenter.ApplicationAuthenticationMethod(this, "MyCfnApplicationAuthenticationMethod", {
      applicationArn: identityCenterApplication.attrApplicationArn,
    });
  }
}
