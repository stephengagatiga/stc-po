import * as React from 'react';
import NewPO from './NewPO';
import PendingPO from './PendingPO';
import Approver from './Approver';
import Supplier from './Supplier';
import {useContext} from "react";
import styles from './StcPo.module.scss';
import {AppContext} from './StcPo';
import { MENU_ID } from '../utils/constant';


const Content = (props) => {
  const context = useContext(AppContext);

  const contentToShow = (menu) => {
    switch(Number(menu)) {
      case MENU_ID.NewPO:
        return <NewPO />
      case MENU_ID.PendingPO:
        return <PendingPO />
      case MENU_ID.Approver:
        return <Approver />
      case MENU_ID.Supplier:
          return <Supplier />
      default:
        return <div>Not found!</div>
    }
  }

  return <div className={styles.content}>
      {contentToShow(context.state.menu)}
  </div>;
};

export default Content;
