/**
 * ImageStream configuration file
 *
 * @author Mustafa Ashurex <mustafa@ashurexconsulting.com>
 */

module.exports = {
  bitly: {
    username: '',
    custom_domain: '',
    client_id: '',
    secret: '',
    access_token: '',
    // The application currently only uses the legacy credentials.
    legacy: {
      login: '',
      api_key: ''
    }
  },
  twitter: {
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: ''
  },
  imagestream: {
    // The 'long' base url to provide to Bit.ly.
    long_url: 'http://www.server.domain',
    // The path to store uploaded images
    image_path: '/var/www/imagestream/public/images/upload',
    // This should end with a slash (it's used for base href in the Jade templates).
    root_path: 'http://www.server.domain/',
    // The relative path to the uploaded images.
    public_image_root: '/images/upload',
    // Used for environments that need a fully qualified path, otherwise this should work
    favicon_path: 'public/favicon.ico',
    // Max number of posts to display per page.
    post_limit: 10,
    mongo: {
      db_name: 'imagestream',
      host: 'localhost',
      port: 27017
    },
    // Social navigation links URLs and titles.
    social: {
      facebook: {
        url: 'http://www.facebook.com/YOUR_PAGE',
        title: 'Facebook Profile'
      },
      twitter: {
        url: 'http://www.twitter.com/ashurexm',
        title: '@ashurexm on Twitter'
      }
    }
  },
  debug: {
    // If enabled, debug logging and behavior will be turned on.
    enabled: true,
    // If false, Bit.ly and Twitter will not be contacted and social sharing will not be enabled.
    api_usage: false
  }
};
