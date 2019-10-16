# Sofie iNews-FTP Gateway

An application for piping data between [**Sofie Server Core**](https://github.com/nrkno/tv-automation-server-core) and iNews FTP based workflow.

This application is a part of the [**Sofie** TV News Studio Automation System](https://github.com/nrkno/Sofie-TV-automation/).

## Usage

```BASH
// Development:
yarn start -host 127.0.0.1 -port 3000 -log "log.log"
// Production:
yarn start
```

## Setup

After starting the gateway, go to the Sofie settings, you should find an option for `INEWS GATEWAY`.

Under hosts, add the IP addresses of your iNews servers. Then add the queue names for each iNews queue you want to ingest into Sofie e.g. `INEWS.QUEUE.ON-AIR`.

Then add the username and password for your iNews system.

Going back to the Sofie Rundowns view, your queues will appear as rundowns.

**CLI arguments:**

| Argument  | Description | Environment variable |
| ------------- | ------------- | --- |
| -host  | Hostname or IP of Core  | CORE_HOST  |
| -port  | Port of Core   |  CORE_PORT |
| -log  | Path to output log |  CORE_LOG |

## Installation for dev

yarn

yarn build

### Dev dependencies

* yarn:
 <https://yarnpkg.com>

* jest:
 `yarn global add jest`
