import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Settings, Users, Shield, Database, Activity } from 'lucide-react';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const AdminCard = styled(Link)`
  display: block;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg};
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: white;
`;

const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const CardDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1.5;
  margin: 0;
`;

const StatsCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.lg};
`;

const StatsTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export function SiteAdminPage() {
  return (
    <Container>
      <Header>
        <Title>Site Administration</Title>
        <Subtitle>Manage system-wide settings, users, and communities</Subtitle>
      </Header>
      
      <Grid>
        <AdminCard to="/admin/site-invite-codes">
          <CardIcon>
            <Shield size={24} />
          </CardIcon>
          <CardTitle>Site Invite Codes</CardTitle>
          <CardDescription>
            Manage system-wide invitation codes and user registration
          </CardDescription>
        </AdminCard>

        <AdminCard to="/admin/users">
          <CardIcon>
            <Users size={24} />
          </CardIcon>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage users across all communities
          </CardDescription>
        </AdminCard>

        <AdminCard to="/admin/communities">
          <CardIcon>
            <Database size={24} />
          </CardIcon>
          <CardTitle>Community Oversight</CardTitle>
          <CardDescription>
            Monitor and manage all communities
          </CardDescription>
        </AdminCard>

        <AdminCard to="/admin/system">
          <CardIcon>
            <Settings size={24} />
          </CardIcon>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            Site-level settings and configuration
          </CardDescription>
        </AdminCard>

        <AdminCard to="/admin/audit">
          <CardIcon>
            <Activity size={24} />
          </CardIcon>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            Security monitoring and activity logs
          </CardDescription>
        </AdminCard>
      </Grid>

      <StatsCard>
        <StatsTitle>Quick Stats</StatsTitle>
        <StatsGrid>
          <StatItem>
            <StatLabel>Total Users</StatLabel>
            <StatValue>--</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Communities</StatLabel>
            <StatValue>--</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Active Invites</StatLabel>
            <StatValue>--</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Characters</StatLabel>
            <StatValue>--</StatValue>
          </StatItem>
        </StatsGrid>
      </StatsCard>
    </Container>
  );
}