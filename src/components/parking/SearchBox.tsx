import { forwardRef, useCallback, useState } from 'react';
import { UseQueryResult } from '@tanstack/react-query';

interface Location {
  lat: number;
  lng: number;
}

interface SearchResult {
  formattedAddress: string;
  location: Location;
}

interface SearchHookResult {
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
}

type SearchHook = (textQuery: string, options?: { languageCode: string }) => UseQueryResult<SearchHookResult>;

interface SearchBoxProps {
  children?: React.ReactNode;
  placeholder?: string;
  useSearchHook: SearchHook;
  onResultSelected: (result: SearchResult) => void;
  value?: string;
}

interface ResultItemProps {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

const ResultItem = ({ result, onSelect, onClose }: ResultItemProps) => (
  <button
    type="button"
    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
    onClick={() => {
      onSelect(result);
      onClose();
    }}
  >
    <p className="text-sm font-medium text-gray-900 truncate">
      {result.formattedAddress}
    </p>
  </button>
);

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ placeholder = 'Buscar dirección...', useSearchHook, onResultSelected, value }, ref) => {
    const [query, setQuery] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);

    const { data, isLoading } = useSearchHook(query, { languageCode: 'es' });

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setQuery(newValue);
      setIsOpen(true);
    }, []);

    const handleClose = useCallback(() => {
      setIsOpen(false);
    }, []);

    return (
      <div className="relative">
        <div className="relative">
          <input
            ref={ref}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
        {isOpen && data?.results && data.results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
            {data.results.map((result) => (
              <ResultItem
                key={result.formattedAddress}
                result={result}
                onSelect={onResultSelected}
                onClose={handleClose}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
