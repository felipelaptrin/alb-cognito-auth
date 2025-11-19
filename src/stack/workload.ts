import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { WorkloadConfig } from "../config";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as alb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as albActions from "aws-cdk-lib/aws-elasticloadbalancingv2-actions";

export interface NetworkStackProps extends cdk.StackProps {
  config: WorkloadConfig;
}

interface IUserPool {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  userPoolDomain: cognito.UserPoolDomain;
}

export class WorkloadStack extends cdk.Stack {
  config: WorkloadConfig;
  domain: route53.IPublicHostedZone;
  certificate: acm.Certificate;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.config = props.config;
    this.domain = route53.PublicHostedZone.fromLookup(this, "PublicHostedZone", {
      domainName: props.config.domainName,
    });
    this.certificate = new acm.Certificate(this, "WildcardCertificate", {
      domainName: this.config.domainName,
      subjectAlternativeNames: [`*.${this.config.domainName}`],
      validation: acm.CertificateValidation.fromDns(this.domain),
    });

    const vpc = this.createVpc();

    const cluster = this.createEcsCluster(vpc);
    const { publicAlb, httpsListener } = this.createPublicAlb(vpc);
    const userPool = this.createCognitoAuth();
    this.createAuthlessFargateApp(vpc, cluster, publicAlb, httpsListener, userPool);
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
    const publicAlb = new alb.ApplicationLoadBalancer(this, "PublicAlb", {
      vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      internetFacing: true,
    });
    publicAlb.addRedirect();
    const httpsListener = publicAlb.addListener("HttpsListener", {
      protocol: alb.ApplicationProtocol.HTTPS,
      sslPolicy: alb.SslPolicy.RECOMMENDED_TLS,
      port: 443,
      defaultAction: alb.ListenerAction.fixedResponse(404, {
        messageBody: "No services configured",
      }),
      certificates: [this.certificate],
    });

    return {
      publicAlb,
      httpsListener,
    };
  }

  createCognitoAuth(): IUserPool {
    const COGNITO_DOMAIN = `auth.${this.config.domainName}`;

    // Reference: https://repost.aws/knowledge-center/cognito-custom-domain-errors
    const dummyARecordParentDomain = new route53.ARecord(this, "CognitoAuthDummyARecord", {
      zone: this.domain,
      recordName: "",
      target: route53.RecordTarget.fromIpAddresses("8.8.8.8"),
    });

    const userPool = new cognito.UserPool(this, "CognitoAuthUserPool", {
      selfSignUpEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      signInAliases: {
        email: true,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    userPool.node.addDependency(dummyARecordParentDomain);

    const userPoolDomain = new cognito.UserPoolDomain(this, "CognitoAuthUserPoolDomain", {
      userPool,
      customDomain: {
        certificate: this.certificate,
        domainName: COGNITO_DOMAIN,
      },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });
    userPoolDomain.node.addDependency(dummyARecordParentDomain);

    const userPoolClient = new cognito.UserPoolClient(this, "CognitoAuthClient", {
      userPool,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: [
          `https://${this.config.appSubdomain}.${this.config.domainName}/oauth2/idpresponse`,
          `https://${this.config.appSubdomain}.${this.config.domainName}`,
        ],
        logoutUrls: [`https://${this.config.appSubdomain}.${this.config.domainName}`],
      },
      generateSecret: true,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    new route53.ARecord(this, "CognitoAuthAliasRecord", {
      zone: this.domain,
      recordName: COGNITO_DOMAIN,
      target: route53.RecordTarget.fromAlias(new route53Targets.UserPoolDomainTarget(userPoolDomain)),
    });

    return {
      userPool,
      userPoolClient,
      userPoolDomain,
    };
  }

  createAuthlessFargateApp(
    vpc: ec2.Vpc,
    cluster: ecs.Cluster,
    publicAlb: alb.ApplicationLoadBalancer,
    httpsListener: alb.ApplicationListener,
    userPool: IUserPool,
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

    const targetGroup = new alb.ApplicationTargetGroup(this, "AppTargetGroup", {
      vpc,
      targetType: alb.TargetType.IP,
      protocol: alb.ApplicationProtocol.HTTP,
      port: 80,
      targets: [fargateService],
      deregistrationDelay: cdk.Duration.seconds(10),
    });

    const action = new albActions.AuthenticateCognitoAction({
      userPool: userPool.userPool,
      userPoolClient: userPool.userPoolClient,
      userPoolDomain: userPool.userPoolDomain,
      next: alb.ListenerAction.forward([targetGroup]),
    });
    httpsListener.addAction("AppRule", {
      priority: 1,
      action,
      conditions: [alb.ListenerCondition.hostHeaders([FULL_APP_HOST])],
    });

    new route53.ARecord(this, "AuthlessAppRecord", {
      target: route53.RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(publicAlb)),
      zone: this.domain,
      recordName: FULL_APP_HOST,
    });
  }
}
