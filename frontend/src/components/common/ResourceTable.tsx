"use client";

import { useCollection } from "@cloudscape-design/collection-hooks";
import Box from "@cloudscape-design/components/box";
import CollectionPreferences from "@cloudscape-design/components/collection-preferences";
import Header from "@cloudscape-design/components/header";
import Pagination from "@cloudscape-design/components/pagination";
import Table, { type TableProps } from "@cloudscape-design/components/table";
import TextFilter from "@cloudscape-design/components/text-filter";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";

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
  filteringText: string;
  onFilteringTextChange: (text: string) => void;

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
  filteringText,
  onFilteringTextChange,
  totalCount,
  currentPage,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: ResourceTableProps<T>) {
  const { items: sortedItems, collectionProps } = useCollection(items, { sorting: {} });
  const pagesCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const emptyState = filteringText ? (
    <Box textAlign="center" color="inherit">
      <SpaceBetween size="xxs">
        <Box variant="strong" color="inherit">
          No matches
        </Box>
        <Box variant="p" color="inherit">
          We can&apos;t find a match.
        </Box>
        <Button onClick={() => onFilteringTextChange("")}>Clear filter</Button>
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
        <TextFilter
          filteringText={filteringText}
          filteringPlaceholder={filteringPlaceholder}
          filteringAriaLabel={`Filter ${resourceName}`}
          onChange={({ detail }) => onFilteringTextChange(detail.filteringText)}
          countText={undefined}
        />
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
