import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { Alert } from '@chardb/ui';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
`;

const Message = styled.div`
  font-size: 1.125rem;
  color: ${props => props.theme.colors.text.secondary};
  text-align: center;
`;

const SuccessContainer = styled.div`
  max-width: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  text-align: center;
  margin: 0;
`;

const ViewLink = styled(Link)`
  display: inline-block;
  margin-top: 0.5rem;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const Spinner = styled.div`
  border: 3px solid ${props => props.theme.colors.border};
  border-top-color: ${props => props.theme.colors.primary};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export function DiscordCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedCharacters, setClaimedCharacters] = useState(0);
  const [claimedItems, setClaimedItems] = useState(0);
  const hasProcessed = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (hasProcessed.current) {
        return;
      }
      hasProcessed.current = true;

      const error = searchParams.get('error');
      const success = searchParams.get('success');
      const claimedChars = searchParams.get('claimedCharacters');
      const claimedItms = searchParams.get('claimedItems');

      setIsProcessing(false);

      if (error) {
        toast.error(`Failed to link Discord account: ${error}`);
        setTimeout(() => navigate('/profile/edit'), 2000);
      } else if (success) {
        const charsCount = parseInt(claimedChars || '0', 10);
        const itemsCount = parseInt(claimedItms || '0', 10);

        setClaimedCharacters(charsCount);
        setClaimedItems(itemsCount);

        if (charsCount > 0 || itemsCount > 0) {
          setShowSuccess(true);
          toast.success('Successfully linked Discord account and claimed pending items!');
          // Auto-redirect after 5 seconds
          setTimeout(() => navigate('/profile'), 5000);
        } else {
          toast.success('Successfully linked Discord account!');
          setTimeout(() => navigate('/profile/edit'), 2000);
        }
      } else {
        toast.error('Invalid callback response');
        setTimeout(() => navigate('/profile/edit'), 2000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  if (isProcessing) {
    return (
      <Container>
        <Spinner />
        <Message>Completing account linking...</Message>
      </Container>
    );
  }

  if (showSuccess) {
    return (
      <Container>
        <SuccessContainer>
          <Title>Discord Account Linked Successfully! 🎉</Title>

          <Alert variant="success">
            <div>
              <strong>Congratulations!</strong> You've claimed:
              <ul style={{ marginTop: '0.5rem', marginBottom: '0.5rem', paddingLeft: '1.5rem' }}>
                {claimedCharacters > 0 && (
                  <li>{claimedCharacters} character{claimedCharacters > 1 ? 's' : ''}</li>
                )}
                {claimedItems > 0 && (
                  <li>{claimedItems} item{claimedItems > 1 ? 's' : ''}</li>
                )}
              </ul>
              <ViewLink to="/profile">View Your Profile →</ViewLink>
            </div>
          </Alert>

          <Message>Redirecting to your profile...</Message>
        </SuccessContainer>
      </Container>
    );
  }

  return null;
}
