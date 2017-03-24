#!/usr/bin/env node

var fs = require('fs-extra');
var https = require('https');
var path = require('path');
var exit = process.exit;
var pkg = require('../package.json');
var version = pkg.version;

var program = require('commander');
var express = require('express');
var mustache = require('mustache');
var strftime = require('strftime');
var underscore = require('underscore');
var AdmZip = require('adm-zip');

var os = require('os');
require('shelljs/global');

var ipAddress = underscore
  .chain(require('os').networkInterfaces())
  .values()
  .flatten()
  .find(function(iface) {
    return iface.family === 'IPv4' && iface.internal === false;
  })
  .value()
  .address;


var globalCerFolder = os.homedir() + '/.ios-ipa-server/' + ipAddress;
  /**
   * Main program.
   */
process.exit = exit

// CLI

before(program, 'outputHelp', function() {
  this.allowUnknownOption();
});

program
  .version(version)
  .usage('[option] [dir]')
  .option('-p, --port <port-number>', 'set port for server (defaults is 1234)')
  .parse(process.argv);

var port = program.port || 1234;

if (!exit.exited) {
  main();
}

  /**
   * Install a before function; AOP.
   */

function before(obj, method, fn) {
  var old = obj[method];

  obj[method] = function() {
    fn.call(this);
    old.apply(this, arguments);
  };
}

function main() {

  console.log('https://' + ipAddress + ':' + port + '/download');
  //console.log(program.args);
  //var destinationPath = program.args.shift() || '.';
  //var ipasDir = destinationPath;
  var ipasDir = "ipa";
  var apkDir = "apk";

  var key;
  var cert;

  try {
    key = fs.readFileSync(globalCerFolder + '/mycert1.key', 'utf8');
    cert = fs.readFileSync(globalCerFolder + '/mycert1.cer', 'utf8');
  } catch (e) {
    var result = exec('sh  ' + path.join(__dirname, '..', 'generate-certificate.sh') + ' ' + ipAddress).output;
    key = fs.readFileSync(globalCerFolder + '/mycert1.key', 'utf8');
    cert = fs.readFileSync(globalCerFolder + '/mycert1.cer', 'utf8');
  }

  var options = {
    key: key,
    cert: cert
  };

  var app = express();
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));
  app.use('/apk', express.static(path.join(__dirname, '..', 'apk')));
  app.use('/cer', express.static(globalCerFolder));

  app.get('/ipa/:ipa', function(req, res) {
    var filename = ipasDir + '/' + req.params.ipa;
    // console.log(filename);

    // This line opens the file as a readable stream
    var readStream = fs.createReadStream(filename);

    // This will wait until we know the readable stream is actually valid before piping
    readStream.on('open', function() {
      // This just pipes the read stream to the response object (which goes to the client)
      readStream.pipe(res);
    });

    // This catches any errors that happen while creating the readable stream (usually invalid names)
    readStream.on('error', function(err) {
      res.end(err);
    });
  });

  app.get(['/', '/download'], function(req, res, next) {

    fs.readFile(path.join(__dirname, '..', 'templates') + '/download.html', function(err, data) {
      if (err)
        throw err;
      var template = data.toString();

      var ipas = ipasInLocation(ipasDir);

      var items_android = [];
      var items_ios = [];
      var history_android = [];
      var history_ios = [];
      for (var i = ipas.length - 1; i >= 0; i--) {
        history_ios.push(itemInfoWithName(ipas[i], ipasDir + '/' + ipas[i] + '.ipa'));
      };

      history_ios = history_ios.sort(function(a, b) {
        var result = b.time.getTime() - a.time.getTime();
        return result;
      });

      if(history_ios.length > 0){
        items_ios.push(history_ios[0]);
        history_ios.splice(0, 1);
      }

      /////////////////////
      var apks = apksInLocation(apkDir);

      for (var i = apks.length - 1; i >= 0; i--) {
        history_android.push(itemInfoWithName(apks[i], apkDir + '/' + apks[i] + '.apk'));
      };

      history_android = history_android.sort(function(a, b) {
        var result = b.time.getTime() - a.time.getTime();
        return result;
      });
      ///////////////////////

      if(history_android.length > 0){
        items_android.push(history_android[0]);
        history_android.splice(0, 1);
      }

      var info = {};
      info.ip = ipAddress;
      info.port = port;
      info.items_ios = items_ios;
      info.items_android = items_android;
      info.history_android = history_android;
      info.history_ios = history_ios;
      var rendered = mustache.render(template, info);
      res.send(rendered);
    })
  });


  app.get('/plist/:file', function(req, res) {
    fs.readFile(path.join(__dirname, '..', 'templates') + '/template.plist', function(err, data) {
      if (err)
        throw err;
      var template = data.toString();

      var rendered = mustache.render(template, {
        name: req.params.file,
        ip: ipAddress,
        port: port,
      });

      res.set('Content-Type', 'text/plain; charset=utf-8');
      // res.set('MIME-Type', 'application/octet-stream');
      res.send(rendered);
    })
  });

  https.createServer(options, app).listen(port);

}

function itemInfoWithName(name, location) {
  //var location = ipasDir + '/' + name + '.ipa';
  var stat = fs.statSync(location);
  var time = new Date(stat.mtime);
  var timeString = strftime('%F %H:%M', time);


  return {
    name: name,
    description: '   Update: ' + timeString,
    time: time,
    ip: ipAddress,
    port: port
  }
}

  /**
   *
   */

function ipasInLocation(location) {
  var result = [];
  var files = fs.readdirSync(location);
  for (var i in files) {
    if (path.extname(files[i]) === ".ipa") {
      result.push(path.basename(files[i], '.ipa'));
    }
  }
  return result;
}

function apksInLocation(location) {
  var result = [];
  var files = fs.readdirSync(location);
  for (var i in files) {
    if (path.extname(files[i]) === ".apk") {
      result.push(path.basename(files[i], '.apk'));
    }
  }
  return result;
}
