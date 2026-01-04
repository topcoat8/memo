import { useState, useEffect, useCallback } from 'react';

export default function useAddressBook(userId) {
    const [entries, setEntries] = useState({});

    // Load from localStorage on mount or when userId changes
    useEffect(() => {
        if (!userId) {
            setEntries({});
            return;
        }

        try {
            const stored = localStorage.getItem(`memo_address_book_${userId}`);
            if (stored) {
                setEntries(JSON.parse(stored));
            } else {
                setEntries({});
            }
        } catch (err) {
            console.error('Failed to load address book:', err);
        }
    }, [userId]);

    // Save entry
    const updateEntry = useCallback((address, data) => {
        if (!userId || !address) return;

        setEntries(prev => {
            const newEntries = {
                ...prev,
                [address]: {
                    ...prev[address],
                    ...data,
                    updatedAt: Date.now()
                }
            };

            try {
                localStorage.setItem(`memo_address_book_${userId}`, JSON.stringify(newEntries));
            } catch (err) {
                console.error('Failed to save address book:', err);
            }

            return newEntries;
        });
    }, [userId]);

    // Get specific entry
    const getEntry = useCallback((address) => {
        return entries[address] || null;
    }, [entries]);

    return {
        entries,
        updateEntry,
        getEntry
    };
}
