import React, { useState, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Button } from '@thclone/ui';

const UploadContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isDragActive', 'hasError'].includes(prop),
})<{ isDragActive: boolean; hasError: boolean }>`
  border: 2px dashed ${({ theme, isDragActive, hasError }) => 
    hasError ? theme.colors.error : 
    isDragActive ? theme.colors.primary : 
    theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background-color: ${({ theme, isDragActive }) => 
    isDragActive ? `${theme.colors.primary}10` : theme.colors.surface};
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
    background-color: ${({ theme }) => `${theme.colors.primary}05`};
  }
`;

const UploadIcon = styled.div`
  font-size: 48px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const UploadText = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const UploadSubtext = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const PreviewContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const PreviewItem = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`;

const PreviewOverlay = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: ${({ theme }) => theme.spacing.xs};
`;

const RemoveButton = styled.button`
  background: ${({ theme }) => theme.colors.error};
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  
  &:hover {
    background: ${({ theme }) => theme.colors.error};
    opacity: 0.8;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

export interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

interface ImageUploadProps {
  files: ImageFile[];
  onFilesChange: (files: ImageFile[]) => void;
  onUpload?: (files: ImageFile[]) => Promise<void>;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  uploading?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  files,
  onFilesChange,
  onUpload,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  disabled = false,
  uploading = false,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} not supported. Allowed types: ${acceptedTypes.join(', ')}`;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB}MB`;
    }
    
    return null;
  };

  const processFiles = useCallback((fileList: FileList) => {
    setError('');
    const newFiles: ImageFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      if (files.length + newFiles.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        break;
      }
      
      const validation = validateFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      
      const preview = URL.createObjectURL(file);
      newFiles.push({
        file,
        preview,
        id: Math.random().toString(36).substring(7),
      });
    }
    
    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
  }, [files, maxFiles, onFilesChange, acceptedTypes, maxSizeMB]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [disabled, processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [processFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const removeFile = useCallback((id: string) => {
    const updatedFiles = files.filter(file => {
      if (file.id === id) {
        URL.revokeObjectURL(file.preview);
        return false;
      }
      return true;
    });
    onFilesChange(updatedFiles);
  }, [files, onFilesChange]);

  const handleUpload = useCallback(async () => {
    if (onUpload && files.length > 0) {
      try {
        setError('');
        await onUpload(files);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }
  }, [onUpload, files]);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.preview));
    };
  }, [files]);

  return (
    <div>
      <UploadContainer
        isDragActive={isDragActive}
        hasError={!!error}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <UploadIcon>📁</UploadIcon>
        <UploadText>
          {isDragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
        </UploadText>
        <UploadSubtext>
          Supports: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} (max {maxSizeMB}MB each)
        </UploadSubtext>
        
        <HiddenInput
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
        />
      </UploadContainer>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {files.length > 0 && (
        <PreviewContainer>
          {files.map((imageFile) => (
            <PreviewItem key={imageFile.id}>
              <PreviewImage src={imageFile.preview} alt="Preview" />
              <PreviewOverlay>
                <RemoveButton
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(imageFile.id);
                  }}
                  type="button"
                >
                  ×
                </RemoveButton>
              </PreviewOverlay>
            </PreviewItem>
          ))}
        </PreviewContainer>
      )}

      {onUpload && files.length > 0 && (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Button
            onClick={handleUpload}
            disabled={disabled || uploading}
            variant="primary"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
};