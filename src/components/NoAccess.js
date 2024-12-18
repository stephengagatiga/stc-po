import * as React from 'react';
import {myMSALObj} from '../utils/constant';

const NoAccess = (props) => {

    const logout = (e) => {
        e.preventDefault();
        myMSALObj.logout();
    };;
    
    return <div style={{padding: '10px'}}>
        <h3>Hi, {myMSALObj.account.name}</h3>
        <p>You don't have permission to access this.</p>
        <br/>
        <a href="#" onClick={logout}>Click here to logout</a>
    </div>;
};

export default NoAccess;
