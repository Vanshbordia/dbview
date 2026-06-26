import { useCallback, useEffect, useState } from "react";

export function usePersistedState<T>(
	key: string,
	defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
	const [state, setState] = useState<T>(() => {
		try {
			const stored = localStorage.getItem(key);
			return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
		} catch {
			return defaultValue;
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(state));
		} catch {
			/* storage full or unavailable */
		}
	}, [key, state]);

	const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
		setState(value);
	}, []);

	return [state, setPersistedState];
}
