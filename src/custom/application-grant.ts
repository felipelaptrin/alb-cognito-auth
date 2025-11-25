import { Construct } from "constructs";
import * as customResources from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

export interface ApplicationGrantProps {
  applicationArn: string;
  trustedTokenIssuerArn: string;
  cognitoUserPoolClientId: string;
}

export class ApplicationGrant extends Construct {
  constructor(scope: Construct, id: string, props: ApplicationGrantProps) {
    super(scope, id);

    new customResources.AwsCustomResource(this, "ApplicationGrant", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      onCreate: {
        service: "sso-admin",
        action: "PutApplicationGrant", // Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/PutApplicationGrantCommand/
        parameters: {
          ApplicationArn: props.applicationArn,
          GrantType: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          Grant: {
            JwtBearer: {
              AuthorizedTokenIssuers: [
                {
                  TrustedTokenIssuerArn: props.trustedTokenIssuerArn,
                  AuthorizedAudiences: [props.cognitoUserPoolClientId],
                },
              ],
            },
          },
        },
        physicalResourceId: customResources.PhysicalResourceId.of("CustomResource"),
      },
      onDelete: {
        service: "sso-admin",
        action: "DeleteApplicationGrant", // Reference https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/DeleteApplicationGrantCommand/
        parameters: {
          ApplicationArn: props.applicationArn,
          GrantType: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        },
      },
      policy: customResources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["sso:DeleteApplicationGrant", "sso:PutApplicationGrant", "sso:GetApplicationGrant"],
          resources: [props.applicationArn],
        }),
      ]),
    });
  }
}
