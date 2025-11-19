import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { WorkloadConfig } from "./config";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as alb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { IPublicHostedZone, PublicHostedZone } from "aws-cdk-lib/aws-route53";

export interface NetworkStackProps extends cdk.StackProps {
  config: WorkloadConfig;
}

export class WorkloadStack extends cdk.Stack {
  config: WorkloadConfig;
  domain: IPublicHostedZone;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.config = props.config;
    this.domain = PublicHostedZone.fromLookup(this, "PublicHostedZone", {
      domainName: props.config.domainName,
    });

    const vpc = this.createVpc();

    this.createEcsCluster(vpc);
    this.createPublicAlb(vpc);
  }

  createVpc(): ec2.Vpc {
    const vpc = new ec2.Vpc(this, "Vpc", {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: "isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      natGateways: 1, // It reduces costs but also reduces HA
      maxAzs: this.config.maxAzs,
    });
    return vpc;
  }

  createEcsCluster(vpc: ec2.Vpc): ecs.Cluster {
    return new ecs.Cluster(this, "EcsCluster", {
      vpc,
      enableFargateCapacityProviders: true,
    });
  }

  createPublicAlb(vpc: ec2.Vpc): {
    publicAlb: alb.ApplicationLoadBalancer;
    httpsListener: alb.ApplicationListener;
  } {
    const certificate = new acm.Certificate(this, "WildcardCertificate", {
      domainName: this.config.domainName,
      subjectAlternativeNames: [`*.${this.config.domainName}`],
      validation: acm.CertificateValidation.fromDns(this.domain),
    });

    const publicAlb = new alb.ApplicationLoadBalancer(this, "PublicAlb", {
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
    });
    const httpsListener = publicAlb.addListener("HttpsListener", {
      protocol: alb.ApplicationProtocol.HTTPS,
      sslPolicy: alb.SslPolicy.RECOMMENDED_TLS,
      port: 443,
      defaultAction: alb.ListenerAction.fixedResponse(404, {
        messageBody: "No services configured",
      }),
      certificates: [certificate],
    });
    publicAlb.addRedirect();

    return {
      publicAlb,
      httpsListener,
    };
  }
}
