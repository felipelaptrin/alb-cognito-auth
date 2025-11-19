import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { WorkloadConfig } from "./config";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as alb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";

export interface NetworkStackProps extends cdk.StackProps {
  config: WorkloadConfig;
}

export class WorkloadStack extends cdk.Stack {
  config: WorkloadConfig;
  domain: route53.IPublicHostedZone;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.config = props.config;
    this.domain = route53.PublicHostedZone.fromLookup(this, "PublicHostedZone", {
      domainName: props.config.domainName,
    });

    const vpc = this.createVpc();

    const cluster = this.createEcsCluster(vpc);
    const { publicAlb, httpsListener } = this.createPublicAlb(vpc);
    this.createAuthlessFargateApp(vpc, cluster, publicAlb, httpsListener);
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
      internetFacing: true,
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

  createAuthlessFargateApp(
    vpc: ec2.Vpc,
    cluster: ecs.Cluster,
    publicAlb: alb.ApplicationLoadBalancer,
    httpsListener: alb.ApplicationListener,
  ) {
    const FULL_APP_HOST = `${this.config.appSubdomain}.${this.config.domainName}`;

    const taskDefinition = new ecs.TaskDefinition(this, "AuthlessAppTaskDefinition", {
      cpu: "512",
      memoryMiB: "1024",
      compatibility: ecs.Compatibility.FARGATE,
    });
    taskDefinition.addContainer("nginx", {
      portMappings: [{ containerPort: 80 }],
      image: ecs.ContainerImage.fromRegistry("nginx:latest"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "nginx",
      }),
    });

    const fargateService = new ecs.FargateService(this, "AuthlessFargateService", {
      cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }),
    });
    fargateService.taskDefinition.executionRole?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
    );

    const targetGroup = new alb.ApplicationTargetGroup(this, "AuthlessAppTargetGroup", {
      vpc,
      targetType: alb.TargetType.IP,
      protocol: alb.ApplicationProtocol.HTTP,
      port: 80,
      targets: [fargateService],
      deregistrationDelay: cdk.Duration.seconds(10),
    });
    httpsListener.addAction("AuthlessAppRule", {
      priority: 1,
      action: alb.ListenerAction.forward([targetGroup]),
      conditions: [alb.ListenerCondition.hostHeaders([FULL_APP_HOST])],
    });

    new route53.ARecord(this, "AuthlessAppRecord", {
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(publicAlb)),
      zone: this.domain,
      recordName: FULL_APP_HOST,
    });
  }
}
