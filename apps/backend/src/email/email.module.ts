import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EmailService } from './email.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const isDevelopment = nodeEnv === 'development';

        return {
          transport: {
            host: configService.get<string>('SMTP_HOST', 'localhost'),
            port: configService.get<number>('SMTP_PORT', 1025),
            secure: false, // true for 465, false for other ports (MailHog uses 1025)
            auth: isDevelopment
              ? undefined // MailHog doesn't require authentication
              : {
                  // AWS SES SMTP credentials would go here in production
                  // For now, we'll use nodemailer's SES transport in the service
                  user: configService.get<string>('SMTP_USER'),
                  pass: configService.get<string>('SMTP_PASSWORD'),
                },
          },
          defaults: {
            from: configService.get<string>(
              'EMAIL_FROM',
              'noreply@example.com',
            ),
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
