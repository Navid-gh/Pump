import { useLaunchParams } from '@telegram-apps/sdk-react';
import { type FC, type PropsWithChildren, useState } from 'react';
import Settings from './Settings';

const Layout: FC<PropsWithChildren<{}>> = ({ children }) => {
    const lp = useLaunchParams(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleRefresh = async () => {
        try {
            await fetch('http://localhost:4000/restart', { method: 'POST' });
        } catch (error) {
            console.error('Failed to restart server', error);
        } finally {
            window.location.reload();
        }
    };

    return (
        <div className='min-h-screen p-4 text-white'>
            <header className='mb-3 flex justify-between items-center'>
                <h2 className='text-lg font-semibold'>Pump.fun Tokens</h2>
                <div className='flex items-center gap-4'>
                    {lp?.tgWebAppData?.user?.firstName && <div className='text-xs opacity-70'>Hi, {lp.tgWebAppData.user.firstName}</div>}
                    <button onClick={handleRefresh} className='text-xs bg-white/10 px-2 py-1 rounded-md'>
                        Refresh
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className='text-xs bg-white/10 px-2 py-1 rounded-md'>
                        Settings
                    </button>
                </div>
            </header>
            <main>{children}</main>
            <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default Layout;
