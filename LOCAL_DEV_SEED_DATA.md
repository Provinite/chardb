# Local Development Seed Data

This document describes the test data available after running the persona seeding script. Use this as a reference for E2E testing, manual QA, and development.

## Quick Start

```bash
# Ensure backend is running
yarn dev:agent

# Run the seed script (in another terminal)
yarn workspace @chardb/database db:seed-personas
```

The script is **idempotent** - safe to run multiple times without creating duplicates.

---

## User Personas

All users share the same password: **`test123`**

### Credentials Table

| Persona | Email | Username | Password |
|---------|-------|----------|----------|
| Site Admin | `siteadmin@test.local` | `siteadmin` | `test123` |
| Community Admin | `communityadmin@test.local` | `communityadmin` | `test123` |
| Moderator | `moderator@test.local` | `moderator` | `test123` |
| Member | `member@test.local` | `member` | `test123` |
| Member (Registry Edit) | `member-registry@test.local` | `member-registry` | `test123` |
| Member (No Registry) | `member-noregistry@test.local` | `member-noregistry` | `test123` |

### Persona Details

#### Site Admin
- **Email:** `siteadmin@test.local`
- **Display Name:** Site Admin
- **Global Permissions:** All enabled
  - `isAdmin: true`
  - `canCreateCommunity: true`
  - `canListUsers: true`
  - `canListInviteCodes: true`
  - `canCreateInviteCode: true`
  - `canGrantGlobalPermissions: true`
- **Community Role:** Admin (in "Test Community")
- **Use Case:** Testing admin-only features, system configuration, user management

#### Community Admin
- **Email:** `communityadmin@test.local`
- **Display Name:** Community Admin
- **Global Permissions:** None (default user)
- **Community Role:** Admin (in "Test Community")
- **Use Case:** Testing community administration without site-wide privileges

#### Moderator
- **Email:** `moderator@test.local`
- **Display Name:** Moderator
- **Global Permissions:** None
- **Community Role:** Moderator (in "Test Community")
- **Use Case:** Testing moderation features, content editing across users

#### Member
- **Email:** `member@test.local`
- **Display Name:** Member
- **Global Permissions:** None
- **Community Role:** Member (in "Test Community")
- **Use Case:** Testing standard user experience, basic character creation

#### Member (Registry Edit)
- **Email:** `member-registry@test.local`
- **Display Name:** Member (Registry Edit)
- **Global Permissions:** None
- **Community Role:** Custom "Member (Registry Edit)" role
- **Special Permission:** `canEditOwnCharacterRegistry: true`
- **Use Case:** Testing registry field editing (species variant, traits) on own characters

#### Member (No Registry)
- **Email:** `member-noregistry@test.local`
- **Display Name:** Member (No Registry)
- **Global Permissions:** None
- **Community Role:** Custom "Member (No Registry)" role
- **Special Permission:** `canEditOwnCharacterRegistry: false`
- **Use Case:** Testing that users WITHOUT registry permission cannot edit species/variant/traits

---

## Community Structure

### Test Community

**Name:** `Test Community`

The test community is created with the following default roles plus two custom roles:

### Roles

| Role | Created By | Description |
|------|------------|-------------|
| Admin | Default | Full community permissions |
| Moderator | Default | Content moderation, can edit others' characters |
| Member | Default | Basic permissions, can create/edit own characters |
| Member (Registry Edit) | Custom | Member + can edit own character registry fields |
| Member (No Registry) | Custom | Member without registry edit permission |

### Role Permission Matrix

| Permission | Admin | Moderator | Member | Member (Registry Edit) | Member (No Registry) |
|------------|:-----:|:---------:|:------:|:---------------------:|:-------------------:|
| `canCreateCharacter` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `canEditOwnCharacter` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `canEditCharacter` | ✓ | ✓ | - | - | - |
| `canEditOwnCharacterRegistry` | ✓ | ✓ | - | ✓ | - |
| `canEditCharacterRegistry` | ✓ | ✓ | - | - | - |
| `canUploadOwnCharacterImages` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `canUploadCharacterImages` | ✓ | ✓ | - | - | - |
| `canCreateSpecies` | ✓ | - | - | - | - |
| `canEditSpecies` | ✓ | ✓ | - | - | - |
| `canCreateRole` | ✓ | - | - | - | - |
| `canEditRole` | ✓ | - | - | - | - |
| `canManageMemberRoles` | ✓ | - | - | - | - |
| `canRemoveCommunityMember` | ✓ | - | - | - | - |
| `canCreateInviteCode` | ✓ | - | - | - | - |
| `canListInviteCodes` | ✓ | - | - | - | - |
| `canManageItems` | ✓ | - | - | - | - |
| `canGrantItems` | ✓ | ✓ | - | - | - |

