import React from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { Button } from '@chardb/ui';

const SearchForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SearchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: flex-end;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  min-width: 150px;
  flex: 1;
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
  }
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const PriceGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const PriceInput = styled(Input)`
  width: 120px;
`;

const PriceSeparator = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

export interface AdvancedSearchFilters {
  search?: string;
  species?: string;
  gender?: string;
  ageRange?: string;
  minPrice?: number;
  maxPrice?: number;
  isSellable?: boolean;
  isTradeable?: boolean;
  sortBy?: string;
  sortOrder?: string;
  searchFields?: string;
}

interface AdvancedSearchFormProps {
  initialFilters?: AdvancedSearchFilters;
  onSearch: (filters: AdvancedSearchFilters) => void;
  onClear: () => void;
  loading?: boolean;
}

export const AdvancedSearchForm: React.FC<AdvancedSearchFormProps> = ({
  initialFilters = {},
  onSearch,
  onClear,
  loading = false,
}) => {
  const { register, handleSubmit, reset } = useForm<AdvancedSearchFilters>({
    defaultValues: {
      search: initialFilters.search || '',
      species: initialFilters.species || '',
      gender: initialFilters.gender || '',
      ageRange: initialFilters.ageRange || '',
      minPrice: initialFilters.minPrice,
      maxPrice: initialFilters.maxPrice,
      isSellable: initialFilters.isSellable,
      isTradeable: initialFilters.isTradeable,
      sortBy: initialFilters.sortBy || 'created',
      sortOrder: initialFilters.sortOrder || 'desc',
      searchFields: initialFilters.searchFields || 'all',
    },
  });

  const handleFormSubmit = (data: AdvancedSearchFilters) => {
    // Remove empty strings and undefined values
    const cleanFilters = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        acc[key as keyof AdvancedSearchFilters] = value;
      }
      return acc;
    }, {} as AdvancedSearchFilters);

    onSearch(cleanFilters);
  };

  const handleClear = () => {
    reset({
      search: '',
      species: '',
      gender: '',
      ageRange: '',
      minPrice: undefined,
      maxPrice: undefined,
      isSellable: undefined,
      isTradeable: undefined,
      sortBy: 'created',
      sortOrder: 'desc',
      searchFields: 'all',
    });
    onClear();
  };

  return (
    <SearchForm onSubmit={handleSubmit(handleFormSubmit)}>
      <SearchRow>
        <FormGroup style={{ flex: 2 }}>
          <Label htmlFor="search">Search Text</Label>
          <Input
            id="search"
            type="text"
            placeholder="Search characters..."
            {...register('search')}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="searchFields">Search In</Label>
          <Select id="searchFields" {...register('searchFields')}>
            <option value="all">All Fields</option>
            <option value="name">Name Only</option>
            <option value="description">Description Only</option>
            <option value="personality">Personality Only</option>
            <option value="backstory">Backstory Only</option>
          </Select>
        </FormGroup>
      </SearchRow>

      <SearchRow>
        <FormGroup>
          <Label htmlFor="species">Species</Label>
          <Input
            id="species"
            type="text"
            placeholder="e.g., Wolf, Cat, Dragon"
            {...register('species')}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="gender">Gender</Label>
          <Input
            id="gender"
            type="text"
            placeholder="e.g., Male, Female, Non-binary"
            {...register('gender')}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="ageRange">Age Range</Label>
          <Input
            id="ageRange"
            type="text"
            placeholder="e.g., Young, Adult, Elder"
            {...register('ageRange')}
          />
        </FormGroup>
      </SearchRow>

      <SearchRow>
        <FormGroup>
          <Label>Price Range</Label>
          <PriceGroup>
            <PriceInput
              type="number"
              placeholder="Min"
              min="0"
              step="0.01"
              {...register('minPrice', { valueAsNumber: true })}
            />
            <PriceSeparator>to</PriceSeparator>
            <PriceInput
              type="number"
              placeholder="Max"
              min="0"
              step="0.01"
              {...register('maxPrice', { valueAsNumber: true })}
            />
          </PriceGroup>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="isSellable">Status</Label>
          <Select
            id="isSellable"
            {...register('isSellable', { valueAsNumber: false })}
          >
            <option value="">Any Status</option>
            <option value="true">For Sale</option>
            <option value="false">Not For Sale</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="isTradeable">Trading</Label>
          <Select
            id="isTradeable"
            {...register('isTradeable', { valueAsNumber: false })}
          >
            <option value="">Any Trading</option>
            <option value="true">Open to Trades</option>
            <option value="false">Not Trading</option>
          </Select>
        </FormGroup>
      </SearchRow>

      <SearchRow>
        <FormGroup>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select id="sortBy" {...register('sortBy')}>
            <option value="created">Date Created</option>
            <option value="updated">Last Updated</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="sortOrder">Order</Label>
          <Select id="sortOrder" {...register('sortOrder')}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </Select>
        </FormGroup>
      </SearchRow>

      <ButtonRow>
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search Characters'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleClear}>
          Clear Filters
        </Button>
      </ButtonRow>
    </SearchForm>
  );
};

export default AdvancedSearchForm;
