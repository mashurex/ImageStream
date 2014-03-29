/**
 *
 * @author Mustafa Ashurex <mustafa@ashurexconsulting.com>
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var config = require('./config');

var app = express();

// Allow the access of config values at template level
app.use(function (req, res, next) {
  res.locals.pconfig = config;
  next();
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon(config.imagestream.favicon_path));
app.use(express.bodyParser({uploadDir: "/tmp" }));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/page/:page', routes.index);
app.get('/post/:id', routes.get);
app.get('/form', routes.form);
app.post('/', routes.save);

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
