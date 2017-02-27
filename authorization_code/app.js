/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var bodyParser = require('body-parser')

var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = ''; // Your client id
var client_secret = ''; // Your secret
var accessToken = ""
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();
app.use(bodyParser.json())



function createPlaylist() {
  var options = {
    url: 'https://api.spotify.com/v1/users/houseofcard525/playlists',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + accessToken},
    json: true,
    body: JSON.stringify({
      name: '525 Top Tracks',
      public: false,
      collaborative: true
    }),
  };
  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {
    console.log("Created playlist.", response);
  });
}

function addTracks(uris, cb) {
  var options = {
    url: 'https://api.spotify.com/v1/users/houseofcard525/playlists/5XvJFSNwqhzWgjqgCLn035/tracks',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + accessToken},
    json: true,
    body: JSON.stringify({
      uris: uris
    }),
  };
  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {
    cb();
  });
}

function getTracks (currentTracks, url, offset, limit, cb) {
  if (url === null || url === undefined) {
    url = 'https://api.spotify.com/v1/users/houseofcard525/playlists/5XvJFSNwqhzWgjqgCLn035/tracks?offeset='
    + offset + '&limit=' + limit;
  }
  var options = {
    url: url,
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + accessToken},
    json: true,
  }
  request.get(options, function(error, response, body) {
    for (var track of body.items) {
      currentTracks.push(track);
    }
    console.log('added', body.items.length, 'tracks');
    if (body.next !== null) {
      getTracks(currentTracks, body.next, 0, 0, cb);
    } else {
      getSnapshotId(function(snapshotId) {
        console.log('id', snapshotId);
        cb(currentTracks, snapshotId);
      });
    }
  });
}

function getSnapshotId (cb) {
  var options = {
    url: 'https://api.spotify.com/v1/users/houseofcard525/playlists/5XvJFSNwqhzWgjqgCLn035/',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + accessToken},
    json: true,
  }
  request.get(options, function(error, response, body) {
      cb(body.snapshot_id);
  });
}

function removeDuplicates() {
    var duplicated = {}
    var duplicatedUris = {}
    getTracks([], null, 0, 100, function(tracks, snapshotId) {
      for (i = 0; i < tracks.length; i++) {
        var current = tracks[i].track;
        if (duplicated[current.id] !== undefined) {
          continue;
        }
        for (j = i; j < tracks.length; j++) {
          if (i === j) continue;
          var second = tracks[j]
          if (tracks[i].track.id === tracks[j].track.id) {
            if (duplicated[tracks[j].track.id] === undefined) {
              duplicated[tracks[j].track.id] = [];
              duplicatedUris[tracks[j].track.id] = tracks[j].track.uri;
            }
            duplicated[tracks[j].track.id].push(j);
          }
        }
      }
      duplicatedObjects = [];
      for (var trackId in duplicated) {
        if (duplicated.hasOwnProperty(trackId)) {
          duplicatedObjects.push({
            uri: duplicatedUris[trackId],
            positions: duplicated[trackId],
          });
        }
      }

       var toDelete = {
         url: 'https://api.spotify.com/v1/users/houseofcard525/playlists/5XvJFSNwqhzWgjqgCLn035/tracks',
         method: 'delete',
         headers: { 'Authorization': 'Bearer ' + accessToken},
         json: true,
         body: {
            tracks: duplicatedObjects,
            snapshot_id: snapshotId
         }
       }
       console.log(toDelete);
       request.get(toDelete, function(error, response, body) {
         console.log(error, body);
       });
    });
}

app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

app.post('/tracks', function(req, res) {
  console.log(req.body.uris);
  addTracks(req.body.uris, removeDuplicates);
  // Remove duplicates
  res.send({
    ok: 'ok',
  })
});

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read user-library-read'
      + ' playlist-read-private playlist-read-collaborative playlist-modify-public'
      + ' playlist-modify-private';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/tracks.html#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
