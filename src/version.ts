export const VERSION = '0.3.0'

export function VersionIsCompatible(storedVersion?: string): boolean {
	return storedVersion === VERSION
}
