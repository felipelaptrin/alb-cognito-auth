import { Construct } from "constructs";
import * as customResources from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

export interface ApplicationAssignmentConfigurationProps {
  applicationArn: string;
  assignmentRequired: boolean;
}

export class ApplicationAssignmentConfiguration extends Construct {
  constructor(scope: Construct, id: string, props: ApplicationAssignmentConfigurationProps) {
    super(scope, id);

    new customResources.AwsCustomResource(this, "ApplicationAssignment", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      onCreate: {
        service: "sso-admin",
        action: "PutApplicationAssignmentConfiguration", // Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/PutApplicationAssignmentConfigurationCommand/
        parameters: {
          ApplicationArn: props.applicationArn,
          AssignmentRequired: props.assignmentRequired,
        },
        physicalResourceId: customResources.PhysicalResourceId.of(`CustomResource`),
      },
      onUpdate: {
        service: "sso-admin",
        action: "PutApplicationAssignmentConfiguration", // Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/PutApplicationAssignmentConfigurationCommand/
        parameters: {
          ApplicationArn: props.applicationArn,
          AssignmentRequired: props.assignmentRequired,
        },
      },
      policy: customResources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["sso:PutApplicationAssignmentConfiguration", "sso:GetApplicationAssignmentConfiguration"],
          resources: [props.applicationArn],
        }),
      ]),
    });
  }
}
