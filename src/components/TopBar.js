import * as React from "react";
import {useState,useContext,useEffect} from "react";
import styles from './StcPo.module.scss';
import {AppContext} from './StcPo';
import {PO_PENDING_VIEWS, MENU_ID, myMSALObj,ACCESS_RIGHTS} from '../utils/constant';


const TopBar = () => {
    const context = useContext(AppContext);
    const [currentMenu, setCurrentMenu] = useState(context.state.menu.toString());    
    const [loginName,setLoginName] = useState("Name");

    useEffect(() => {
        setLoginName(myMSALObj.account.name);
    });
    
    const getMenuItems = () => {

        let menu = [];

        if (context.state.pOPendingView == PO_PENDING_VIEWS.LIST) {
            menu = [
                {
                    id: 1,
                    title: 'New',
                    click: (e) => onMenuItemClick(e)
                },
                {
                    id: 2,
                    title: 'Purchase Orders',
                    click: (e) => {
                        onMenuItemClick(e);
                    }
                }
            ];
        } else if (context.state.pOPendingView == PO_PENDING_VIEWS.ITEM) {
            menu = [
                {
                    id: 1,
                    title: 'New',
                    click: (e) => {  
                        //Reset the pOPendingView 
                        context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.LIST});
                        onMenuItemClick(e); 
                    }
                },
                {
                    id: 1.2,
                    title: 'Purchase Orders',
                    click: (e) => {
                        context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.LIST})
                    }
                },
                {
                    id: 2,
                    title: 'View PO',
                    click: (e) => onMenuItemClick(e)
                },
            ];
        } else {
            menu = [
                {
                    id: 1,
                    title: 'New',
                    click: (e) => {  
                        //Reset the pOPendingView 
                        context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.LIST});
                        onMenuItemClick(e); 
                    }
                },
                {
                    id: 1.2,
                    title: 'Purchase Orders',
                    click: (e) => {
                        context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.LIST})
                    }
                    
                },
                {
                    id: 2,
                    title: 'Edit PO',
                    click: (e) => onMenuItemClick(e)
                }
            ];
        }

        if (context.state.userAccessRights == ACCESS_RIGHTS.READ || context.state.userAccessRights == ACCESS_RIGHTS.RECEIVER) {
            //removing the new menu
            menu.shift();
            return menu;
        } else if (context.state.userAccessRights == ACCESS_RIGHTS.MODIFY) {
            return menu;
        }

    }

    const secondMenu = [
        {
            id: MENU_ID.Approver,
            title: 'Approver',
            click: (e) => { 
                //Reset the pOPendingView 
                context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.LIST});
                onMenuItemClick(e); 
            }
        },
        {
            id: MENU_ID.Supplier,
            title: 'Supplier',
            click: (e) => { 
                //Reset the pOPendingView 
                context.dispatch.setPOPendingViewDispatch({type: 'CHANGE', value: PO_PENDING_VIEWS.LIST});
                onMenuItemClick(e); 
            }
        }
        
    ];

    const onMenuItemClick = (e) => {
        let id = e.currentTarget.getAttribute('data-id');
        setCurrentMenu(id);
        context.dispatch.menuDispatch({type: "CHANGE", value: id});
    }



    return <div className={styles.topBar}>
        <ul>
            {
                getMenuItems().map(i => <li key={i.id} data-id={i.id} onClick={i.click} className={currentMenu == i.id.toString() ? styles.menuItemNavSelected : ""}>{i.title}</li>)
            }
        </ul>
        <ul style={{marginLeft: 'auto'}}>
            {
                secondMenu.map(i => <li key={i.id} data-id={i.id} onClick={i.click} className={currentMenu == i.id.toString() ? styles.menuItemNavSelected : ""}>{i.title}</li>)
            }
        </ul>
        <ul className={styles.topBarMenuNotSelectable}>
            <li>|</li>
            {/* <li>{AUTH_CONTEXT.getCachedUser().profile.name}</li> */}
            <li>{loginName}</li>
            <li>|</li>
        </ul>
        <ul>
            <li onClick={e => {
                myMSALObj.logout();
            }}>Logout</li>
        </ul>
    </div>

}
export default TopBar;