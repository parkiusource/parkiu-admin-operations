import { useState, useCallback, forwardRef } from 'react';
import { useAutocompletePlaces, AutocompleteSuggestion } from '@/api/hooks/useAutocompletePlaces';
import { Input } from '@/components/common/Input';
import { LuX } from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

interface SearchBoxProps {
  placeholder?: string;
  onResultSelected: (suggestion: { placeId: string; text: string }) => void;
  value?: string;
  locationBias?: { lat: number; lng: number; radius: number };
}

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ placeholder = 'Buscar dirección...', onResultSelected, value, locationBias }, ref) => {
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [popoverOpen, setPopoverOpen] = useState(false);

    const { results, isLoading, error } = useAutocompletePlaces(searchTerm, locationBias);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      setPopoverOpen(!!newValue);
    }, []);

    const handleClearSearch = useCallback(() => {
      setSearchTerm('');
      setPopoverOpen(false);
    }, []);

    const handleSelect = (suggestion: AutocompleteSuggestion['placePrediction']) => {
      setSearchTerm(suggestion.text.text);
      setPopoverOpen(false);
      onResultSelected({ ...suggestion, text: suggestion.text.text });
    };

    return (
      <div className={twMerge('w-full')}>
        <div className="relative w-full">
          <Input
            ref={ref}
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            className="w-full py-2 pl-8 pr-4 text-base"
            autoComplete="off"
          />
          {!!searchTerm && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400"
              onClick={handleClearSearch}
              type="button"
              aria-label="Limpiar búsqueda"
            >
              <LuX className="w-4 h-4" />
            </button>
          )}
        </div>
        {popoverOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
            {isLoading && <div className="p-4 text-gray-500">Cargando...</div>}
            {!isLoading && results.length === 0 && (
              <div className="p-4 text-gray-500">No se encontraron resultados</div>
            )}
            {!isLoading && results.map((suggestion) => (
              <button
                key={suggestion.placePrediction.placeId}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                onClick={() => handleSelect(suggestion.placePrediction)}
              >
                <span className="block text-sm font-medium text-gray-900 truncate">
                  {suggestion.placePrediction.text.text}
                </span>
              </button>
            ))}
            {error && <div className="p-4 text-red-500">Error: {error}</div>}
          </div>
        )}
      </div>
    );
  }
);

SearchBox.displayName = 'SearchBox';
