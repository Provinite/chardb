import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useMutation } from '@apollo/client';
import { LINK_EXTERNAL_ACCOUNT } from '../graphql/external-accounts.graphql';
import toast from 'react-hot-toast';

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

export function DeviantArtCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [linkExternalAccount] = useMutation(LINK_EXTERNAL_ACCOUNT);
  const [isProcessing, setIsProcessing] = useState(true);
  const hasProcessed = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (hasProcessed.current) {
        return;
      }
      hasProcessed.current = true;
      const error = searchParams.get('error');
      const success = searchParams.get('success');
      const providerAccountId = searchParams.get('providerAccountId');
      const displayName = searchParams.get('displayName');

      if (error) {
        toast.error(`Failed to link DeviantArt account: ${error}`);
        navigate('/profile/edit');
        return;
      }

      if (success && providerAccountId && displayName) {
        try {
          await linkExternalAccount({
            variables: {
              input: {
                provider: 'DEVIANTART',
                providerAccountId: decodeURIComponent(providerAccountId),
                displayName: decodeURIComponent(displayName),
              },
            },
          });

          toast.success('Successfully linked DeviantArt account!');
          navigate('/profile/edit');
        } catch (err: any) {
          console.error('Error linking account:', err);
          toast.error(err.message || 'Failed to link DeviantArt account');
          navigate('/profile/edit');
        }
      } else {
        toast.error('Invalid callback parameters');
        navigate('/profile/edit');
      }

      setIsProcessing(false);
    };

    processCallback();
  }, [searchParams, linkExternalAccount, navigate]);

  return (
    <Container>
      {isProcessing && (
        <>
          <Spinner />
          <Message>Linking your DeviantArt account...</Message>
        </>
      )}
    </Container>
  );
}
