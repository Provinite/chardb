import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserConnection } from './entities/user.entity';
import { UserProfile, UserStats } from './entities/user-profile.entity';
import { UpdateUserInput } from './dto/update-user.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserConnection, { name: 'users' })
  async findAll(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ): Promise<UserConnection> {
    return this.usersService.findAll(limit, offset);
  }

  @Query(() => User, { name: 'user', nullable: true })
  async findOne(
    @Args('id', { type: () => ID, nullable: true }) id?: string,
    @Args('username', { nullable: true }) username?: string,
  ): Promise<User | null> {
    if (id) {
      return this.usersService.findById(id);
    }
    if (username) {
      return this.usersService.findByUsername(username);
    }
    throw new Error('Either id or username must be provided');
  }

  @Query(() => User, { name: 'me' })
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findById(user.id);
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Args('input') updateUserInput: UpdateUserInput,
    @CurrentUser() user: User,
  ): Promise<User> {
    return this.usersService.update(user.id, updateUserInput);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@CurrentUser() user: User): Promise<boolean> {
    return this.usersService.remove(user.id);
  }

  @Query(() => UserProfile, { name: 'userProfile', nullable: true })
  async getUserProfile(
    @Args('username') username: string,
    @CurrentUser() currentUser?: User,
  ): Promise<UserProfile | null> {
    return this.usersService.getUserProfile(username, currentUser?.id);
  }

  @Query(() => UserStats, { name: 'userStats' })
  async getUserStats(
    @Args('userId', { type: () => ID }) userId: string,
    @CurrentUser() currentUser?: User,
  ): Promise<UserStats> {
    const includePrivate = currentUser?.id === userId || currentUser?.isAdmin;
    return this.usersService.getUserStats(userId, includePrivate);
  }
}