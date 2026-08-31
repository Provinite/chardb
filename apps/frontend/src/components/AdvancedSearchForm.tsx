import React from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { Button } from "@chardb/ui";
import { AVAILABILITY_KINDS } from "../lib/characterAvailability";
import { CharacterAvailability } from "../generated/graphql";

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

const CheckboxRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  input {
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
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
  ageRange?: string;
  minPrice?: number;
  maxPrice?: number;
  isSellable?: boolean;
  isTradeable?: boolean;
  /** Any of these, not all -- a row of checkboxes. */
  availability?: CharacterAvailability[];
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
      search: initialFilters.search || "",
      ageRange: initialFilters.ageRange || "",
      minPrice: initialFilters.minPrice,
      maxPrice: initialFilters.maxPrice,
      isSellable: initialFilters.isSellable,
      isTradeable: initialFilters.isTradeable,
      availability: initialFilters.availability ?? [],
      sortBy: initialFilters.sortBy || "created",
      sortOrder: initialFilters.sortOrder || "desc",
      searchFields: initialFilters.searchFields || "all",
    },
  });

  const handleFormSubmit = (data: AdvancedSearchFilters) => {
    // Remove empty strings and undefined values
    const cleanFilters = Object.entries(data).reduce((acc, [key, value]) => {
      if (
        value !== "" &&
        value !== undefined &&
        value !== null &&
        !(typeof value === "number" && isNaN(value)) &&
        // An unticked row is no filter rather than one matching nothing, so
        // the empty array has to be dropped like an empty string is.
        !(Array.isArray(value) && value.length === 0)
      ) {
        acc[key as keyof AdvancedSearchFilters] = value;
      }
      return acc;
    }, {} as AdvancedSearchFilters);

    onSearch(cleanFilters);
  };

  const handleClear = () => {
    reset({
      search: "",
      ageRange: "",
      minPrice: undefined,
      maxPrice: undefined,
      isSellable: undefined,
      isTradeable: undefined,
      availability: [],
      sortBy: "created",
      sortOrder: "desc",
      searchFields: "all",
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
            {...register("search")}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="searchFields">Search In</Label>
          <Select id="searchFields" {...register("searchFields")}>
            <option value="all">All Fields</option>
            <option value="name">Name Only</option>
            <option value="details">Details Only</option>
          </Select>
        </FormGroup>
      </SearchRow>

      <SearchRow>
        <FormGroup>
          <Label htmlFor="ageRange">Age Range</Label>
          <Input
            id="ageRange"
            type="text"
            placeholder="e.g., Young, Adult, Elder"
            {...register("ageRange")}
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
              {...register("minPrice", { valueAsNumber: true })}
            />
            <PriceSeparator>to</PriceSeparator>
            <PriceInput
              type="number"
              placeholder="Max"
              min="0"
              step="0.01"
              {...register("maxPrice", { valueAsNumber: true })}
            />
          </PriceGroup>
        </FormGroup>

      </SearchRow>

      {/* A row of checkboxes rather than the two dropdowns this replaced.
          Ticking several means "any of these", which is the question people
          actually browse with -- "show me anything free or up for offers" is
          one search, and a pair of single-select dropdowns could not ask it. */}
      <FormGroup>
        <Label as="span">Open to</Label>
        <CheckboxRow>
          {AVAILABILITY_KINDS.map((kind) => (
            <CheckboxLabel key={kind.value}>
              <input
                type="checkbox"
                value={kind.value}
                data-testid="availability-filter"
                data-availability={kind.value}
                {...register("availability")}
              />
              {kind.label}
            </CheckboxLabel>
          ))}
        </CheckboxRow>
      </FormGroup>

      <SearchRow>
        <FormGroup>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select id="sortBy" {...register("sortBy")}>
            <option value="created">Date Created</option>
            <option value="updated">Last Updated</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="sortOrder">Order</Label>
          <Select id="sortOrder" {...register("sortOrder")}>
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </Select>
        </FormGroup>
      </SearchRow>

      <ButtonRow>
        <Button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search Characters"}
        </Button>
        <Button type="button" variant="secondary" onClick={handleClear}>
          Clear Filters
        </Button>
      </ButtonRow>
    </SearchForm>
  );
};

export default AdvancedSearchForm;
