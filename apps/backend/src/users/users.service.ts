import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUser, UpdateUser } from '@thclone/shared';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async create(createUserDto: CreateUser & { password: string }) {
    const { password, ...userData } = createUserDto;
    return this.db.user.create({
      data: {
        ...userData,
        passwordHash: password,
      },
    });
  }

  async findAll(limit = 20, offset = 0) {
    const users = await this.db.user.findMany({
      take: limit,
      skip: offset,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalCount = await this.db.user.count();

    return {
      nodes: users,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
    };
  }

  async findById(id: string) {
    return this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        dateOfBirth: true,
        isVerified: true,
        isAdmin: true,
        privacySettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByUsername(username: string) {
    return this.db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUser) {
    return this.db.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        dateOfBirth: true,
        isVerified: true,
        privacySettings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.db.user.delete({
      where: { id },
    });
    return true;
  }
}