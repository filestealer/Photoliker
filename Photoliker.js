var system = require('system');
var username = system.args[1];
var password = system.args[2];
var hours = system.args[3];

var page = require('webpage').create();

var stepIndex = 0;
var loadInProgress = false;
var isFinished = true;
var instagramLoginURL = 'https://instagram.com/accounts/login/';

Date.prototype.addHours= function(h){
        this.setHours(this.getHours()+h);
            return this;
}

if (!hours) {
    hours = 24;
} else {
    hours = parseInt(hours);
}

console.log('Username: ' + username);
console.log('Hours to look back: ' + hours);

var targetTime = (new Date()).addHours(-hours);

page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';
console.log('Current UA: ' + page.settings.userAgent);

page.onConsoleMessage = function (msg, line, source) {
    console.log('console> ' + msg);
};

page.onLoadStarted = function() {
    loadInProgress = true;
};

page.onLoadFinished = function() {
    loadInProgress = false;
};

function next() {
    isFinished = true;
};

function clickElement(selector) {
    var point = page.evaluate(function (selector) {

        var el = $(selector)[0];
        var rect = el.getBoundingClientRect();
        return {
            x: rect.left + Math.floor(rect.width / 2),
            y: rect.top + Math.floor(rect.height / 2)
        };
    }, selector);
    page.sendEvent('click', point.x, point.y);
}

function getLatestTime() {
    var timeElements = $('time');
    var length = timeElements.length;
    console.log('Number of visible images: ' + length);
    var dateString = timeElements[length - 1].getAttribute('datetime');
    return new Date(dateString);
};

var steps = [
    function() {
        page.open(instagramLoginURL);
        console.log('Go to: ' + instagramLoginURL);
        next();
    },
    function() {
        clickElement('[name="username"]');
        page.sendEvent('keypress', username);

        clickElement('[name="password"]');
        page.sendEvent('keypress', password);

        page.render('before-submit.png');
        clickElement('button');

        setTimeout(function () {
            next();
        }, 1000);
    },
    function() {
        var error = page.evaluate(function () {
            var element = document.getElementById('slfErrorAlert');
            var error_message = false;
            if (element !== null) {
                error_message = element.innerText.trim();
            }
            return error_message;
        });

        page.render('after-submit.png');
        if (!error) {
            console.log('Login Successful: ' + page.url);
        } else {
            console.log('Login Failed: ' + error);
        }
        next();
    },
    function() {
        var latestTime = page.evaluate(getLatestTime);
        console.log('Target time:' + targetTime);
        console.log('Latest time:' + latestTime);
        if (latestTime <= targetTime) {
            next();
        } else {

            page.evaluate(function() {
                document.body.scrollTop = document.body.scrollHeight;
            });

            clickElement('a:contains("Load more")');
            var scrollInterval = setInterval(function() {

                page.render('after-load-more.png');
                page.evaluate(function() {
                    document.body.scrollTop = document.body.scrollHeight;
                });

                var latestTime = page.evaluate(getLatestTime);
                console.log('Latest time:' + latestTime);
                if (latestTime <= targetTime) {
                    clearInterval(scrollInterval);
                    next();
                    return;
                }

            }, 5000);
        }
    },
    function() {
        var likeButtons = page.evaluate(function() {
            return $('[class~="coreSpriteHeartOpen"]').map(function() {
                return this.getAttribute('data-reactid');
            }).get();
        });
        var length = likeButtons.length;
        console.log('Number of unliked images: ' + length);

        var i = 0;
        var likingInterval = setInterval(function() {
            clickElement('[data-reactid="' + likeButtons[i] + '"]');
            console.log(likeButtons[i]);
            i++;
            if (i >= length) {
                clearInterval(likingInterval);
                next();
            }
        }, 1000);
    },
    function() {
        page.render('after-liking.png');
        phantom.exit();
    }
];

setInterval(function() {
    if (isFinished && !loadInProgress && typeof steps[stepIndex] == "function") {
        isFinished = false;
        steps[stepIndex]();
        stepIndex++;
    }
}, 50);
