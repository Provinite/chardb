import { Module } from "@nestjs/common";
import { MailerModule, MailerOptions } from "@nestjs-modules/mailer";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { EmailService } from "./email.service";
import { TransportType } from "@nestjs-modules/mailer/dist/interfaces/mailer-options.interface";

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<MailerOptions> => {
        const smtpHost = configService.get<string>("SMTP_HOST");
        const awsRegion = configService.get<string>("AWS_REGION", "us-east-1");

        // If SMTP_HOST is configured, use SMTP (for development with MailHog)
        // Otherwise, use AWS SES with IAM role authentication (for production)
        const transport: TransportType = smtpHost
          ? {
              host: smtpHost,
              port: configService.get<number>("SMTP_PORT", 1025),
              secure: false,
              auth: configService.get<string>("SMTP_USER")
                ? {
                    user: configService.get<string>("SMTP_USER"),
                    pass: configService.get<string>("SMTP_PASSWORD"),
                  }
                : undefined,
            }
          : {
              SES: {
                sesClient: new SESv2Client({
                  region: awsRegion,
                  // Credentials automatically loaded from ECS task role
                }),
                SendEmailCommand: SendEmailCommand as any,
              },
            };

        return {
          transport,
          defaults: {
            from: configService.get<string>(
              "EMAIL_FROM",
              "noreply@example.com",
            ),
          },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
