import * as React from 'react';
import {useState,useReducer,useEffect} from "react";
import styles from './StcPo.module.scss';
import TopBar from './TopBar';
import Content from './Content';
import {PO_PENDING_VIEWS,CLOUD_SERVER,SERVER,MENU_ID,myMSALObj} from '../utils/constant';
import axios from "axios";

export const AppContext = React.createContext(null);

const StcPo = (props) => {

  useEffect(() => {
    setLoading(true);
    

    let requestObj = {
      scopes: ["User.Read"]
    };


    myMSALObj.acquireTokenSilent(requestObj).then(function (tokenResponse) {

      axios.get('https://graph.microsoft.com/v1.0/me/', { headers: {
              'Authorization': 'Bearer ' + tokenResponse.accessToken,
      }})
      .then(response => {
        let d = {
          id: 0,
          objId: response.data.id,
          firstName: response.data.givenName,
          lastName: response.data.surname,
          email: response.data.mail
        };

        setUser(d);
        setLoading(false);

      })
      .catch(error => {
        console.log(error);
      })

    }).catch(function (error) {

    });




    // axios.get(`${CLOUD_SERVER}/users/${AUTH_CONTEXT.getCachedUser().profile.oid}`)
    // axios.get(`${CLOUD_SERVER}/users/${myMSALObj.account.accountIdentifier}`)
    //   .then(response => {
    //     setUser(response.data);
    //     setLoading(false);
    //   })
    //   .catch(error => {
    //     console.log(error);
    //   });
    
    axios.get(`${SERVER}/po/approvers`)
      .then(response => {
          setApproversDispatch({ type: 'CHANGE', value: response.data});
      })
      .catch(error => {
          
      })
      .finally(() => {
        setApproverLoading(false);
      });

    axios.get(`${SERVER}/po/suppliers`)
      .then(response => {
        setSuppliersDispatch({ type: 'CHANGE', value: response.data});
      })
      .catch(error => {

      })
      .finally(() => {
        setSuppliersLoading(false);
      })

  }, []);

  const stateReducer = (state, action) => {
    switch (action.type) {
      case "CHANGE":
        return action.value;
      default:
        return state;
    }
  }; 

  //This holds the data of currently selected menu
  //Intialize to PendingPO so that it will first appear when the app is loaded
  const [menu,menuDispatch] = useReducer(stateReducer,MENU_ID.PendingPO);
  //This holds the data in view of POPending so you can change the TopBar view
  const [pOPendingView,setPOPendingViewDispatch] = useReducer(stateReducer,PO_PENDING_VIEWS.LIST);
  //This holds the data of currently loggin user 
  const [user,setUser] = useState(null);
  const [isLoading,setLoading] = useState(true);
  //This holds the data of approvers
  const [approvers,setApproversDispatch] = useReducer(stateReducer,[]);
  const [isApproverLoading,setApproverLoading] = useState(true);
  //This holds the data of suppliers
  const [suppliers,setSuppliersDispatch] = useReducer(stateReducer,[]);
  const [isSuppliersLoading,setSuppliersLoading] = useState(true);

  //below states are used in NewPO the purpose of store them here is to retain their value 
  //whener the user is exting the NewPO component during the creation of PO
  const [items,setItemsDispatch] = useReducer(stateReducer, [
    {
        id: 0,
        quantity: "",
        name: "",
        price: "",
        hasError: false,
        quantityError: "",
        nameError: "",
        priceError: ""
    }
]);
  const [supplier,setSupplierDispatch] = useReducer(stateReducer,"");
  const [referenceNumber,setReferenceNumberDispatch] = useReducer(stateReducer, "");
  const [contactPerson,setContactPersonDispatch] = useReducer(stateReducer, "");
  const [estDate,setEstDateDispatch] = useReducer(stateReducer, null);
  const [customer,setCustomerDispatch] = useReducer(stateReducer, "");
  const [currency,setCurrencyDispatch] = useReducer(stateReducer,1);
  const [discount,setDiscountDispatch] = useReducer(stateReducer, "");
  const [discountAmount,setDiscountAmountDispatch] = useReducer(stateReducer, 0);
  const [totalAmount,setTotalAmountDispatch] = useReducer(stateReducer, 0);
  const [remarks,setRemarksDispatch] = useReducer(stateReducer, "");
  const [internalNote,setInternalNoteDispatch] = useReducer(stateReducer, "");
  const [approver,setApproverDispatch] = useReducer(stateReducer, "");
  const [attachments,setAttachmentsDispatch] = useReducer(stateReducer,[]);
  const [attachmentsExternal,setAttachmentsExternalDispatch] = useReducer(stateReducer,[]);

  const [sIOrBI,setSIOrBIDispatch] = useReducer(stateReducer, "");
  const [invoiceDate,setInvoiceDateDispatch] = useReducer(stateReducer, null);
  const [termsOfPayment,setTermsOfPaymentDispatch] = useReducer(stateReducer, "");

  if (isLoading) {
    return (
      <div>Please wait while we're checking your account...</div>
    );
  } else {
    return (
      <div className={styles.layout}>
        <AppContext.Provider value={{
            dispatch: { menuDispatch, setPOPendingViewDispatch, setApproversDispatch, setItemsDispatch, setSupplierDispatch, setReferenceNumberDispatch, setContactPersonDispatch, setEstDateDispatch, setCustomerDispatch, setCurrencyDispatch, setDiscountDispatch, setDiscountAmountDispatch, setTotalAmountDispatch, setRemarksDispatch, setInternalNoteDispatch, setApproverDispatch, setSuppliersDispatch, setAttachmentsDispatch, setAttachmentsExternalDispatch, setSIOrBIDispatch, setInvoiceDateDispatch, setTermsOfPaymentDispatch },
             
            state: { menu, pOPendingView, user, approvers, isApproverLoading, items, supplier, referenceNumber, contactPerson, estDate, customer, currency, discount, discountAmount, totalAmount, remarks, internalNote, approver, suppliers, isSuppliersLoading, attachments, attachmentsExternal, userAccessRights: props.userAccessRights, sendUpdatesTOs: props.sendUpdatesTOs, sIOrBI, invoiceDate, termsOfPayment }}}>
          <TopBar />
          <Content />
        </AppContext.Provider>
      </div>);
  }

};

export default StcPo;
