import * as React from "react";
import {useState,useContext} from "react";
import styles from './StcPo.module.scss';
import {AppContext} from './StcPo';

const SideBar = () => {
  const context = useContext(AppContext);

  const [currentMenu, setCurrentMenu] = useState("");

  
  const setSelectedNav = (e) => {
    let dataMenu = e.currentTarget.getAttribute("data-menuid");
    setCurrentMenu(dataMenu);
    context.dispatch.menuDispatch({type: "CHANGE", value: dataMenu});
  };

  const MenuItems = () => {
    let fullMenu = [
      {
        Id: 1,
        Title: "New",
        SubItems: []
      },
      {
        Id: 2,
        Title: "Pending",
        SubItems: []
      },
      {
        Id: 3,
        Title: "Purchase Orders",
        SubItems: []
      },
      {
        Id: 10,
        Title: "Settings",
        SubItems: [
          {
            Id: 10.1,
            Title: "Users",
          },
        ]
      }
    ];

    return fullMenu;
  };


  const onSibebarItemClick = (e) => {
    let ele = e.currentTarget;

    //uncollapse item with subitems
    for (let i = 0; i < document.getElementsByClassName("hasSubItem").length; i++) {
      //Prevent removing effect from current element
      if (ele != document.getElementsByClassName("hasSubItem")[i]) {
        document.getElementsByClassName("hasSubItem")[i].setAttribute("data-active","0");
        document.getElementsByClassName("hasSubItem")[i].children[1].setAttribute("style","height: 0px");        
      }
    }

    if (ele.classList.contains("hasSubItem")) {
      if (ele.getAttribute("data-active") != "1") {
        //Show collapse sub items
        let sidebarItemHeight = ele.clientHeight;
        let sidebarItemSubItemCount = ele.children[1].children.length;

        //This use to check if the element is active
        ele.setAttribute("data-active","1");
        ele.children[1].setAttribute("style","height: "+(sidebarItemHeight*sidebarItemSubItemCount)+"px");    
      } else {

        //uncollapse sub items
        ele.setAttribute("data-active","");
        ele.children[1].setAttribute("style","height: 0px"); 
      }
    } else {
      setSelectedNav(e);      
    }

  };

  const onSubItemClick = (e) => {
    e.stopPropagation();
    setSelectedNav(e);
  };



  return (
    <div className={styles.sidebar}>
      <ul>
        {
          MenuItems().map(menu => 
                menu.SubItems.length == 0 ?          
               <li key={menu.Id} onClick={onSibebarItemClick} data-menuid={menu.Id}><div className={currentMenu == menu.Id.toString() ? styles.sideBarItemNavSelected : ""}>{menu.Title}</div></li>  
                :
               <li key={menu.Id} onClick={onSibebarItemClick} className="hasSubItem" ><div>{menu.Title}</div>
                  <ul>
                  {
                    menu.SubItems.map(subItem => 
                    <li key={subItem.Id} onClick={onSubItemClick} data-menuid={subItem.Id}><div className={currentMenu == subItem.Id.toString() ? styles.sideBarItemNavSelected : ""}>{subItem.Title}</div></li>
                    )
                  }
                  </ul>
               </li>  
            )
        }
      </ul>
    </div>);

};

export default SideBar;