---

## Sample Data

### Species

| Name | Community | Variants |
|------|-----------|----------|
| Test Species | Test Community | Standard |

### Species Variants

| Variant Name | Species | Color |
|--------------|---------|-------|
| Standard | Test Species | None |

### Characters

All sample characters are owned by **Site Admin** (created via the authenticated GraphQL endpoint).

| Character Name | Species | Variant | Owner |
|----------------|---------|---------|-------|
| Site Admin's Character | Test Species | Standard | Site Admin |
| Community Admin's Character | Test Species | Standard | Site Admin |
| Moderator's Character | Test Species | Standard | Site Admin |
| Member's Character | Test Species | Standard | Site Admin |
| Member (Registry Edit)'s Character | Test Species | Standard | Site Admin |
| Member (No Registry)'s Character | Test Species | Standard | Site Admin |

> **Note:** For proper ownership testing, create characters while logged in as each individual persona. The seeded characters are all owned by Site Admin because they're created through the Site Admin's authenticated session.

---

## Testing Scenarios

### Registry Permission Testing

1. **Login as `member-registry@test.local`**
   - Create a new character with Test Species / Standard variant
   - Verify user CAN edit the species variant and registry ID on their own character
   - Verify user CANNOT edit registry fields on characters they don't own

2. **Login as `member-noregistry@test.local`**
   - Create a new character with Test Species / Standard variant
   - Verify user CANNOT edit the species variant or registry ID (even on their own character)
   - Verify user CAN still edit other profile fields (name, bio, etc.)

3. **Login as `moderator@test.local`**
   - Verify user CAN edit registry fields on ANY character (including others' characters)

### Permission Escalation Testing

1. Login as `member@test.local` and verify CANNOT:
   - Create species
   - Edit roles
   - Manage other users' roles
   - Edit other users' characters

2. Login as `communityadmin@test.local` and verify CAN:
   - Perform all community admin actions
   - But CANNOT access site-wide admin features (user list, global permissions)

3. Login as `siteadmin@test.local` and verify CAN:
   - Access all features including site admin panel
   - List all users
   - Grant global permissions

---

## GraphQL Testing

### Login Mutation

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
  }
}

# Variables:
{
  "input": {
    "email": "member-registry@test.local",
    "password": "test123"
  }
}
```

### Verify Current User Permissions

```graphql
query Me {
  me {
    id
    username
    email
    isAdmin
    canCreateCommunity
    canListUsers
    communityMemberships {
      role {
        name
        canEditOwnCharacterRegistry
        canEditCharacterRegistry
      }
    }
  }
}
```

---

## Resetting Test Data

To reset to a fresh state:

```bash
# Reset the database (drops all data)
yarn workspace @chardb/database db:push --force-reset

# Re-run the seed script
yarn workspace @chardb/database db:seed-personas
```

---

## Script Options

```bash
# Full seed (users, community, roles, species, characters)
yarn workspace @chardb/database db:seed-personas

# Skip sample data (only create users, community, roles)
yarn workspace @chardb/database db:seed-personas --skip-sample-data
```

---

## Troubleshooting

### "HTTP error: 400" during seeding

The backend must be running before executing the seed script:
```bash
yarn dev:agent  # Start backend first
```

### "User already exists" errors

The script is idempotent. If you see "exists" messages, that's expected behavior on subsequent runs.

### Need a completely fresh database

```bash
yarn workspace @chardb/database db:push --force-reset
yarn workspace @chardb/database db:seed-personas
```

---

## Related Documentation

- [README.md](./README.md) - Project overview
- [TEST_WORKFLOWS.md](./TEST_WORKFLOWS.md) - Testing workflows
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
