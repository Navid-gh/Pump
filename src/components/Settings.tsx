import { type FC, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { PumpNewTokenResponse } from '../types/services';
import { BACKEND_URL } from '@/lib/utils/constants';

interface SettingsFormData {
    minMarketCap: number;
    minEntryPointMC: number;
    minEntryPointTradeCount: number;
    newTokenTimeout: number;
    tradeCheckInterval: number;
    listenNewToken: boolean;
    listenTokenTrade: boolean;
}

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const Settings: FC<SettingsProps> = ({ isOpen, onClose }) => {
    const { register, handleSubmit, reset } = useForm<SettingsFormData>();

    useEffect(() => {
        // Fetch current settings when component opens
        // For now, using default values as API for GET is not defined
        const getSettings = async () => {
            const settings = await fetch(`${BACKEND_URL}/tokens/filter`);
            const data = (await settings.json()) as PumpNewTokenResponse['config'];
            reset({
                minMarketCap: data.minMarketCap,
                minEntryPointMC: data.minEntryMarketCap,
                minEntryPointTradeCount: data.minEntryTradesCount,
                newTokenTimeout: data.newTokenTimeout,
                tradeCheckInterval: data.tradeCheckInterval,
                listenNewToken: data.listenNewToken,
                listenTokenTrade: data.listenTokenTrade,
            });
        };
        getSettings();
    }, [isOpen, reset]);

    const onSubmit = async (data: SettingsFormData) => {
        try {
            await fetch(`${BACKEND_URL}/tokens/filter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    minMarketCap: Number(data.minMarketCap),
                    minEntryPointMC: Number(data.minEntryPointMC),
                    minEntryPointTradeCount: Number(data.minEntryPointTradeCount),
                    newTokenTimeout: Number(data.newTokenTimeout),
                    tradeCheckInterval: Number(data.tradeCheckInterval),
                    listenNewToken: data.listenNewToken,
                    listenTokenTrade: data.listenTokenTrade,
                }),
            });
            onClose();
        } catch (error) {
            console.error('Failed to update settings', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'>
            <div className='bg-[#1a1d21] p-6 rounded-lg shadow-lg w-full max-w-sm'>
                <h2 className='text-xl font-bold mb-4'>Settings</h2>
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                    <div>
                        <label htmlFor='minMarketCap' className='block text-sm font-medium text-white/80'>
                            Min Market Cap (SOL)
                        </label>
                        <input
                            type='number'
                            id='minMarketCap'
                            {...register('minMarketCap')}
                            className='w-full bg-white/5 rounded-md p-2 mt-1'
                        />
                    </div>
                    <div>
                        <label htmlFor='minEntryPointMC' className='block text-sm font-medium text-white/80'>
                            Min Entry Point MC (SOL)
                        </label>
                        <input
                            type='number'
                            id='minEntryPointMC'
                            {...register('minEntryPointMC')}
                            className='w-full bg-white/5 rounded-md p-2 mt-1'
                        />
                    </div>
                    <div>
                        <label htmlFor='minEntryPointTradeCount' className='block text-sm font-medium text-white/80'>
                            Min Entry Point Trade Count
                        </label>
                        <input
                            type='number'
                            id='minEntryPointTradeCount'
                            {...register('minEntryPointTradeCount')}
                            className='w-full bg-white/5 rounded-md p-2 mt-1'
                        />
                    </div>
                    <div>
                        <label htmlFor='newTokenTimeout' className='block text-sm font-medium text-white/80'>
                            New Token Timeout (ms)
                        </label>
                        <input
                            type='number'
                            id='newTokenTimeout'
                            {...register('newTokenTimeout')}
                            className='w-full bg-white/5 rounded-md p-2 mt-1'
                        />
                    </div>
                    <div>
                        <label htmlFor='tradeCheckInterval' className='block text-sm font-medium text-white/80'>
                            Trade Check Interval (ms)
                        </label>
                        <input
                            type='number'
                            id='tradeCheckInterval'
                            {...register('tradeCheckInterval')}
                            className='w-full bg-white/5 rounded-md p-2 mt-1'
                        />
                    </div>
                    <div className='flex items-center justify-between'>
                        <label htmlFor='listenNewToken' className='text-sm font-medium text-white/80'>
                            Listen for New Tokens
                        </label>
                        <input
                            type='checkbox'
                            id='listenNewToken'
                            {...register('listenNewToken')}
                            className='w-4 h-4 text-blue-600 bg-white/5 border-gray-300 rounded focus:ring-blue-500'
                        />
                    </div>

                    <div className='flex items-center justify-between'>
                        <label htmlFor='listenTokenTrade' className='text-sm font-medium text-white/80'>
                            Listen for Token Trades
                        </label>
                        <input
                            type='checkbox'
                            id='listenTokenTrade'
                            {...register('listenTokenTrade')}
                            className='w-4 h-4 text-blue-600 bg-white/5 border-gray-300 rounded focus:ring-blue-500'
                        />
                    </div>
                    <div className='flex justify-end space-x-2'>
                        <button type='button' onClick={onClose} className='px-4 py-2 bg-white/10 rounded-md'>
                            Cancel
                        </button>
                        <button type='submit' className='px-4 py-2 bg-blue-500 rounded-md'>
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
