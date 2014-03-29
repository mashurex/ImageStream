# ImageStream Social Image Stream

### Requirements
- [MongoDB](http://www.mongodb.org/) 
- [Node.JS](http://nodejs.org/)

## Project Setup and Execution
1. Go the project base directory in Terminal and type `npm install`.
2. Copy `config.default.js` to `config.js` and edit as necessary, see [Configuration](#configuration)).
2. Start mongo 
	- Type `mongod` in a *new* Terminal window and leave it open.
3. Execute the application 
	- Type `node app.js` in the original Terminal window

### Manual Post Submission
Images and 'messages' can be manually submitted via web form at `http://localhost:3000/popsquatch/form`. Anything posted via this method will show up just the same as an image posted from another application.

### Submission Fields
The endpoint to POST data to is `http://localhost:3000/`

- `displayImage`: The image to be uploaded.
- `message`: The message to be used for the tweet.

## <a id="configuration">Configuration</a>
All configuration is done in the `config.js` file. If it doesn't exist it should be copied from `config.default.js` which should have enough configuration to make the application run.

#### ImageStream
General application configuration resides in this section.

- `long_url`: This is the URL to use as the base URL for Bitly links, the 'base callback' URL, if you will. This URL needs to be publicly accessible and point to the `/popsquatch` endpoint.
- `post_limit`: The number of posts to display per page.

##### Debug
This section is for debugging and development parameters.

- `enabled`: If set to `true`, extra logging and debug behavior will be enabled.
- `api_usage`: If set to `false` the application will **not** POST to Twitter and Bit.ly APIs.

#### Bitly

If you wish to use OAuth configuraiton make sure that `username`,`client_id`, `secret` and `access_token` are properly filled out. 

#####Legacy
For using the Legacy API connection, simply fill out the `login` and `api_key` values in the `bitly.legacy` section.

#### Twitter
Twitter requires OAuth authentication and as such you will need the `consumer_key`, `consumer_secret`, `access_token` and `access_token_secret` from your custom Twitter application.







<!-- $Id: README.md 10018 2014-03-21 20:09:10Z mustafaashurex $ -->