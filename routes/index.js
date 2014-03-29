/**
 *
 * @author Mustafa Ashurex <mustafa@ashurexconsulting.com>
 */
var fs = require('fs');
var mongo = require('mongodb');
var Bitly = require('bitly');
var Twit = require('twit');
var config = require('../config');
var winston = require('winston');
var crypto = require('crypto');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      name: 'is-file',
      filename: 'imagestream.log',
      handleExceptions: true,
      json: false,
      level: (config.debug.enabled ? 'debug' : 'warn')
    }),
    new (winston.transports.Console)({
      name: 'is-console',
      handleExceptions: true,
      level: (config.debug.enabled ? 'debug' : 'warn')
    })
  ],
  exitOnError: true
});

// MongoDB access instance.
var db = mongo.Db(config.imagestream.mongo.db_name,
  new mongo.Server(
    config.imagestream.mongo.host,
    config.imagestream.mongo.port, {auto_reconnect: true}
  ),
  {}
);

// Bit.ly API client.
var bitly = new Bitly(config.bitly.legacy.login, config.bitly.legacy.api_key);

// Twitter API client.
var twitter = new Twit({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token: config.twitter.access_token,
  access_token_secret: config.twitter.access_token_secret
});

// Open up the mongo database connection.
db.open(function openDb(err) {
  if (err) {
    logger.error('Error connecting to MongoDB instance!');
    throw err;
  }
});

function stripTrailingSlash(str) {
  if (str.substr(-1) == '/') {
    return str.substr(0, str.length - 1);
  }
  return str;
}

function stripLeadingSlash(str) {
  if (str.substr(0, 1) == '/') {
    return str.substr(1);
  }
  return str;
}

/**
 * Based on the HTTP headers provided, will determine whether or not the client
 * requested JSON or something else.
 *
 * @param {Object} headers HTTP request headers.
 * @returns {boolean} True if JSON should be rendered, false otherwise.
 */
function shouldRenderJson(headers) {
  if (headers.accept) {
    if (headers.accept.toLowerCase().indexOf('json') == -1) {
      return false;
    }
    else if (headers.accept.toLowerCase().indexOf('html') != -1) {
      return false;
    }
  }

  if (headers['content-type']) {
    if (headers['content-type'].toLowerCase().indexOf('json') == -1) {
      return false;
    }
    else if (headers['content-type'].toLowerCase().indexOf('html') == -1) {
      return false;
    }
  }

  return true;
}

/**
 * Removes the specified path from the disk.
 *
 * @param {string} path The fully qualified path to the file or directory to be deleted.
 */
function unlinkFile(path) {
  try {
    fs.unlink(path, function unlinkPath(err) {
      if (err) {
        logger.warn('Error deleting file at %s, %s', path, err, { error: err, category: 'unlink_file' });
      }
    });
  } catch (ex) {
    logger.error('Exception while deleting file at %s, %s', path, ex, { exception: err, category: 'unlink_file' });
  }
}

/**
 * Generates a crypto hash from the provided filename.
 *
 * @param {string} filename The filename (or full filepath, including name) to hash.
 * @returns {string} The hashed output of the input string.
 */
function generateHash(filename) {
  return crypto.createHash('md5').update(filename).digest('hex');
}

