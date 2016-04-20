"use strict";
if(process.env.OPBEAT_APP_ID) {
  require('opbeat').start({
    appId: process.env.OPBEAT_APP_ID,
    organizationId: process.env.OPBEAT_ORGANIZATION_ID,
    secretToken: process.env.OPBEAT_SECRET_TOKEN
  });
}

var app = require('../app');

app.listen(process.env.PORT || 3000, function() {
  console.log('App listening on port 3000!');
});
