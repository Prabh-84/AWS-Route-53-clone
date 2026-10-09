"use client";

import { useCollection } from "@cloudscape-design/collection-hooks";
import Box from "@cloudscape-design/components/box";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";
import Header from "@cloudscape-design/components/header";
import Pagination from "@cloudscape-design/components/pagination";
import PropertyFilter, { type PropertyFilterProps } from "@cloudscape-design/components/property-filter";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";

/** Use a PropertyFilter (key/operator/value tokens) instead of the plain text filter. */
export interface PropertyFilterConfig {
  query: PropertyFilterProps.Query;
  onChange: (query: PropertyFilterProps.Query) => void;
  filteringProperties: PropertyFilterProps.FilteringProperty[];
  filteringOptions?: PropertyFilterProps.FilteringOption[];
}

const propertyFilterStrings: PropertyFilterProps.I18nStrings = {
  filteringAriaLabel: "Filter records",
  dismissAriaLabel: "Dismiss",
  filteringPlaceholder: "Filter records by property or value",
  groupValuesText: "Values",
  groupPropertiesText: "Properties",
  operatorsText: "Operators",
  operationAndText: "and",
  operationOrText: "or",
  operatorLessText: "Less than",
  operatorLessOrEqualText: "Less than or equal",
  operatorGreaterText: "Greater than",
  operatorGreaterOrEqualText: "Greater than or equal",
  operatorContainsText: "Contains",
  operatorDoesNotContainText: "Does not contain",
  operatorEqualsText: "Equals",
  operatorDoesNotEqualText: "Does not equal",
  editTokenHeader: "Edit filter",
  propertyText: "Property",
  operatorText: "Operator",
  valueText: "Value",
  cancelActionText: "Cancel",
  applyActionText: "Apply",
  allPropertiesLabel: "All properties",
  tokenLimitShowMore: "Show more",
  tokenLimitShowFewer: "Show fewer",
  clearFiltersText: "Clear filters",
  removeTokenButtonAriaLabel: (token) => `Remove token ${token.propertyKey ?? ""} ${token.value}`,
  enteredTextLabel: (text) => `Use: "${text}"`,
};

export interface ResourceTableProps<T> {
  columnDefinitions: TableProps.ColumnDefinition<T>[];
  /** The current page of items (already filtered/paginated by the server). */
  items: T[];
  trackBy: (item: T) => string;
  loading?: boolean;

  selectionType?: "single" | "multi";
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;

  title: string;
  counter?: string;
  description?: React.ReactNode;
  info?: React.ReactNode;
  actions?: React.ReactNode;

  /** Singular/plural label used in aria text and the page-size options, e.g. "hosted zones". */
  resourceName: string;
  empty: { title: string; description?: string; action?: React.ReactNode };
  filteringPlaceholder: string;
  /** Plain text filter (used when no propertyFilter is given). */
  filteringText?: string;
  onFilteringTextChange?: (text: string) => void;
  propertyFilter?: PropertyFilterConfig;
  /** Rows for which this returns true get a disabled checkbox. */
  isItemDisabled?: (item: T) => boolean;

  /** Total number of matching items on the server. */
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Cloudscape Table + TextFilter + Pagination + CollectionPreferences.
 * Filtering and paging are server-driven (controlled props); useCollection supplies sorting.
 */
export function ResourceTable<T>({
  columnDefinitions,
  items,
  trackBy,
  loading,
  selectionType,
  selectedItems,
  onSelectionChange,
  title,
  counter,
  description,
  info,
  actions,
  resourceName,
  empty,
  filteringPlaceholder,
  filteringText = "",
  onFilteringTextChange,
  propertyFilter,
  isItemDisabled,
  totalCount,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: ResourceTableProps<T>) {
  const { items: sortedItems, collectionProps } = useCollection(items, { sorting: {} });
  const pagesCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const isFiltered = propertyFilter ? propertyFilter.query.tokens.length > 0 : filteringText !== "";
  const clearFilter = () =>
    propertyFilter ? propertyFilter.onChange({ tokens: [], operation: "and" }) : onFilteringTextChange?.("");

  const emptyState = isFiltered ? (
    <Box textAlign="center" color="inherit">
      <SpaceBetween size="xxs">
        <Box variant="strong" color="inherit">
          No matches
        </Box>
        <Box variant="p" color="inherit">
          We can&apos;t find a match.
        </Box>
        <Button onClick={clearFilter}>Clear filter</Button>
      </SpaceBetween>
    </Box>
  ) : (
    <Box textAlign="center" color="inherit">
      <SpaceBetween size="xxs">
        <Box variant="strong" color="inherit">
          {empty.title}
        </Box>
        {empty.description && (
          <Box variant="p" color="inherit">
            {empty.description}
          </Box>
        )}
        {empty.action}
      </SpaceBetween>
    </Box>
  );

  return (
    <Table
      {...collectionProps}
      columnDefinitions={columnDefinitions}
      items={sortedItems}
      trackBy={trackBy}
      loading={loading}
      loadingText={`Loading ${resourceName}`}
      selectionType={selectionType}
      isItemDisabled={isItemDisabled}
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => onSelectionChange?.(detail.selectedItems)}
      ariaLabels={{
        selectionGroupLabel: `${resourceName} selection`,
        allItemsSelectionLabel: () => "select all",
        itemSelectionLabel: (_, item) => `select ${trackBy(item)}`,
      }}
      header={
        <Header variant="h2" counter={counter} info={info} description={description} actions={actions}>
          {title}
        </Header>
      }
      filter={
        propertyFilter ? (
          <PropertyFilter
            query={propertyFilter.query}
            onChange={({ detail }) => propertyFilter.onChange(detail)}
            filteringProperties={propertyFilter.filteringProperties}
            filteringOptions={propertyFilter.filteringOptions ?? []}
            i18nStrings={{ ...propertyFilterStrings, filteringPlaceholder: filteringPlaceholder, filteringAriaLabel: `Filter ${resourceName}` }}
            expandToViewport
          />
        ) : (
          <TextFilter
            filteringText={filteringText}
            filteringPlaceholder={filteringPlaceholder}
            filteringAriaLabel={`Filter ${resourceName}`}
            onChange={({ detail }) => onFilteringTextChange?.(detail.filteringText)}
            countText={undefined}
          />
        )
      }
      pagination={
        <Pagination
          currentPageIndex={currentPage}
          pagesCount={pagesCount}
          onChange={({ detail }) => onPageChange(detail.currentPageIndex)}
          ariaLabels={{
            nextPageLabel: "Next page",
            previousPageLabel: "Previous page",
            pageLabel: (pageNumber) => `Page ${pageNumber} of all pages`,
          }}
        />
      }
      preferences={
        <CollectionPreferences
          title="Preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize }}
          onConfirm={({ detail }) => detail.pageSize && onPageSizeChange(detail.pageSize)}
          pageSizePreference={{
            title: "Page size",
            options: pageSizeOptions.map((value) => ({ value, label: `${value} ${resourceName}` })),
          }}
        />
      }
      empty={emptyState}
    />
  );
}
