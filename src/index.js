// pollyfills for older browsers
// import "babel-polyfill";
import 'core-js'; 

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import NoAccess from './components/NoAccess';
import './components/StcPo.module.scss';
import {myMSALObj, SERVER, ACCESS_RIGHTS} from './utils/constant';
import axios from "axios";
import { getUserAccess } from './utils/utils';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;


// pdfjs.GlobalWorkerOptions.workerSrc = 'https://192.168.0.222/3rdpartyscripts/pdf.js'


var requestObj = {
  scopes: ["user.read"]
};

const getUserGroupsAndAllowedGroups = (accessToken) => {

  axios.all([
    axios.get('https://graph.microsoft.com/v1.0/me/memberOf', { headers: {
    'Authorization': 'Bearer ' + accessToken,
    }}),
    axios.get(`${SERVER}/po/allowedgroups`)
    ]
  ).then(axios.spread( (userGroups,permissionsGroups) => {

    let userAccessRights = getUserAccess(userGroups.data, permissionsGroups.data);

    if (userAccessRights == ACCESS_RIGHTS.NONE) {
      ReactDOM.render(
        <NoAccess />,
        document.getElementById('root')
      );
    } else {
      ReactDOM.render(
        <App userAccessRights={userAccessRights} sendUpdatesTOs={permissionsGroups.data.sendPOUpdatesTo} />,
        document.getElementById('root')
      );
    }

  }))
  .catch(error => {
    console.log(error);
    document.getElementById('root').innerText = "Unable to check user permission";
  });
}


//Check if user is already login
myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {
  getUserGroupsAndAllowedGroups(tokenResponse.accessToken);
}).catch(function (error) {

//User is not login prompt login window
  myMSALObj.loginPopup(requestObj)
    .then(function (loginResponse) {


      //Get new access token
      myMSALObj.acquireTokenSilent(requestObj).then(function (newTokenResponse) {
        getUserGroupsAndAllowedGroups(newTokenResponse.accessToken);
      }).catch(function (error) {
        console.log(error);
        document.getElementById('root').innerText = "Please login your Office 365 account.";
      });

    }).catch(function (error) {
      console.log(error);
      document.getElementById('root').innerText = "Please login your Office 365 account.";
    });

});






