import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';
import { BrowserRouter } from 'react-router-dom';

import { init } from '@/lib/tg/init';

import './index.css';
import App from './App';
import Providers from '@/components/Providers';
import { FavoritesProvider } from '@/hooks/useFavorites';

// Mock the environment in case, we are outside Telegram.
import '@/lib/tg/mockEnv';

const root = ReactDOM.createRoot(document.getElementById('root')!);

try {
    const launchParams = retrieveLaunchParams();
    const { tgWebAppPlatform: platform } = launchParams;
    const debug = (launchParams.tgWebAppStartParam || '').includes('platformer_debug') || import.meta.env.DEV;

    // Configure all application dependencies.
    await init({
        debug,
        mockForMacOS: platform === 'macos',
    }).then(() => {
        root.render(
            <StrictMode>
                <Providers>
                    <FavoritesProvider>
                        <BrowserRouter>
                            <App />
                        </BrowserRouter>
                    </FavoritesProvider>
                </Providers>
            </StrictMode>
        );
    });
} catch (e) {
    console.error(e);
}
