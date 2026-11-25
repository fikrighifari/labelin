import { createContext } from 'react';
import type { SavedPaperSize } from './data';

export const PaperLibrary = createContext<{ sizes: SavedPaperSize[]; add: (size: SavedPaperSize) => void } | null>(null);
