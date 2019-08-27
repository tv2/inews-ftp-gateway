# Sofie iNews-FTP Gateway


An application for piping data between [**Sofie Server Core**](https://github.com/nrkno/tv-automation-server-core) and iNews FTP based workflow.

This application is a part of the [**Sofie** TV News Studio Automation System](https://github.com/nrkno/Sofie-TV-automation/).

## Usage
```
// Development:
npm run start -host 127.0.0.1 -port 3000 -log "log.log"
// Production:
npm run start
```

As of now the gateway uses the Sofie-spreadsheet protocol. So for now all settings is manually added in a DEFAULT.ts file. So copy example_DEFAULTS.ts to DEFAULTS.ts and edit Ip, login, queues etc.

**CLI arguments:**

| Argument  | Description | Environment variable |
| ------------- | ------------- | --- |
| -host  | Hostname or IP of Core  | CORE_HOST  |
| -port  | Port of Core   |  CORE_PORT |
| -log  | Path to output log |  CORE_LOG |

## Installation for dev

yarn

yarn build

### Dev dependencies:

* yarn
	https://yarnpkg.com

* jest
	yarn global add jest
