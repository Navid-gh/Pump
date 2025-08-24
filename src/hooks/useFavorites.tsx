import { useState, useEffect, useCallback, createContext, useContext, type FC, type PropsWithChildren } from 'react';

const FAVORITES_KEY = 'pump_fun_favorites';

interface FavoritesContextType {
    favorites: Set<string>;
    addFavorite: (mint: string) => void;
    removeFavorite: (mint: string) => void;
    isFavorite: (mint: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
    favorites: new Set(),
    addFavorite: () => {},
    removeFavorite: () => {},
    isFavorite: () => false,
});

export const FavoritesProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    useEffect(() => {
        try {
            const storedFavorites = localStorage.getItem(FAVORITES_KEY);
            if (storedFavorites) {
                setFavorites(new Set(JSON.parse(storedFavorites)));
            }
        } catch (error) {
            console.error('Failed to load favorites from local storage', error);
        }
    }, []);

    const saveFavorites = (newFavorites: Set<string>) => {
        try {
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(newFavorites)));
            setFavorites(newFavorites);
        } catch (error) {
            console.error('Failed to save favorites to local storage', error);
        }
    };

    const addFavorite = useCallback(
        (mint: string) => {
            const newFavorites = new Set(favorites);
            newFavorites.add(mint);
            saveFavorites(newFavorites);
        },
        [favorites]
    );

    const removeFavorite = useCallback(
        (mint: string) => {
            const newFavorites = new Set(favorites);
            newFavorites.delete(mint);
            saveFavorites(newFavorites);
        },
        [favorites]
    );

    const isFavorite = useCallback(
        (mint: string) => {
            return favorites.has(mint);
        },
        [favorites]
    );

    return <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
    return useContext(FavoritesContext);
};
