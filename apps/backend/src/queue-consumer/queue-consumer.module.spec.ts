import { ConfigService } from "@nestjs/config";
import { sqsModuleFactory } from "./queue-consumer.module";

function makeConfig(vars: Record<string, string>): ConfigService {
  return {
    get: (key: string, defaultValue?: string) => vars[key] ?? defaultValue,
  } as unknown as ConfigService;
}

describe("sqsModuleFactory", () => {
  const baseVars = {
    AWS_SQS_QUEUE_URL: "http://localhost:4566/000000000000/chardb-prize-distribution",
    AWS_REGION: "us-east-1",
  };

  it('enables consumer when AWS_SQS_ENABLED is "true"', () => {
    const config = makeConfig({ ...baseVars, AWS_SQS_ENABLED: "true" });
    const result = sqsModuleFactory(config);
    expect(result.consumers).toHaveLength(1);
  });

  it("enables consumer when AWS_SQS_ENABLED is absent (default true)", () => {
    const config = makeConfig({ ...baseVars });
    const result = sqsModuleFactory(config);
    expect(result.consumers).toHaveLength(1);
  });

  it('disables consumer when AWS_SQS_ENABLED is the string "false"', () => {
    // Regression: ConfigService.get<boolean>() returns the raw string "false",
    // which is truthy — must compare as string, not coerce via generic.
    const config = makeConfig({ ...baseVars, AWS_SQS_ENABLED: "false" });
    const result = sqsModuleFactory(config);
    expect(result.consumers).toHaveLength(0);
  });

  it("disables consumer when AWS_SQS_QUEUE_URL is absent", () => {
    const config = makeConfig({ AWS_SQS_ENABLED: "true" });
    const result = sqsModuleFactory(config);
    expect(result.consumers).toHaveLength(0);
  });

  it("passes queue URL and region through to consumer config", () => {
    const config = makeConfig({ ...baseVars, AWS_SQS_ENABLED: "true" });
    const result = sqsModuleFactory(config);
    expect(result.consumers[0].queueUrl).toBe(baseVars.AWS_SQS_QUEUE_URL);
    expect(result.consumers[0].region).toBe("us-east-1");
  });
});