/**
 * Display manual upload form.
 * This is really only used for testing and is disabled when debug is turned off.
 *
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.form = function (req, res) {
  if (config.debug.enabled) {
    res.render('form', { title: 'ImageStream Submission API' });
  } else {
    res.writeHead(401, 'Not authorized');
    res.end('Move along, nothing to see here.');
  }
};

/**
 * List all message posts, default index page.
 *
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.index = function (req, res) {
  try {
    // Conveniently flip between JSON or HTML depending on the request type.
    var doRenderJson = shouldRenderJson(req.headers);

    var limit = config.imagestream.post_limit;

    // Determine the requested page and the start index that refers to.
    var page = req.params.page;
    if (!page) {
      page = 1;
    } else {
      page = parseInt(page);
    }
    var placeNumber = (page - 1) * limit;

    db.collection("message_posts", function getCollection(err, collection) {
      // Sort descending by createDate to bring the newest to the top
      collection.find().sort({createDate: -1}).toArray(function collectionToArray(err, results) {
        if (err) {
          if (!doRenderJson) {
            res.render('error', { error: err });
          }
          else {
            res.json({ error: '' + err }, 400);
          }
        }
        else if (!results) {
          res.send(404);
        }
        else {
          var count = results.length;

          // Reset the index and page via redirect if they're too high.
          if ((placeNumber >= count) && (page > 1)) {
            res.redirect('/page/1');
          }

          var posts = results.slice(placeNumber, (placeNumber + limit));
          if (!doRenderJson) {
            res.render('index', {
              entries: posts,
              total: count,
              page: page,
              page_count: (count / limit),
              next_page: (page + 1),
              prev_page: (page - 1)
            });
          }
          else {
            res.json(posts, 200);
          }
        }
      });
    });
  } catch (ex) {
    logger.error(ex.message, { exception: ex });
    res.json(500);
  }
};

/**
 * Request a single entry.
 *
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 */
exports.get = function (req, res) {
  var id = req.params.id;
  try {
    var doRenderJson = shouldRenderJson(req.headers);
    db.collection('message_posts', function getCollection(error, collection) {
      collection.findOne({_id: new mongo.ObjectID(id)}, function findOneResult(error, result) {
        if (error) {
          logger.warn(error);
          res.json('' + error, 400);
        } else if (!result || !result.imageType) {
          res.send(404);
        } else {
          var fbook_url = stripTrailingSlash(config.imagestream.long_url) + '/post/' + id;
          var twitter_url = ((result.short_url && result.short_url != '') ? result.short_url : fbook_url);
          var img_url = stripTrailingSlash(config.imagestream.long_url) + '/' +
            stripLeadingSlash(stripTrailingSlash(config.imagestream.public_image_root)) + '/' + result.imageName;

          var social_meta = {
            image_url: img_url,
            post_url: fbook_url,
            short_url: twitter_url,
            title: result.message
          };

          if (!doRenderJson) {
            res.render('entry', {
              title: result.message,
              result: result,
              facebook_share_url: fbook_url,
              twitter_share_url: twitter_url,
              social_meta: social_meta
            });
          }
          else {
            res.json(result, 200);
          }
        }
      });
    });
  } catch (ex) {
    logger.error(ex.message, { exception: ex });
    res.json(500);
  }
};

/**
 * Returns the extension of the filename input.
 *
 * @param {string} filename
 * @returns {string} The filename extension if it has one.
 */
function getExtension(filename) {
  var i = filename.lastIndexOf('.') + 1;
  return (i < 0) ? '' : filename.substr(i);
}

/**
 * Updates the short URL for the specified article.
 *
 * @param {string} article_id The ID of the article to update.
 * @param {string} short_url The shortened URL to add to the article.
 */
function updateShortUrl(article_id, short_url) {
  try {
    db.collection('message_posts', function getCollection(error, collection) {
      collection.update({_id: article_id}, {$set: {short_url: short_url}}, function updateCollection(err) {
        if (err) {
          logger.error('Error updating record %s with new short url %s: %s', article_id, short_url, err);
        }
      });
    });
  } catch (ex) {
    logger.error('Exception occurred updating record %s with short url %s: %s',
      article_id,
      short_url,
      ex.message,
      {
        exception: ex,
        category: 'short_url'
      }
    );
  }
}

/**
 * Processes the request and image details, stores the data and returns a response.
 *
 * @param {Object} req HTTP request object.
 * @param {Object} res HTTP response object.
 * @param {Object} image Uploaded image metadata.
 * @param {string} imageName The name to use for the file when looking up on the filesystem or HTTP.
 * @param {string} publicBaseUrl The base URL to use in the qualified URL for the image metadata.
 */
