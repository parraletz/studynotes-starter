import { Annotations, CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import {
  WebFunction,
  WebFunctionAuthType,
  WebFunctionCode,
  WebFunctionRuntime,
} from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));

export class StudyNotesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!existsSync(`${DIST}/index.cjs`)) {
      throw new Error("No existe dist/index.cjs. Corre `npm run build` (o usa `npm run deploy`, que lo hace por ti).");
    }

    // ── DynamoDB on-demand: sin tráfico pagas solo los centavos del almacenamiento ──
    const table = new TableV2(this, "Notes", {
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billing: Billing.onDemand(),
      removalPolicy: RemovalPolicy.DESTROY, // starter: `npm run destroy` deja la cuenta limpia
    });

    const logGroup = new LogGroup(this, "Logs", {
      retention: RetentionDays.ONE_WEEK, // logs viejos también cuestan
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── Lambda Web Function: tu servidor HTTP tal cual, escala a cero ──
    const web = new WebFunction(this, "Web", {
      code: WebFunctionCode.fromAssetToManagedBucket(DIST),
      runtime: WebFunctionRuntime.NODEJS_24_X,
      entryPoint: "index.cjs",
      environment: { TABLE_NAME: table.tableName, NODE_ENV: "production" },
      timeout: Duration.seconds(10),
      logGroup,
      // Público: la app decide quién puede qué. Ver "Seguridad" en el README.
      defaultEndpointAuth: WebFunctionAuthType.APPLICATION_MANAGED,
      defaultEndpoint: {
        // Guardarraíles de costo para quien empieza: como máximo 2 entornos
        // y 100 peticiones por segundo. Súbelos cuando de verdad los necesites.
        maxEnvironments: 2,
        rateLimit: 100,
      },
    });

    // Endpoint público a propósito (la UI debe abrirse en el navegador). Lo reconocemos
    // explícitamente para que la advertencia de CDK no se ignore por costumbre.
    Annotations.of(web.endpoint).acknowledgeWarning(
      "@aws-cdk/aws-lambda:webFunctionPublicEndpoint",
      "Starter: endpoint público; la app valida la entrada y aísla datos por x-user-id (demo, sin auth real).",
    );

    // Mínimo privilegio: lectura/escritura solo en esta tabla.
    table.grantReadWriteData(web);

    new CfnOutput(this, "Url", { value: `https://${web.endpoint.domainName}` });
    new CfnOutput(this, "TableName", { value: table.tableName });
  }
}
