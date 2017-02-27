function createPlaylist() {
   $.ajax({
      url: 'https://api.spotify.com/v1/users/1244546098/playlists' ,
      method: 'POST',
      headers: {
         'Authorization': 'Bearer ' + window.access_token
      },
      data: JSON.stringify({
        name: 'Shared Top Tracks',
        public: false,
        collaborative: true,
      }),
      success: function(response) {
         console.log(response);
      }
   });
}
function followPlaylist() {
   $.ajax({
      url: 'https://api.spotify.com/v1/users/houseofcard525/playlists/5XvJFSNwqhzWgjqgCLn035/followers' ,
      method: 'PUT',
      headers: {
         'Authorization': 'Bearer ' + window.access_token
      },
      data: JSON.stringify({
      }),
      success: function(response) {
         console.log(response);
      }
   });
}

function addSongs(uris) {
  console.log('aadding songs');
   $.ajax({
       contentType: 'application/json',
      url: 'http://localhost:8888/tracks' ,
      method: 'POST',
      data: JSON.stringify({
        uris: uris,
      }),
      success: function(response) {
         console.log(response);
      }
   });

}

function getData() {
  $.ajax({
      url: 'https://api.spotify.com/v1/me/top/tracks',
      headers: {
         'Authorization': 'Bearer ' + window.access_token
      },
      success: function(response) {
        var uris = [];
        for (var i = 0; i<response.items.length; i++) {
            uris.push(response.items[i].uri);
            var list = $('#top-tracks');
            var li = $('<li>' + response.items[i].name + '</li>')
            list.append(li);
        }
        followPlaylist();
        addSongs(uris);
      }
   });
}
/**
* Obtains parameters from the hash of the URL
* @return Object
*/
function getHashParams() {
   var hashParams = {};
   var e, r = /([^&;=]+)=?([^&;]*)/g,
   q = window.location.hash.substring(1);
   while ( e = r.exec(q)) {
      hashParams[e[1]] = decodeURIComponent(e[2]);
   }
   return hashParams;
}

var params = getHashParams();

var access_token = params.access_token,
refresh_token = params.refresh_token,
error = params.error;

if (error) {
   alert('There was an error during the authentication');
} else {
   if (access_token) {
      window.access_token = access_token;
      window.refresh_token = refresh_token;
      getData();
   } else {
      // render initial screen
      $('#login').show();
      $('#loggedin').hide();
   }
}
