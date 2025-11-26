# Auth Proxy

## How to deploy

1) Install dependencies

You can use [mise](https://mise.jdx.dev/) to install all developer dependencies.

```sh
mise install
```

Then, install nodeJS dependencies:

```sh
yarn
```

2) Export AWS credentials to connect to the Shared Assets account in our console

3) Change the config values to fit your use-case

Change the `src/config/config.dev.ts` to fit your use-case. The parameter `samlMetadataUrl` is optional and if not provided the authentication will be via Cognito User Pool, otherwise, if the parameter is passed the authentication will be via SAML 2.0 using IAM Identity Center as IdP.

:warning: The AWS [does not support creating Identity Center applications](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sso-application.html#cfn-sso-application-status) programatically, meaning that the application should be created manually. I suggest first deploying the application without the `samlMetadataUrl` parameter, then proceding to add it. This will be explained on the following steps.

4) Go to your application endpoint and check if it's redirecting you to log in via Cognito User Pool.

![Cognito User Pool login](./docs/login-cognito.png)

You can create a user in the user pool and validate that this user can actually login in the application.

5) Deploy the `DevWorkloadStack`

```sh
yarn cdk deploy DevWorkloadStack
```

After the deployment, go to the AWS Console > CloudFormation > `DevWorkloadStack` > Resources > Copy the Physical ID of the `CognitoAuthUserPool` resource. We are going to use it on step 8.

6) Go to the AWS Identity Center

![Creating an application in AWS Identity Center](./docs/01-create-app.png)

7) Select Application of type SAML 2.0

![Selecting type of the application to be SAML 2.0](./docs/02-select-application-type.png)

8) Configure the SAML 2.0 Application

![Configure the SAML 2.0 Application](./docs/03-configure-saml.png)

- The `Application Start URL` should be set to: `https://{appSubdomain}.{domainName}`
- The `Application ACS URL` should be set to: `https://{appSubdomain}.{domainName}/saml2/idpresponse`. The Cognito [documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/saml2-idpresponse-endpoint.html) specificies the `/saml2/idpresponse` path.
- The `Application SAML audience` should be set to: `urn:amazon:cognito:sp:{awsRegion}:{userPoolId}` based on the Cognito [documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-integrating-3rd-party-saml-providers.html).

Make sure to substitute the variable in the brackets to the correct value:
- `{appSubdomain}`: The value used in your `src/config/config.dev.ts` file
- `{domainName}`: The value used in your `src/config/config.dev.ts` file
- `{awsRegion}`: The value used in your `src/config/config.dev.ts` file (env.region).
- `{userPoolId}`: The value you copied on step 4.

Copy the `IAM Identity Center SAML metadata Url` to use on the following step.

9) Edit attribute mapping

![Editing Attribute mappings](./docs/attribute-mappings.png)

Map:
- `Subject` to `${user:subject}` with `persistent` format.
- `email` to `${user:email} with `basic` format.

10) Deploy the stack with the `samlMetadataUrl`

Add the `samlMetadataUrl` parameter to the `src/config/config.dev.ts` and then deploy the stack again:

```sh
yarn cdk deploy DevWorkloadStack
```

11) Assign the Application to the identity center user

![User assignment](./docs/user-assignment.png)

12) Go to your application endpoint and check if it's redirecting you to log in via Identity Center.

:warning: Even after the deployment is successful, it might take a couple of minutes Cognito redirect to Identity Center.

![Identity Center Login](./docs/identity-center-login.png)

13) Check if application is accessible after the log in

![Application page](./docs/application.png)


I was following: https://aws.amazon.com/blogs/security/how-to-implement-trusted-identity-propagation-for-applications-protected-by-amazon-cognito/




Application start URL: https://app.demosfelipetrindade.lap
Application ACS URL: https://auth.demosfelipetrindade.lat/saml2/idpresponse
Application SAML audience: urn:amazon:cognito:sp:us-east-1_00vmtTN4Z