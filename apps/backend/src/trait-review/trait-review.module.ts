import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TraitReviewService } from './trait-review.service';
import { TraitReviewResolver } from './trait-review.resolver';
import { TraitReviewCharacterResolver } from './trait-review-character.resolver';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [TraitReviewService, TraitReviewResolver, TraitReviewCharacterResolver],
  exports: [TraitReviewService],
})
export class TraitReviewModule {}
