import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
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

      if (error) {
        toast.error(`Failed to link DeviantArt account: ${error}`);
      } else if (success) {
        toast.success('Successfully linked DeviantArt account!');
      } else {
        toast.error('Invalid callback response');
      }

      setIsProcessing(false);
      navigate('/profile/edit');
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <Container>
      {isProcessing && (
        <>
          <Spinner />
          <Message>Completing account linking...</Message>
        </>
      )}
    </Container>
  );
}
