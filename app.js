const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const useragent = require('express-useragent');

const AuthController = require('./controllers/auth');
const WebsiteController = require('./controllers/website');
const PinController = require('./controllers/pin');
const Error = require('./errors/general');
const TokenService = require('./services/token');

// parsing the body of POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// User-Agent parser
app.use(useragent.express());

// log every request
app.use((req, res, next) => {
    const token = req.header('Authorization');
    console.log(req.method, req.url, token ? token : '');
    next();
});

// check JSON syntax error
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError) {
        return next(Error.JsonSyntax);
    }
    next();
});

// check empty body in POST requests
app.use((req, res, next) => {
    if (req.method == 'POST' && Object.keys(req.body).length == 0 && req.body.constructor == Object) {
        return next(Error.EmptyBody);
    }
    next();
});

// controllers

// these routes don't need token

// home
app.get('/', (req, res, next) => {
    res.sendFile(path.join(__dirname + '/pages/home.html'));
});

// favicon
app.get('/favicon.ico', (req, res, next) => {
    const faviconPath = path.join(__dirname, 'favicon.ico');
    res.header('Content-Type', 'image/x-icon');
    fs.createReadStream(faviconPath).pipe(res);
});

// set user using token
app.use((req, res, next) => {
    const token = req.header('Authorization');
    if(token) {
        TokenService.checkToken(token)
            .then((t) => {
                if (t != null) {

                    // add authenticated user to request
                    req.user = {
                        _id: t.user._id,
                        token: token
                    };
                }
                return next();
            })
    } else {
        return next();
    }
});

// auth
app.use('/auth', AuthController);

// auth checker
app.use((req, res, next) => {
    if(!req.user) {
        return next(Error.InvalidToken);
    } else {
        return next();
    }
});

// these routes need token

// website
app.use('/website', WebsiteController);

// pin
app.use('/pin', PinController);

// error handler

app.use((err, req, res, next) => {

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') == 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);

    // log error
    console.log(req.method, req.url, 'error', err.body);

    // send error
    res.send(err.body)
});

// catch 404 and forward to error handler
app.use((err, req, res, next) => {
    console.log('error 404', req.url, 'not found');

    var error = new Error();
    error.status = 404;
    next(error);
});

module.exports = app;
