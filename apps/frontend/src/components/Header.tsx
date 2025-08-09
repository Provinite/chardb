import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const HeaderContainer = styled.header`
  background-color: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.md} 0;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Logo = styled(Link)`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const NavLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const UserMenu = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserInfo = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 0.8;
  }
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const Username = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">CharDB</Logo>
        
        <Nav>
          <NavLink to="/characters">Characters</NavLink>
          <NavLink to="/galleries">Galleries</NavLink>
          <NavLink to="/media">Media</NavLink>
          
          <ThemeToggle />
          
          {user ? (
            <UserMenu>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/character/create">Create</NavLink>
              <NavLink to="/upload">Upload</NavLink>
              <UserInfo to={`/user/${user.username}`}>
                {user.avatarUrl && <Avatar src={user.avatarUrl} alt={user.username} />}
                <Username>{user.displayName || user.username}</Username>
              </UserInfo>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </UserMenu>
          ) : (
            <UserMenu>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                Sign Up
              </Button>
            </UserMenu>
          )}
        </Nav>
      </HeaderContent>
    </HeaderContainer>
  );
};