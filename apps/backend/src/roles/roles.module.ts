import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesResolver } from './roles.resolver';
import { DatabaseModule } from '../database/database.module';
import { CommunitiesModule } from '../communities/communities.module';

@Module({
  imports: [DatabaseModule, CommunitiesModule],
  providers: [RolesResolver, RolesService],
  exports: [RolesService],
})
export class RolesModule {}
