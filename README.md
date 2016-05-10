Node.js interface to the Blitzen time series database.

This repository is structured as an npm module. To use it in a node.js project, install it using npm's built in support for GitHub-hosted modules:

`npm install AlexTessier/blitzen-nodejs`

See `crucible.js` for example code. To use this example in a project which depends on this module, modify line 1 to `require('blitzen')` instead of `require('./blitzen')`. You will also need to create an `.adsk-data360` directory under your home directory and populate it with `entities-crucible.json` (a file which specifies the organization ID, group ID and project ID of your project in the Blitzen database), and `credentials-crucible.json` (a file which specifies the client ID and secret of the app). These have already been generated and will be provided to you by more secure means -- particularly the client ID and secret.
