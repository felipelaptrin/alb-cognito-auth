import { Construct } from "constructs";
import * as customResources from "aws-cdk-lib/custom-resources";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

export interface TrustTokenIssuerProps {
  name: string;
  instanceArn: string;
  issuerUrl: string;
}

export class TrustTokenIssuer extends Construct {
  public readonly arn: string;

  constructor(scope: Construct, id: string, props: TrustTokenIssuerProps) {
    super(scope, id);

    const trustTokenIssuer = new customResources.AwsCustomResource(this, "TrustTokenIssuer", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      onCreate: {
        service: "sso-admin",
        action: "CreateTrustedTokenIssuer", // Reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/CreateTrustedTokenIssuerCommand/
        parameters: {
          Name: props.name,
          InstanceArn: props.instanceArn,
          TrustedTokenIssuerConfiguration: {
            OidcJwtConfiguration: {
              IssuerUrl: props.issuerUrl,
              ClaimAttributePath: "email",
              IdentityStoreAttributePath: "emails.value",
              JwksRetrievalOption: "OPEN_ID_DISCOVERY",
            },
          },
          TrustedTokenIssuerType: "OIDC_JWT",
        },
        physicalResourceId: customResources.PhysicalResourceId.fromResponse("TrustedTokenIssuerArn"),
      },
      onDelete: {
        service: "sso-admin",
        action: "DeleteTrustedTokenIssuer", // Reference https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/DeleteTrustedTokenIssuerCommand/
        parameters: {
          TrustedTokenIssuerArn: new customResources.PhysicalResourceIdReference(),
        },
      },
      onUpdate: {
        service: "sso-admin",
        action: "UpdateTrustedTokenIssuer", // Reference https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sso-admin/Class/UpdateTrustedTokenIssuerCommand/
        parameters: {
          Name: props.name,
          TrustedTokenIssuerArn: new customResources.PhysicalResourceIdReference(),
          TrustedTokenIssuerConfiguration: {
            OidcJwtConfiguration: {
              IssuerUrl: props.issuerUrl,
              ClaimAttributePath: "email",
              IdentityStoreAttributePath: "emails.value",
              JwksRetrievalOption: "OPEN_ID_DISCOVERY",
            },
          },
        },
      },
      policy: customResources.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["sso:CreateTrustedTokenIssuer", "sso:DeleteTrustedTokenIssuer", "sso:UpdateTrustedTokenIssuer"],
          resources: ["*"],
        }),
      ]),
    });

    // this.arn = trustTokenIssuer.getResponseField("TrustedTokenIssuerArn");
    const cfnTrustTokenIssuer = trustTokenIssuer.node.defaultChild as cdk.CustomResource;
    this.arn = cfnTrustTokenIssuer.ref;
  }
}
