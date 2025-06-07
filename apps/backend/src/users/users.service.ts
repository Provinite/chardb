import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUser, UpdateUser } from '../shared/types';

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
        isAdmin: true,
        privacySettings: true,
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
        isAdmin: true,
        privacySettings: true,
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
    const updateData = {
      ...updateUserDto,
      // Convert dateOfBirth string to Date if provided
      ...(updateUserDto.dateOfBirth && {
        dateOfBirth: new Date(updateUserDto.dateOfBirth)
      })
    };
    
    return this.db.user.update({
      where: { id },
      data: updateData,
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

  async remove(id: string) {
    await this.db.user.delete({
      where: { id },
    });
    return true;
  }
}