function processArticlePost(req, res, image, imageName, publicBaseUrl) {

  publicBaseUrl = stripTrailingSlash(publicBaseUrl);

  var article = {
    imageType: image.type,
    imageSize: image.size,
    imageName: imageName,
    short_url: '',
    message: req.body.message,
    createDate: new Date()
  };

  db.collection('message_posts', function getCollection(error, collection) {
    collection.save(article, { safe: true }, function saveArticle(err) {
      if (err) {
        logger.error(error);
        res.json('' + err, 400);
      } else {

        unlinkFile(image.path);

        // Create a copy w/out image binary data for response.
        var client_response = {
          id: article._id,
          imageUrl: publicBaseUrl + '/' + stripLeadingSlash(config.imagestream.public_image_root) + '/' + stripLeadingSlash(imageName),
          imageName: article.imageName,
          imageSize: article.imageSize,
          imageType: article.imageType,
          message: article.message,
          createDate: article.createDate,
          short_url: '',
          tweet_url: '',
          response_message: '',
          tweet_sent: false
        };

        if (config.debug.api_usage) {
          try {
            // Shorten the URL w/ Bit.ly.
            var custom_domain = (config.bitly.custom_domain && config.bitly.custom_domain != '' ? config.bitly.custom_domain : 'bit.ly');
            bitly.shorten(publicBaseUrl + '/post/' + article._id, custom_domain, function shortenUrl(bitlyErr, response) {
              if (bitlyErr) {
                logger.warn('Error posting to Bit.ly: %s', bitlyErr.message, { error: bitlyErr, response: response, category: 'bitly' });
                res.json(client_response, 400);
              }
              else if (response.status_code == 200) {

                if (config.debug.enabled) {
                  logger.debug('Bit.ly response', { response: response, category: 'bitly' });
                }

                client_response.short_url = response.data.url;

                updateShortUrl(article._id, response.data.url);

                var tweet = client_response.message + "\n" + client_response.short_url;

                try {
                  // Post to Twitter (if Bit.ly POST is successful).
                  twitter.post('statuses/update', {status: tweet }, function twitterPost(err, reply) {
                    if (err) {
                      logger.warn('Twitter post error: %s', err, { error: err, response: reply, category: 'twitter' });
                    }
                    else {
                      if (config.debug.enabled) {
                        logger.debug('Twitter response', { response: reply, category: 'twitter' });
                      }

                      client_response.tweet_sent = true;
                      client_response.tweet_url = 'http://twitter.com/' + reply.user.screen_name + '/statuses/' + reply.id_str;
                    }

                    res.json(client_response, 200);
                  });
                } catch (ex) {
                  client_response.response_message = 'Exception occurred posting to Twitter: ' + ex.message;
                  logger.error('Exception occurred posting to Twitter: %s', ex.message, { exception: ex, category: 'twitter' });
                  res.json(client_response, 200);
                }
              } else {
                client_response.response_message = 'Error shortening URL with Bit.ly';
                res.json(client_response, 200);
              }
            });
          } catch (ex) {
            client_response.response_message = 'Exception occurred shortening URL with Bit.ly: ' + ex.message;
            logger.error('Exception occurred shortening URL with Bit.ly: %s', ex.message, { exception: ex, category: 'bitly' });
            res.json(client_response, 200);
          }
        } else {
          client_response.response_message = 'API usage is disabled.';
          res.json(client_response, 200);
        }
      }
    });
  });
}

/**
 * Save a new post to the database, bit.ly and twitter.
 *
 * @param req
 * @param res
 */
exports.save = function (req, res) {
  try {
    var image = req.files.displayImage;
    var url = stripTrailingSlash(config.imagestream.long_url);
    var newPath = stripTrailingSlash(config.imagestream.image_path);

    if (image && image.size) {
      fs.readFile(image.path, function readImage(err, data) {
        if (!err) {

          var imageName = generateHash(image.path) + "." + getExtension(image.path);
          newPath += '/' + imageName;

          fs.writeFile(newPath, data, function writeImage(err) {
            if (err) {
              logger.error('Error writing uploaded file to %s: %s', newPath, err, { category: 'image_upload' });
              res.json('' + err, 400);
            }
            else {
              logger.debug('Successfully wrote image to %s.', newPath);
              processArticlePost(req, res, image, imageName, url);
            }
          });

        } else {
          logger.error('Error reading uploaded image: %s', err, { category: 'image_upload' });
          res.json('' + err, 400);
        }
      });
    } else {
      res.json(404);
    }
  } catch (ex) {
    logger.error(ex.message, { exception: ex, category: 'image_upload' });
    res.json(500);
  }
};
