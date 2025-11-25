import { Construct } from "constructs";
import * as customResources from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

export interface ApplicationAuthenticationMethodProps {
  applicationArn: string;
}

export class ApplicationAuthenticationMethod extends Construct {
  constructor(scope: Construct, id: string, props: ApplicationAuthenticationMethodProps) {
    super(scope, id);

    new customResources.AwsCustomResource(this, "ApplicationAuthenticationMethod", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      onCreate: {
        service: "sso-admin",
        action: "PutApplicationAuthenticationMethod", // Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/PutApplicationAuthenticationMethodCommand/
        parameters: {
          ApplicationArn: props.applicationArn,
          AuthenticationMethodType: "IAM",
          AuthenticationMethod: {
            Iam: {
              ActorPolicy: {
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Principal: {
                      AWS: cdk.Stack.of(this).account,
                    },
                    Action: "sso-oauth:CreateTokenWithIAM",
                    Resource: props.applicationArn,
                  },
                ],
              },
            },
          },
        },
        physicalResourceId: customResources.PhysicalResourceId.of("CustomResource"),
      },
      onDelete: {
        service: "sso-admin",
        action: "DeleteApplicationAuthenticationMethod", // Reference https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/DeleteApplicationAuthenticationMethodCommand/
        parameters: {
          ApplicationArn: props.applicationArn,
          AuthenticationMethodType: "IAM",
        },
      },
      policy: customResources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "sso:PutApplicationAuthenticationMethod",
            "sso:DeleteApplicationAuthenticationMethod",
            "sso:GetApplicationAuthenticationMethod",
          ],
          resources: [props.applicationArn],
        }),
      ]),
    });
  }
}
