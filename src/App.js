import React from 'react';
import {useEffect} from 'react';

import './App.css';
import StcPo from './components/StcPo';

const App = (props) => {
  return <StcPo userAccessRights={props.userAccessRights} sendUpdatesTOs={props.sendUpdatesTOs} />;
}

export default App;