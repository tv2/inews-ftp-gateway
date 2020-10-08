import { DeviceConfigManifest, ConfigManifestEntryType } from 'tv-automation-server-core-integration'

export const INEWS_DEVICE_CONFIG_MANIFEST: DeviceConfigManifest = {
	deviceConfig: [
		{
			id: 'hosts',
			name: '',
			type: ConfigManifestEntryType.TABLE,
			defaultType: 'default',
			config: {
				default: [
					{
						id: 'host',
						name: 'Host',
						columnName: 'Hosts',
						type: ConfigManifestEntryType.STRING,
					},
				],
			},
		},
		{
			id: 'queues',
			name: '',
			type: ConfigManifestEntryType.TABLE,
			defaultType: 'default',
			config: {
				default: [
					{
						id: 'queues',
						name: 'Queue',
						columnName: 'Queues',
						type: ConfigManifestEntryType.STRING,
					},
				],
			},
		},
		{
			id: 'user',
			name: 'User',
			type: ConfigManifestEntryType.STRING,
		},
		{
			id: 'password',
			name: 'Password',
			type: ConfigManifestEntryType.STRING,
		},
	],
}
